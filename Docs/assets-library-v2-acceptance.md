# 资产库 V2 验收说明

## 范围

本次验收覆盖以下四个页面与共享底座：

- `Snippets`：代码仓库卡片页 + 大弹窗代码编辑
- `Vault`：密钥卡片仓库 + 客户端加密 + 密文同步 + 加密导入导出
- `Notes`：双栏 Markdown 笔记工作流
- `Diary`：双栏日期日记工作流

## 本轮实现结论

### 1. 已脱离旧临时存储主路径

- `src/services/api/snippets.ts`
- `src/services/api/notes.ts`
- `src/services/api/diary.ts`
- `src/services/api/vault.ts`

以上四个资产 API 都已经走 `tauriInvoke`，不再把 `localStorage` 作为主读写来源。

当前仍保留 `localStorage` 的地方只有一次性迁移入口：

- `src/services/api/assets-migration.ts`

它只负责首次导入历史数据，不再承担长期事实来源。

### 2. 四个页面职责已经分化

- `src/pages/AssetsSnippetsPage.vue`：代码卡片仓库，强调预览、复制、收藏、弹窗编辑。
- `src/pages/AssetsVaultPage.vue`：安全卡片仓库，强调掩码、显示控制、复制、导入导出。
- `src/pages/AssetsNotesPage.vue`：双栏文档工作流，强调列表切换、Markdown 编辑和预览。
- `src/pages/AssetsDiaryPage.vue`：双栏日期工作流，强调今天入口、模板、副标题和上下文联动。

### 3. 小窗口下的 Notes / Diary 可用性

共享文档外壳：

- `src/features/assets/shared/ui/AssetDocumentWorkspace.vue`

它在 `960px` 以下切成单列布局，并继续保留编辑/预览切换。

页面本身也补了响应式：

- `src/pages/AssetsNotesPage.vue`
- `src/pages/AssetsDiaryPage.vue`

### 4. Vault 安全约束已落地

关键实现文件：

- `src/services/assets/vault-crypto.ts`
- `src/services/tauri/stronghold.ts`
- `src/services/api/vault.ts`
- `src-tauri/src/services/sync/upsert/vault_entries.rs`

当前约束如下：

- Vault 主密钥保存在 Stronghold。
- Vault 条目 `value` 在前端加密后再写入数据库。
- 旧明文 Vault 数据会在读取或迁移时自动转成密文。
- 远端同步只同步密文后的 `asset_vault_entries`。
- 导出默认生成加密包。
- 导入需要文件密码，导入后会使用当前设备主密钥重新加密。

## 已执行校验

本轮实现已执行以下命令并通过：

```bash
bun run lint --fix
bun run build
cargo check --manifest-path /Users/sty/Desktop/StoneFlow/src-tauri/Cargo.toml
```

## 建议你重点手测的路径

### Vault

1. 新建一条 Vault，确认列表里默认显示掩码，复制和眼睛预览都正常。
2. 关闭并重开页面，确认原条目还能正常解密显示与复制。
3. 先用旧数据或手动造一条历史明文数据，确认首次读取后会被自动迁移成密文。
4. 执行导出，确认生成 `.json` 文件，且密码不匹配时会阻止导出。
5. 执行导入，确认错误密码会失败，正确密码会恢复条目。
6. 如果你当前远端同步环境可用，做一次 `push / pull`，确认同步报告里出现 `Vault` 表统计。

### Snippets

1. 搜索标题、标签、语言、代码内容，确认都能命中。
2. 打开大弹窗，确认 `CodeMirror` 编辑、保存、复制、收藏正常。

### Notes

1. 在双栏里切换编辑/预览。
2. 缩小窗口到接近小尺寸，确认仍能通过模式切换继续编辑和预览。

### Diary

1. 新建今天日记，确认固定日期前缀与副标题模式正确。
2. 检查模板正文、任务上下文和跳转入口。
3. 缩小窗口后确认仍能通过模式切换继续工作。

## 已知实现边界

- Vault 目前是“单用户、单设备主密钥”模型，还没有做团队共享与权限分级。
- 导出文件目前走浏览器下载流，不是原生系统保存面板。
- Notes 与 Diary 仍是 Markdown 工作流，不包含附件系统和块级编辑。
