import React, { useRef, useState, useCallback, useMemo } from "react";
import { BackHandler, Platform, StyleSheet, useTVEventHandler, HWEvent } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";
import { CCTV_CHANNELS, findCctvIndexByPid } from "@/constants/CctvChannels";

// PC 端入口基础地址
const YANGSHIPIN_BASE_URL = "https://www.yangshipin.cn/tv/home";

// 模拟桌面浏览器的 User-Agent，强制走 PC 站点逻辑
const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export default function MyTvWebScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType } = responsiveConfig;

  const params = useLocalSearchParams<{ pid?: string }>();
  const initialPid = useMemo(() => {
    const pidParam = params.pid;
    if (Array.isArray(pidParam)) {
      return pidParam[0];
    }
    return pidParam;
  }, [params.pid]);

  const initialIndex = useMemo(() => {
    const idx = findCctvIndexByPid(initialPid || undefined);
    return idx >= 0 ? idx : 0;
  }, [initialPid]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const currentChannel = CCTV_CHANNELS[currentIndex] ?? CCTV_CHANNELS[0];
  const currentUrl = `${YANGSHIPIN_BASE_URL}?pid=${currentChannel.pid}`;

  const changeChannel = useCallback(
    (direction: "next" | "prev") => {
      setCurrentIndex((prev) => {
        if (direction === "next") {
          return (prev + 1) % CCTV_CHANNELS.length;
        }
        return (prev - 1 + CCTV_CHANNELS.length) % CCTV_CHANNELS.length;
      });
    },
    []
  );

  const handleTVEvent = useCallback(
    (event: HWEvent) => {
      if (deviceType !== "tv") return;
      if (event.eventType === "up") {
        changeChannel("prev");
      } else if (event.eventType === "down") {
        changeChannel("next");
      }
    },
    [changeChannel, deviceType]
  );

  useTVEventHandler(deviceType === "tv" ? handleTVEvent : () => { });

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
        source={{ uri: currentUrl }}
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
