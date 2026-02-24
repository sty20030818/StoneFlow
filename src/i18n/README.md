# i18n Key 规范

- 命名格式：`<domain>.<feature>.<element>`，例如 `settings.remoteSync.status.testing`
- key 必须稳定，不得用显示文案本身作为 key
- 同一语义跨页面复用同一个 key（优先放在 `common.*`）
- 新增文案必须同时补全 `zh-CN` 与 `en-US`，禁止只改单语言
- 运行时禁止新增硬编码用户可见文案（测试桩与调试日志除外）
