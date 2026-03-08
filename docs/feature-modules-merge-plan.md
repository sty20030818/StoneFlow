# Feature 模块合并规划

## 当前问题

项目中存在 16 个 feature 模块，部分模块粒度过细，职责重叠：

```
src/features/
├── assets-diary/      # 日记
├── assets-notes/      # 笔记
├── assets-snippets/   # 代码片段
├── assets-vault/      # 保险箱
├── assets-shared/     # 资产共享
├── settings-about/    # 设置-关于
├── settings-core/     # 设置-核心
└── ...
```

## 建议合并方案

### 方案A: 按业务域聚合

```
src/features/
├── workspace/         # 工作区（任务、项目、空间）
│   ├── tasks/
│   ├── projects/
│   └── spaces/
├── assets/            # 资产管理（合并 diary/notes/snippets/vault）
│   ├── diary/
│   ├── notes/
│   ├── snippets/
│   ├── vault/
│   └── shared/        # 共享组件
├── settings/          # 设置（合并 core+about）
│   ├── core/
│   └── about/
├── inspector/         # 详情面板
├── sync/              # 远程同步
├── trash/             # 回收站
└── create-flow/       # 创建流程
```

**优点**：
- 减少模块数量，便于理解业务边界
- 共享组件更容易复用
- 减少跨模块通信

**缺点**：
- 需要大量文件移动
- 可能影响现有功能
- 需要更新所有导入路径

### 方案B: 保持现有结构，优化共享

```
src/features/
├── assets/            # 新建统一入口
│   ├── diary/        # 链接到 assets-diary
│   ├── notes/        # 链接到 assets-notes
│   └── shared/       # 提取共享逻辑
├── assets-diary/      # 保持不变
├── assets-notes/      # 保持不变
└── ...
```

**优点**：
- 影响范围小
- 渐进式优化
- 保持向后兼容

**缺点**：
- 模块数量仍然较多
- 职责重叠依然存在

## 推荐方案：渐进式合并

### 阶段1: 提取共享逻辑（低风险）

1. 创建 `src/features/assets/shared/` 目录
2. 提取共享的类型定义、工具函数
3. 更新各 asset 模块使用共享逻辑

### 阶段2: 合并 Settings 模块（低风险）

1. 创建 `src/features/settings/` 目录
2. 将 `settings-core` 和 `settings-about` 迁移到子目录
3. 更新导入路径

### 阶段3: 合并 Assets 模块（高风险，延后）

需要充分测试和评估后执行。

## 迁移检查清单

### 阶段1: 提取共享逻辑

- [ ] 创建 `features/assets/shared/` 目录
- [ ] 提取共享类型定义
- [ ] 提取共享工具函数
- [ ] 更新各模块导入
- [ ] 测试所有 asset 功能
- [ ] 更新文档

### 阶段2: 合并 Settings

- [ ] 创建 `features/settings/` 目录
- [ ] 迁移 `settings-core` 内容
- [ ] 迁移 `settings-about` 内容
- [ ] 更新所有导入路径
- [ ] 测试设置功能
- [ ] 删除旧目录

### 阶段3: 合并 Assets（可选）

- [ ] 充分评估风险
- [ ] 创建详细迁移计划
- [ ] 准备回滚方案
- [ ] 分步执行迁移
- [ ] 完整回归测试

## 风险评估

### 低风险操作

- 提取共享逻辑到独立模块
- 添加新的统一入口
- 更新文档和注释

### 中风险操作

- 合并相似的小模块（如 settings）
- 更新导入路径
- 调整目录结构

### 高风险操作

- 合并大型模块（如 assets）
- 删除现有模块
- 大规模重构导入路径

## 建议

### 立即执行

**不执行大规模合并**，原因：
1. 现有架构已经稳定运行
2. 大规模重构风险较高
3. 收益不明显
4. 可能影响用户体验

### 近期优化

1. **提取共享逻辑**：创建 `assets-shared` 模块
2. **优化文档**：更新 feature 模块说明
3. **代码审查**：检查是否有不必要的跨模块依赖

### 长期规划

1. 根据业务发展评估是否需要合并
2. 在新功能开发时采用新的模块组织方式
3. 渐进式重构现有模块

## 结论

**当前建议：暂不执行 Feature 模块合并**

理由：
- 现有架构虽有小问题，但整体运行良好
- 大规模重构收益不明显
- 风险控制优先

替代方案：
- 优化现有模块的共享逻辑
- 改善模块间通信方式
- 在新功能开发时采用更好的组织方式

## 参考资源

- [Feature 模块规范](../src/features/README.md)
- [状态管理迁移指南](./state-management-migration.md)
- [Service 层架构设计](./service-layer-architecture.md)
