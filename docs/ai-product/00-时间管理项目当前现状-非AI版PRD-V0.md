# 时间管理项目当前现状 PRD V0（非 AI 版）

## 1. 项目一句话定位

这是一个以日历时间块、标签分类、计时记录和 Supabase 云端同步为核心的个人时间管理 Web/PWA 应用。

依据：`App.tsx` 以 `calendar`、`alarm`、`history` 三个主模块组织产品入口；`components/Calendar.tsx`、`components/Alarm.tsx`、`components/History.tsx` 分别承载日历、计时器和历史记录；`utils/eventService.ts`、`utils/tagService.ts` 负责 Supabase 数据读写。

## 2. 当前目标用户

当前最适合的用户是：需要以“时间块 + 标签”记录每日事项，并希望在日历、计时器和历史列表之间形成轻量闭环的个人效率用户。

更具体地说，当前产品更适合：

- 已经愿意手动记录时间段的人。
- 希望用标签区分工作、学习、生活、休息等时间类别的人。
- 需要在手机/PWA 或桌面浏览器中查看当天、当周、当月时间安排的人。
- 需要通过 `.ics` 和 JSON 做日历迁移、备份、恢复的人。

不太适合：

- 期待自动识别浏览器、应用或系统行为的人。
- 期待 AI 自动总结、目标追踪、计划建议的人。
- 需要团队协作、共享日历、权限管理的人。

## 3. 核心用户问题

### 已经通过现有功能解决的问题

- 用户可以创建、编辑、删除日程时间块：`components/AddEventModal.tsx`、`App.tsx` 的 `handleAddEvent`、`handleUpdateEvent`、`handleDeleteEvent`。
- 用户可以按日、周、月查看时间安排：`components/Calendar.tsx`、`components/TimeGrid.tsx`、`utils/dateUtils.ts` 的 `generateCalendarData` 和 `getVisibleDateRange`。
- 用户可以用标签给时间分类：`components/CreateTagModal.tsx`、`components/TagManagerModal.tsx`、`utils/tagService.ts`。
- 用户可以用秒表或倒计时记录一段时间，并同步成日程：`components/Alarm.tsx`、`components/LogSessionModal.tsx`、`App.tsx` 的 `handleLogSession`。
- 用户可以查看某一天的历史记录，并按标签筛选或分组：`components/History.tsx`。
- 用户可以查看规则统计类洞察，例如总时长、最多标签、最长连续时间、下一段空闲：`components/EventPanel.tsx` 的 `insights` 计算。
- 用户可以通过 Supabase 登录、同步 events 和 tags：`utils/supabaseClient.ts`、`utils/eventService.ts`、`utils/tagService.ts`、`components/AuthModal.tsx`。
- 用户可以导入 `.ics`、导出 `.ics`、导出/恢复 JSON：`components/SettingsModal.tsx`、`utils/dateUtils.ts` 的 `parseICS` 和 `exportToICS`。

### 还没有解决的问题

- 时间记录还不能自动形成自然语言复盘或原因解释。
- 标签统计还不能判断“今天是否高效”“时间分配是否符合目标”。
- 历史记录只展示和聚合，不提供趋势、周报、异常提醒或建议。
- 当前没有目标、计划、反馈、评分、心情、任务完成状态等闭环字段。
- 当前没有真实 AI 模型调用，也没有 AI 结果存储。
- 事件只有标题、开始时间、结束时间、标签、日期等基础字段；`CalendarEvent.description` 在类型里存在，但当前 Supabase `events` 表和事件保存逻辑没有持久化 description。

### 后续 AI 功能可能解决的问题

- 根据 events/tags/date/duration 生成每日或每周时间复盘。
- 识别时间分布异常，例如休息不足、碎片时间过多、某类标签占比异常。
- 将规则统计转成更可读的自然语言洞察。
- 根据用户目标补充建议，但前提是需要新增目标、计划或用户偏好输入。
- 生成可用于作品集、面试表达的“时间管理洞察报告”。

