# 状态管理迁移执行计划

## 当前状态

### ✅ 已完成
1. 新的 TanStack Query hooks 已创建
   - `src/features/workspace/model/useProjectsQuery.ts`
   - 包含 `useProjectsQuery` 和 `useProjectsMutations`

2. 新的 UI Store 已创建
   - `src/stores/ui.ts`
   - 仅包含客户端 UI 状态

3. 统一错误处理已创建
   - `src/composables/base/useErrorHandler.ts`

### ⚠️ 待迁移文件

使用 `useProjectsStore` 的文件（按优先级排序）：

#### 高优先级（核心功能）
1. `src/startup/initialize.ts` - 应用启动初始化
2. `src/features/create-flow/composables/useCreateTaskModal.ts` - 创建任务
3. `src/features/create-flow/composables/useCreateProjectModal.ts` - 创建项目
4. `src/features/inspector/composables/project/useProjectInspectorDrawer.ts` - 项目详情面板
5. `src/features/inspector/composables/task/useTaskInspectorDrawer.ts` - 任务详情面板
6. `src/features/inspector/composables/task/useTaskInspectorActions.ts` - 任务操作
7. `src/features/inspector/composables/task/useTaskInspectorOptions.ts` - 任务选项
8. `src/features/inspector/composables/task/useTaskInspectorDerived.ts` - 任务派生状态
9. `src/features/inspector/composables/task/useTaskInspectorSync.ts` - 任务同步

#### 中优先级（辅助功能）
10. `src/features/trash/composables/useTrashPage.ts` - 回收站
11. `src/features/review/composables/useReviewFinishList.ts` - 回顾列表
12. `src/features/workspace/ui/DraggableProjectTree.vue` - 项目树
13. `src/features/workspace/composables/useWorkspaceProjectView.ts` - 工作区视图
14. `src/layouts/Sidebar.vue` - 侧边栏
15. `src/layouts/Header.vue` - 头部

#### 低优先级（其他）
16. `src/features/app-shell/composables/useAppGlobalOverlays.ts` - 全局遮罩

### 📋 迁移检查清单

#### 必须完成
- [ ] 所有组件不再导入 `useProjectsStore`
- [ ] 使用 `useProjectsQuery` 或相关 hooks 获取数据
- [ ] 使用 `useUIStore` 管理 UI 状态
- [ ] 错误处理使用 `useErrorHandler`
- [ ] 数据修改后正确调用 `invalidateProjects`

#### 建议完成
- [ ] 移除 `src/stores/projects.ts` 文件
- [ ] 更新相关文档和注释
- [ ] 添加迁移示例代码

## 迁移策略

### 策略一：渐进式迁移（推荐）

**优点：**
- 风险可控
- 可以随时停止
- 不影响现有功能
- 易于测试和验证

**执行步骤：**

1. **第一阶段：迁移工具函数和 composables**
   - 文件 1-9（inspector 和 create-flow）
   - 这些文件独立性强，影响范围小

2. **第二阶段：迁移页面和布局**
   - 文件 10-15（trash, review, workspace, layouts）
   - 这些文件影响用户界面

3. **第三阶段：迁移辅助功能**
   - 文件 16（app-shell）
   - 最后的收尾工作

4. **第四阶段：清理**
   - 移除 `src/stores/projects.ts`
   - 更新文档
   - 完成迁移

### 策略二：一次性迁移

**优点：**
- 快速完成
- 状态统一

**缺点：**
- 风险大
- 难以测试
- 可能影响现有功能

**不推荐**，除非有充分的时间和测试资源。

## 详细迁移计划

### 第一阶段：迁移工具函数和 composables

#### 任务 1.1：迁移 create-flow

**文件：**
- `src/features/create-flow/composables/useCreateTaskModal.ts`
- `src/features/create-flow/composables/useCreateProjectModal.ts`

**迁移步骤：**

1. **分析当前使用方式**
   ```bash
   # 查找 useProjectsStore 使用
   grep -A 10 "useProjectsStore" src/features/create-flow/composables/useCreateTaskModal.ts
   ```

2. **替换导入**
   ```typescript
   // 旧代码
   import { useProjectsStore } from '@/stores/projects'
   const projectsStore = useProjectsStore()
   
   // 新代码
   import { useProjectsQuery } from '@/features/workspace'
   const { data: projects } = useProjectsQuery({ spaceId })
   ```

3. **更新数据访问**
   ```typescript
   // 旧代码
   const projects = projectsStore.getProjectsOfSpace(spaceId)
   
   // 新代码
   const { data: projects } = useProjectsQuery({ spaceId })
   ```

4. **更新数据修改**
   ```typescript
   // 旧代码
   await projectsStore.patchProject(spaceId, projectId, patch)
   
   // 新代码
   await updateProject({ projectId, ...patch })
   await invalidateProjects({ spaceId })
   ```

5. **测试验证**
   - 运行开发服务器
   - 测试创建任务功能
   - 测试创建项目功能
   - 确认无报错

