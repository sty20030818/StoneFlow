# Feature 套件迁移映射

本文记录本次 feature 套件重构后的正式目录映射、公开入口约束与破坏性变更清单。

## 最终套件结构

```txt
src/features
├── workspace
│   ├── shared
│   ├── tasks
│   ├── projects
│   ├── spaces
│   └── index.ts
├── assets
│   ├── shared
│   ├── diary
│   ├── notes
│   ├── snippets
│   ├── vault
│   └── index.ts
├── settings
│   ├── shared
│   ├── core
│   ├── about
│   ├── remote-sync
│   └── index.ts
├── app-shell
├── create-flow
├── inspector
├── review
├── shared
└── trash
```

## 旧目录到新目录映射

### Settings

- `src/features/settings-core/**` -> `src/features/settings/core/**`
- `src/features/settings-about/**` -> `src/features/settings/about/**`
- `src/features/remote-sync/**` -> `src/features/settings/remote-sync/**`
- 设置导航与容器共享能力 -> `src/features/settings/shared/**`

### Assets

- `src/features/assets-diary/**` -> `src/features/assets/diary/**`
- `src/features/assets-notes/**` -> `src/features/assets/notes/**`
- `src/features/assets-snippets/**` -> `src/features/assets/snippets/**`
- `src/features/assets-vault/**` -> `src/features/assets/vault/**`
- `src/features/assets-shared/**` -> `src/features/assets/shared/**`

### Workspace

- `src/features/workspace/model/query-keys.ts` -> `src/features/workspace/shared/model/query-keys.ts`
- `src/features/workspace/model/query-invalidation.ts` -> `src/features/workspace/shared/model/query-invalidation.ts`
- `src/features/workspace/model/types.ts` -> `src/features/workspace/shared/model/types.ts`
- `src/features/workspace/model/useProjectsQuery.ts` -> `src/features/workspace/shared/queries/useProjectsQuery.ts`
- `src/features/workspace/model/useWorkspaceTaskBoardQuery.ts` -> `src/features/workspace/shared/queries/useWorkspaceTaskBoardQuery.ts`
- `src/features/workspace/composables/useSpaceProjectsState.ts` -> `src/features/workspace/spaces/useSpaceProjectsState.ts`
- `src/features/workspace/composables/useWorkspaceProjectBreadcrumb.ts` -> `src/features/workspace/projects/useWorkspaceProjectBreadcrumb.ts`
- `src/features/workspace/composables/useWorkspaceProjectTasks.ts` -> `src/features/workspace/projects/useWorkspaceProjectTasks.ts`
- `src/features/workspace/composables/useWorkspaceProjectView.ts` -> `src/features/workspace/projects/useWorkspaceProjectView.ts`
- `src/features/workspace/composables/useWorkspaceTaskActions.ts` -> `src/features/workspace/tasks/useWorkspaceTaskActions.ts`
- `src/features/workspace/composables/useWorkspaceTaskSnapshotState.ts` -> `src/features/workspace/tasks/useWorkspaceTaskSnapshotState.ts`
- `src/features/workspace/queries/projects.ts` -> `src/features/workspace/projects/queries/projects.ts`
- `src/features/workspace/queries/tasks.ts` -> `src/features/workspace/tasks/queries/tasks.ts`
- `src/features/workspace/mutations/projects.ts` -> `src/features/workspace/projects/mutations/projects.ts`
- `src/features/workspace/mutations/tasks.ts` -> `src/features/workspace/tasks/mutations/tasks.ts`
- `src/features/workspace/ui/DraggableProjectTree.vue` -> `src/features/workspace/projects/ui/DraggableProjectTree.vue`
- `src/features/workspace/ui/project-view-partials/**` -> `src/features/workspace/projects/ui/project-view-partials/**`
- `src/features/workspace/ui/DraggableTaskList.vue` -> `src/features/workspace/tasks/ui/DraggableTaskList.vue`
- `src/features/workspace/ui/InlineTaskCreator.vue` -> `src/features/workspace/tasks/ui/InlineTaskCreator.vue`
- `src/features/workspace/ui/TaskColumn.vue` -> `src/features/workspace/tasks/ui/TaskColumn.vue`
- `src/features/workspace/ui/TaskCard/**` -> `src/features/workspace/tasks/ui/TaskCard/**`

## 公开入口约束

- 页面层和其他 feature 默认只能导入 `@/features/<domain>`
- 若必须复用稳定模型契约，只允许导入 `@/features/workspace/shared/model`
- 套件外禁止直接导入：
  - `@/features/settings/**` 内部子域
  - `@/features/assets/**` 内部子域
  - `@/features/workspace/shared/**` 的非 `model` 路径
  - `@/features/workspace/tasks/**`
  - `@/features/workspace/projects/**`
  - `@/features/workspace/spaces/**`

## 破坏性变更

- 已删除历史碎片式 feature 名：
  - `settings-core`
  - `settings-about`
  - `remote-sync`
  - `assets-diary`
  - `assets-notes`
  - `assets-snippets`
  - `assets-vault`
  - `assets-shared`
- 已删除 `workspace` 根层混合目录的内部访问路径：
  - `@/features/workspace/composables/**`
  - `@/features/workspace/model/**`
  - `@/features/workspace/queries/**`
  - `@/features/workspace/mutations/**`
  - `@/features/workspace/ui/**`
- `/settings` 默认落点已切换为 `/settings/core`

## 当前残留风险

- 还没有完成手工交互回归，尤其是：
  - `workspace` 的项目树展开、拖拽排序、任务创建与编辑
  - `settings/remote-sync` 的同步配置与执行链路
  - `assets` 四个子域的读写闭环
- 历史文档中仍存在旧目录命名示例，这些文档属于历史记录，不代表当前正式结构

## 后续新增代码的硬约束

- 不再新增历史碎片式顶层 feature
- 不保留目录迁移兼容层
- 套件级共享逻辑进入 `<suite>/shared`
- 子域私有实现进入 `<suite>/<subdomain>`
- 套件外依赖必须通过公开入口收口
