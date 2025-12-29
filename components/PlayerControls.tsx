import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  Pause,
  Play,
  SkipForward,
  List,
  Tv,
  ArrowDownToDot,
  ArrowUpFromDot,
  Gauge,
  ArrowLeft,
  RectangleHorizontal,
  RectangleVertical,
} from "lucide-react-native";
import { ThemedText } from "@/components/ThemedText";
import { MediaButton } from "@/components/MediaButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyledButton } from "./StyledButton";

import usePlayerStore from "@/stores/playerStore";
import useDetailStore from "@/stores/detailStore";
import { useSources } from "@/stores/sourceStore";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

interface PlayerControlsProps {
  showControls: boolean;
  setShowControls: (show: boolean) => void;
  onUserActivity?: () => void;
  onBack?: () => void;
  isLandscape?: boolean;
  onToggleOrientation?: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  showControls,
  setShowControls,
  onUserActivity,
  onBack,
  isLandscape,
  onToggleOrientation,
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

  const { deviceType } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const isTouchDevice = deviceType !== "tv";

  const { detail } = useDetailStore();
  const resources = useSources();

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
    if (deviceType === "tv") return styles.controlsOverlay;

    return [
      styles.controlsOverlay,
      {
        paddingTop: 20 + insets.top,
        paddingBottom: 20 + insets.bottom,
        paddingLeft: 20 + insets.left,
        paddingRight: 20 + insets.right,
      },
    ];
  }, [deviceType, insets.bottom, insets.left, insets.right, insets.top]);

  return (
    <View style={overlayStyle}>
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
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground} />
          <View
            style={[
              styles.progressBarFilled,
              {
                width: `${(isSeeking ? seekPosition : progressPosition) * 100}%`,
              },
            ]}
          />
          <Pressable style={styles.progressBarTouchable} />
        </View>

        <ThemedText style={{ color: "white", marginTop: 5 }}>
          {status?.isLoaded
            ? `${formatTime(status.positionMillis)} / ${formatTime(status.durationMillis || 0)}`
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
    width: 96,
    alignItems: "flex-end",
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
