## 根因定位
- 事件未被渲染到“今天”：按天渲染依赖 `isSameDay(event.date, day)`（utils/dateUtils.ts:118、components/Calendar.tsx:75），若事件跨零点且未按天拆分，今天不会出现。
- 过滤导致不可见：前端按 `visibleTags` 过滤（App.tsx:239）。若事件的 `category` 不在 `visibleTags`，会被隐藏；但加载后代码已 union 事件分类到 `visibleTags`，一般可见。
- 时区/日期映射：`fromDB` 将 Supabase 的 `timestamptz` 转为 Date 并再构造 `date`（utils/eventService.ts:14-25）。若处理不一致，会出现“今天”判断失败。
- 拉取失败或RLS：若 Supabase Key/URL/CORS/网络异常，或 RLS 仅允许 INSERT 不允许 SELECT，则前端无法拉取。迁移文件已包含 `select` 策略（supabase/migrations/001_events.sql:20-22）。

## 修复方案
1) 正确支持跨日拆分
- 改造 `splitEventAcrossDays`：当 `endTime < startTime` 表示跨日，将区间按天切片，返回多个段（今天与次日各一段）。
- 在创建与导入时使用拆分：
  - `handleAddEvent` 已调用拆分，保留；
  - `handleImportEvents` 对每条导入事件 `flatMap(splitEventAcrossDays)` 后再保存（App.tsx:363-414）。

2) 统一“日期归一化”规则
- 在 `fromDB` 保持本地时区一致性：以事件开始时间 `start` 的本地年月日生成 `date`（用于 `isSameDay`），避免 UTC→本地跨日偏差。
- 验证今天/非今天的 `isSameDay(event.date, new Date())` 行为一致。

3) 防止 0/负时长导致渲染异常
- 在 `AddEventModal` 提交前校验，若 `end <= start`，自动设为 `start + 15min`。

4) 增强数据拉取与可见性
- 创建后拉取增加一次 500ms 重试，避免后端延迟导致“新事件未出现”。
- 在首次加载后 `visibleTags = tags + 事件分类集合`，确保新分类可见（App.tsx:372-378）。

5) 连接与策略验证
- 检查 `.env.local` 的 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`；
- 在浏览器 Network 验证 `GET /rest/v1/events` 成功返回；
- 在 Supabase 确认 `events/tags` 的 `select` 策略启用。

## 验证用例
- 创建“今天 23:00 至 明天 02:00”，检查今天/次日各自显示分段；
- 导入 ICS 跨日事件，确认今天片段显示；
- 创建普通事件后立刻显示；切换标签可见性不会隐藏新事件；
- 控制台打印拉取到的事件数量与分类，确认与后台一致。

如确认以上方案，我将按上述文件点修改并完成本地验证。