## 4. 当前产品范围

### 日历视图

功能描述：提供日、周、月三种视图，展示时间块和事件列表。

用户能做什么：

- 切换日/周/月视图。
- 前后翻页。
- 点击月视图日期进入日视图。
- 在日/周时间网格中拖拽创建时间段。
- 拖动或调整已有事件时间。
- 在右侧事件面板查看当前范围内的日程、分组、统计和规则洞察。
- 按标签控制日历显示。

相关代码位置：

- `components/Calendar.tsx`
- `components/TimeGrid.tsx`
- `components/DayCell.tsx`
- `components/EventPanel.tsx`
- `utils/dateUtils.ts`
- `types.ts` 的 `ViewMode`、`DayData`、`DragSelection`

当前完成度：较完整。日、周、月视图、时间网格、拖拽创建、事件点击、标签筛选和右侧面板已经接入。

已知限制：

- 右侧“智能洞察”是前端规则统计，不是 AI。
- 只有当前可见日期范围会从 Supabase 加载，跨范围趋势需要额外查询。
- 日程描述字段未完整落库。
- 复杂重复日程、提醒、地点、参与人、全天事件等标准日历能力未看到实现。

### 事件管理

功能描述：用户可以新建、编辑、删除日程事件，事件包含标题、开始时间、结束时间、标签、日期。

用户能做什么：

- 通过日历拖拽或“新增日程”打开新增弹窗。
- 输入标题、选择标签、设置起止时间。
- 编辑已有事件。
- 删除事件。
- 创建失败、更新失败、删除失败时回滚乐观更新。
- 创建、更新、删除后通过 toast 撤销部分操作。

相关代码位置：

- `components/AddEventModal.tsx`
- `App.tsx` 的 `handleAddEvent`、`handleUpdateEvent`、`handleDeleteEvent`
- `utils/eventService.ts`
- `utils/dateUtils.ts` 的 `splitEventAcrossDays`
- `supabase/migrations/001_events.sql`
- `supabase/migrations/002_add_category_to_events.sql`

当前完成度：核心 CRUD 已实现，并带乐观更新、失败回滚、JWT 过期处理和跨天拆分。

已知限制：

- Supabase 表字段只有 `id`、`user_id`、`title`、`start_time`、`end_time`、`created_at`、`category`，没有 description、location、recurrence、status。
- `CalendarEvent` 类型有 `description`，但 `createEvents`、`updateEvent` 没有写入 description。
- 跨天事件会拆分为多个 segment，但 DB 读取 `fromDB` 没有恢复 `seriesId`、`segmentIndex` 等元数据，跨天连续性主要存在于前端创建当次的状态中。

### 标签系统

功能描述：用户可以创建、编辑、删除、排序、筛选标签，用标签给事件分类。

用户能做什么：

- 创建标签名称、颜色、图标。
- 编辑标签。
- 删除标签。
- 拖拽排序标签。
- 在日历和历史记录中按标签筛选。
- 导入 `.ics` 时选择统一归属标签。

相关代码位置：

- `components/CreateTagModal.tsx`
- `components/TagManagerModal.tsx`
- `components/ImportTagSelectionModal.tsx`
- `utils/tagService.ts`
- `utils/dateUtils.ts` 的 `APPLE_CALENDAR_COLORS`
- `supabase/migrations/002_tags.sql`
- `supabase/migrations/003_add_order_to_tags.sql`

当前完成度：可用。标签 CRUD、排序、颜色、图标、筛选都已实现。

已知限制：

- 标签只有名称、颜色、图标、排序，没有分类层级、语义说明、生产力权重、目标绑定。
- 删除标签会将关联事件归为未分类，而不是要求用户迁移到新标签。
- 标签排序会同时写 Supabase 和 localStorage；当数据库缺少 `order` 字段时会降级为本地排序。

### 计时器 / 秒表

功能描述：用户可以使用秒表或倒计时，完成后把计时区间同步为日程。

用户能做什么：

