<!--
  StoneFlow README (GitHub)
  Version: 0.1.0 (Preview)
  Tip: 把截图/GIF 放到 /assets 并替换下方占位链接
-->

<p align="center">
  <img src="./assets/logo.png" alt="StoneFlow" width="96" />
</p>

<h1 align="center">StoneFlow</h1>

<p align="center">
  <b>以「完成」为核心、以「项目」为骨架</b>的本地优先桌面效率系统 ✨
</p>

<p align="center">
  <a href="#-为什么是-stoneflow">为什么 StoneFlow</a> ·
  <a href="#-功能一览">功能</a> ·
  <a href="#-快捷键">快捷键</a> ·
  <a href="#-快速上手">快速上手</a> ·
  <a href="#-路线图">路线图</a>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-0.1.0-blue" />
  <img alt="tauri" src="https://img.shields.io/badge/Tauri-2.10.x-24C8DB" />
  <img alt="rust" src="https://img.shields.io/badge/Rust-safe%20%26%20fast-orange" />
  <img alt="vue" src="https://img.shields.io/badge/Vue-3.5.x-42b883" />
  <img alt="local-first" src="https://img.shields.io/badge/local--first-SQLite-success" />
</p>

> 🚧 **预览版 (0.1.0)**：核心功能已比较完整，正在快速迭代中。欢迎提 Issue / PR，一起把它打磨成你会每天打开的工具。

---

## 🧠 为什么是 StoneFlow

你可能也经历过这些“效率工具的副作用”：

* ✅ 待办清空了，但一周后只记得「我好忙」，却说不清自己做成了什么。
* 🧩 项目/任务拆得很细，但回顾时只能看到零散条目，没有阶段叙事。
* 🔔 提醒/协作/订阅堆满，结果是更焦虑、更碎片。

**StoneFlow 的出发点是反过来的：**

> **Task** 是行动，**Project** 是叙事，**Finish List** 是你走过的路。

* 不追求“清空列表”，而是积累“完成证据”🏆
* 用稳定的结构（Space / Project / Task）承载长期主义
* 让你在几个月甚至几年后，仍能站在某个 Project 上看见「当时真实发生了什么」

---

## ✨ 核心亮点（给忙但认真生活的你）

* 🎯 **完成清单驱动 (Finish List)**：把“完成过”变成可回顾的资产，而不是一次性事件
* 🧭 **项目骨架 (Space / Project / Task)**：长期目标有结构，阶段推进更有掌控感
* 🗂️ **像 IDE 一样顺手的交互**：抽屉式 Inspector、拖拽排序、批量编辑、零摩擦流转
* ⌨️ **高密度快捷键 + 命令面板**：不离开键盘也能完成大多数操作
* 🔒 **本地优先 + 数据可控**：SQLite 本地存储，速度快、离线可用、隐私更安心
* 🦀 **Rust 后端更可靠**：核心数据变更通过 Rust 层统一收口，减少“写坏数据”的概率

> 我们把任务管理当成一个“行为档案系统”，未来会用日志和分析把你从“忙”带到“变强”。

---

## 🧩 功能一览

### ✅ 任务与项目

* **Space / Project / Task** 三层结构：Work / Personal / Study 等多语境切换
* **Projects 树结构**：支持多层级展示、展开状态记忆、同级拖拽排序
* **任务双列视图**：Todo / Done 两列，Todo 按优先级分组（P0/P1/P2/P3）
* **任务创建**：支持内联创建 & 弹窗创建（带更多字段）
* **Task Inspector 抽屉**：右侧滑出编辑面板（状态 / 优先级 / 截止日期 / 标签 / 归属 / 备注等）
* **批量编辑模式**：多选、整列选择、批量软删除

### 🏆 完成与回顾

* **Finish List 时间线**：永久记录完成任务（可按 Space / Project / 日期 / 关键词筛选）
* **Stats 统计**：完成趋势、分布统计（预览版）
* **Logs 行为视图**：原始/聚合日志 + JSON 导出（预览版）

### 🗃️ 资产库（Library）

