import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Modal, FlatList, Pressable } from "react-native";
import { StyledButton } from "./StyledButton";
import usePlayerStore from "@/stores/playerStore";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

interface EpisodeSelectionModalProps {}

export const EpisodeSelectionModal: React.FC<EpisodeSelectionModalProps> = () => {
  const { showEpisodeModal, episodes, currentEpisodeIndex, playEpisode, setShowEpisodeModal } = usePlayerStore();

  const { deviceType, screenWidth, screenHeight } = useResponsiveLayout();
  const isTouchDevice = deviceType !== "tv";

  const [episodeGroupSize] = useState(30);
  const [selectedEpisodeGroup, setSelectedEpisodeGroup] = useState(() => Math.floor(currentEpisodeIndex / episodeGroupSize));

  useEffect(() => {
    setSelectedEpisodeGroup(Math.floor(currentEpisodeIndex / episodeGroupSize));
  }, [currentEpisodeIndex, episodeGroupSize]);

  const numColumns = deviceType === "mobile" ? 3 : deviceType === "tablet" ? 4 : 5;

  const styles = useMemo(() => {
    if (!isTouchDevice) {
      return tvStyles;
    }

    const maxHeight = Math.min(screenHeight * 0.75, 560);
    return StyleSheet.create({
      modalContainer: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      },
      modalContent: {
        width: screenWidth,
        height: maxHeight,
        backgroundColor: "rgba(0, 0, 0, 0.92)",
        padding: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      },
      modalTitle: {
        color: "white",
        marginBottom: 12,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "bold",
      },
      episodeList: {
        justifyContent: "flex-start",
        paddingBottom: 16,
      },
      episodeItem: {
        flex: 1,
        paddingVertical: 6,
        margin: 4,
      },
      episodeItemText: {
        fontSize: 14,
      },
      episodeGroupContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        paddingHorizontal: 10,
      },
      episodeGroupButton: {
        paddingHorizontal: 6,
        margin: 8,
      },
      episodeGroupButtonText: {
        fontSize: 12,
      },
    });
  }, [isTouchDevice, screenWidth, screenHeight]);

  const onSelectEpisode = (index: number) => {
    playEpisode(index);
    setShowEpisodeModal(false);
  };

  const onClose = () => {
    setShowEpisodeModal(false);
  };

  return (
    <Modal
      visible={showEpisodeModal}
      transparent={true}
      animationType="slide"
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {isTouchDevice && <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessible={false} />}
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>选择剧集</Text>

          {episodes.length > episodeGroupSize && (
            <View style={styles.episodeGroupContainer}>
              {Array.from({ length: Math.ceil(episodes.length / episodeGroupSize) }, (_, groupIndex) => (
                <StyledButton
                  key={groupIndex}
                  text={`${groupIndex * episodeGroupSize + 1}-${Math.min(
                    (groupIndex + 1) * episodeGroupSize,
                    episodes.length
                  )}`}
                  onPress={() => setSelectedEpisodeGroup(groupIndex)}
                  isSelected={selectedEpisodeGroup === groupIndex}
                  style={styles.episodeGroupButton}
                  textStyle={styles.episodeGroupButtonText}
                />
              ))}
            </View>
          )}
          <FlatList
            key={`episode-columns-${numColumns}`}
            data={episodes.slice(
              selectedEpisodeGroup * episodeGroupSize,
              (selectedEpisodeGroup + 1) * episodeGroupSize
            )}
            numColumns={numColumns}
            style={{ flex: 1 }}
            contentContainerStyle={styles.episodeList}
            keyExtractor={(_, index) => `episode-${selectedEpisodeGroup * episodeGroupSize + index}`}
            renderItem={({ item, index }) => {
              const absoluteIndex = selectedEpisodeGroup * episodeGroupSize + index;
              return (
                <StyledButton
                  text={item.title || `第 ${absoluteIndex + 1} 集`}
                  onPress={() => onSelectEpisode(absoluteIndex)}
                  isSelected={currentEpisodeIndex === absoluteIndex}
                  hasTVPreferredFocus={currentEpisodeIndex === absoluteIndex}
                  style={styles.episodeItem}
                  textStyle={styles.episodeItemText}
                />
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const tvStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  modalContent: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 600,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    padding: 20,
  },
  modalTitle: {
    color: "white",
    marginBottom: 12,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  episodeList: {
    justifyContent: "flex-start",
  },
  episodeItem: {
    flex: 1,
    paddingVertical: 2,
    margin: 4,
  },
  episodeItemText: {
    fontSize: 14,
  },
  episodeGroupContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  episodeGroupButton: {
    paddingHorizontal: 6,
    margin: 8,
  },
  episodeGroupButtonText: {
    fontSize: 12,
  },
});
