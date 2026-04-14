# features 目录导航

`src/features` 是当前前端唯一业务主战场。

完整架构规范请直接看：

- [ARCHITECTURE.md](/Users/sty/Desktop/StoneFlow/src/ARCHITECTURE.md)

## 当前约定

- `features` 按业务组织，不按技术类型组织
- 子 feature 默认骨架是：`model + logic + ui + index.ts`
- 页面层只挂接 feature scene，不直接承担大业务逻辑
- `logic` 负责业务编排，文件名继续使用 `useXxx.ts`
- `ui` 放页面 scene、业务组件、弹窗与局部界面
- `index.ts` 只做白名单导出，禁止 `export *`

## 当前主要业务套件

- `workspace`
- `assets`
- `settings`
- `review`
- `system`

## 迁移提醒

以下旧心智模型已经废弃：

- 顶层 `components`
- 顶层 `stores`
- 顶层 `services`
- 顶层 `composables`

以后新增功能，请先判断：

1. 属于哪个业务 feature
2. 属于 `model`、`logic` 还是 `ui`
3. 是否只是纯共享能力
4. 是否只是技术适配

如果拿不准，先回到 [ARCHITECTURE.md](/Users/sty/Desktop/StoneFlow/src/ARCHITECTURE.md) 看完整判定规则。