* **Snippets**：代码片段库（本地）
* **Notes**：Markdown 笔记（本地）
* **Diary**：日记条目 + 当日完成联动（本地）
* **Vault**：密钥管理（预览版：本地存储；加密能力在路线图中）

### ☁️ 同步与数据

* **本地 SQLite**：离线可用、启动快、查询快
* **远端配置（可选）**：支持多个远端配置，手动上传/下载控制同步节奏
* **连接信息安全保存**：敏感连接串使用 Stronghold 保存（更安心）

---

## ⌨️ 快捷键

| 快捷键            | 功能                   |
| -------------- | -------------------- |
| `Cmd/Ctrl + K` | 打开命令面板（快速跳转/入口）      |
| `Cmd/Ctrl + N` | 新建任务弹窗（非输入框时）        |
| `Enter`        | 工作区触发内联创建聚焦          |
| `Esc`          | 关闭 Task Inspector 抽屉 |

**内联创建小技巧：**

* `Tab`：循环优先级
* `Shift + Enter`：展开备注输入
* `Cmd/Ctrl + Enter`：提交创建

---

## 🪄 交互亮点（你会爱上的细节）

* 🧲 **抽屉式 Inspector**：编辑时不丢上下文，`Esc` 一键回到心流
* 🧱 **结构稳定**：Project 不是大号 Todo，而是阶段容器（Scope）
* 🧭 **空间记忆**：切换 Space 自动回到上次浏览位置与展开状态
* 🧹 **删除是纠错**：完成进入 Finish List；删除只是修正记录（更符合真实世界）

---

## 🚀 快速上手

1. 进入 **All Tasks** 或任意 Space
2. `Enter` 内联快速创建任务，或 `Cmd/Ctrl + N` 打开弹窗创建
3. 点击任务打开右侧 **Inspector**，补充优先级/标签/截止日期/备注
4. 完成任务后，到 **Finish List** 回顾、筛选与复盘

---

## 🧱 技术栈

* 桌面框架：**Tauri 2**
* 后端：**Rust**（命令/数据一致性/安全存储）
* 本地数据库：**SQLite**（SeaORM）
* 前端：**Vue 3 + Vite**
* 状态管理：**Pinia**
* UI：**@nuxt/ui** 组件体系 + 自定义交互

> 目标：让“效率工具”在你电脑上像原生应用一样稳、快、顺手。

---

## 🛠️ 开发与构建（开发者）

> 如果你只想体验应用：建议优先使用 Release 版本（待补充下载链接）。

```bash
pnpm install
pnpm build
pnpm tauri dev
pnpm tauri build
```

---

## 🗺️ 路线图

### 0.2.x（体验打磨）

* 🔎 全局搜索 & Filter/Sort 真正接入任务筛选
* 🧾 更真实的 Activity Logs（后端落库、可回放）
* 📊 Stats 统计升级：按 Project 的完成率 / 里程碑 / lead time
* 🧩 Library 与 Task/Project 更深关联（引用、反向链接）

### 0.3.x（能力扩展）

* 🔐 Vault 加密（本地安全存储）
* ☁️ 同步体验升级：冲突处理、增量同步、可视化状态
* 🪟 Mini 模式 / 小窗专注（更接近 Raycast 的效率体验）

### 1.0（愿景）

* 🤖 基于日志的复盘提示：发现你的高产时段、拖延模式、阶段瓶颈
* 🏗️ Project 叙事增强：阶段总结、里程碑、复盘模板
* 🧠 “完成证据”智能归档：让你回顾时像翻阅自己的成长年鉴

---

## 🖼️ 截图与演示

> 这里建议放 3～6 张图 + 1 个 GIF（命令面板/Inspector/Finish List）。

* `./assets/screenshot-1.png`
* `./assets/screenshot-2.png`
* `./assets/demo.gif`

---

## 🤝 贡献 & 反馈

* 发现 Bug / 想要新功能：请直接提 **Issue**
* 想一起做：欢迎 **PR**（也欢迎先开讨论）

---

## 📄 License

> 待补充（建议尽早确定：MIT / Apache-2.0 / AGPL 等）

---

### ⭐ 如果 StoneFlow 对你有帮助

点个 Star 会让我们知道：这个方向值得继续做下去。谢谢你 🙏