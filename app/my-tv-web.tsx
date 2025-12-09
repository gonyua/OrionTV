import React, { useRef, useState, useCallback } from "react";
import { BackHandler, Platform, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter, useFocusEffect } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";

// 使用 PC 端入口地址，而不是移动/客户端入口
const YANGSHIPIN_CCTV1_URL = "https://www.yangshipin.cn/tv/home";

// 模拟桌面浏览器的 User-Agent，强制走 PC 站点逻辑
const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export default function MyTvWebScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (webViewRef.current && canGoBack) {
          webViewRef.current.goBack();
          return true;
        }
        router.back();
        return true;
      };

      if (Platform.OS === "android") {
        BackHandler.addEventListener("hardwareBackPress", onBackPress);
      }

      return () => {
        if (Platform.OS === "android") {
          BackHandler.removeEventListener("hardwareBackPress", onBackPress);
        }
      };
    }, [canGoBack, router])
  );

  return (
    <ThemedView style={[commonStyles.container, styles.container]}>
      <WebView
        ref={webViewRef}
        source={{ uri: YANGSHIPIN_CCTV1_URL }}
        style={styles.webview}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        userAgent={DESKTOP_USER_AGENT}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  webview: {
    flex: 1,
  },
});
