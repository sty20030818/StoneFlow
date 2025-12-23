# StoneFlow

StoneFlow 是一款正在开发中的轻量桌面任务管理工具，目标是让你用更少的操作把「收集 → 规划 → 执行 → 完成」串起来。

## 给用户看的（快速上手）

### 现在能做什么

- 在左侧导航切换页面：Today / Inbox / Projects / Finish / Settings
- 在 Settings 调整偏好：默认首页模式、信息密度、创建即开始（会自动保存）

### 怎么用

- **切换页面**：点击左侧导航
- **修改设置**：进入 Settings，修改后会自动保存；下次打开仍保留

### 数据与隐私

- 本地数据目前仅用于保存偏好设置（早期版本，后续会扩展到任务数据）
- 不会主动上传你的数据（如后续引入联网功能，会在此说明并提供开关）

### 下载与安装

暂未提供正式发布包；后续会在此补充下载方式与安装说明。

## 技术栈

- 前端：Vue 3 + Vite
- UI：Nuxt UI v4 + Tailwind CSS v4
- 状态：Pinia
- 桌面端：Tauri 2 + Rust
- 持久化（M0）：`@tauri-apps/plugin-store`

## 架构概览

- 前端按分层组织：页面（pages）/ 布局（layout）/ 状态（stores）/ Tauri 服务封装（services）
- Rust 侧入口保持精简：`main.rs` 仅调用库入口，业务能力以 `commands/*` 方式注册
- 权限采用最小化能力集（capabilities）：仅开放当前所需能力

## 开发命令

### 安装依赖

```bash
pnpm install
```

### 仅运行前端（浏览器）

```bash
pnpm dev
```

### 前端构建

```bash
pnpm build
```

### 运行桌面端（Tauri）

需要本机已安装 Rust（确保 `cargo` 可用）：

```bash
pnpm tauri dev
```

### 打包桌面端

```bash
pnpm tauri build
```
