import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, TextInput, StyleSheet, Alert, Keyboard, TouchableOpacity, ScrollView } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import VideoCard from "@/components/VideoCard";
import VideoLoadingAnimation from "@/components/VideoLoadingAnimation";
import { api, SearchResult } from "@/services/api";
import { Search, QrCode, Trash2, History } from "lucide-react-native";
import { StyledButton } from "@/components/StyledButton";
import { useRemoteControlStore } from "@/stores/remoteControlStore";
import { RemoteControlModal } from "@/components/RemoteControlModal";
import { useSettingsStore } from "@/stores/settingsStore";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import CustomScrollView from "@/components/CustomScrollView";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";
import ResponsiveNavigation from "@/components/navigation/ResponsiveNavigation";
import ResponsiveHeader from "@/components/navigation/ResponsiveHeader";
import { DeviceUtils } from "@/utils/DeviceUtils";
import Logger from '@/utils/Logger';

const logger = Logger.withTag('SearchScreen');

export default function SearchScreen() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const { showModal: showRemoteModal, lastMessage, targetPage, clearMessage } = useRemoteControlStore();
  const { remoteInputEnabled } = useSettingsStore();
  const router = useRouter();

  // 响应式布局配置
  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType, spacing } = responsiveConfig;

  useEffect(() => {
    if (lastMessage && targetPage === 'search') {
      logger.debug("Received remote input:", lastMessage);
      const realMessage = lastMessage.split("_")[0];
      setKeyword(realMessage);
      handleSearch(realMessage);
      clearMessage(); // Clear the message after processing
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, targetPage]);

  // 加载搜索历史
  const fetchSearchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const history = await api.getSearchHistory();
      setSearchHistory(history || []);
    } catch (err) {
      logger.info("Failed to load search history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSearchHistory();
  }, [fetchSearchHistory]);

  // useEffect(() => {
  //   // Focus the text input when the screen loads
  //   const timer = setTimeout(() => {
  //     textInputRef.current?.focus();
  //   }, 200);
  //   return () => clearTimeout(timer);
  // }, []);

  const handleSearch = async (searchText?: string) => {
    const term = typeof searchText === "string" ? searchText : keyword;
    if (!term.trim()) {
      Keyboard.dismiss();
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const response = await api.searchVideos(term);
      if (response.results.length > 0) {
        setResults(response.results);
        // 保存搜索历史
        try {
          const updatedHistory = await api.addSearchHistory(term.trim());
          setSearchHistory(updatedHistory || []);
        } catch (historyErr) {
          logger.info("Failed to save search history:", historyErr);
        }
      } else {
        setError("没有找到相关内容");
      }
    } catch (err) {
      setError("搜索失败，请稍后重试。");
      logger.info("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const onSearchPress = () => handleSearch();

  const handleQrPress = () => {
    if (!remoteInputEnabled) {
      Alert.alert("远程输入未启用", "请先在设置页面中启用远程输入功能", [
        { text: "取消", style: "cancel" },
        { text: "去设置", onPress: () => router.push("/settings") },
      ]);
      return;
    }
    showRemoteModal('search');
  };

  // 点击搜索历史项
  const handleHistoryItemPress = (item: string) => {
    setKeyword(item);
    handleSearch(item);
  };

  // 删除单个搜索历史
  const handleDeleteHistoryItem = async (item: string) => {
    try {
      await api.deleteSearchHistory(item);
      setSearchHistory(prev => prev.filter(h => h !== item));
    } catch (err) {
      logger.info("Failed to delete search history item:", err);
    }
  };

  // 长按删除（去掉 item 里的叉叉按钮）
  const confirmDeleteHistoryItem = (item: string) => {
    Alert.alert(
      "删除搜索历史",
      `确定删除「${item}」吗？`,
      [
        { text: "取消", style: "cancel" },
        { text: "删除", style: "destructive", onPress: () => handleDeleteHistoryItem(item) },
      ]
    );
  };

  // 清空所有搜索历史
  const handleClearAllHistory = () => {
    Alert.alert(
      "清空搜索历史",
      "确定要清空所有搜索历史吗？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确定",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteSearchHistory();
              setSearchHistory([]);
            } catch (err) {
              logger.info("Failed to clear search history:", err);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: SearchResult; index: number }) => (
    <VideoCard
      id={item.id.toString()}
      source={item.source}
      title={item.title}
      poster={item.poster}
      year={item.year}
      sourceName={item.source_name}
      api={api}
    />
  );

  // 渲染搜索历史
  const renderSearchHistory = () => {
    if (historyLoading) {
      return (
        <View style={[commonStyles.center, { flex: 1 }]}>
          <ThemedText style={{ color: '#888' }}>加载中...</ThemedText>
        </View>
      );
    }

    if (searchHistory.length === 0) {
      return (
        <View style={[commonStyles.center, { flex: 1 }]}>
          <ThemedText style={{ color: '#888' }}>输入关键词开始搜索</ThemedText>
        </View>
      );
    }

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={dynamicStyles.historyContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={dynamicStyles.historyHeader}>
          <View style={dynamicStyles.historyTitleRow}>
            <History size={deviceType === 'mobile' ? 18 : 20} color="#888" />
            <ThemedText style={dynamicStyles.historyTitle}>搜索历史</ThemedText>
          </View>
          <TouchableOpacity onPress={handleClearAllHistory} style={dynamicStyles.clearButton}>
            <Trash2 size={deviceType === 'mobile' ? 16 : 18} color="#888" />
            <ThemedText style={dynamicStyles.clearButtonText}>清空</ThemedText>
          </TouchableOpacity>
        </View>
        <View style={dynamicStyles.historyTagsContainer}>
          {searchHistory.map((item, index) => (
            <View key={`${item}-${index}`} style={dynamicStyles.historyTagWrapper}>
              {deviceType === 'tv' ? (
                <StyledButton
                  style={dynamicStyles.historyTag}
                  buttonStyle={dynamicStyles.historyTagButton}
                  onPress={() => handleHistoryItemPress(item)}
                  onLongPress={() => confirmDeleteHistoryItem(item)}
                  delayLongPress={500}
                >
                  <ThemedText style={dynamicStyles.historyTagText} numberOfLines={1}>
                    {item}
                  </ThemedText>
                </StyledButton>
              ) : (
                <TouchableOpacity
                  style={dynamicStyles.historyTagTouchable}
                  onPress={() => handleHistoryItemPress(item)}
                  onLongPress={() => confirmDeleteHistoryItem(item)}
                  delayLongPress={500}
                  activeOpacity={0.7}
                >
                  <ThemedText style={dynamicStyles.historyTagText} numberOfLines={1}>
                    {item}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  // 动态样式
  const dynamicStyles = createResponsiveStyles(deviceType, spacing);

  const renderSearchContent = () => (
    <>
      <View style={dynamicStyles.searchContainer}>
        <TouchableOpacity
          activeOpacity={1}
          style={[
            dynamicStyles.inputContainer,
            {
              borderColor: isInputFocused ? Colors.dark.primary : "transparent",
            },
          ]}
          onPress={() => textInputRef.current?.focus()}
        >
          <TextInput
            ref={textInputRef}
            style={dynamicStyles.input}
            placeholder="搜索电影、剧集..."
            placeholderTextColor="#888"
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={onSearchPress}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            returnKeyType="search"
          />
        </TouchableOpacity>
        <StyledButton style={dynamicStyles.searchButton} onPress={onSearchPress}>
          <Search size={deviceType === 'mobile' ? 20 : 24} color="white" />
        </StyledButton>
        {deviceType !== 'mobile' && (
          <StyledButton style={dynamicStyles.qrButton} onPress={handleQrPress}>
            <QrCode size={deviceType === 'tv' ? 24 : 20} color="white" />
          </StyledButton>
        )}
      </View>

      {loading ? (
        <VideoLoadingAnimation showProgressBar={false} />
      ) : error ? (
        <View style={[commonStyles.center, { flex: 1 }]}>
          <ThemedText style={dynamicStyles.errorText}>{error}</ThemedText>
        </View>
      ) : results.length > 0 ? (
        <CustomScrollView
          data={results}
          renderItem={renderItem}
          loading={loading}
          error={error}
          emptyMessage="输入关键词开始搜索"
        />
      ) : (
        renderSearchHistory()
      )}
      <RemoteControlModal />
    </>
  );

  const content = (
    <ThemedView style={[commonStyles.container, dynamicStyles.container]}>
      {renderSearchContent()}
    </ThemedView>
  );

  // 根据设备类型决定是否包装在响应式导航中
  if (deviceType === 'tv') {
    return content;
  }

  return (
    <ResponsiveNavigation>
      <ResponsiveHeader title="搜索" showBackButton={deviceType !== 'mobile'} />
      {content}
    </ResponsiveNavigation>
  );
}

const createResponsiveStyles = (deviceType: string, spacing: number) => {
  const isMobile = deviceType === 'mobile';
  const minTouchTarget = DeviceUtils.getMinTouchTargetSize();

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: deviceType === 'tv' ? 50 : 0,
    },
    searchContainer: {
      flexDirection: "row",
      paddingHorizontal: spacing,
      marginBottom: spacing,
      alignItems: "center",
      paddingTop: isMobile ? spacing / 2 : 0,
    },
    inputContainer: {
      flex: 1,
      height: isMobile ? minTouchTarget : 50,
      backgroundColor: "#2c2c2e",
      borderRadius: isMobile ? 8 : 8,
      marginRight: spacing / 2,
      borderWidth: 2,
      borderColor: "transparent",
      justifyContent: "center",
    },
    input: {
      flex: 1,
      paddingHorizontal: spacing,
      color: "white",
      fontSize: isMobile ? 16 : 18,
    },
    searchButton: {
      width: isMobile ? minTouchTarget : 50,
      height: isMobile ? minTouchTarget : 50,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: isMobile ? 8 : 8,
      marginRight: deviceType !== 'mobile' ? spacing / 2 : 0,
    },
    qrButton: {
      width: isMobile ? minTouchTarget : 50,
      height: isMobile ? minTouchTarget : 50,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: isMobile ? 8 : 8,
    },
    errorText: {
      color: "red",
      fontSize: isMobile ? 14 : 16,
      textAlign: "center",
    },
    // 搜索历史样式
    historyContainer: {
      paddingHorizontal: spacing,
      paddingBottom: spacing * 2,
    },
    historyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing,
    },
    historyTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing / 2,
    },
    historyTitle: {
      fontSize: isMobile ? 16 : 18,
      color: "#888",
      fontWeight: "500",
    },
    clearButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing / 4,
      paddingVertical: spacing / 2,
      paddingHorizontal: spacing / 2,
    },
    clearButtonText: {
      fontSize: isMobile ? 14 : 16,
      color: "#888",
    },
    historyTagsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    historyTagWrapper: {
      marginRight: spacing * 1.25,
      marginBottom: spacing * 1.25,
    },
    historyTag: {
      marginRight: 0,
    },
    historyTagButton: {
      paddingHorizontal: spacing,
      paddingVertical: isMobile ? spacing / 2 : spacing * 0.6,
      backgroundColor: "#2c2c2e",
      borderRadius: 20,
      borderWidth: 0,
    },
    historyTagTouchable: {
      paddingLeft: spacing,
      paddingRight: spacing,
      paddingVertical: isMobile ? spacing / 2 : spacing * 0.6,
      backgroundColor: "#2c2c2e",
      borderRadius: 20,
    },
    historyTagText: {
      fontSize: isMobile ? 14 : 16,
      color: "#fff",
      maxWidth: isMobile ? 150 : 200,
    },
  });
};
