import { create } from "zustand";
import { api, SearchResult, PlayRecord, DoubanMineItem, DoubanNowPlayingItem } from "@/services/api";
import { PlayRecordManager } from "@/services/storage";
import useAuthStore from "./authStore";
import { useSettingsStore } from "./settingsStore";

export type RowItem = (SearchResult | PlayRecord | DoubanMineItem | DoubanNowPlayingItem) & {
  id: string;
  source: string;
  title: string;
  poster: string;
  progress?: number;
  play_time?: number;
  lastPlayed?: number;
  episodeIndex?: number;
  sourceName?: string;
  totalEpisodes?: number;
  year?: string;
  rate?: string;
};

export interface Category {
  title: string;
  type?: "movie" | "tv" | "record" | "douban-mine" | "nowplaying";
  tag?: string;
  tags?: string[];
  doubanStatus?: "wish" | "do" | "collect";
}

const recordCategory: Category = { title: "最近播放", type: "record" };

const doubanMineCategories: Category[] = [
  { title: "看过", type: "douban-mine", doubanStatus: "collect" },
  { title: "想看", type: "douban-mine", doubanStatus: "wish" },
];

const initialCategories: Category[] = [
  ...doubanMineCategories,
  recordCategory,
  { title: "热门上映", type: "nowplaying" },
  { title: "热门剧集", type: "tv", tag: "热门" },
  { title: "电视剧", type: "tv", tags: ["国产剧", "美剧", "英剧", "韩剧", "日剧", "港剧", "日本动画", "动画"] },
  {
    title: "电影",
    type: "movie",
    tags: [
      "热门",
      "最新",
      "经典",
      "豆瓣高分",
      "冷门佳片",
      "华语",
      "欧美",
      "韩国",
      "日本",
      "动作",
      "喜剧",
      "爱情",
      "科幻",
      "悬疑",
      "恐怖",
    ],
  },
  { title: "综艺", type: "tv", tag: "综艺" },
  { title: "豆瓣 Top250", type: "movie", tag: "top250" },
  { title: "全球榜" },
  { title: "中国榜" },
  // “我的电视”模块，点击后跳转到专用页面
  { title: "我的电视" },
];

const defaultSelectedCategory =
  initialCategories.find((category) => category.title === "最近播放") || initialCategories[0];

// 添加缓存项接口
interface CacheItem {
  data: RowItem[];
  timestamp: number;
  type: "movie" | "tv" | "record" | "nowplaying";
  hasMore: boolean;
}

const CACHE_EXPIRE_TIME = 5 * 60 * 1000; // 5分钟过期
const MAX_CACHE_SIZE = 10; // 最大缓存容量
const MAX_ITEMS_PER_CACHE = 40; // 每个缓存最大条目数
const UNAUTHORIZED_MESSAGE = "认证失败，请重新登录";

const getCacheKey = (category: Category) => {
  return `${category.type || 'unknown'}-${category.title}-${category.tag || ''}`;
};

export const getHomeCategoryKey = getCacheKey;

const isValidCache = (cacheItem: CacheItem) => {
  return Date.now() - cacheItem.timestamp < CACHE_EXPIRE_TIME;
};

export interface CategoryPageState {
  data: RowItem[];
  loading: boolean;
  loadingMore: boolean;
  pageStart: number;
  hasMore: boolean;
  error: string | null;
}

const createInitialPageState = (overrides?: Partial<CategoryPageState>): CategoryPageState => ({
  data: [],
  loading: false,
  loadingMore: false,
  pageStart: 0,
  hasMore: true,
  error: null,
  ...overrides,
});

interface HomeState {
  categories: Category[];
  selectedCategory: Category;
  pageStates: Record<string, CategoryPageState>;
  fetchInitialData: (category?: Category) => Promise<void>;
  loadMoreData: (category?: Category) => Promise<void>;
  selectCategory: (category: Category) => void;
  refreshPlayRecords: () => Promise<void>;
  clearError: (category?: Category) => void;
}

// 内存缓存，应用生命周期内有效
const dataCache = new Map<string, CacheItem>();
let lastLoginStatusCheckAt = 0;
const LOGIN_STATUS_CHECK_INTERVAL = 10 * 1000;

