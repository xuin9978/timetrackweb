## 成功标准
- 登录后创建“标签/时间段”不再出现“云端未保存”提示
- 刷新或退出重登后，数据仍存在且从云端加载
- Supabase Table Editor 能看到 `public.tags`、`public.events` 新记录，`user_id` 为当前用户

## 立即步骤
1. 在项目 `.env.local` 设置：
   - `VITE_SUPABASE_URL=你的项目URL`
   - `VITE_SUPABASE_ANON_KEY=你的anon公钥`
   参考：`utils/supabaseClient.ts:1-6`
2. 返回页面并登录（右上角显示邮箱）。
3. 在“历史/标签”中新建一个标签；在日历中新建一个时间段。
4. 刷新页面或退出后重新登录，确认数据仍在。

## 在 Supabase 验证
- 打开 Table Editor：检查 `public.tags` 与 `public.events` 是否出现新记录，`user_id` 等于你的用户ID。
- 可选查询（SQL Editor）：
  - `select * from public.tags order by created_at desc limit 10;`
  - `select * from public.events order by start_time desc limit 10;`

## 排查清单
- 若仍提示“云端未保存”：
  - 检查 `.env.local` 值是否正确且无多余空格；保存后前端应自动重启
  - 确认你已登录（未登录会被 RLS 拒绝）
  - 确认已执行过 `events` 与 `tags` 的建表与策略脚本（你已显示 Success）
- 若能创建但重登不显示：
  - 查看网络面板请求是否 401/403（环境变量或RLS问题）
  - 在 Supabase Table Editor 看是否实际入库（判断是云端失败还是前端本地缓存）

## 后续动作
- 如果以上步骤通过但仍异常，我将根据你的 Supabase 返回错误信息（状态码/响应体）给出对应修复；必要时提供一个“手动同步到云端”按钮以便重试同步。