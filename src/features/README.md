# 前端功能域目录约定

`src/features` 现在统一按“业务套件 / 独立 feature”组织代码，页面层与其他 feature 只能依赖公开入口，不允许继续穿透内部实现。

## 顶层结构

- 业务套件：`workspace`、`assets`、`settings`
- 独立 feature：`app-shell`、`create-flow`、`inspector`、`review`、`trash`
- 跨域基础能力：`shared`

套件的职责是承载一个稳定的业务域，并在套件根入口统一对外导出。

## 套件目录规则

业务套件统一使用以下骨架：

```txt
src/features/<suite>
├── shared/       # 套件内跨子域共享的稳定能力
├── <subdomain>/  # 子域私有实现
└── index.ts      # 套件公开入口
```

当前套件划分如下：

- `workspace`
  - `shared`
  - `tasks`
  - `projects`
  - `spaces`
- `assets`
  - `shared`
  - `diary`
  - `notes`
  - `snippets`
  - `vault`
- `settings`
  - `shared`
  - `core`
  - `about`
  - `remote-sync`

## shared 与子域的边界

- `shared/` 只放兄弟子域之间真实复用的稳定能力
- 子域目录只放当前子域的私有实现
- 不要把“子域自己的实现文件”伪装成 `shared`
- 不为规范机械创建空目录，按复杂度逐步演进

例如：

- `workspace/shared/model`：query key、失效策略、稳定类型
- `workspace/shared/queries`：跨 `tasks/projects/spaces` 复用的查询封装
- `workspace/tasks`：任务卡片、拖拽、内联创建、任务写入编排
- `workspace/projects`：项目树、项目视图、面包屑、项目写入编排

## 子域内部组织

子域默认优先保持扁平，只有复杂度明显上升时再细分为 `model / queries / mutations / composables / ui`。

推荐顺序：

- 简单子域：`index.ts` + 少量扁平文件
- 中等子域：按 `queries / mutations / ui` 分组
- 复杂子域：再补 `model / composables`

不要为了“看起来规范”提前制造空目录。

## 公开入口规则

- 页面层与其他 feature 只能导入 `@/features/<domain>`
- 若必须复用稳定模型契约，只允许导入 `@/features/<suite>/shared/model`
- 禁止导入：
  - `@/features/<suite>/shared/*` 的其他内部目录
  - `@/features/<suite>/<subdomain>/*`
  - 历史碎片式顶层 feature，如 `assets-diary`、`settings-core`

`workspace` 是当前唯一明确开放 `shared/model` 给套件外使用的套件，用于稳定 query key、失效策略和领域类型复用。

## 分层边界

- 页面层：`src/pages/**`
- 功能域层：`src/features/**`
- 数据访问层：`src/services/api/**`
- 基础共享层：`src/composables/base/**`、`src/utils/**`、`src/config/**`
- 装配插件层：`src/plugins/**`

页面层只负责路由装配与页面级组合，不直接访问 `services/api`。

## Query Key 规范

统一骨架：`[domain, resource, scope, params]`

- `domain`：业务域，如 `workspace`、`assets`、`settings`
- `resource`：资源名，如 `tasks`、`projects`、`profiles`
- `scope`：查询语义，如 `list`、`detail`、`activity`
- `params`：筛选、分页、排序等可变参数对象

约束：

- 新增 key 必须包含 `domain` 与 `resource`
- 新维度优先通过 `scope + params` 扩展
- mutation 成功后必须通过 invalidation 统一刷新数据

## 迁移与治理规则

- 历史顶层 feature 若要收敛到套件，先补套件根入口，再替换外部导入
- 子域实现迁移后，旧目录必须在同一批次删除，不保留兼容 re-export
- 新增共享能力前先判断它是“跨子域共享”还是“子域私有实现”
- ESLint 边界规则是硬约束，目录设计必须与规则保持一致
