import React, { useEffect, useRef, useCallback, memo, useMemo, useState, Component, ErrorInfo, ReactNode } from "react";
import { StyleSheet, TouchableOpacity, BackHandler, AppState, AppStateStatus, View, Platform, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import * as ScreenOrientation from "expo-screen-orientation";
import { ThemedView } from "@/components/ThemedView";
import { PlayerControls } from "@/components/PlayerControls";
import { EpisodeSelectionModal } from "@/components/EpisodeSelectionModal";
import { SourceSelectionModal } from "@/components/SourceSelectionModal";
import { SpeedSelectionModal } from "@/components/SpeedSelectionModal";
import { SeekingBar } from "@/components/SeekingBar";
import VideoLoadingAnimation from "@/components/VideoLoadingAnimation";
import useDetailStore from "@/stores/detailStore";
import { useTVRemoteHandler } from "@/hooks/useTVRemoteHandler";
import Toast from "react-native-toast-message";
import usePlayerStore, { selectCurrentEpisode } from "@/stores/playerStore";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import Logger from '@/utils/Logger';

const logger = Logger.withTag('PlayScreen');

// 动态导入 expo-video，处理可能的导入错误
let VideoView: any = null;
let useVideoPlayerHook: ((source: any, setup?: any) => any) | null = null;
let videoModuleError: string | null = null;
let videoModuleLoaded = false;

try {
  const expoVideo = require('expo-video');
  VideoView = expoVideo.VideoView;
  useVideoPlayerHook = expoVideo.useVideoPlayer;
  videoModuleLoaded = true;
  console.log('[PlayScreen] expo-video module loaded:', {
    hasVideoView: !!VideoView,
    hasUseVideoPlayer: !!useVideoPlayerHook,
  });
} catch (error: any) {
  videoModuleError = error?.message || 'Failed to load expo-video';
  console.error('[PlayScreen] Failed to load expo-video:', error);
}

// 创建一个空的 hook 作为 fallback
const useVideoPlayerFallback = (source: any, setup?: any) => {
  console.warn('[PlayScreen] Using fallback video player (expo-video not available)');
  return null;
};

// 使用可用的 hook
const useVideoPlayer = useVideoPlayerHook || useVideoPlayerFallback;

const CONTROLS_TIMEOUT = 5000;

// 错误边界组件
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
          <Text style={{ color: 'white', fontSize: 16, textAlign: 'center', padding: 20 }}>
            播放器加载失败{'\n'}
            {this.state.error?.message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// 优化的加载动画组件
const LoadingContainer = memo(
  ({ style, currentEpisode }: { style: any; currentEpisode: { url: string; title: string } | undefined }) => {
    logger.info(
      `[PERF] Video component NOT rendered - waiting for valid URL. currentEpisode: ${!!currentEpisode}, url: ${
        currentEpisode?.url ? "exists" : "missing"
      }`
    );
    return (
      <View style={style}>
        <VideoLoadingAnimation showProgressBar />
      </View>
    );
  }
);

LoadingContainer.displayName = "LoadingContainer";

// 移到组件外部避免重复创建
const createResponsiveStyles = (deviceType: string) => {
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "black",
      ...(isMobile || isTablet ? { paddingTop: 0 } : {}),
    },
    videoContainer: {
      ...StyleSheet.absoluteFillObject,
      ...(isMobile || isTablet ? { zIndex: 1 } : {}),
    },
    videoPlayer: {
      ...StyleSheet.absoluteFillObject,
    },
    loadingContainer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "black",
      padding: 20,
    },
    errorText: {
      color: "white",
      fontSize: 16,
      textAlign: "center",
      marginBottom: 20,
    },
  });
};