- 在“闹钟”模块切换秒表/计时器。
- 设置倒计时时长。
- 启动、停止、继续。
- 完成计时后填写说明并选择最多 5 个标签。
- 将计时结果同步为一个或多个事件。

相关代码位置：

- `components/Alarm.tsx`
- `components/TimerSetupModal.tsx`
- `components/LogSessionModal.tsx`
- `App.tsx` 的 `alarmState` 和 `handleLogSession`
- `types.ts` 的 `AlarmState`、`AlarmMode`、`LogSessionModalConfig`

当前完成度：基础计时闭环已实现。

已知限制：

- 计时器状态只在前端内存中，刷新页面后不会恢复。
- 完成后选择多个标签会创建多条同时间段事件，可能导致统计重复计算总时长。
- LogSessionModal 的 description 最终用于事件标题，当前没有单独 description 字段落库。
- 没有番茄钟轮次、提醒声音、后台计时持久化等能力。

### 历史记录

功能描述：按日期查看已记录事件，支持标签筛选、分组、标签管理入口。

用户能做什么：

- 选择某一天查看记录。
- 通过迷你日历跳转日期。
- 按标签筛选记录。
- 按标签分组查看当天总时长和记录数。
- 点击历史卡片进入事件编辑。
- 打开标签管理。

相关代码位置：

- `components/History.tsx`
- `components/MiniCalendar.tsx`
- `components/TagManagerModal.tsx`
- `utils/dateUtils.ts` 的时长格式化方法

当前完成度：日级历史查看和标签聚合已实现。

已知限制：

- 历史记录没有周/月趋势。
- 没有复盘文本、目标达成判断、异常原因解释。
- 默认只基于当前 App 中已加载的 `events` 状态，若日历端没有加载全量历史，则历史模块可见数据范围可能受 App 当前数据加载策略影响，需进一步实测确认。

### 数据同步 / Supabase

功能描述：通过 Supabase Auth 登录，按用户隔离 events 和 tags 数据。

用户能做什么：

- 邮箱密码登录和注册。
- 登录后同步日程和标签。
- 退出登录。
- 网络异常时使用本地缓存或备份查看部分数据。
- 同步失败时看到状态条和重试按钮。

相关代码位置：

- `utils/supabaseClient.ts`
- `components/AuthModal.tsx`
- `components/AccountModal.tsx`
- `App.tsx` 的 `handleLogin`、`handleRegister`、`syncStatusCopy`
- `utils/eventService.ts`
- `utils/tagService.ts`
- `utils/dataBackupService.ts`
- `supabase/migrations/*.sql`
- `supabase/migrations.sql`
- `supabase_rls_policies.sql`

当前完成度：核心云同步已接入。

已知限制：

- 当前仓库没有看到完整用户 settings 表。
- Supabase 只配置匿名 key 和 URL，缺少环境变量时 client 为 null。
- RLS SQL 有多个文件版本，存在 `supabase_rls_policies.sql` 和 `supabase-rls-policies.sql` 两份命名相近文件，后续应确认实际部署采用哪份。
- README 仍要求 `GEMINI_API_KEY`，但当前 Supabase client 使用的是 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。

### 导入导出

功能描述：支持应用数据 JSON 备份/恢复，以及 `.ics` 日历导入和导出。

用户能做什么：

- 导出完整应用数据 JSON，包括 events、tags、exportDate、version。
- 从 JSON 恢复 events 和 tags。
- 导入 Apple/Google 日历 `.ics` 文件，解析事件后选择导入标签。
- 按全部、日、周、月、自定义范围导出 `.ics`。
- 按标签导出 `.ics`。

相关代码位置：

- `components/SettingsModal.tsx`
- `components/ImportTagSelectionModal.tsx`
- `utils/dateUtils.ts` 的 `parseICS`、`exportToICS`
- `App.tsx` 的 `handleRestoreData`、`handleImportEvents`

当前完成度：可用，覆盖 JSON 备份恢复和 ICS 双向流转。

已知限制：

