import React, { useMemo } from "react";
import { View, Text, StyleSheet, Modal, FlatList, Pressable } from "react-native";
import { StyledButton } from "./StyledButton";
import useDetailStore from "@/stores/detailStore";
import usePlayerStore from "@/stores/playerStore";
import Logger from '@/utils/Logger';
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

const logger = Logger.withTag('SourceSelectionModal');

export const SourceSelectionModal: React.FC = () => {
  const { showSourceModal, setShowSourceModal, loadVideo, currentEpisodeIndex, status } = usePlayerStore();
  const { searchResults, detail, setDetail } = useDetailStore();
  const { deviceType, screenWidth, screenHeight } = useResponsiveLayout();
  const isTouchDevice = deviceType !== "tv";

  const numColumns = deviceType === "mobile" ? 2 : 3;

  const styles = useMemo(() => {
    if (!isTouchDevice) return tvStyles;

    const maxHeight = Math.min(screenHeight * 0.75, 520);
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
      sourceList: {
        justifyContent: "flex-start",
        paddingBottom: 16,
      },
      sourceItem: {
        flex: 1,
        paddingVertical: 10,
        margin: 6,
      },
      sourceItemText: {
        fontSize: 14,
      },
    });
  }, [isTouchDevice, screenWidth, screenHeight]);

  const onSelectSource = (index: number) => {
    logger.debug("onSelectSource", index, searchResults[index].source, detail?.source);
    if (searchResults[index].source !== detail?.source) {
      const newDetail = searchResults[index];
      setDetail(newDetail);
      
      // Reload the video with the new source, preserving current position
      const currentPosition = status?.isLoaded ? status.positionMillis : undefined;
      loadVideo({
        source: newDetail.source,
        id: newDetail.id.toString(),
        episodeIndex: currentEpisodeIndex,
        title: newDetail.title,
        position: currentPosition
      });
    }
    setShowSourceModal(false);
  };

  const onClose = () => {
    setShowSourceModal(false);
  };

  return (
    <Modal
      visible={showSourceModal}
      transparent={true}
      animationType="slide"
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {isTouchDevice && <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessible={false} />}
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>选择播放源</Text>
          <FlatList
            key={`source-columns-${numColumns}`}
            data={searchResults}
            numColumns={numColumns}
            style={{ flex: 1 }}
            contentContainerStyle={styles.sourceList}
            keyExtractor={(item, index) => `source-${item.source}-${index}`}
            renderItem={({ item, index }) => (
              <StyledButton
                text={item.source_name}
                onPress={() => onSelectSource(index)}
                isSelected={detail?.source === item.source}
                hasTVPreferredFocus={detail?.source === item.source}
                style={styles.sourceItem}
                textStyle={styles.sourceItemText}
              />
            )}
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
  sourceList: {
    justifyContent: "flex-start",
  },
  sourceItem: {
    flex: 1,
    paddingVertical: 2,
    margin: 4,
  },
  sourceItemText: {
    fontSize: 14,
  },
});
