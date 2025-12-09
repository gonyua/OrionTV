import React from "react";
import { View, StyleSheet, ActivityIndicator, ScrollView, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { BoxOfficeItem, BoxOfficeResponse } from "@/services/api";
import { Colors } from "@/constants/Colors";

interface BoxOfficeSidebarProps {
  globalBoxOffice: BoxOfficeResponse | null;
  chinaBoxOffice: BoxOfficeResponse | null;
  loading: boolean;
  error: string | null;
}

const BoxOfficeSidebar: React.FC<BoxOfficeSidebarProps> = ({
  globalBoxOffice,
  chinaBoxOffice,
  loading,
  error,
}) => {
  const router = useRouter();
  const { spacing, deviceType } = useResponsiveLayout();

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingLeft: spacing,
          paddingRight: spacing,
          paddingVertical: spacing,
          borderLeftWidth: deviceType === "mobile" ? 0 : StyleSheet.hairlineWidth,
          borderLeftColor: "rgba(255,255,255,0.1)",
        },
        scrollContainer: {
          flex: 1,
        },
        section: {
          marginBottom: spacing,
        },
        sectionHeader: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: spacing / 2,
        },
        sectionTitle: {
          fontSize: deviceType === "mobile" ? 16 : 18,
          fontWeight: "600",
        },
        sectionSubTitle: {
          marginLeft: spacing / 2,
          fontSize: 12,
          color: "#999",
        },
        itemRow: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: spacing,
          borderRadius: 6,
        },
        itemRowFocused: {
          backgroundColor: "rgba(255,255,255,0.06)",
        },
        rank: {
          width: 30,
          textAlign: "center",
          fontWeight: "600",
        },
        rankTop: {
          color: "#f96518",
        },
        itemContent: {
          flex: 1,
          marginLeft: spacing,
        },
        itemTitle: {
          fontSize: deviceType === "mobile" ? 13 : 14,
          marginBottom: 1,
          lineHeight: deviceType === "mobile" ? 16 : 18,
        },
        itemMeta: {
          fontSize: 11,
          color: "#aaa",
          marginTop: 0,
          lineHeight: 14,
        },
        grossText: {
          marginLeft: spacing / 2,
          minWidth: 68,
          textAlign: "right",
          fontSize: 12,
          color: "#f96518",
        },
        loadingContainer: {
          paddingVertical: spacing,
          alignItems: "center",
          justifyContent: "center",
        },
        errorText: {
          fontSize: 12,
          color: "#f96518",
        },
      }),
    [deviceType, spacing]
  );

  const formatGrossInYi = (item: BoxOfficeItem) => {
    if (typeof item.grossWan !== "number" || Number.isNaN(item.grossWan)) {
      return "";
    }
    const yi = item.grossWan / 10000;
    if (!Number.isFinite(yi)) {
      return "";
    }
    return `${yi.toFixed(2)}亿`;
  };

  const handleItemPress = (item: BoxOfficeItem) => {
    if (!item.title) return;
    router.push({
      pathname: "/detail",
      params: { source: "douban", q: item.title },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  const renderSection = (data: BoxOfficeResponse | null, fallbackTitle: string) => {
    if (!data || !data.list || data.list.length === 0) {
      return null;
    }
    const items = data.list;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>{data.yearLabel || fallbackTitle}</ThemedText>
          {data.updateTime ? (
            <ThemedText style={styles.sectionSubTitle}>{data.updateTime}</ThemedText>
          ) : null}
        </View>
        {items.map((item, index) => (
          <Pressable
            key={`${data.yearLabel}-${item.rank}-${item.title}`}
            onPress={() => handleItemPress(item)}
            focusable
            hasTVPreferredFocus={deviceType === "tv" && index === 0}
            android_ripple={
              Platform.isTV || deviceType !== "tv"
                ? { color: "transparent" }
                : { color: Colors.dark.link }
            }
            style={({ pressed, focused }) => [
              styles.itemRow,
              (pressed || focused) && styles.itemRowFocused,
            ]}
          >
            <ThemedText style={[styles.rank, item.rank <= 3 ? styles.rankTop : null]}>
              {item.rank}
            </ThemedText>
            <View style={styles.itemContent}>
              <ThemedText numberOfLines={1} style={styles.itemTitle}>
                {item.title}
              </ThemedText>
              {(item.year || item.genre) && (
                <ThemedText numberOfLines={1} style={styles.itemMeta}>
                  {item.year || ""}
                  {item.year && item.genre ? " · " : ""}
                  {item.genre || ""}
                </ThemedText>
              )}
            </View>
            <ThemedText numberOfLines={1} style={styles.grossText}>
              {formatGrossInYi(item)}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        {renderSection(globalBoxOffice, "全球电影票房排行榜")}
        {renderSection(chinaBoxOffice, "中国电影票房总榜")}
      </View>
    </ScrollView>
  );
};

export default BoxOfficeSidebar;
