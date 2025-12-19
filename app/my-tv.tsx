import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { StyledButton } from "@/components/StyledButton";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getCommonResponsiveStyles } from "@/utils/ResponsiveStyles";
import ResponsiveNavigation from "@/components/navigation/ResponsiveNavigation";
import ResponsiveHeader from "@/components/navigation/ResponsiveHeader";
import { CCTV_CHANNELS } from "@/constants/CctvChannels";

export default function MyTvScreen() {
  const router = useRouter();
  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType, spacing } = responsiveConfig;

  const handleOpenWebView = (pid: string) => {
    router.push({
      pathname: "/my-tv-web",
      params: { pid },
    });
  };

  const dynamicStyles = createStyles(spacing);

  const content = (
    <ThemedView style={[commonStyles.container, dynamicStyles.container]}>

      <View style={dynamicStyles.channelBar}>
        {CCTV_CHANNELS.map((channel, index) => (
          <StyledButton
            key={channel.id}
            text={channel.name}
            onPress={() => handleOpenWebView(channel.pid)}
            isSelected={false}
            hasTVPreferredFocus={deviceType === "tv" && index === 0}
            style={dynamicStyles.channelButton}
            textStyle={dynamicStyles.channelButtonText}
          />
        ))}
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
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      alignContent: 'flex-start',
      paddingVertical: spacing * 2,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    channelButton: {
      width: spacing * 20,
      height: spacing * 6,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing,
      marginVertical: spacing,
    },
    channelButtonText: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#fff',
      textAlign: 'left',
    },
  });