- `.ics` 导入只解析 SUMMARY、DTSTART、DTEND、DESCRIPTION 中的 `Category: `。
- `.ics` 导出 DESCRIPTION 只写 `Category: ${event.category}`，不是标签名称。
- “智能导入 Apple/Google 日历”是规则解析和标签选择，不是 AI。
- JSON 恢复登录态下会用 `replaceAllEvents` 替换全部云端事件，风险较高，需要用户确认策略。

### 设置

功能描述：设置弹窗主要承载数据备份、恢复、外部日历导入和导出。

用户能做什么：

- 备份和恢复应用数据。
- 导入 `.ics`。
- 选择范围导出 `.ics`。

相关代码位置：

- `components/SettingsModal.tsx`
- `App.tsx` 的 `isSettingsOpen`

当前完成度：数据管理类设置已实现。

已知限制：

- 没有看到独立的用户设置持久化，例如默认视图、工作时间、周起始日、AI 偏好等。
- 主题明暗模式保存在 localStorage：`App.tsx` 的 `calendar-color-mode`。

### 其他模块

#### PWA / 移动端适配

功能描述：检测 standalone/PWA 模式，并调整 class。

相关代码位置：

- `index.tsx`
- `manifest.json`
- `index.html`

完成度：已有基础 PWA 适配。

限制：未看到 service worker 或离线应用壳缓存配置，待确认实际 PWA 离线能力。

#### 错误和失败态

功能描述：同步失败、离线、会话过期、操作失败有 toast 或状态条提示。

相关代码位置：

- `App.tsx`
- `utils/eventService.ts`
- `utils/tagService.ts`
- `index.tsx`

完成度：基础失败态较完整。

限制：部分错误用 `alert`，部分用 toast，体验不统一。

#### AI / prompt / insight / analysis 相关

- `components/EventPanel.tsx` 的“智能洞察”：真实功能，但本质是规则统计，不是 AI。计算总时长、最多标签、最长连续、下一段空闲。
- `components/SettingsModal.tsx` 的“智能导入 Apple/Google 日历”：真实功能，但本质是 `.ics` 规则解析和手动选择标签，不是 AI。
- `utils/promptSystem.ts`：存在 prompt 白名单、结构解析、格式校验和模板响应逻辑，但没有在主 App 中发现调用，也没有模型 SDK 或网络请求。当前判断为占位/模板/未接入主功能。
- `README.md` 和 `vite.config.ts` 中出现 `GEMINI_API_KEY`：README 是 AI Studio 模板说明；`vite.config.ts` 注入 Gemini env，但主应用未发现真实 Gemini 调用。当前判断为模板残留或未接入配置。
- `today-events-display-issue-analysis.md`：问题分析文档，不是产品功能。

## 5. 核心用户路径

### 路径 1：创建和管理日程

触发入口：日历页新增按钮、时间网格拖拽、右侧事件面板新增按钮。

用户操作：选择时间段，填写标题，选择标签，提交。

系统处理：`AddEventModal` 组装事件数据；`App.tsx` 的 `handleAddEvent` 调用 `splitEventAcrossDays` 处理跨天，再进行乐观更新；登录且 Supabase 可用时调用 `createEvents` 写入 `events` 表；失败时回滚并提示。

输出结果：日历时间块出现，右侧事件列表更新，Supabase 同步成功后显示成功 toast。

相关代码位置：

- `components/Calendar.tsx`
- `components/TimeGrid.tsx`
- `components/AddEventModal.tsx`
- `App.tsx`
- `utils/eventService.ts`
- `utils/dateUtils.ts`

### 路径 2：使用计时器记录时间

触发入口：左侧导航进入“闹钟”模块。

用户操作：选择秒表或计时器，启动，停止/继续，完成后填写说明并选择标签。

系统处理：`Alarm` 用 `requestAnimationFrame` 更新显示；完成后计算开始/结束时间，打开 `LogSessionModal`；`handleLogSession` 将结果转成一条或多条事件并复用 `handleAddEvent` 写入日历和 Supabase。

