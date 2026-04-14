# StoneFlow 前端架构说明

本文档是 `src/` 目录下前端代码的唯一结构规范。以后新增功能、重构旧功能、拆组件、落状态、写技术适配时，都以这份文档为准。

## 1. 顶层结构

当前前端源码统一收敛为以下顶层层级：

```txt
src/
├── app/         # 应用装配层
├── pages/       # 路由入口层
├── features/    # 业务功能层
├── shared/      # 纯共享层
├── infra/       # 技术适配层
├── i18n/        # 国际化资源与初始化
├── assets/      # 静态资源
├── styles/      # 全局样式
└── vite-env.d.ts
```

核心原则只有一句话：

- `app` 负责装配
- `pages` 负责入口
- `features` 负责业务
- `shared` 负责纯复用
- `infra` 负责和外部世界打交道

## 2. 各层职责

### 2.1 `app/`

`app` 只放应用级装配代码，不放具体业务规则。

适合放进 `app` 的内容：

- 启动流程：`bootstrap`、`startup`
- 路由实例：`app/router`
- provider 安装：Pinia、i18n、query runtime
- 应用布局：`app/layout`
- 应用级逻辑：`app/logic`
- 布局头部系统：`app/layout/header`
- 全局 overlays：命令面板、全局 modal、全局通知容器
- 少量真正全局的 store

不适合放进 `app` 的内容：

- 资产库编辑逻辑
- 任务看板逻辑
- 远程同步业务规则
- 评审统计逻辑

### 2.2 `pages/`

`pages` 是路由页入口层，必须尽量薄。

页面组件只负责：

- 接路由
- 挂载 feature scene
- 做少量路由参数适配

页面组件不负责：

- 直接访问 `infra`
- 写大块业务逻辑
- 持有复杂页面状态
- 承担大面积样式与界面实现

推荐形态：

```vue
<template>
	<SomePageScene />
</template>

<script setup lang="ts">
	import SomePageScene from '@/features/some-feature/ui/SomePageScene.vue'
</script>
```

### 2.3 `features/`

`features` 是唯一业务主战场。以后新增功能，优先思考“它属于哪个 feature”，而不是“它是组件、store 还是 composable”。

当前推荐业务套件：

```txt
features/
├── workspace/
├── assets/
├── settings/
├── review/
└── system/
```

常见子 feature 例子：

- `features/workspace/task-board`
- `features/workspace/project-view`
- `features/workspace/project-tree`
- `features/workspace/create-flow`
- `features/workspace/trash`
- `features/assets/vault`
- `features/assets/notes`
- `features/assets/snippets`
- `features/assets/diary`
- `features/settings/appearance`
- `features/settings/about`
- `features/settings/remote-sync`
- `features/review/logs`
- `features/review/stats`
- `features/review/finish-list`
- `features/system/updater`

### 2.4 `shared/`

`shared` 只放跨多个 feature 复用、且不带明显业务语义的稳定能力。

适合放进 `shared` 的内容：

- 基础 UI 组件
- 通用 composables
- 全局 config
- 纯工具函数
- 通用类型
- query 基础设施

不适合放进 `shared` 的内容：

- `remote-sync`
- `vault`
- `task`
- `project`
- `review`

如果一个模块名字里已经带有明确业务词，默认不应该进入 `shared`。

### 2.5 `infra/`

`infra` 是技术适配层，不是业务层。

它只回答“怎么做”，不回答“为什么做”。

适合放进 `infra` 的内容：

- `infra/api`：Tauri invoke 形式的 API 适配
- `infra/tauri`：store、stronghold、system actions、底层 invoke
- `infra/sync`：远程同步 transport、协调器
- `infra/crypto`：加解密工具

不适合放进 `infra` 的内容：

- 页面编排
- feature 业务判断
- UI 状态
- 表单交互逻辑

## 3. feature 内部结构

单个子 feature 默认使用下面的骨架：

```txt
<feature>/
├── model/
├── logic/
├── ui/
└── index.ts
```

### 3.1 `model/`

放：

- 领域类型
- DTO 到领域模型的映射
- 领域常量
- 稳定契约

不要放：

- 组件
- Tauri 调用
- 页面交互逻辑

### 3.2 `logic/`

放：

- 业务逻辑
- 页面编排逻辑
- useXxx composables
- 提交、加载、筛选、同步、导入导出等流程

命名规则：

- 目录名统一叫 `logic`
- 文件名继续使用 Vue 习惯的 `useXxx.ts`

