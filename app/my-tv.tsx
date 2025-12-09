import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { StyledButton } from "@/components/StyledButton";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";
import ResponsiveNavigation from "@/components/navigation/ResponsiveNavigation";
import ResponsiveHeader from "@/components/navigation/ResponsiveHeader";

export default function MyTvScreen() {
  const router = useRouter();
  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType, spacing } = responsiveConfig;

  const handleOpenWebView = () => {
    router.push("/my-tv-web");
  };

  const dynamicStyles = createStyles(spacing);

  const content = (
    <ThemedView style={[commonStyles.container, dynamicStyles.container]}>

      <View style={dynamicStyles.channelBar}>
        {/* <StyledButton
          text="CCTV1"
          onPress={handlePlayCctv1}
          isSelected={currentStreamUrl != null}
          style={dynamicStyles.channelButton}
          textStyle={dynamicStyles.channelButtonText}
        /> */}
        <StyledButton
          text="开始"
          onPress={handleOpenWebView}
          isSelected={false}
          hasTVPreferredFocus
          style={[dynamicStyles.channelButton, dynamicStyles.startButton]}
          textStyle={dynamicStyles.channelButtonText}
        />
      </View>
    </ThemedView>
  );

  if (deviceType === 'tv') {
    return content;
  }

  return (
    <ResponsiveNavigation>
      <ResponsiveHeader title="我的电视" showBackButton />
      {content}
    </ResponsiveNavigation>
  );
}

const createStyles = (spacing: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    playerContainer: {
      flex: 1,
    },
    channelBar: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: spacing,
      paddingVertical: spacing / 2,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    channelButton: {
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing / 2,
    },
     startButton: {
       marginLeft: spacing,
     },
    channelButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
    },
  });