输出结果：计时区间成为日历事件，可在日历和历史中查看。

相关代码位置：

- `components/Alarm.tsx`
- `components/TimerSetupModal.tsx`
- `components/LogSessionModal.tsx`
- `App.tsx`

### 路径 3：查看历史记录

触发入口：左侧导航进入“历史”模块。

用户操作：选择日期，筛选标签，切换按标签分组，点击某条记录。

系统处理：`History` 从 `events` 中筛选 `viewDate` 当天记录，按时间排序；筛选标签；分组模式下按 category 聚合并计算总时长；点击记录调用 `onOpenModal` 进入编辑。

输出结果：展示当天时间记录列表或按标签聚合的记录和时长。

相关代码位置：

- `components/History.tsx`
- `components/MiniCalendar.tsx`
- `components/AddEventModal.tsx`

### 路径 4：通过标签理解时间分布

触发入口：日历右侧事件面板或历史模块。

用户操作：切换分组/统计视图，筛选标签。

系统处理：`EventPanel` 将当前视图范围内的 events 按 category 聚合，计算每个标签总时长；`History` 在单日维度按标签分组并计算总时长。

输出结果：用户看到当前日/周/月或某天各标签耗时。

相关代码位置：

- `components/EventPanel.tsx`
- `components/History.tsx`
- `utils/dateUtils.ts`

### 路径 5：导入或同步日历数据

触发入口：设置弹窗“数据备份与同步”。

用户操作：选择 `.ics` 文件导入，或选择范围/标签导出 `.ics`，或导出/恢复 JSON。

系统处理：导入时 `parseICS` 解析文件，`ImportTagSelectionModal` 要求用户选择标签，`handleImportEvents` 去重、跨天拆分并写入本地或 Supabase；导出时 `exportToICS` 生成文件；JSON 恢复时 `handleRestoreData` 替换或设置事件数据。

输出结果：日历数据被导入、导出或恢复。

相关代码位置：

- `components/SettingsModal.tsx`
- `components/ImportTagSelectionModal.tsx`
- `utils/dateUtils.ts`
- `App.tsx`

## 6. 当前数据结构和数据流

### 主要数据对象

#### Tag

来源：`types.ts`

核心字段：

- `id: string`
- `label: string`
- `color: string`
- `icon?: string`
- `order?: number`

数据库字段：

- `supabase/migrations/002_tags.sql`：`id`、`user_id`、`label`、`color`、`icon`、`created_at`
- `supabase/migrations/003_add_order_to_tags.sql`：`order`

#### CalendarEvent

来源：`types.ts`

核心字段：

- `id: string`
- `title: string`
- `startTime: string`
- `endTime: string`
- `category: string`
- `date: Date`
- `description?: string`
- `seriesId?: string`
- `segmentIndex?: number`
- `segmentCount?: number`
- `continuesFromPreviousDay?: boolean`
- `continuesToNextDay?: boolean`

数据库字段：

- `supabase/migrations/001_events.sql`：`id`、`user_id`、`title`、`start_time`、`end_time`、`created_at`
- `supabase/migrations/002_add_category_to_events.sql`：`category`

待确认：

- `description` 在类型中存在，但数据库和 service 当前未持久化。
- 跨天 segment 元数据没有对应数据库字段。

#### User

来源：Supabase Auth。

当前前端使用字段：

- `currentUser.id`
- `currentUser.email`

相关代码位置：

- `App.tsx`
- `components/AuthModal.tsx`
- `components/AccountModal.tsx`
- `utils/supabaseClient.ts`

#### Settings

当前没有独立 settings 数据对象或 Supabase 表。

已看到的本地设置：

- `calendar-color-mode` 存在 localStorage。
- 标签排序在部分情况下存在 `tag_order_${userId}` 或 `tag_order_guest`。

### 数据存储在哪里

