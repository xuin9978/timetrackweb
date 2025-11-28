## 问题概述
- 三条错误日志：
  - `net::ERR_ABORTED` 请求到 `tags` 与 `events`。
  - `TypeError: Failed to fetch`，发生在初始化数据加载。
- 典型成因：组件或用户态变化导致前一次请求被新请求中止；或瞬时网络/后端不可达。当前初始化并发拉取两类数据，未优雅处理中止与重试。

## 目标
- 在用户/路由变化时安全取消在途请求，不产生错误日志。
- 降低载荷与并发压力，避免浏览器资源问题。
- 对瞬时网络失败（非中止）进行友好的重试与 UI 反馈。

## 技术方案
### 1) 为 Supabase 查询接入 AbortSignal
- 依据官方文档支持 `.abortSignal(signal)`（参考：Supabase JS 文档 https://supabase.com/docs/reference/javascript/db-abortsignal）。
- 修改数据层：
  - `utils/tagService.ts:1` 的 `fetchTags(userId, page=1, perPage=50, signal?)`：在 PostgREST 查询上调用 `.abortSignal(signal)`，并将 `AbortError` 视为正常中止返回空集合，不抛错。
  - `utils/eventService.ts:1` 的 `fetchEvents(userId, signal?)`：同上处理。

### 2) 在 App 层集中管理请求与中止
- `App.tsx` 初始化加载（`React.useEffect`，大约 `App.tsx:300+`）：
  - 创建 `AbortController`，将 `controller.signal` 传入 `fetchTags` 和 `fetchEvents`。
  - 在清理函数中调用 `controller.abort()`。
  - 在 `catch` 中忽略 `AbortError` 或被识别为中止的错误，仅记录真实失败。

### 3) 降载与分页
- 精准选择列：将 `select('*')` 改为仅需要的列，以降低响应体：
  - `tags`：`select('id,label,color,icon,created_at')`。
  - `events`：`select('id,title,start_time,end_time,category')`。
- 标签分页已具备；为 `events` 同步引入分页（`page, perPage` + `.range(...)`），并在需要的视图中按需加载（如历史视图滚动或“加载更多”）。

### 4) 去重与序列化请求
- 在初始化加载中引入 `requestId` 本地序列（仅最新响应可落库），避免快速切换用户态时旧响应覆盖新响应。

### 5) 瞬时网络失败的重试与 UI 反馈
- 封装通用 `retry`（最大 3 次，指数退避，尊重 AbortSignal）。
- `App.tsx` 在初始化加载失败时：
  - 若 `navigator.onLine === false`，显示离线提示与“重试”按钮。
  - 其他失败显示轻量提示（不打断主界面）。

## 代码改动点
- `utils/tagService.ts:1`：为 `fetchTags` 添加 `signal` 支持、精简列选择、保留分页。
- `utils/eventService.ts:1`：为 `fetchEvents` 添加 `signal` 支持、精简列选择，新增分页签名。
- `App.tsx:300+`：初始化加载处接入 `AbortController`，改良错误分流与清理，加入请求序列保护；必要处（更新/删除后刷新）保留直接刷新但避免并发覆盖。

## 验证
- 启动应用，快速登录/登出或切换用户，确认：
  - 旧请求被中止但不再产生日志错误；最新数据正确渲染。
- 断网后再联网：首次失败触发提示与重试，恢复后数据正常。
- 大量标签/事件场景：分页与精简列保障响应稳定，浏览器不再出现资源不足或中止噪声。

## 备注
- 当前依赖版本 `@supabase/supabase-js@^2.84.0` 支持 `.abortSignal(signal)`（文档见上）。如后续升级，保持该接口兼容性验证。