例如：

- `useAssetsVaultPage.ts`
- `useRemoteSyncOverview.ts`
- `useCreateTaskModal.ts`

### 3.3 `ui/`

放：

- 页面 scene
- 业务组件
- feature 私有弹窗
- feature 私有卡片、列表、分区组件

如果 UI 很复杂，可以只在 `ui/` 下面继续拆，不允许重新长出顶层 `components/` 或 `pages/` 思维。

例如：

```txt
ui/
├── AssetsVaultPageScene.vue
├── partials/
└── CreateTaskModal/
```

### 3.4 `index.ts`

`index.ts` 只做白名单导出。

规则：

- 允许显式导出稳定接口
- 禁止 `export *`
- 禁止把整个内部结构一股脑暴露

## 4. 状态管理规则

默认优先级：

1. 组件局部状态
2. feature 内 `logic/useXxx.ts`
3. feature 内 `store.ts`
4. `app/stores/*`

只有在以下情况才使用 Pinia：

- 跨多个兄弟组件共享
- 跨页面共享
- 需要持久化
- 明确属于全局应用状态

约束：

- 全局应用状态进 `app/stores`
- feature 专属状态进 `features/**/store.ts` 或 `features/**/store/*`
- 不允许再恢复顶层 `src/stores` 杂货铺

## 5. 导入边界规则

### 5.1 允许的依赖方向

允许：

- `pages -> features`
- `pages -> app`
- `features -> shared`
- `features -> infra`
- `app -> shared`
- `app -> features`

谨慎使用：

- `feature A -> feature B`

只有在存在明确稳定公开接口时才允许跨 feature 依赖。

### 5.2 禁止的依赖方向

禁止：

- `pages -> infra` 直接调用
- `shared -> features`
- `shared -> app`
- `infra -> features`
- 直接穿透别的 feature 内部私有目录

## 6. 新增功能时怎么判断落点

新增功能时，按下面顺序判断：

1. 它属于哪个业务套件？
2. 它属于哪个子 feature？
3. 它是 `model`、`logic` 还是 `ui`？
4. 它是不是纯共享能力？
5. 它是不是技术适配？

### 例子 1：新增“任务批量归档”

应优先放：

```txt
features/workspace/task-board/
├── logic/useTaskBatchArchive.ts
├── ui/TaskBatchActions.vue
└── model/
```

如果要调 Tauri：

```txt
infra/api/tasks.ts
```

### 例子 2：新增“更新器下载进度提示”

应优先放：

```txt
features/system/updater/
├── logic/useUpdater.ts
└── ui/UpdateNotification.vue
```

### 例子 3：新增“一个新的通用日期输入壳”

应优先放：

```txt
shared/ui/base/
```

## 7. 常见反例

以下写法一律视为坏味道：

- 在 `pages` 里写 300 行以上业务编排
- 在 `shared` 里放 `remote-sync`、`vault`、`task` 相关逻辑
- 在 feature 的 UI 组件里直接调用 `infra`
- 在 `app` 里写业务规则
- 用 `export *` 暴露整个 feature 内部
- 重新引入顶层 `components/`、`stores/`、`services/`、`composables/` 作为主工作区

## 8. 旧目录到新目录映射

本次重构采用以下总体映射：

```txt
旧 -> 新
src/layouts              -> src/app/layout
src/startup              -> src/app/startup
src/router               -> src/app/router
src/services             -> src/infra
src/components           -> src/shared/ui 或具体 feature/ui
src/composables          -> src/shared/composables / src/app/composables / 具体 feature/logic
src/stores               -> src/app/stores 或具体 feature/store
src/config               -> src/shared/config
src/utils                -> src/shared/lib
src/types                -> src/shared/types
```

## 9. 当前实现上的约束说明

当前仓库已经完成第一阶段重组：

- 顶层目录已收敛为 `app + pages + features + shared + infra`
- 页面已下沉为 feature scene + 轻量 wrapper
- `services`、`stores`、`components`、`composables` 已拆回新结构

后续新增功能时，不允许再绕开这套结构回写旧模式。

## 10. 开发时的简版口诀

遇到新代码，先问自己四个问题：

1. 这是业务吗？
2. 这是技术适配吗？
3. 这是纯共享吗？
4. 这是应用装配吗？

答案分别对应：

- 业务：`features`
- 技术适配：`infra`
- 纯共享：`shared`
- 应用装配：`app`

如果它只是路由入口，就放 `pages`。