- 登录用户的事件：Supabase `events` 表。
- 登录用户的标签：Supabase `tags` 表。
- Supabase Auth session：由 Supabase client 持久化。
- 事件缓存：`localStorage` 的 `events_cache_${userId}` 和 `events_backup_${userId}`。
- 标签缓存：`localStorage` 的 `tags_cache_${userId}`。
- 标签排序缓存：`localStorage` 的 `tag_order_${userId}` 或 `tag_order_guest`。
- 主题模式：`localStorage` 的 `calendar-color-mode`。
- 未登录时：`INITIAL_EVENTS` 和 `INITIAL_TAGS` 均为空，未登录新建事件会提示登录；部分导入异常分支可写入本地 state。

### 前端状态和 Supabase 如何同步

- App 初始化时监听 Supabase auth session，得到 `currentUser`。
- 有 `currentUser` 时，根据当前 `currentDate`、`viewMode`、`selectedDate` 计算可见日期范围。
- 并行调用 `fetchTagsDB(currentUser.id, 1, 50)` 和 `fetchEvents(currentUser.id, startDate, endDate)`。
- 读成功后写入 React state：`tags`、`events`、`visibleTags`。
- 事件新增、编辑、删除使用乐观更新：先更新 state，再调用 Supabase；失败则回滚。
- 标签新增、编辑、删除、排序也采用前端状态更新，再调用 Supabase 或 localStorage 降级。
- 网络异常时读取 localStorage 缓存或备份，并设置 `syncStatus` 为 `offline-cache` 或 `sync-error`。

### 适合作为后续 AI 复盘输入的数据

适合直接复用：

- 事件标题：`CalendarEvent.title`
- 日期：`CalendarEvent.date`
- 起止时间：`startTime`、`endTime`
- 时长：可由 `getDurationInMinutes` 计算
- 标签 ID：`category`
- 标签名称/颜色/图标：`Tag.label`、`Tag.color`、`Tag.icon`
- 日/周/月聚合结果：可复用 `EventPanel` 和 `History` 中已有聚合逻辑

需要补充或待确认：

- 目标/计划：当前没有。
- 用户自评/反馈：当前没有。
- 任务完成状态：当前没有。
- 事件描述：类型有，持久化未接入。
- 心情、能量、专注度：当前没有。
- AI 复盘结果存储表：当前没有。

## 7. 当前非 AI 能力边界

### 已经能做到

- 记录时间块。
- 用标签分类时间。
- 在日/周/月维度查看日程。
- 使用秒表/计时器把实际耗时转成日程。
- 查看单日历史。
- 按标签筛选、分组和统计总时长。
- 规则计算总时长、最多标签、最长连续时间、下一段空闲。
- 通过 Supabase 按用户同步 events 和 tags。
- 通过 JSON 和 `.ics` 做备份、恢复、导入和导出。
- 在网络异常、会话过期、保存失败时给出基础提示或回滚。

### 规则统计能完成的事情

- 计算某个范围内总时长。
- 计算每个标签总耗时。
- 找出耗时最多标签。
- 计算最长连续时间块。
- 查找下一段 15 分钟以上空闲。
- 根据日期筛选历史记录。
- 根据标签筛选记录。

### 需要用户手动判断的事情

- 今天时间使用是否合理。
- 某个标签耗时多是否代表高效或低效。
- 哪些事件是计划内、计划外、被打断或低价值。
- 时间分配是否符合个人目标。
- 复盘结论和改进动作。
- 导入日历事件应该归属哪个标签。

### 未来适合 AI 介入的事情

- 将规则统计转成自然语言复盘。
- 根据标签分布给出异常提醒。
- 对比用户目标和实际时间分配。
- 从事件标题中识别主题或任务类型。
- 生成周报、月报、面试作品集案例表达。
- 识别 Badcase：例如重复记录、标签过粗、无效标题、缺失记录、计时重复统计。

## 8. 当前问题与产品缺口

### 时间记录是否能形成洞察

当前能形成基础规则洞察，但还不能形成真正的复盘。

证据：

- `EventPanel` 已计算总时长、最多标签、最长连续、下一段空闲。
- `History` 已支持按标签分组计算单日时长。

缺口：