const useHomeStore = create<HomeState>((set, get) => ({
  categories: initialCategories,
  selectedCategory: defaultSelectedCategory,
  pageStates: {},

  fetchInitialData: async (category?: Category) => {
    const { apiBaseUrl } = useSettingsStore.getState();
    const now = Date.now();
    if (now - lastLoginStatusCheckAt > LOGIN_STATUS_CHECK_INTERVAL) {
      await useAuthStore.getState().checkLoginStatus(apiBaseUrl);
      lastLoginStatusCheckAt = now;
    }

    const targetCategory = category ?? get().selectedCategory;
    const cacheKey = getCacheKey(targetCategory);

    // 最近播放不缓存，始终实时获取
    if (targetCategory.type === 'record') {
      set((state) => ({
        pageStates: {
          ...state.pageStates,
          [cacheKey]: createInitialPageState({
            loading: true,
            data: [],
            pageStart: 0,
            hasMore: true,
            error: null,
          }),
        },
      }));
      await get().loadMoreData(targetCategory);
      return;
    }

    // 容器分类（需要选择子分类）不加载内容
    if (targetCategory.tags && !targetCategory.tag) {
      set((state) => ({
        pageStates: {
          ...state.pageStates,
          [cacheKey]: createInitialPageState({
            loading: false,
            data: [],
            pageStart: 0,
            hasMore: false,
            error: null,
          }),
        },
      }));
      return;
    }

    // 检查缓存
    if (dataCache.has(cacheKey) && isValidCache(dataCache.get(cacheKey)!)) {
      const cachedData = dataCache.get(cacheKey)!;
      set((state) => ({
        pageStates: {
          ...state.pageStates,
          [cacheKey]: createInitialPageState({
            loading: false,
            data: cachedData.data,
            pageStart: cachedData.data.length,
            hasMore: cachedData.hasMore,
            error: null,
          }),
        },
      }));
      return;
    }

    set((state) => ({
      pageStates: {
        ...state.pageStates,
        [cacheKey]: createInitialPageState({
          loading: true,
          data: [],
          pageStart: 0,
          hasMore: true,
          error: null,
        }),
      },
    }));
    await get().loadMoreData(targetCategory);
  },

  loadMoreData: async (category?: Category) => {
    const targetCategory = category ?? get().selectedCategory;
    const cacheKey = getCacheKey(targetCategory);
    const pageState = get().pageStates[cacheKey] ?? createInitialPageState();

    if (pageState.loadingMore || !pageState.hasMore) return;

    if (pageState.pageStart > 0) {
      set((state) => ({
        pageStates: {
          ...state.pageStates,
          [cacheKey]: { ...(state.pageStates[cacheKey] ?? createInitialPageState()), loadingMore: true },
        },
      }));
    }

    try {
      if (targetCategory.type === "record") {
        // const { isLoggedIn } = useAuthStore.getState();
        // if (!isLoggedIn) {
        //   useAuthStore.getState().requireLogin();
        //   set({
        //     contentData: [],
        //     hasMore: false,
        //     error: UNAUTHORIZED_MESSAGE,
        //   });
        //   return;
        // }
        const records = await PlayRecordManager.getAll();
        const rowItems = Object.entries(records)
          .map(([key, record]) => {
            const [source, id] = key.split("+");
            return {
              ...record,
              id,
              source,
              progress: record.play_time / record.total_time,
              poster: record.cover,
              sourceName: record.source_name,
              episodeIndex: record.index,
              totalEpisodes: record.total_episodes,
              lastPlayed: record.save_time,
              play_time: record.play_time,
            };
          })
          // .filter((record) => record.progress !== undefined && record.progress > 0 && record.progress < 1)
          .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));

        set((state) => ({
          pageStates: {
            ...state.pageStates,
            [cacheKey]: {
              ...(state.pageStates[cacheKey] ?? createInitialPageState()),
              data: rowItems,
              pageStart: rowItems.length,
              hasMore: false,
              error: null,
            },
          },
        }));
      } else if (targetCategory.type === "douban-mine" && targetCategory.doubanStatus) {
        const result = await api.getDoubanMine(targetCategory.doubanStatus, pageState.pageStart);

        const newItems = result.list.map((item) => ({
          ...item,
          id: item.title,
          source: "douban",
        })) as RowItem[];

        if (pageState.pageStart === 0) {
          // 清理过期缓存
          for (const [key, value] of dataCache.entries()) {
            if (!isValidCache(value)) {
              dataCache.delete(key);
            }
          }

          // 如果缓存太大，删除最旧的项
          if (dataCache.size >= MAX_CACHE_SIZE) {
            const oldestKey = Array.from(dataCache.keys())[0];
            dataCache.delete(oldestKey);
          }

          // 限制缓存的数据条目数，但不限制显示的数据
          const cacheItems = newItems.slice(0, MAX_ITEMS_PER_CACHE);

          // 存储新缓存
          dataCache.set(cacheKey, {
            data: cacheItems,
            timestamp: Date.now(),
            type: "tv",
            hasMore: true,
          });

          set((state) => ({
            pageStates: {
              ...state.pageStates,
              [cacheKey]: {
                ...(state.pageStates[cacheKey] ?? createInitialPageState()),
                data: newItems,
                pageStart: newItems.length,
                hasMore: result.hasMore ?? result.list.length !== 0,
                error: null,
              },
            },
          }));
        } else {
          const existingCache = dataCache.get(cacheKey);
          if (existingCache) {
            if (existingCache.data.length < MAX_ITEMS_PER_CACHE) {
              const updatedData = [...existingCache.data, ...newItems];
              const limitedCacheData = updatedData.slice(0, MAX_ITEMS_PER_CACHE);

              dataCache.set(cacheKey, {
                ...existingCache,
                data: limitedCacheData,
                hasMore: true,
              });
            }
          }

          set((state) => {
            const prevState = state.pageStates[cacheKey] ?? createInitialPageState();
            return {
              pageStates: {
                ...state.pageStates,
                [cacheKey]: {
                  ...prevState,
                  data: [...prevState.data, ...newItems],
                  pageStart: prevState.pageStart + newItems.length,
                  hasMore: result.hasMore ?? result.list.length !== 0,
                  error: null,
                },
              },
            };
          });
        }
      } else if (targetCategory.type === "nowplaying") {
        const result = await api.getDoubanNowPlaying();

        const newItems = result.list.map((item) => ({
          ...item,
          id: item.id || item.title,
          source: "douban",
        })) as RowItem[];

        // 清理过期缓存
        for (const [key, value] of dataCache.entries()) {
          if (!isValidCache(value)) {
            dataCache.delete(key);
          }
        }

        // 如果缓存太大，删除最旧的项
        if (dataCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = Array.from(dataCache.keys())[0];
          dataCache.delete(oldestKey);
        }

        const cacheItems = newItems.slice(0, MAX_ITEMS_PER_CACHE);

        dataCache.set(cacheKey, {
          data: cacheItems,
          timestamp: Date.now(),
          type: "nowplaying",
          hasMore: false,
        });

        set((state) => ({
          pageStates: {
            ...state.pageStates,
            [cacheKey]: {
              ...(state.pageStates[cacheKey] ?? createInitialPageState()),
              data: newItems,
              pageStart: newItems.length,
              hasMore: false,
              error: null,
            },
          },
        }));
      } else if (
        (targetCategory.type === "movie" || targetCategory.type === "tv") &&
        targetCategory.tag
      ) {
        const result = await api.getDoubanData(
          targetCategory.type,
          targetCategory.tag,
          20,
          pageState.pageStart
        );

        const newItems = result.list.map((item) => ({
          ...item,
          id: item.title,
          source: "douban",
        })) as RowItem[];

        if (pageState.pageStart === 0) {
          // 清理过期缓存
          for (const [key, value] of dataCache.entries()) {
            if (!isValidCache(value)) {
              dataCache.delete(key);
            }
          }

          // 如果缓存太大，删除最旧的项
          if (dataCache.size >= MAX_CACHE_SIZE) {
            const oldestKey = Array.from(dataCache.keys())[0];
            dataCache.delete(oldestKey);
          }

          // 限制缓存的数据条目数，但不限制显示的数据
          const cacheItems = newItems.slice(0, MAX_ITEMS_PER_CACHE);

          // 存储新缓存
          dataCache.set(cacheKey, {
            data: cacheItems,
            timestamp: Date.now(),
            type: targetCategory.type,
            hasMore: true // 始终为 true，因为我们允许继续加载
          });

          set((state) => ({
            pageStates: {
              ...state.pageStates,
              [cacheKey]: {
                ...(state.pageStates[cacheKey] ?? createInitialPageState()),
                data: newItems,
                pageStart: newItems.length,
                hasMore: result.list.length !== 0,
                error: null,
              },
            },
          }));
        } else {
          // 增量加载时更新缓存
          const existingCache = dataCache.get(cacheKey);
          if (existingCache) {
            // 只有当缓存数据少于最大限制时才更新缓存
            if (existingCache.data.length < MAX_ITEMS_PER_CACHE) {
              const updatedData = [...existingCache.data, ...newItems];
              const limitedCacheData = updatedData.slice(0, MAX_ITEMS_PER_CACHE);

              dataCache.set(cacheKey, {
                ...existingCache,
                data: limitedCacheData,
                hasMore: true // 始终为 true，因为我们允许继续加载
              });
            }
          }

          // 更新状态时使用所有数据
          set((state) => {
            const prevState = state.pageStates[cacheKey] ?? createInitialPageState();
            return {
              pageStates: {
                ...state.pageStates,
                [cacheKey]: {
                  ...prevState,
                  data: [...prevState.data, ...newItems],
                  pageStart: prevState.pageStart + newItems.length,
                  hasMore: result.list.length !== 0,
                  error: null,
                },
              },
            };
          });
        }
      } else if (targetCategory.tags) {
        // It's a container category, do not load content, but clear current content
        set((state) => ({
          pageStates: {
            ...state.pageStates,
            [cacheKey]: {
              ...(state.pageStates[cacheKey] ?? createInitialPageState()),
              data: [],
              pageStart: 0,
              hasMore: false,
              error: null,
            },
          },
        }));
      } else {
        set((state) => ({
          pageStates: {
            ...state.pageStates,
            [cacheKey]: {
              ...(state.pageStates[cacheKey] ?? createInitialPageState()),
              hasMore: false,
              error: null,
            },
          },
        }));
      }
    } catch (err: any) {
      let errorMessage = "加载失败，请重试";

      if (err.message === "API_URL_NOT_SET") {
        errorMessage = "请点击右上角设置按钮，配置您的服务器地址";
      } else if (err.message === "UNAUTHORIZED") {
        errorMessage = UNAUTHORIZED_MESSAGE;
      } else if (err.message.includes("Network")) {
        errorMessage = "网络连接失败，请检查网络连接";
      } else if (err.message.includes("timeout")) {
        errorMessage = "请求超时，请检查网络或服务器状态";
      } else if (err.message.includes("404")) {
        errorMessage = "服务器API路径不正确，请检查服务器配置";
      } else if (err.message.includes("500")) {
        errorMessage = "服务器内部错误，请联系管理员";
      } else if (err.message.includes("403")) {
        errorMessage = "访问被拒绝，请检查权限设置";
      }

      if (errorMessage === UNAUTHORIZED_MESSAGE) {
        useAuthStore.getState().requireLogin();
      }

      set((state) => ({
        pageStates: {
          ...state.pageStates,
          [cacheKey]: {
            ...(state.pageStates[cacheKey] ?? createInitialPageState()),
            error: errorMessage,
          },
        },
      }));
    } finally {
      set((state) => ({
        pageStates: {
          ...state.pageStates,
          [cacheKey]: {
            ...(state.pageStates[cacheKey] ?? createInitialPageState()),
            loading: false,
            loadingMore: false,
          },
        },
      }));
    }
  },

  selectCategory: (category: Category) => {
    const currentCategory = get().selectedCategory;
    const cacheKey = getCacheKey(category);

    if (currentCategory.title !== category.title || currentCategory.tag !== category.tag) {
      set({ selectedCategory: category });

      // 容器分类（需要选择子分类）不加载内容
      if (category.tags && !category.tag) {
        set((state) => ({
          pageStates: {
            ...state.pageStates,
            [cacheKey]: createInitialPageState({
              loading: false,
              data: [],
              pageStart: 0,
              hasMore: false,
              error: null,
            }),
          },
        }));
        return;
      }

      const cachedData = dataCache.get(cacheKey);
      if (cachedData && isValidCache(cachedData)) {
        set((state) => ({
          pageStates: {
            ...state.pageStates,
            [cacheKey]: createInitialPageState({
              loading: false,
              data: cachedData.data,
              pageStart: cachedData.data.length,
              hasMore: cachedData.hasMore,
              error: null,
            }),
          },
        }));
      } else {
        // 删除过期缓存
        if (cachedData) {
          dataCache.delete(cacheKey);
        }
        get().fetchInitialData(category);
      }
    }
  },

  refreshPlayRecords: async () => {
    await get().fetchInitialData(recordCategory);
  },

  clearError: (category?: Category) => {
    const targetCategory = category ?? get().selectedCategory;
    const cacheKey = getCacheKey(targetCategory);

    set((state) => ({
      pageStates: {
        ...state.pageStates,
        [cacheKey]: {
          ...(state.pageStates[cacheKey] ?? createInitialPageState()),
          error: null,
        },
      },
    }));
  },
}));

export default useHomeStore;
