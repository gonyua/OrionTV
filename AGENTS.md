# Repository Guidelines

## Project Structure & Module Organization

- 源码入口在 `app/`，使用 `expo-router` 按路由组织 TV 页面（如 `index.tsx`、`detail.tsx`、`live.tsx` 等）。
- 复用 UI 组件在 `components/`，通用逻辑在 `hooks/`，业务接口与系统能力在 `services/`，状态通过 `stores/` 中的 Zustand store 管理。
- 工具与样式辅助在 `utils/`，静态资源在 `assets/`，平台配置在 `xml/`，额外文档在 `docs/`。

## Build, Test, and Development Commands

- 开发调试：`yarn start` 在本地启动 Expo 开发服务器；`yarn android` / `yarn ios` 在对应平台上运行 TV 应用。
- 预构建与打包：`yarn prebuild` 生成原生工程并同步 `xml/` 配置；`yarn build` 生成 Android release 包；`yarn build-debug` 生成 debug 包。
- 质量检查：`yarn test` 交互式运行 Jest；`yarn test-ci` 在 CI 中运行并输出覆盖率；`yarn lint` 运行 ESLint；`yarn typecheck` 执行 TypeScript 类型检查。

## Coding Style & Naming Conventions

- 主要使用 TypeScript（`.ts`/`.tsx`），缩进为 2 空格，统一使用单引号与分号。
- React 组件使用大驼峰命名（如 `ThemedText`、`LivePlayer`），hook 以 `use` 前缀命名（如 `useResponsiveLayout`）。
- 文件应放在对应领域目录，例如新状态放入 `stores/`，新网络逻辑放入 `services/`。

## Testing Guidelines

- 使用 Jest 与 `jest-expo`，测试文件放在就近的 `__tests__/` 目录，命名如 `DeviceUtils.test.ts` 或 `ThemedText-test.tsx`。
- 新功能应至少包含一个单元测试或快照测试；变更公共工具或样式时更新相关快照。
- 在提交前本地运行 `yarn test`，CI 会使用 `yarn test-ci` 验证覆盖率。

## Commit & Pull Request Guidelines

- 建议使用简短英文前缀，如 `feat: add live filter`、`fix: tv focus issue`，描述清晰、聚焦单一改动。
- 提交 PR 时请附上变更说明、相关 issue 编号（如 `#123`）、关键 UI 的截图（可参考 `screenshot/`）以及测试执行结果。

## Agent-Specific Instructions

- 自动代理在修改本仓库代码时，应遵循本文件约定，优先保持现有风格与目录结构，不引入不必要的新依赖。
- 回答与文档优先使用中文；如在子目录存在额外 `AGENTS.md`，请同时遵守更细粒度的说明。

