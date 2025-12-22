import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { StyledButton } from '@/components/StyledButton';
import { useResponsiveLayout, DeviceType } from '@/hooks/useResponsiveLayout';
import { getCommonResponsiveStyles } from '@/utils/ResponsiveStyles';
import ResponsiveNavigation from '@/components/navigation/ResponsiveNavigation';
import ResponsiveHeader from '@/components/navigation/ResponsiveHeader';
import { CCTV_CHANNELS } from '@/constants/CctvChannels';

export default function MyTvScreen() {
  const router = useRouter();
  const responsiveConfig = useResponsiveLayout();
  const commonStyles = getCommonResponsiveStyles(responsiveConfig);
  const { deviceType, spacing, screenWidth } = responsiveConfig;

  const handleOpenWebView = (pid: string) => {
    router.push({
      pathname: '/my-tv-web',
      params: { pid },
    });
  };

  const dynamicStyles = createStyles(spacing, screenWidth, deviceType);

  const content = (
    <ThemedView style={[commonStyles.container, dynamicStyles.container]}>
      <View style={dynamicStyles.channelBar}>
        {CCTV_CHANNELS.map((channel, index) => (
          <StyledButton
            key={channel.id}
            text={channel.name}
            onPress={() => handleOpenWebView(channel.pid)}
            isSelected={false}
            hasTVPreferredFocus={deviceType === 'tv' && index === 0}
            style={dynamicStyles.channelButton}
            buttonStyle={dynamicStyles.channelButtonPressable}
            textStyle={dynamicStyles.channelButtonText}
            variant='primary'
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

const getButtonMetrics = (deviceType: DeviceType, spacing: number, screenWidth: number) => {
  const isTv = deviceType === 'tv';
  const baseWidth = isTv ? 180 : deviceType === 'tablet' ? 160 : 150;
  const buttonWidth = Math.max(120, Math.min(baseWidth, screenWidth - spacing * 4));
  const buttonHeight = isTv ? 64 : 52;
  const gap = isTv ? Math.max(spacing, 12) : Math.max(spacing * 0.75, 10);

  return { buttonWidth, buttonHeight, gap };
};

const createStyles = (spacing: number, screenWidth: number, deviceType: DeviceType) => {
  const { buttonWidth, buttonHeight, gap } = getButtonMetrics(deviceType, spacing, screenWidth);
  const horizontalPadding = deviceType === 'tv' ? spacing * 2 : spacing * 1.5;

  return StyleSheet.create({
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
      paddingHorizontal: horizontalPadding,
      paddingVertical: spacing * 2,
      backgroundColor: 'rgba(12, 14, 18, 0.92)',
      borderTopWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    channelButton: {
      marginRight: gap,
      marginBottom: gap,
    },
    channelButtonPressable: {
      width: buttonWidth,
      height: buttonHeight,
      paddingHorizontal: spacing,
      paddingVertical: 0,
      borderRadius: deviceType === 'tv' ? 14 : 10,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.16)',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    channelButtonText: {
      fontSize: deviceType === 'tv' ? 20 : 16,
      fontWeight: '600',
      color: '#f2f4f7',
      textAlign: 'center',
      letterSpacing: 0.3,
    },
  });
};
