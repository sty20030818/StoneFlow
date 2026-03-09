# 后端分层架构

## 目标

这次重构采用破坏式调整，不保留向后兼容壳层。目标只有三个：

- 写路径边界清晰
- 仓储层只保留数据访问原语
- 命令层、服务层、仓储层的职责和代码结构完全一致

## 最终分层

```text
前端调用
  -> commands
  -> services（仅写路径）
  -> repos
  -> db / entities
```

其中有一个明确例外：

- 纯查询：`command -> repo`
- 写路径：`command -> service -> repo`

这样做的原因很直接：查询不需要额外的透传壳层，写路径才需要事务、跨实体编排和副作用管理。

## 各层职责

### Commands

- 接收 Tauri 命令参数
- 做输入 DTO 转换
- 调用对应 service 或 query repo
- 完成错误边界映射

禁止事项：

- 不在 command 内开启事务
- 不在 command 内编排多个 repo
- 不在 command 内写业务规则

### Services

- 只承接会修改持久化状态的用例
- 定义事务边界
- 协调多个 repo 原语
- 处理跨实体规则、活动日志、副作用刷新

当前已收口的写服务：

- `TaskService`
- `ProjectService`
- `SyncService`

### Repos

- 提供查询原语和 mutation 原语
- 屏蔽 SeaORM 细节
- 负责实体与 DTO 的基础映射

禁止事项：

- 不承载完整业务用例
- 不拥有事务边界
- 不处理跨实体业务决策

## 当前模块组织

### Task

- `commands/tasks.rs`：命令边界
- `services/task_service.rs`：任务写用例
- `repos/task_repo/query.rs`：任务读取原语
- `repos/task_repo/mutation.rs`：任务主表写入原语
- `repos/task_repo/tags.rs` `links.rs` `custom_fields.rs`：关联数据同步原语
- `repos/task_repo/stats.rs`：项目统计刷新原语

`TaskRepo` 入口现在只保留查询聚合能力和少量 service 需要的辅助入口。

### Project

- `commands/projects.rs`：命令边界
- `services/project_service.rs`：项目写用例
- `repos/project_repo/query.rs`：项目读取原语
- `repos/project_repo/mutation.rs`：项目主表写入原语
- `repos/project_repo/helpers.rs`：路径重建、DTO 填充等辅助逻辑

`ProjectRepo` 入口现在只保留列表查询、默认项目查询和项目树收集能力。

### Sync

- `commands/sync.rs`：参数和错误边界
- `services/sync_service.rs`：拉取、推送、连接测试

同步逻辑不再停留在 command 中。

## 关键约束

### 事务边界

- 所有写路径事务由 service 开启和提交
- repo 原语默认接受 `ConnectionTrait`，便于被事务和普通连接复用

### 输入模型

- 用例级输入模型定义在 service 层
- command 负责把前端请求 DTO 转换成 service 输入
- repo 不再承载完整用例输入结构

### 文档与代码一致性

这份文档描述的是当前代码的最终态，不再包含：

- 渐进式迁移计划
- 兼容旧 repo 入口的策略
- 临时测试文件保留约定

后续如果继续演进，应该直接修改最终态设计，而不是重新引入兼容层。