- 没有自然语言解释。
- 没有趋势对比。
- 没有目标参照。
- 没有“为什么出现这种分布”的因果线索。

### 历史记录是否能帮助复盘

当前能帮助用户回看某一天做了什么，但复盘价值有限。

缺口：

- 只能看单日，不是完整周/月复盘。
- 没有自动总结。
- 没有高低效判断。
- 没有行动建议。

### 标签是否足够支持分析

当前标签足够支持基础分类和时长统计，但不足以支持深度分析。

缺口：

- 标签没有层级，例如工作/深度工作/会议。
- 标签没有目标属性，例如应该增加或减少。
- 标签没有价值权重。
- 标签没有用户定义的解释或 AI 可用语义描述。

### 是否缺少目标 / 计划 / 反馈闭环

缺少。

当前只有“记录实际发生的时间块”，没有看到以下对象：

- 目标。
- 每日计划。
- 周计划。
- 任务状态。
- 完成反馈。
- 用户评分。
- AI 建议是否采纳。

### 是否有 AI 占位但没有真实模型调用

有。

- `README.md` 写了 AI Studio 和 `GEMINI_API_KEY`。
- `vite.config.ts` 注入了 `process.env.GEMINI_API_KEY`。
- `utils/promptSystem.ts` 提供 prompt 模板校验。
- 但主功能代码未发现 Gemini/OpenAI/模型调用，也未发现 AI 结果展示或存储。

### README 或代码中是否存在过时描述

存在。

- README 当前仍是 “Run and deploy your AI Studio app” 模板说明，并要求设置 `GEMINI_API_KEY`。
- 当前真实产品主线是 Supabase 时间管理应用，实际需要 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
- 文档中应以代码为准，README 需后续更新。

## 9. 后续 AI 升级机会

### P0：最适合第一版做的 AI 功能

第一版适合做“AI 自动时间复盘”。

原因：

- 已有稳定的输入数据：事件标题、日期、起止时间、标签。
- 已有基础统计能力：总时长、标签耗时、最长连续、空闲时间。
- 用户场景天然成立：时间管理产品的下一步就是从记录走向复盘。
- AI 可以先作为“规则统计的解释层”，不需要一开始接入复杂 Agent。
- 可以先做日复盘或周复盘，范围清晰，Eval 和 Badcase 容易定义。

建议 P0 形态：

- 入口：日历右侧 `EventPanel` 的“智能洞察”区域或历史页日期顶部。
- 输入：当天或本周 events + tags + 聚合统计。
- 输出：3 到 5 条自然语言复盘，包括时间分布、异常点、一个改进建议。
- 强约束：明确这是基于记录生成，不推断未记录事项。

当前缺口：

- 需要新增真实模型调用。
- 需要新增 prompt 和输出 schema。
- 需要新增复盘结果展示状态。
- 如果要保存复盘，需要新增 Supabase 表。
- 如果要判断好坏，需要补目标/偏好，否则只能做中性描述和轻建议。

### P1：后续可增强的 AI 功能

- 周报/月报自动生成。
- 标签体系优化建议。
- 事件标题自动规范化。
- 自动识别“会议过多”“碎片时间过多”“休息不足”等模式。
- 基于用户目标的差距分析。
- 复盘 Badcase 收集和用户反馈闭环。
- AI 建议采纳后的下周跟踪。

### P2：暂缓功能

- 完整 Agent 自主规划。
- RAG 知识库。
- Chrome 插件自动采集网页行为。
- 多端原生通知和系统级行为识别。
- 团队共享和组织管理。
- 订阅系统和海外商业化。
- 高复杂度自动排程。

## 10. 非目标

当前非 AI 版 PRD 不包含：

- 完整 AI PRD。
- 完整 Agent。
- 完整 RAG。
- Chrome 插件。
- 订阅系统。
- 海外商业化。
- 高保真原型。
- 大规模重构。
- 数据库迁移实施方案。
- 模型选型和成本测算。
- 线上埋点体系。