#### 任务 1.2：迁移 inspector

**文件：**
- `src/features/inspector/composables/project/useProjectInspectorDrawer.ts`
- `src/features/inspector/composables/task/useTaskInspectorDrawer.ts`
- `src/features/inspector/composables/task/useTaskInspectorActions.ts`
- `src/features/inspector/composables/task/useTaskInspectorOptions.ts`
- `src/features/inspector/composables/task/useTaskInspectorDerived.ts`
- `src/features/inspector/composables/task/useTaskInspectorSync.ts`

**迁移步骤：**同上

#### 任务 1.3：迁移 startup

**文件：**
- `src/startup/initialize.ts`

**迁移步骤：**

这个文件比较特殊，需要在应用启动时初始化数据。可以考虑保留部分逻辑，或使用 TanStack Query 的预加载功能。

### 第二阶段：迁移页面和布局

#### 任务 2.1：迁移 trash 和 review

**文件：**
- `src/features/trash/composables/useTrashPage.ts`
- `src/features/review/composables/useReviewFinishList.ts`

#### 任务 2.2：迁移 workspace

**文件：**
- `src/features/workspace/ui/DraggableProjectTree.vue`
- `src/features/workspace/composables/useWorkspaceProjectView.ts`

#### 任务 2.3：迁移 layouts

**文件：**
- `src/layouts/Sidebar.vue`
- `src/layouts/Header.vue`

### 第三阶段：迁移辅助功能

#### 任务 3.1：迁移 app-shell

**文件：**
- `src/features/app-shell/composables/useAppGlobalOverlays.ts`

### 第四阶段：清理

#### 任务 4.1：移除旧代码

**操作：**
1. 确认所有文件已迁移
2. 搜索是否还有使用 `useProjectsStore` 的地方
3. 移除 `src/stores/projects.ts`
4. 更新文档

#### 任务 4.2：更新文档

**操作：**
1. 更新迁移指南，标记为已完成
2. 更新架构文档
3. 添加迁移示例代码

## 验证方法

### 自动化验证

```bash
# 检查是否还有使用旧 store 的地方
grep -r "useProjectsStore" src/ --include="*.ts" --include="*.vue"

# 应该返回空或仅剩文档中的示例
```

### 手动验证

1. **功能测试**
   - 创建任务
   - 创建项目
   - 编辑任务/项目
   - 删除任务/项目
   - 查看详情面板
   - 切换工作区

2. **性能测试**
   - 页面加载速度
   - 数据刷新速度
   - 内存使用情况

3. **错误处理测试**
   - 网络错误
   - 数据验证错误
   - 权限错误

## 回滚计划

如果迁移过程中遇到问题：

1. **保留旧代码**
   - 不要立即删除 `src/stores/projects.ts`
   - 在完成所有迁移并测试通过后再删除

2. **Git 分支策略**
   ```bash
   # 创建迁移分支
   git checkout -b refactor/state-management-migration
   
   # 每完成一个阶段就提交
   git commit -m "refactor: migrate create-flow to TanStack Query"
   
   # 如果有问题，可以回滚
   git checkout main
   ```

3. **功能开关（可选）**
   ```typescript
   // 可以考虑使用功能开关，逐步切换
   const USE_NEW_STATE_MANAGEMENT = true
   
   if (USE_NEW_STATE_MANAGEMENT) {
     // 使用新代码
   } else {
     // 使用旧代码
   }
   ```

## 时间估算

- **第一阶段**：2-3 天
- **第二阶段**：2-3 天
- **第三阶段**：1 天
- **第四阶段**：1 天
- **总计**：6-8 天

## 注意事项

1. **渐进式迁移**
   - 每次只迁移一个文件或一组相关文件
   - 每次迁移后都要测试
   - 不要一次性修改太多文件

2. **保持兼容性**
   - 在完全迁移前，新旧代码可能需要共存
   - 确保数据流向清晰

3. **文档更新**
   - 及时更新迁移进度
   - 记录遇到的问题和解决方案

4. **团队沟通**
   - 告知团队成员迁移计划
   - 协调好开发节奏
   - 避免同时修改同一文件

## 成功标准

迁移成功的标准：

1. ✅ 所有组件不再使用 `useProjectsStore`
2. ✅ 功能正常工作，无报错
3. ✅ 性能无明显退化
4. ✅ 测试覆盖充分
5. ✅ 文档已更新
6. ✅ 团队已培训新用法

## 下一步行动

**推荐立即开始：**

从最简单的文件开始，例如：
1. `src/features/create-flow/composables/useCreateTaskModal.ts`
2. `src/features/create-flow/composables/useCreateProjectModal.ts`

这两个文件相对独立，迁移风险小，适合作为第一次迁移的练习。

**命令：**
```bash
# 开始迁移第一个文件
# 我可以帮你完成迁移，只需要你确认：
# "开始迁移 useCreateTaskModal.ts"
```
