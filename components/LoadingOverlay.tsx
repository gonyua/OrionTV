import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/Colors";

interface LoadingOverlayProps {
  visible: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible }) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});