## 11. 当前项目 PRD 自查表

| 检查项 | 当前是否满足 | 证据 / 代码位置 | 备注 |
|---|---|---|---|
| 是否有真实时间记录闭环 | 是 | `components/Calendar.tsx`、`components/AddEventModal.tsx`、`utils/eventService.ts`、`App.tsx` | 日历创建、编辑、删除已接 Supabase |
| 是否有计时到记录闭环 | 是 | `components/Alarm.tsx`、`components/LogSessionModal.tsx`、`App.tsx` 的 `handleLogSession` | 完成计时后可生成事件 |
| 是否有标签分类 | 是 | `types.ts`、`components/TagManagerModal.tsx`、`utils/tagService.ts` | 标签 CRUD、排序、颜色、图标、筛选 |
| 是否有历史记录 | 是 | `components/History.tsx` | 单日历史、筛选、分组 |
| 是否有统计或复盘能力 | 部分满足 | `components/EventPanel.tsx`、`components/History.tsx` | 有规则统计，没有自然语言复盘 |
| 是否有数据同步 | 是 | `utils/supabaseClient.ts`、`utils/eventService.ts`、`utils/tagService.ts`、`supabase/migrations/*.sql` | Supabase Auth + RLS + events/tags |
| 是否有离线或缓存兜底 | 部分满足 | `utils/dataBackupService.ts`、`utils/eventService.ts`、`utils/tagService.ts`、`App.tsx` | 有 localStorage 缓存/备份，但不是完整离线队列 |
| 是否有导入导出 | 是 | `components/SettingsModal.tsx`、`utils/dateUtils.ts` | JSON 备份/恢复，ICS 导入/导出 |
| 是否有 AI 功能 | 否 | `utils/promptSystem.ts`、`README.md`、`vite.config.ts` | 有模板/配置残留，无真实模型调用 |
| 是否有 AI 占位或误导文案 | 是 | `README.md`、`components/EventPanel.tsx`、`components/SettingsModal.tsx` | “智能洞察”“智能导入”均非模型能力 |
| 是否有失败态 | 是 | `App.tsx`、`utils/eventService.ts`、`utils/tagService.ts` | toast、状态条、回滚、JWT 过期处理 |
| 是否适合作为 AI PRD 的基础 | 是 | events/tags 数据结构和规则统计已经具备 | 第一版适合做 AI 自动时间复盘 |
| README 是否准确 | 否 | `README.md` | 仍是 AI Studio/Gemini 模板说明 |
| 数据是否足够支持深度复盘 | 部分满足 | `types.ts`、`supabase/migrations/*.sql` | 缺目标、反馈、描述持久化、AI 结果表 |

## 12. 给下一步 AI PRD 的输入

可以直接复用的内容：

- 用户问题：用户已能记录时间，但缺少自动复盘、解释和改进建议。
- 数据输入：events、tags、date、startTime、endTime、category、title、由规则计算出的 duration 和标签聚合。
- 当前功能基础：日历视图、事件管理、标签系统、计时器、历史记录、Supabase 同步、导入导出。
- 现有缺口：缺自然语言复盘、缺目标/计划/反馈闭环、缺真实 AI 调用、缺 AI 输出存储。
- 最适合的 AI 入口：`components/EventPanel.tsx` 的“智能洞察”区域，或 `components/History.tsx` 的单日历史顶部。
- 第一版 AI 功能建议：AI 自动时间复盘，先做日复盘，再扩展周复盘。

需要补充确认的问题：

- 第一版 AI 复盘是否只针对“当天”，还是支持“本周”。
- 是否需要保存 AI 复盘结果到 Supabase。
- 是否要新增目标/计划字段，还是先做无目标的中性复盘。
- 是否允许事件标题作为 AI 输入。
- 是否需要用户反馈按钮，例如“准确/不准确”“有帮助/无帮助”。
- 是否需要保留当前“智能洞察”文案，还是改为“统计洞察”以避免误导。
- 是否要补齐 description 的数据库字段和 UI 输入。
