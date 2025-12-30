import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useVideoPlayer } from 'expo-video';
import Toast from 'react-native-toast-message';
import usePlayerStore from '@/stores/playerStore';
import Logger from '@/utils/Logger';

const logger = Logger.withTag('useVideoHandlers');

interface UseVideoHandlersProps {
  currentEpisode: { url: string; title: string } | undefined;
  initialPosition: number;
  introEndTime?: number;
  playbackRate: number;
  detail?: { poster?: string };
}

export const useVideoHandlers = ({
  currentEpisode,
  initialPosition,
  introEndTime,
  playbackRate,
  detail,
}: UseVideoHandlersProps) => {
  const hasSetInitialPosition = useRef(false);
  const lastUrl = useRef<string | null>(null);
  const lastStatus = useRef<string>('idle');

  // 创建 video player
  const player = useVideoPlayer(currentEpisode?.url || null, (p) => {
    // 初始配置
    p.loop = false;
    p.playbackRate = playbackRate;
    // 设置时间更新间隔 (expo-video 1.x 可能不支持此属性)
    if ('timeUpdateEventInterval' in p) {
      (p as any).timeUpdateEventInterval = 1;
    }
  });

  // 当 URL 变化时重置初始位置标记
  useEffect(() => {
    if (currentEpisode?.url && currentEpisode.url !== lastUrl.current) {
      hasSetInitialPosition.current = false;
      lastUrl.current = currentEpisode.url;
      logger.info(`[PERF] URL changed, resetting initial position flag`);
    }
  }, [currentEpisode?.url]);

  // 处理播放速度变化
  useEffect(() => {
    if (player && playbackRate) {
      player.playbackRate = playbackRate;
    }
  }, [player, playbackRate]);

  // 轮询状态更新
  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      const currentStatus = player.status;

      // 状态变化处理
      if (currentStatus !== lastStatus.current) {
        logger.info(`[STATUS] Player status changed: ${lastStatus.current} -> ${currentStatus}`);
        lastStatus.current = currentStatus;

        if (currentStatus === 'readyToPlay') {
          usePlayerStore.setState({ isLoading: false });

          // 设置初始位置
          if (!hasSetInitialPosition.current) {
            const jumpPosition = initialPosition || introEndTime || 0;
            if (jumpPosition > 0) {
              const jumpSeconds = jumpPosition / 1000;
              logger.info(`[PERF] Setting initial position to ${jumpSeconds}s`);
              player.currentTime = jumpSeconds;
            }
            hasSetInitialPosition.current = true;
          }

          // 自动播放
          player.play();
        } else if (currentStatus === 'loading') {
          usePlayerStore.setState({ isLoading: true });
        } else if (currentStatus === 'error') {
          handleError(null);
        }
      }

      // 更新播放状态
      if (currentStatus === 'readyToPlay') {
        const positionMillis = (player.currentTime || 0) * 1000;
        const durationMillis = (player.duration || 0) * 1000;

        const playbackStatus = {
          isLoaded: true,
          isPlaying: player.playing,
          positionMillis,
          durationMillis,
          didJustFinish: false,
        };

        usePlayerStore.getState().handlePlaybackStatusUpdate(playbackStatus);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [player, initialPosition, introEndTime]);

  // 错误处理
  const handleError = useCallback((error: any) => {
    if (!currentEpisode?.url) return;

    logger.error(`[ERROR] Video playback error:`, error);

    const errorString = error?.toString() || '';
    const isSSLError = errorString.includes('SSL') || errorString.includes('Certificate');
    const isNetworkError = errorString.includes('Network') || errorString.includes('connection');

    if (isSSLError) {
      Toast.show({
        type: "error",
        text1: "SSL证书错误，正在尝试其他播放源...",
      });
      usePlayerStore.getState().handleVideoError('ssl', currentEpisode.url);
    } else if (isNetworkError) {
      Toast.show({
        type: "error",
        text1: "网络连接失败，正在尝试其他播放源...",
      });
      usePlayerStore.getState().handleVideoError('network', currentEpisode.url);
    } else {
      Toast.show({
        type: "error",
        text1: "视频播放失败，正在尝试其他播放源...",
      });
      usePlayerStore.getState().handleVideoError('other', currentEpisode.url);
    }
  }, [currentEpisode?.url]);

  // VideoView 的 props
  const videoViewProps = useMemo(() => ({
    contentFit: 'contain' as const,
    nativeControls: false,
  }), []);

  return {
    player,
    videoViewProps,
  };
};
