# StoneFlow

StoneFlow 是一款面向长期主义个人的桌面效率系统——以“完成”为核心、以“Project”为骨架，帮助你把行为记录、项目推进、Finish List、日志和资料同步编织，形成可复盘、可沉淀的行动轨迹。

## 核心优势

- **Finish List 驱动**：不同于 Todoist/Things 只强调待办，StoneFlow 把完成行为作为核心成果，记录每一次 Action，而非仅仅清空列表。
- **Project = 叙事容器**：相比 ClickUp、Notion 的层级自由，StoneFlow 把 Project 定义成阶段性目标/长期事项，自动维护任务计数、活跃时间和 computed status，帮助你专注阶段演进而不是碎片任务。
- **本地优先 / 日志即资产**：所有交互穿过 Rust 层写入 SQLite，并同步生成 Activity Log（创建、变更、Project 切换等），兼顾高速响应与完整审计，规避完全云端（如 Asana）带来的隐私与网络依赖。
- **高控制感与长期陪伴**：强调“删除是纠错”“Finish List 是证据”，更像一个每天打开、使用越久越离不开的伴侣工具，适合需要长期项目/习惯跟踪的人。
- **轻量 + 可扩展的附加模块**：除核心任务体系，还内置 Activity、Diary、Secret、Code Snippet、Mini/命令条/固定小窗等页面，兼顾行动、思考与资料沉淀。

## 核心概念

- **Space**：用于区分“Work / Personal / Study”等语境，作为视图层与逻辑分区，不承载任务逻辑。
- **Project**：StoneFlow 唯一的长期结构单元，本身不是单个动作，而是长期目标/阶段容器，支持最多两层嵌套，自动记录 todo/done 计数、完成率、最近活跃、computed status（进行中/已完成/归档/已删除）。
- **Task**：最小可执行行为，必须属于某个 Project（默认 Project 存在每个 Space）；包含计划/实际时间、多次开始历史、优先级、标签、链接、custom fields。
- **Finish List**：所有已完成任务的永久记录，可按 Space/Project/Tag/时间筛选，并预留完成感想。
- **Activity Log**：Rust 层记录创建、状态、优先级、Project 切换等全部关键行为，后续可用于分析、趋势、导出。
- **附加模块**：Diary、Secret、Note、Code Snippet 等页面提供弱关联文本与资料能力。
- **Mini 工具**：命令条（Raycast 风格）、Mini 任务窗、固定小窗，提供高频操作入口。

## 页面与界面概览

1. **All Tasks 页面**：聚合展示所有 Space/Project 的 Task，支持按 priority/time/status/tag 多维排序与筛选，默认按优先级，适合全局视角分析与快速操作。
2. **Space 页面（Work/Personal/Study）**：每个 Space 是独立页面，可按 priority/time/status 排序；状态分区显示未开始/进行中/已结束任务，便于聚焦当前阶段。
3. **Finish List 页面**：以时间轴记录所有完成任务，可按 Project/Space/Tag/时间筛选与聚合，提供统计视图与完成感想入口。
4. **Activity / 日志页面**：展示所有关键行为（创建、状态、优先级、Project 切换），支持导出 JSON/CSV，是操作可追溯的“审计”面板。
5. **Diary / Secret / Note / Code Snippet 页面**：记录思考、密钥、片段，支持弱关联 Task/Project，形成知识与行动的联动库。
6. **Mini 模式 + 命令条 + 固定小窗**：命令条用于快速新建 Task、跳转；Mini 显示未完成任务；固定小窗用于突出当前任务或笔记。
7. **Settings/Preferences**：控制默认首页、信息密度、创建即开始等偏好，设置保持自动保存。

> **截图预留**：后续可在这个章节插入 `docs/screenshots/xxx.png` 的实际界面截图。

## 已实现功能

- 支持 Space/Project/Task 的完整 CRUD，Project 维护 todo/done 计数、last_task_updated_at、computed status。
- 多维筛选/排序（Space/Project/Status/Tag/Priority/时间），任务可通过侧边栏即时编辑并切换 Project，自动触发 Activity Log。
- Finish List 永久保存完成记录，支持 Project/Space/Tag/时间筛选，强调“完成即资产”。
- Activity Log 记录创建、状态、优先级、Project 切换等所有关键交互。
- 附加模块：Diary、Secret、Note、Code Snippet 页面为文本与资料型内容提供操作视窗。
- 快捷入口：Raycast 风格命令条、Mini 任务窗、固定小窗，提升高频操作效率；支持全局快捷键。
- 本地 SQLite + Tauri + Rust 保证一致性，并提供导出/备份/导入机制。
- 单一初始化迁移策略 + README 中的本地 DB 重建指南，避免繁杂历史迁移。

## 规划中功能

- **云同步与多设备**：可选的云同步备份方案，支持跨设备使用，但仍保持本地优先可选。
- **分析提示与 AI 辅助**：基于 Activity Log 提供完成率波动、复盘提醒等数据洞察。
- **附加模块扩展**：增强 Diary/Secret/Code Snippet 与任务/项目的弱关联能力，引入多媒体或模板。
- **开发者扩展**：开放更多自定义统计、导出、插件或脚本能力，利用 Rust/SQLite 架构打底。

## 安装与运行

```bash
pnpm install
pnpm dev      # 浏览器预览前端
pnpm build    # 前端构建
pnpm tauri dev  # 运行桌面端（需 Rust、cargo）
pnpm tauri build  # 打包桌面端
```

## 快速上手

1. 打开命令条或左侧 All Tasks 页面，创建 Task，选择 Space/Project、设置 priority/tag。
2. 任务侧边栏可以直接修改 note、Project、Deadline、Tag，所有变更会写入 Activity Log。
3. 完成任务后进入 Finish List，可按 Project/Space/Tag/时间筛选并查看完成日志。
4. 日志页面（Activity）可以导出 JSON/CSV；Diary/Secret/Note/Code Snippet 用于记录背景资料。
5. Mini 窗口和快捷键提供高频新建与切换入口。

## 技术栈与架构亮点

- **前端**：Vue 3 + Vite + Tailwind/nuxt UI；命令条、Mini 模式依赖 Vue 组合式逻辑与自定义组件。
- **状态**：Pinia 确保各页面共享 Project/Task 状态，配合各模块的 computed properties。
- **桌面端**：Tauri 2 + Rust，所有业务变更由 Rust command（`commands/*`）与 repo 负责。
- **数据库**：SQLite 本地存储，全量通过 `src-tauri/src/db` 管理，迁移由单一 `0001_init.sql` 控制，`DbState` 以 Mutex 包裹 `Connection`。
- **日志与一致性**：Rust 层每次 Task/Project 变更均生成 Activity Log，方便后续分析与同步。

## 本地数据库重建（开发）

若碰到旧版本数据库（`schema_migrations` 记录不为 0），请删除本地 DB 并重新启动：

```
C:\Users\<用户名>\AppData\Roaming\stoneflow\stoneflow.db
```

删除后 `tauri dev` 会自动创建最新 Schema（参考 `src-tauri/src/db/init` 中的迁移与 seed）。

## Roadmap 与联系方式

- **v1**：All Tasks、Finish List、Project/Task 模型、日志、Diary/Secret/Note/Code Snippet、Mini/命令条。
- **未来**：云同步/多设备、AI/分析提醒、附加模块升级、开发者扩展。
- 欢迎在 issues/PR 中提供反馈；需帮助可以通过仓库讨论板或邮件联系 StoneFlow 团队。
