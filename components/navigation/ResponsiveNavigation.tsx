import React from 'react';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import TabletSidebarNavigator from './TabletSidebarNavigator';

interface ResponsiveNavigationProps {
  children: React.ReactNode;
}

const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({ children }) => {
  const { deviceType } = useResponsiveLayout();

  switch (deviceType) {
    case 'mobile':
      // 移动端由 `app/(tabs)/_layout.tsx` 的 `<Tabs>` 负责底部导航与保活
      return <>{children}</>;
    
    case 'tablet':
      return (
        <TabletSidebarNavigator>
          {children}
        </TabletSidebarNavigator>
      );
    
    case 'tv':
    default:
      // TV端保持原有的Stack导航，不需要额外的导航容器
      return <>{children}</>;
  }
};

export default ResponsiveNavigation;
