# OrionTV 📺

一个基于 React Native TVOS 和 Expo 构建的播放器，旨在提供流畅的视频观看体验。

## ✨ 功能特性

- **框架跨平台支持**: 同时支持构建 Apple TV 和 Android TV。
- **现代化前端**: 使用 Expo、React Native TVOS 和 TypeScript 构建，性能卓越。
- **Expo Router**: 基于文件系统的路由，使导航逻辑清晰简单。
- **TV 优化的 UI**: 专为电视遥控器交互设计的用户界面。

## 🛠️ 技术栈

- **前端**:
  - [React Native TVOS](https://github.com/react-native-tvos/react-native-tvos)
  - [Expo](https://expo.dev/) (~51.0)
  - [Expo Router](https://docs.expo.dev/router/introduction/)
  - [Expo AV](https://docs.expo.dev/versions/latest/sdk/av/)
  - TypeScript

## 📂 项目结构

本项目采用类似 monorepo 的结构：

```
.
├── app/              # Expo Router 路由和页面
├── assets/           # 静态资源 (字体, 图片, TV 图标)
├── components/       # React 组件
├── constants/        # 应用常量 (颜色, 样式)
├── hooks/            # 自定义 Hooks
├── services/         # 服务层 (API, 存储)
├── package.json      # 前端依赖和脚本
└── ...
```

## 🚀 快速开始

### 环境准备

请确保您的开发环境中已安装以下软件：

- [Node.js](https://nodejs.org/) (LTS 版本)
- [Yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Xcode](https://developer.apple.com/xcode/) (用于 Apple TV 开发)
- [Android Studio](https://developer.android.com/studio) (用于 Android TV 开发)

### 项目启动

接下来，在项目根目录运行前端应用：

```sh

# 安装依赖
yarn

# [首次运行或依赖更新后] 生成原生项目文件
# 这会根据 app.json 中的配置修改原生代码以支持 TV
yarn prebuild-tv

# 运行在 Apple TV 模拟器或真机上
yarn ios-tv

# 运行在 Android TV 模拟器或真机上
yarn android-tv
```

## 使用

- 1.2.x 以上版本需配合 [MoonTV](https://github.com/senshinya/MoonTV) 使用。


## 📜 主要脚本

- `yarn start`: 在手机模式下启动 Metro Bundler。
- `yarn start-tv`: 在 TV 模式下启动 Metro Bundler。
- `yarn ios-tv`: 在 Apple TV 上构建并运行应用。
- `yarn android-tv`: 在 Android TV 上构建并运行应用。
- `yarn prebuild-tv`: 为 TV 构建生成原生项目文件。
- `yarn lint`: 检查代码风格

## 📝 License

本项目采用 MIT 许可证。

## ⚠️ 免责声明

OrionTV 仅作为视频搜索工具，不存储、上传或分发任何视频内容。所有视频均来自第三方 API 接口提供的搜索结果。如有侵权内容，请联系相应的内容提供方。

本项目开发者不对使用本项目产生的任何后果负责。使用本项目时，您必须遵守当地的法律法规。

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=zimplexing/OrionTV&type=Date)](https://www.star-history.com/#zimplexing/OrionTV&Date)

## 🙏 致谢

本项目受到以下开源项目的启发：

- [MoonTV](https://github.com/senshinya/MoonTV) - 一个基于 Next.js 的视频聚合应用
- [LibreTV](https://github.com/LibreSpark/LibreTV) - 一个开源的视频流媒体应用

感谢以下项目提供 API Key 的赞助

- [gpt-load](https://github.com/tbphp/gpt-load) - 一个高性能的 OpenAI 格式 API 多密钥轮询代理服务器，支持负载均衡，使用 Go 语言开发

• 是否为tv 平板 手机 是运行时取的，但有两种“来源”，不一样：

  1. deviceType（来自 useResponsiveLayout）

  - 运行时用 Dimensions.get('window') 拿屏幕宽高 + Platform.isTV。
  - 逻辑是：Platform.isTV 为真就当 TV，否则按宽度分 mobile/tablet/tv。
  - 所以它是根据屏幕尺寸推断，大屏平板/横屏 Web 也可能被判成 tv。

  2. isTVPlatform（process.env.EXPO_TV === "1"）

  - 这是构建/启动时写死的环境变量，不是设备实时检测。
  - 你在脚本里 EXPO_TV=1，它就认为是 TV 平台。

  简单说：

  - deviceType 是运行时根据屏幕“推断”。
  - EXPO_TV 是启动参数“声明”。
    如果你想严格区分真 TV，Platform.isTV 更靠谱；如果想靠屏幕大小做响应式，就用 deviceType。


  - Platform.isTV：React Native 的原生平台判断，只有真正的 tvOS / Android TV 才为 true。用来判断“是否真的 TV 设备”最靠谱。
  - deviceType：useResponsiveLayout 按屏幕宽度推断出来的类型（mobile/tablet/tv）。大屏平板、Web 全屏也可能被判成 tv，用于布局响应式，不保证是真的 TV。
  - isTVPlatform（process.env.EXPO_TV === '1'）：启动/构建时的开关，脚本里手动设定。用于“强制以 TV 模式运行”或控制 TV 相关逻辑，但不是设备检测。

  ⚠️ 重要警告 2（切换 TV / 非 TV 构建）

如果你：
	•	已生成 手机端原生目录
	•	又切换 EXPO_TV=true 或 isTV=true
	•	或反向从 TV 切回手机构建

👉 再次运行 npx expo prebuild 很容易导致 CocoaPods 错误
npx expo prebuild --clean’
官方说明：
https://docs.expo.dev/workflow/prebuild/#clean

⸻

Apple TV：React Native TV 是官方支持的；Expo 不是官方支持，但可以“有限使用”。


• 简单说：EXPO_TV=1 只在 生成原生工程（expo prebuild）时起作用。
- 不加 EXPO_TV=1：生成的是手机工程（Android phone / iOS）。
- 加了 EXPO_TV=1：生成的是TV 工程（Android TV / tvOS），会把原生配置改成 TV 需要的样子。
“改成 TV 形态”具体包括：
- Android：写入 Android TV 的 manifest 配置、TV banner 图、leanback 相关配置。
- iOS：写入 tvOS 的工程配置、Apple TV 的图标/Top Shelf 资源。
  这就像 Android 里：
  - 普通 build → 用手机的 AndroidManifest.xml
  - TV build → 用一套 TV 的 manifest + 资源

• 原理很简单：Expo 在 prebuild 时会执行“配置插件”，插件会直接读写原生工程文件。
  高层流程：
  1. expo prebuild 生成一套默认原生工程（android/、ios/）。
  2. 然后执行 app.json 里的每个 plugin。
  3. plugin 会用脚本去修改工程文件（Manifest、Gradle、Xcode 工程、资源文件等）。
  4. @react-native-tvos/config-tv 就是其中一个，它会根据 EXPO_TV 决定要不要改成 TV 配置。
  所以本质是：
  expo prebuild = 生成原生工程 + 运行一堆“自动改工程”的脚本。
  EXPO_TV=1 只是让这一个插件走“TV 改造”分支。

  • 在 node_modules 里，就是一个 Expo config plugin，不是 shell 脚本。入口和执行位置如下：

  - 插件入口：node_modules/@react-native-tvos/config-tv/app.plugin.js
    里面只是 require('./build/withTV')。
  - 核心逻辑：node_modules/@react-native-tvos/config-tv/build/withTV.js
    会根据开关决定是否执行 TV 改造。
  - 读取 EXPO_TV 的位置：node_modules/@react-native-tvos/config-tv/build/utils/config.js
    isTVEnabled() 里用 getenv('EXPO_TV') 判断。

  TV 改造具体脚本就是这些文件（被 withTV.js 调用）：

  - node_modules/@react-native-tvos/config-tv/build/withTVAndroidManifest.js
  - node_modules/@react-native-tvos/config-tv/build/withTVAndroidBannerImage.js
  - node_modules/@react-native-tvos/config-tv/build/withTVXcodeProject.js
  - node_modules/@react-native-tvos/config-tv/build/withTVInfoPlist.js
  - node_modules/@react-native-tvos/config-tv/build/withTVPodfile.js
  - node_modules/@react-native-tvos/config-tv/build/withTVAppleIconImages.js

  所以结论是：
  expo prebuild → 执行这些 JS 脚本 → 直接改 android/、ios/ 里的原生工程文件。
  EXPO_TV=1 就是让它走“TV 改造分支”。

  你贴的那段其实是 withTVXcodeProject.d.ts（类型声明文件），不是执行逻辑本身。
  它只是说明：这个模块的函数类型来自 expo/config-plugins。

  真正执行逻辑在：

  - node_modules/@react-native-tvos/config-tv/build/withTVXcodeProject.js

  里面会 require('expo/config-plugins')，用 Expo 提供的 API 去修改 Xcode 工程文件（比如 build settings、目标平台等）。

  所以结论是：
  是的，这个插件就是基于 expo/config-plugins 的 API 来修改原生工程的。
  如果你想看实际怎么改，我可以打开 withTVXcodeProject.js 给你看关键片段。

   App 启动
      ↓
  _layout.tsx (根布局)
      ↓
  loadSettings() ← settingsStore.ts
      ↓
  读取保存的 apiBaseUrl（服务器地址）
      ↓
  fetchServerConfig() ← 获取服务器配置
      ↓
  apiBaseUrl 变化触发 checkLoginStatus()
      ↓
  根据 serverConfig.StorageType 判断认证方式
      ↓
  确定登录状态 → 首页加载数据

  为什么需要这个流程？

  1. apiBaseUrl - 是连接后端服务器的地址，存在 settingsStore 中
  2. serverConfig - 包含服务器的认证配置（如 StorageType）
  3. 首页数据 - 需要从服务器获取，必须先确认：
    - 服务器地址是否有效
    - 用户是否已登录

  之前的问题

  时序问题：
  loadSettings() 执行:
    1. set({ apiBaseUrl })     ← 触发 checkLoginStatus
    2. fetchServerConfig()      ← 还没开始！

  checkLoginStatus 执行:
    - serverConfig = null
    - isLoadingServerConfig = false  ← 误以为加载完成
    - 显示错误提示！

  修复后

  loadSettings() 执行:
    1. set({ apiBaseUrl, isLoadingServerConfig: true })  ← 同时设置
    2. fetchServerConfig()

  checkLoginStatus 执行:
    - serverConfig = null
    - isLoadingServerConfig = true  ← 知道正在加载，会等待
    - 等待加载完成后再判断

  所以 settingsStore 是整个应用初始化的起点，它管理着服务器连接的核心配置。

 settingsStore 存储了服务器地址 (apiBaseUrl)

  启动流程：
  加载服务器地址 → 获取服务器配置 → 检查登录 → 显示首页

  之前的问题：
  - 服务器地址加载了，但服务器配置还没获取到
  - checkLoginStatus 就跑去检查了
  - 发现配置是空的，以为服务器不可用，就报错了

  修复：让它等配置加载完再检查，不要着急报错。


    1. 服务器地址加载 - settingsStore.ts:53-54
  set({
    apiBaseUrl: settings.apiBaseUrl,  // ← 这里设置了地址
    ...
  });

  2. checkLoginStatus 被触发 - _layout.tsx:44-48
  useEffect(() => {
    if (apiBaseUrl) {
      checkLoginStatus(apiBaseUrl);  // ← apiBaseUrl 一变化就跑来检查
    }
  }, [apiBaseUrl, checkLoginStatus]);

  3. 发现配置是空的就报错 - authStore.ts:54-60
  if (!serverConfig?.StorageType) {  // ← 配置是空的
    if (!settingsState.isLoadingServerConfig) {  // ← 以为不在加载中
      Toast.show({ type: "error", text1: "请检查网络或者服务器地址是否可用" });  // ← 报错
    }
    return;
  }

  修复 - settingsStore.ts:61
  set({
    apiBaseUrl: settings.apiBaseUrl,
    ...
    isLoadingServerConfig: true,  // ← 加了这个，告诉它"我正在加载，别急"
  });