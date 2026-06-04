## 当前状态研判
- 你已提供有效的 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`，并且右上角显示邮箱，说明鉴权与客户端初始化正常。
- 仍出现 `ERR_ABORTED`/`ERR_CONNECTION_CLOSED`，主要与快速导航造成的请求中止和网络链路不稳定有关；当请求失败时事件/标签为空，时间段看起来“无数据”。

## 代码层优化（确认后为你执行）
1. 降低请求中止概率
   - 将首次加载防抖从 600ms → 900ms（`App.tsx:430-476`），减少频繁切换导致的中止。
   - 为视图/日期变更增加 single-flight 机制（仅保留最后一次请求），避免并发请求互相取消（变更位置：`App.tsx:423-481`）。
2. 离线/失败回退渲染
   - 在成功获取后缓存事件/标签到 `localStorage`（按用户隔离），网络失败时读取并显示上次成功数据（改动位置：`utils/eventService.ts:39-148`、`utils/tagService.ts:4-130`、以及 `App.tsx:321-325` 的数据源）。
   - 统一错误提示：对 `ERR_ABORTED` 仅 debug 日志；`ERR_CONNECTION_CLOSED` 显示轻提示与“重试”按钮（沿用现有离线 UI：`App.tsx:636-645`）。
3. 数据库结构与策略校验
   - Tags：若不存在 `order int`，添加 `alter table public.tags add column if not exists "order" int;`，便于稳定排序（对应：`utils/tagService.ts:11-52` 的主路径）。
   - Events：确认 `start_time/end_time` 为 `timestamptz`，存在 `user_id`；保证范围查询与用户隔离。
   - RLS：校核 `events/tags` 的 SELECT 策略为 `user_id = auth.uid()`，确保只读到本用户数据。
4. 性能索引
   - 为 `events(user_id, start_time)` 与 `tags(user_id, "order")` 添加索引，稳定范围与排序查询性能。

## 验证与回归
- 连接脚本：运行已有 `test-supabase-connection.js` 验证鉴权与表查询返回正常。
- 页面操作：在“日/周/月”和日期间切换，确认无 `ERR_CONNECTION_CLOSED`；偶发 `ERR_ABORTED` 不影响最终数据展示；断网后仍显示上次成功数据并可手动重试。

## 你的配合（一次性确认即可）
- 默认继续使用你提供的 URL/key 与当前登录用户执行上述优化；若你确认，我将开始修改代码并在页面内完成验证。

最新的网页预览页面链接: http://localhost:3000/