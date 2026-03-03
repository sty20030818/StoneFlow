# 前端功能域目录约定

`src/features` 按业务域组织代码，页面层只能依赖 feature 的公开入口。

## 分层边界

- 页面层：`src/pages/**`
- 功能域层：`src/features/<domain>/**`
- 数据访问层：`src/services/api/**`
- 基础共享层：`src/composables/base/**`、`src/utils/**`、`src/config/**`

页面层仅负责路由与组合，不直接访问 `services/api`。

## 目录骨架

- `model/`: 对外稳定暴露的能力（query key、查询 hooks、领域模型）
- `queries/`: 读取链路实现（内部）
- `mutations/`: 写入链路实现（内部）
- `composables/`: feature 内部编排（内部）
- `ui/`: feature 内部 UI 组件（内部）

## 公开入口规则

- 页面与其他 feature 只能导入 `@/features/<domain>` 或 `@/features/<domain>/model`
- feature 内部拆分请使用相对路径，避免跨域导入内部实现
- query key 必须使用 `domain/resource/scope/params` 骨架

## Query Key 规范

统一骨架：`[domain, resource, scope, params]`

- `domain`：业务域，如 `workspace`、`inspector`、`remote-sync`
- `resource`：资源名，如 `tasks`、`projects`、`profiles`
- `scope`：查询语义，如 `list`、`detail`、`activity`
- `params`：筛选、分页、排序等可变参数对象

约束：

- 新增 key 必须包含 `domain` 与 `resource`
- 新维度优先通过 `scope + params` 扩展，不重写基础层级语义
- mutation 成功后必须通过 query invalidation 刷新数据

## ESLint 架构防线

- `no-restricted-imports`：页面层禁止直接导入 `@/services/api/*`
- `no-restricted-imports`（regex）：feature 禁止跨域导入内部实现路径

临时迁移白名单：

- `src/pages/assets/**`
- `src/pages/review/**`
- `src/pages/Trash/**`
- `src/pages/ProjectView/**`

白名单用于迁移过渡，后续按板块逐步收敛。

## 迁移执行规则

- 历史页面迁移到 feature 时，先补 `model` 公开接口，再替换页面导入路径
- 旧的 `services/api/*` 直连路径逐步下沉到 feature 内部 `queries/mutations`
- `refresh-signals` 仅保留 UI 瞬时事件，数据刷新统一走 query invalidation