// 内部播放器组件
function PlayScreenContent() {
  logger.info('[PlayScreen] PlayScreenContent rendering...');

  const videoViewRef = useRef<any>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTogglingOrientationRef = useRef(false);
  const router = useRouter();
  useKeepAwake();
  const [isLandscape, setIsLandscape] = useState(false);

  // 响应式布局配置
  const { deviceType } = useResponsiveLayout();
  const isTouchDevice = deviceType !== "tv";

  logger.info(`[PlayScreen] deviceType: ${deviceType}, isTouchDevice: ${isTouchDevice}`);

  const {
    episodeIndex: episodeIndexStr,
    position: positionStr,
    source: sourceStr,
    id: videoId,
    title: videoTitle,
  } = useLocalSearchParams<{
    episodeIndex: string;
    position?: string;
    source?: string;
    id?: string;
    title?: string;
  }>();

  logger.info(`[PlayScreen] Params - episodeIndex: ${episodeIndexStr}, source: ${sourceStr}, id: ${videoId}, title: ${videoTitle}`);

  const episodeIndex = parseInt(episodeIndexStr || "0", 10);
  const position = positionStr ? parseInt(positionStr, 10) : undefined;

  const { detail } = useDetailStore();
  const source = sourceStr || detail?.source;
  const id = videoId || detail?.id?.toString();
  const title = videoTitle || detail?.title;

  logger.info(`[PlayScreen] Resolved - source: ${source}, id: ${id}, title: ${title}, hasDetail: ${!!detail}`);

  const {
    isLoading,
    showControls,
    initialPosition,
    introEndTime,
    playbackRate,
    setShowControls,
    setVideoViewRef,
    setPlayer,
    setIsInPiP,
    startPictureInPicture,
    reset,
    loadVideo,
  } = usePlayerStore();
  const currentEpisode = usePlayerStore(selectCurrentEpisode);
  const { showEpisodeModal, showSourceModal, showSpeedModal, setShowEpisodeModal, setShowSourceModal, setShowSpeedModal } =
    usePlayerStore();

  logger.info(`[PlayScreen] Store state - isLoading: ${isLoading}, hasCurrentEpisode: ${!!currentEpisode}, episodeUrl: ${currentEpisode?.url?.substring(0, 50)}...`);

  // 打印 expo-video 状态
  logger.info(`[PlayScreen] expo-video status - loaded: ${videoModuleLoaded}, error: ${videoModuleError}, hasHook: ${!!useVideoPlayerHook}`);

  // 创建 video player
  const videoSource = currentEpisode?.url || null;
  logger.info(`[PlayScreen] Creating player with source: ${videoSource ? videoSource.substring(0, 80) + '...' : 'null'}`);

  const player = useVideoPlayer(videoSource, (p: any) => {
    if (!p) {
      logger.warn('[PlayScreen] Player setup callback received null player');
      return;
    }
    logger.info('[PlayScreen] Player setup callback - configuring player');
    p.loop = false;
    p.playbackRate = playbackRate;
    // 设置时间更新间隔 (expo-video 1.x 可能不支持此属性)
    if ('timeUpdateEventInterval' in p) {
      p.timeUpdateEventInterval = 1;
    }
  });

  logger.info(`[PlayScreen] Player created: ${player ? 'success' : 'null'}, player type: ${typeof player}`);

  // 轮询状态更新
  const lastStatus = useRef<string>('idle');
  const hasSetInitialPosition = useRef(false);
  const lastUrl = useRef<string | null>(null);

  // 当 URL 变化时重置
  useEffect(() => {
    if (currentEpisode?.url && currentEpisode.url !== lastUrl.current) {
      hasSetInitialPosition.current = false;
      lastUrl.current = currentEpisode.url;
      logger.info(`[PlayScreen] URL changed to: ${currentEpisode.url.substring(0, 100)}...`);
    }
  }, [currentEpisode?.url]);

  // 播放速度变化
  useEffect(() => {
    if (player && playbackRate) {
      player.playbackRate = playbackRate;
    }
  }, [player, playbackRate]);

  // 状态轮询
  useEffect(() => {
    if (!player) {
      logger.info('[PlayScreen] No player, skipping status polling');
      return;
    }

    logger.info('[PlayScreen] Starting status polling...');

    const interval = setInterval(() => {
      try {
        const currentStatus = player.status;

        if (currentStatus !== lastStatus.current) {
          logger.info(`[PlayScreen] Player status: ${lastStatus.current} -> ${currentStatus}`);
          lastStatus.current = currentStatus;

          if (currentStatus === 'readyToPlay') {
            usePlayerStore.setState({ isLoading: false });

            if (!hasSetInitialPosition.current) {
              const jumpPosition = initialPosition || introEndTime || 0;
              if (jumpPosition > 0) {
                const jumpSeconds = jumpPosition / 1000;
                logger.info(`[PlayScreen] Seeking to ${jumpSeconds}s`);
                player.currentTime = jumpSeconds;
              }
              hasSetInitialPosition.current = true;
            }

            player.play();
          } else if (currentStatus === 'loading') {
            usePlayerStore.setState({ isLoading: true });
          } else if (currentStatus === 'error') {
            logger.error('[PlayScreen] Player error state');
            Toast.show({ type: "error", text1: "视频播放失败" });
          }
        }

        if (currentStatus === 'readyToPlay') {
          const positionMillis = (player.currentTime || 0) * 1000;
          const durationMillis = (player.duration || 0) * 1000;

          usePlayerStore.getState().handlePlaybackStatusUpdate({
            isLoaded: true,
            isPlaying: player.playing,
            positionMillis,
            durationMillis,
            didJustFinish: false,
          });
        }
      } catch (error) {
        logger.error('[PlayScreen] Error in status polling:', error);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [player, initialPosition, introEndTime]);

  // 设置 player 到 store
  useEffect(() => {
    if (player) {
      logger.info('[PlayScreen] Setting player to store');
      setPlayer(player);
    }
  }, [player, setPlayer]);

  // 设置 videoViewRef 到 store
  useEffect(() => {
    if (videoViewRef.current) {
      setVideoViewRef(videoViewRef);
    }
  }, [setVideoViewRef]);

  // TV遥控器处理
  const tvRemoteHandler = useTVRemoteHandler();

  // 动态样式
  const dynamicStyles = useMemo(() => createResponsiveStyles(deviceType), [deviceType]);

  // 屏幕方向
  useEffect(() => {
    if (Platform.isTV) return;

    const applyInitialLock = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsLandscape(true);
        logger.info('[PlayScreen] Locked to landscape');
      } catch (error) {
        logger.error('[PlayScreen] Failed to lock orientation:', error);
      }
    };

    void applyInitialLock();

    return () => {
      void ScreenOrientation.unlockAsync();
    };
  }, []);

  const toggleOrientation = useCallback(async () => {
    if (Platform.isTV) return;
    if (isTogglingOrientationRef.current) return;
    isTogglingOrientationRef.current = true;

    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsLandscape(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsLandscape(true);
      }
    } catch (error) {
      logger.error('[PlayScreen] Failed to toggle orientation:', error);
      Toast.show({ type: "error", text1: "切换横竖屏失败" });
    } finally {
      isTogglingOrientationRef.current = false;
    }
  }, [isLandscape]);

  const onToggleOrientationPress = useCallback(() => {
    setShowControls(false);
    setShowEpisodeModal(false);
    setShowSourceModal(false);
    setShowSpeedModal(false);
    void toggleOrientation();
  }, [setShowControls, setShowEpisodeModal, setShowSourceModal, setShowSpeedModal, toggleOrientation]);

  // 画中画按钮处理
  const onPiPPress = useCallback(async () => {
    logger.info('[PlayScreen] PiP button pressed');
    setShowControls(false);
    await startPictureInPicture();
  }, [setShowControls, startPictureInPicture]);

  // PiP 事件回调
  const onPictureInPictureStart = useCallback(() => {
    logger.info('[PlayScreen] Entered PiP mode');
    setIsInPiP(true);
  }, [setIsInPiP]);

  const onPictureInPictureStop = useCallback(() => {
    logger.info('[PlayScreen] Exited PiP mode');
    setIsInPiP(false);
  }, [setIsInPiP]);

  const onBackPress = useCallback(() => {
    logger.info('[PlayScreen] Back button pressed');
    if (showEpisodeModal) {
      setShowEpisodeModal(false);
      return;
    }
    if (showSourceModal) {
      setShowSourceModal(false);
      return;
    }
    if (showSpeedModal) {
      setShowSpeedModal(false);
      return;
    }
    router.back();
  }, [router, setShowEpisodeModal, setShowSourceModal, setShowSpeedModal, showEpisodeModal, showSourceModal, showSpeedModal]);

  const resetControlsTimer = useCallback(() => {
    if (deviceType === "tv") return;

    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }

    controlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, CONTROLS_TIMEOUT);
  }, [deviceType, setShowControls]);

  // 加载视频
  useEffect(() => {
    logger.info(`[PlayScreen] loadVideo effect - source: ${source}, id: ${id}, title: ${title}`);

    if (source && id && title) {
      loadVideo({ source, id, episodeIndex, position, title });
    } else {
      logger.warn('[PlayScreen] Missing required params for loadVideo');
    }

    return () => {
      logger.info('[PlayScreen] Unmounting, calling reset');
      reset();
    };
  }, [episodeIndex, source, position, reset, loadVideo, id, title]);

  // 屏幕点击处理
  const onScreenPress = useCallback(() => {
    if (deviceType === "tv") {
      tvRemoteHandler.onScreenPress();
    } else {
      const newShowControls = !showControls;
      setShowControls(newShowControls);
      if (newShowControls) {
        resetControlsTimer();
      } else if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
    }
  }, [deviceType, tvRemoteHandler, setShowControls, showControls, resetControlsTimer]);

  // 控制栏定时器
  useEffect(() => {
    if (deviceType === "tv") return;
    if (!showControls) return;

    resetControlsTimer();

    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
    };
  }, [deviceType, showControls, resetControlsTimer]);

  // App 状态变化 - 自动进入 PiP
  useEffect(() => {
    if (Platform.isTV || !isTouchDevice) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        logger.info('[PlayScreen] App going to background, starting PiP');
        startPictureInPicture();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [isTouchDevice, startPictureInPicture]);

  // 返回键处理
  useEffect(() => {
    const backAction = () => {
      if (showEpisodeModal) {
        setShowEpisodeModal(false);
        return true;
      }
      if (showSourceModal) {
        setShowSourceModal(false);
        return true;
      }
      if (showSpeedModal) {
        setShowSpeedModal(false);
        return true;
      }
      if (showControls) {
        setShowControls(false);
        return true;
      }
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [router, setShowControls, setShowEpisodeModal, setShowSourceModal, setShowSpeedModal, showControls, showEpisodeModal, showSourceModal, showSpeedModal]);

  // 超时处理
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (isLoading) {
      timeoutId = setTimeout(() => {
        if (usePlayerStore.getState().isLoading) {
          usePlayerStore.setState({ isLoading: false });
          Toast.show({ type: "error", text1: "播放超时，请重试" });
        }
      }, 60000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading]);

  // 检查 expo-video 是否可用
  if (videoModuleError) {
    logger.error('[PlayScreen] expo-video not available:', videoModuleError);
    return (
      <View style={dynamicStyles.errorContainer}>
        <Text style={dynamicStyles.errorText}>
          视频播放器不可用{'\n\n'}
          请运行 "yarn prebuild-ios" 后重新编译应用{'\n\n'}
          错误: {videoModuleError}
        </Text>
      </View>
    );
  }

  if (!detail) {
    logger.info('[PlayScreen] No detail, showing loading');
    return <VideoLoadingAnimation showProgressBar />;
  }

  logger.info(`[PlayScreen] Rendering main content, hasPlayer: ${!!player}, hasVideoView: ${!!VideoView}`);

  return (
    <ThemedView focusable style={dynamicStyles.container}>
      <TouchableOpacity
        activeOpacity={1}
        style={dynamicStyles.videoContainer}
        onPress={onScreenPress}
      >
        {/* 使用 expo-video 的 VideoView */}
        {currentEpisode?.url && player && VideoView ? (
          <VideoView
            ref={videoViewRef}
            style={dynamicStyles.videoPlayer}
            player={player}
            contentFit="contain"
            nativeControls={false}
            allowsPictureInPicture={isTouchDevice}
            startsPictureInPictureAutomatically={isTouchDevice}
            onPictureInPictureStart={onPictureInPictureStart}
            onPictureInPictureStop={onPictureInPictureStop}
          />
        ) : (
          <LoadingContainer style={dynamicStyles.loadingContainer} currentEpisode={currentEpisode} />
        )}

        {showControls && (
          <PlayerControls
            showControls={showControls}
            setShowControls={setShowControls}
            onUserActivity={resetControlsTimer}
            onBack={onBackPress}
            isLandscape={isLandscape}
            onToggleOrientation={onToggleOrientationPress}
            onPiPPress={onPiPPress}
          />
        )}

        <SeekingBar />

        {/* 加载动画覆盖层 */}
        {currentEpisode?.url && isLoading && (
          <View style={dynamicStyles.loadingContainer}>
            <VideoLoadingAnimation showProgressBar />
          </View>
        )}
      </TouchableOpacity>

      <EpisodeSelectionModal />
      <SourceSelectionModal />
      <SpeedSelectionModal />
    </ThemedView>
  );
}

// 主导出组件（带错误边界）
export default function PlayScreen() {
  logger.info('[PlayScreen] Main component rendering');

  return (
    <ErrorBoundary>
      <PlayScreenContent />
    </ErrorBoundary>
  );
}
