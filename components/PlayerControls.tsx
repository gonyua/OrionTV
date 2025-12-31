import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, PanResponder, Platform } from "react-native";
import {
  Pause,
  Play,
  SkipForward,
  List,
  Tv,
  Expand,
  Shrink,
  ArrowDownToDot,
  ArrowUpFromDot,
  Gauge,
  ArrowLeft,
  RectangleHorizontal,
  RectangleVertical,
  PictureInPicture2,
} from "lucide-react-native";
import { ThemedText } from "@/components/ThemedText";
import { MediaButton } from "@/components/MediaButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyledButton } from "./StyledButton";

import usePlayerStore from "@/stores/playerStore";
import useDetailStore from "@/stores/detailStore";
import { useSources } from "@/stores/sourceStore";

interface PlayerControlsProps {
  showControls: boolean;
  setShowControls: (show: boolean) => void;
  isVideoFitCover?: boolean;
  onToggleVideoFit?: () => void;
  onUserActivity?: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onBack?: () => void;
  isLandscape?: boolean;
  onToggleOrientation?: () => void;
  onPiPPress?: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  showControls,
  setShowControls,
  isVideoFitCover,
  onToggleVideoFit,
  onUserActivity,
  onInteractionStart,
  onInteractionEnd,
  onBack,
  isLandscape,
  onToggleOrientation,
  onPiPPress,
}) => {
  const {
    currentEpisodeIndex,
    episodes,
    status,
    isSeeking,
    seekPosition,
    progressPosition,
    playbackRate,
    togglePlayPause,
    playEpisode,
    setShowEpisodeModal,
    setShowSourceModal,
    setShowSpeedModal,
    setIntroEndTime,
    setOutroStartTime,
    introEndTime,
    outroStartTime,
  } = usePlayerStore();

  const insets = useSafeAreaInsets();
  const isTouchDevice = !Platform.isTV;

  const { detail } = useDetailStore();
  const resources = useSources();

  const progressBarContainerRef = useRef<View | null>(null);
  const progressBarPageXRef = useRef(0);
  const progressBarWidthRef = useRef(0);
  const hasProgressBarMeasurementRef = useRef(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);

  const videoTitle = detail?.title || "";
  const currentEpisode = episodes[currentEpisodeIndex];
  const currentEpisodeTitle = currentEpisode?.title;
  const currentSource = resources.find((r) => r.source === detail?.source);
  const currentSourceName = currentSource?.source_name;
  const hasNextEpisode = currentEpisodeIndex < (episodes.length || 0) - 1;

  const formatTime = (milliseconds: number) => {
    if (!milliseconds) return "00:00";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getScrubPosition = useCallback((evt: any, gestureState?: any) => {
    const width = progressBarWidthRef.current;
    if (!width) return 0;
    const pageX =
      typeof gestureState?.moveX === "number"
        ? gestureState.moveX
        : typeof evt?.nativeEvent?.pageX === "number"
          ? evt.nativeEvent.pageX
          : null;

    if (hasProgressBarMeasurementRef.current && typeof pageX === "number") {
      const ratio = (pageX - progressBarPageXRef.current) / width;
      return Math.max(0, Math.min(1, ratio));
    }

    const x = evt?.nativeEvent?.locationX ?? 0;
    const ratio = x / width;
    return Math.max(0, Math.min(1, ratio));
  }, []);

  const seekToScrubPosition = useCallback(
    async (ratio: number) => {
      if (!status?.isLoaded || !status.durationMillis) return;

      const { player } = usePlayerStore.getState();
      if (!player) return;

      const newPositionMs = ratio * status.durationMillis;
      try {
        player.currentTime = newPositionMs / 1000;
        player.play();
      } catch {
        // 忽略：轮询会在下一次更新状态
      }

      // 立即同步 UI，避免松手后短暂回跳
      usePlayerStore.setState((state) => ({
        status: state.status ? { ...state.status, positionMillis: newPositionMs, isPlaying: true } : state.status,
        progressPosition: ratio,
      }));
    },
    [status?.durationMillis, status?.isLoaded]
  );

  const panResponder = useMemo(() => {
    if (!isTouchDevice) return null;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        onInteractionStart?.();
        setIsScrubbing(true);
        const ratio = getScrubPosition(evt);
        setScrubPosition(ratio);

        const pageX = evt?.nativeEvent?.pageX;
        const container = progressBarContainerRef.current;
        if (container && typeof pageX === "number") {
          const startPageX = pageX;
          container.measureInWindow((x, _y, width) => {
            progressBarPageXRef.current = x;
            if (width) {
              progressBarWidthRef.current = width;
              hasProgressBarMeasurementRef.current = true;
            }
            if (width) {
              const adjustedRatio = Math.max(0, Math.min(1, (startPageX - x) / width));
              setScrubPosition(adjustedRatio);
            }
          });
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const ratio = getScrubPosition(evt, gestureState);
        setScrubPosition(ratio);
      },
      onPanResponderRelease: async (evt, gestureState) => {
        const ratio = getScrubPosition(evt, gestureState);
        setScrubPosition(ratio);
        setIsScrubbing(false);
        onInteractionEnd?.();
        onUserActivity?.();
        await seekToScrubPosition(ratio);
      },
      onPanResponderTerminate: async (evt, gestureState) => {
        const ratio = getScrubPosition(evt, gestureState);
        setScrubPosition(ratio);
        setIsScrubbing(false);
        onInteractionEnd?.();
        onUserActivity?.();
        await seekToScrubPosition(ratio);
      },
      onShouldBlockNativeResponder: () => true,
    });
  }, [getScrubPosition, isTouchDevice, onInteractionEnd, onInteractionStart, onUserActivity, seekToScrubPosition]);

  const displayedProgressPosition = isTouchDevice ? (isScrubbing ? scrubPosition : progressPosition) : isSeeking ? seekPosition : progressPosition;
  const durationMillis = status?.durationMillis || 0;
  const displayedPositionMillis =
    isTouchDevice && isScrubbing && status?.isLoaded && durationMillis ? displayedProgressPosition * durationMillis : status?.positionMillis || 0;

  const onPlayNextEpisode = () => {
    if (hasNextEpisode) {
      playEpisode(currentEpisodeIndex + 1);
    }
  };

  const runWithActivity = (action: () => void | Promise<void>) => () => {
    onUserActivity?.();
    void action();
  };

  const overlayStyle = useMemo(() => {
    if (!isTouchDevice) return styles.controlsOverlay;

    return [
      styles.controlsOverlay,
      {
        paddingTop: 20 + insets.top,
        paddingBottom: 20 + insets.bottom,
        paddingLeft: 20 + insets.left,
        paddingRight: 20 + insets.right,
      },
    ];
  }, [insets.bottom, insets.left, insets.right, insets.top, isTouchDevice]);

  return (
    <View style={overlayStyle} pointerEvents="box-none">
      <View style={styles.topControls}>
        {isTouchDevice && (
          <View style={styles.topSideContainerLeft}>
            <StyledButton
              variant="ghost"
              onPress={runWithActivity(() => {
                onBack?.();
              })}
              buttonStyle={styles.topIconButton}
              accessibilityLabel="返回"
            >
              <ArrowLeft color="white" size={22} />
            </StyledButton>
          </View>
        )}
        <Text style={styles.controlTitle}>
          {videoTitle} {currentEpisodeTitle ? `- ${currentEpisodeTitle}` : ""}{" "}
          {currentSourceName ? `(${currentSourceName})` : ""}
        </Text>
        {isTouchDevice && (
          <View style={styles.topSideContainerRight}>
            <StyledButton
              variant="ghost"
              onPress={() => {
                onPiPPress?.();
              }}
              buttonStyle={styles.topIconButton}
              accessibilityLabel="画中画"
            >
              <PictureInPicture2 color="white" size={20} />
            </StyledButton>
            <StyledButton
              variant="ghost"
              onPress={runWithActivity(() => {
                onToggleVideoFit?.();
              })}
              buttonStyle={styles.topIconButton}
              accessibilityLabel={isVideoFitCover ? "恢复原始画面" : "画面填充屏幕"}
            >
              {isVideoFitCover ? <Shrink color="white" size={20} /> : <Expand color="white" size={20} />}
            </StyledButton>
            <StyledButton
              variant="ghost"
              onPress={() => {
                onToggleOrientation?.();
              }}
              buttonStyle={styles.topIconButton}
              accessibilityLabel="切换横竖屏"
            >
              {isLandscape ? <RectangleVertical color="white" size={20} /> : <RectangleHorizontal color="white" size={20} />}
            </StyledButton>
          </View>
        )}
      </View>

      <View style={styles.bottomControlsContainer}>
        <View
          style={styles.progressBarContainer}
          ref={progressBarContainerRef}
          onLayout={(e) => {
            progressBarWidthRef.current = e.nativeEvent.layout.width;
            const container = progressBarContainerRef.current;
            if (!container) return;
            requestAnimationFrame(() => {
              container.measureInWindow((x, _y, width) => {
                progressBarPageXRef.current = x;
                if (width) {
                  progressBarWidthRef.current = width;
                  hasProgressBarMeasurementRef.current = true;
                }
              });
            });
          }}
        >
          <View style={styles.progressBarBackground} />
          <View
            style={[
              styles.progressBarFilled,
              {
                width: `${displayedProgressPosition * 100}%`,
              },
            ]}
          />
          <View
            collapsable={false}
            style={styles.progressBarTouchable}
            {...(panResponder ? panResponder.panHandlers : {})}
          />
        </View>

        <ThemedText style={{ color: "white", marginTop: 5 }}>
          {status?.isLoaded
            ? `${formatTime(displayedPositionMillis)} / ${formatTime(durationMillis)}`
            : "00:00 / 00:00"}
        </ThemedText>

        <View style={styles.bottomControls}>
          <MediaButton onPress={runWithActivity(setIntroEndTime)} timeLabel={introEndTime ? formatTime(introEndTime) : undefined}>
            <ArrowDownToDot color="white" size={24} />
          </MediaButton>

          <MediaButton onPress={runWithActivity(togglePlayPause)} hasTVPreferredFocus={showControls}>
            {status?.isLoaded && status.isPlaying ? (
              <Pause color="white" size={24} />
            ) : (
              <Play color="white" size={24} />
            )}
          </MediaButton>

          <MediaButton onPress={runWithActivity(onPlayNextEpisode)} disabled={!hasNextEpisode}>
            <SkipForward color={hasNextEpisode ? "white" : "#666"} size={24} />
          </MediaButton>

          <MediaButton onPress={runWithActivity(setOutroStartTime)} timeLabel={outroStartTime ? formatTime(outroStartTime) : undefined}>
            <ArrowUpFromDot color="white" size={24} />
          </MediaButton>

          <MediaButton onPress={runWithActivity(() => setShowEpisodeModal(true))}>
            <List color="white" size={24} />
          </MediaButton>

          <MediaButton onPress={runWithActivity(() => setShowSpeedModal(true))} timeLabel={playbackRate !== 1.0 ? `${playbackRate}x` : undefined}>
            <Gauge color="white" size={24} />
          </MediaButton>

          <MediaButton onPress={runWithActivity(() => setShowSourceModal(true))}>
            <Tv color="white" size={24} />
          </MediaButton>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "space-between",
    padding: 20,
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topSideContainerLeft: {
    width: 96,
    alignItems: "flex-start",
  },
  topSideContainerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topIconButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 44,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  controlTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  bottomControlsContainer: {
    width: "100%",
    alignItems: "center",
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 15,
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    position: "relative",
    marginTop: 10,
  },
  progressBarBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
  },
  progressBarFilled: {
    position: "absolute",
    left: 0,
    height: 8,
    backgroundColor: "#fff",
    borderRadius: 4,
  },
  progressBarTouchable: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 30,
    top: -10,
    zIndex: 10,
  },
  controlButton: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  topRightContainer: {
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44, // Match TouchableOpacity default size for alignment
  },
  resolutionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
