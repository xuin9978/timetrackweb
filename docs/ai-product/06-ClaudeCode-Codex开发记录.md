# Claude Code / Codex 开发记录

## 1. 记录目标

记录 Claude Code / Codex 在 AI 自动复盘功能中的开发、调试、验证和文档变更，便于后续回溯每次改动的原因、范围和结果。

## 2. 记录范围

需要追加记录的改动包括：

- Prompt 修改。
- AI 输出结构修改。
- LLM 调用方式修改。
- 错误兜底逻辑修改。
- 数据聚合逻辑修改。
- Eval 样本或评分标准修改。
- Badcase 修复。
- 相关 UI 入口或展示逻辑修改。

## 3. 开发记录模板

```markdown
## YYYY-MM-DD - 变更标题

### 背景

### 本次目标

### 修改文件

### 关键实现

### 验证方式

### 结果

### 风险与后续
```

## 4. 开发记录

## 2026-06-05 - 创建 AI 自动复盘文档区

### 背景

需要在项目根目录创建 `docs/ai-product/`，集中存放时间管理项目 AI 自动复盘功能的产品、评估和开发记录文档。

### 本次目标

- 复制已有非 AI 版 PRD 到 `00` 文档。
- 创建 AI 自动复盘 PRD、Workflow、Eval、Badcase、Prompt 版本记录、开发记录模板。
- 文档仅围绕 AI 自动复盘，不扩展 RAG、Agent、Chrome 插件、订阅系统。

### 修改文件

- `docs/ai-product/00-时间管理项目当前现状-非AI版PRD-V0.md`
- `docs/ai-product/01-AI自动复盘-PRD-V0.md`
- `docs/ai-product/02-AI自动复盘-Workflow-V0.md`
- `docs/ai-product/03-AI自动复盘-Eval-V0.md`
- `docs/ai-product/04-AI自动复盘-Badcase-V0.md`
- `docs/ai-product/05-Prompt版本记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

创建文档目录和 7 个 Markdown 文件。`00` 文件来自项目根目录已有 `非AI版 PRD.md`。

### 验证方式

检查目标目录文件列表，确认未创建无关知识总结文件。

### 结果

已创建文档模板，后续功能开发时可按对应文件追加记录。

### 风险与后续

当前仅为文档结构，尚未实现 AI 自动复盘功能、Prompt 接入、LLM 调用或 Eval 自动化。

## 2026-06-05 - 创建 AI 功能迭代记录文件

### 背景

AI 自动日复盘已经从文档方案推进到可演示功能，需要一个产品迭代总记录文件，串联需求调整、代码修改、Prompt 修改、输出结构修改、测试、验收和修复。

### 本次目标

- 创建 `docs/ai-product/07-AI功能迭代记录.md`。
- 明确每轮迭代记录结构。
- 追加第 1 轮 AI 自动日复盘迭代记录。
- 同步记录本轮 Prompt / 输出结构 / LLM 调用方式变化。

### 修改文件

- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/05-Prompt版本记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

`07` 文件记录第 1 轮产品迭代：右侧日程面板 AI 图标入口、结构化复盘弹窗、本地 `/api/ai/daily-review` 调用链、GLM 优先 DeepSeek 兜底、本地 Demo 兜底、反馈按钮和当前未完成真实 LLM 测试的状态。

`05` 文件追加 Prompt-V1、Output-V1、Call-V1 和 Aggregation-V1，记录本轮从 Markdown 六段式文档设想推进到 JSON 结构化输出和本地 LLM 调用的变化。

### 验证方式

人工检查 Markdown 文件结构，确认 `07` 包含用户指定的 10 个记录栏目，且未创建无关文档。

### 结果

已建立 AI 自动复盘产品迭代总记录文件，并完成本轮迭代记录追加。

### 风险与后续

本轮文档记录基于已有代码改动和构建结果；真实 GLM / DeepSeek 输出尚未人工验收。下一轮应进行真实样本测试，并根据结果更新 Eval 或 Badcase。

## 2026-06-05 - 调整 AI 日复盘为手动 LLM 触发

### 背景

用户希望打开 AI 日复盘时先保留最初的结构化弹窗设计，不要自动请求 LLM；真实每日复盘应由弹窗内部的 LLM 按钮触发。

### 本次目标

- 保留默认本地结构化复盘。
- 在弹窗内增加“生成 AI 复盘”按钮。
- 点击按钮后再调用后台 `/api/ai/daily-review`。
- 失败时保留本地复盘兜底。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

将 LLM 请求逻辑从 `useEffect` 自动触发改为 `requestReview` 手动触发。弹窗打开时重置为 `idle`，默认显示本地结构化复盘；用户点击“生成 AI 复盘”后进入 `loading`，成功后展示真实 AI 输出，失败后展示错误提示并保留本地复盘。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。尚未完成浏览器真实点击和 GLM 输出验收。

### 风险与后续

下一轮需要在浏览器中验证按钮点击、loading、success、error 状态，并将真实输出纳入 Eval 或 Badcase。

## 2026-06-05 - 修复 AI 日复盘点击后空白页风险

### 背景

用户反馈点击“生成 AI 复盘”后页面变成空白。该现象大概率来自真实 LLM 返回结构与前端预期不一致，导致 React 渲染时报错。

### 本次目标

- 增强 LLM 输出结构容错。
- 避免字符串数组、缺字段或非标准字段导致整页崩溃。
- 重启本地开发服务器，恢复页面可访问状态。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

新增 `normalizeRemoteReview`，在设置 `remoteReview` 前对 LLM 输出进行归一化。兼容 `time_distribution`、`insights`、`risks`、`actions`、`caveats` 缺字段或返回字符串数组的情况。弹窗内按钮补充 `type="button"`。

### 验证方式

- 执行 `npm run build`。
- 重启 `npm run dev -- --host 127.0.0.1`。

### 结果

构建通过，本地 dev server 已重启。尚未完成浏览器内真实点击复测。

### 风险与后续

如果 GLM 输出仍频繁漂移，需要同步收紧 Prompt、增加服务端 JSON schema 校验，并考虑为 AI 复盘弹窗增加局部 Error Boundary。

## 2026-06-05 - 调整 AI 日复盘为右侧复盘看板

### 背景

用户希望点击 AI 复盘后，不是出现居中弹窗，而是在右侧弹出一个与日程面板同高、略宽、位置稍微向左移动的复盘内容看板。

### 本次目标

- 将复盘容器从居中弹窗改为右侧看板。
- 保持看板高度与原右侧面板一致。
- 增加看板宽度和右侧留白，让看板相对居中。
- 保留现有 AI 复盘内容和 LLM 调用逻辑。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `index.html`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

将外层布局改为固定右侧对齐容器，复盘看板宽度设为 `max-w-[430px]`，高度设为 `h-[85vh]`，桌面端右侧保留 `lg:pr-12`，使其从最右边向左移动。新增 `slideInRight` 动画用于右侧滑入。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。尚未完成浏览器视觉复测。

### 风险与后续

当前组件名称仍为 Modal，但视觉形态已转为 Panel；后续若确认该方向，应重命名组件并进一步处理无遮罩/嵌入式侧板体验。

## 2026-06-05 - 恢复 AI 日复盘为居中弹窗

### 背景

用户反馈希望恢复到居中位置，不继续使用右侧复盘看板形态。

### 本次目标

- 将 AI 日复盘恢复为居中弹窗。
- 保留已有 LLM 手动触发和输出容错逻辑。
- 移除右侧看板专用滑入动画。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `index.html`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

将弹窗外层恢复为 `fixed inset-0 flex items-center justify-center`，使用半透明黑色遮罩和 `modalEnter` 动画。删除 `slideInRight` keyframes。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。尚未完成浏览器视觉复测。

### 风险与后续

后续继续在居中弹窗内优化 AI 结果与本地规则预览的层级，而不是再切换为右侧看板。

## 2026-06-05 - 为 AI 日复盘增加右侧内容看板

### 背景

用户指出居中复盘弹窗右侧存在一大片可利用空间，希望在保留居中弹窗的同时，右侧额外增加一个独立看板展示 AI 复盘内容。

### 本次目标

- 保留当前居中复盘弹窗位置。
- 新增右侧 AI 复盘内容看板。
- 让右侧看板承载 LLM 生成后的摘要、洞察、建议和数据限制。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

在弹窗外层增加一个 `max-w-[940px]` 的双列容器，左侧保留原主弹窗，右侧新增 `AI 复盘内容` 看板。右侧看板根据 `status` 展示等待生成、生成中或 LLM 成功结果，并在小屏幕下隐藏。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。尚未完成浏览器视觉复测。

### 风险与后续

后续需要确认中等宽度下双看板是否拥挤，以及是否需要进一步区分左侧“本地统计依据”和右侧“AI 复盘结果”。

## 2026-06-05 - 设计并落地 AI 日复盘系统提示词 V2

### 背景

用户确认下一步需要设计用于生成 AI 日复盘的系统提示词。当前代码中已有临时 Prompt-V1，但它只约束了 JSON 字段，尚不足以支撑 AI PM 作品集中的 Workflow、Eval 和 Badcase 讲述。

### 本次目标

- 将系统提示词设计为可评估的产品部件。
- 明确 AI 日复盘的角色边界、事实约束、表达边界、输出结构和数据不足兜底。
- 更新本地 LLM 调用使用 Prompt-V2。
- 保证前端兼容新旧输出字段。

### 修改文件

- `docs/ai-product/08-AI日复盘系统提示词设计.md`
- `docs/ai-product/05-Prompt版本记录.md`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`
- `vite.config.ts`
- `components/AIDailyReviewModal.tsx`

### 关键实现

在 `vite.config.ts` 中将系统提示词升级为 Prompt-V2，要求模型严格基于输入 events/tags/stats，禁止编造未记录事实，禁止人格评价和过度推断，并固定输出 Output-V2 JSON。

在 `components/AIDailyReviewModal.tsx` 中兼容 Output-V2 字段：`evidence_based_observations`、`tomorrow_actions`、`data_limitations`，同时保留对 V1 字段 `insights`、`actions`、`caveats` 的兼容。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。未完成真实 LLM 多样本验收。

### 风险与后续

下一轮需要使用今日数据、少量数据和空数据分别测试 Prompt-V2，并把输出质量同步记录到 Eval 和 Badcase 文档。

## 2026-06-05 - 将 AI 生成入口移动到右侧复盘看板

### 背景

用户在浏览器中标注左侧“当前显示本地结构化复盘 / 生成 AI 复盘”操作卡片，希望将这块内容放到右侧 AI 复盘看板中。

### 本次目标

- 左侧主弹窗聚焦展示本地结构化复盘和统计依据。
- 右侧 AI 看板负责 LLM 生成入口、生成状态和 AI 结果展示。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

移除左侧主弹窗中的生成操作卡片，将“生成 AI 复盘”按钮移入右侧等待态。右侧看板根据 `status` 展示等待生成、生成中和已生成状态，并在成功后提供“重新生成”按钮。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。未完成真实浏览器点击测试。

### 风险与后续

当前右侧看板在小屏幕下隐藏，因此移动端暂时没有生成按钮。后续如果需要移动端可用，需要增加小屏幕内嵌入口。

## 2026-06-05 - 将 AI 生成中状态收敛到右侧看板

### 背景

用户反馈左侧主弹窗中的“正在分析今天的时间记录...”也应放到右侧 AI 看板里，并希望删除“由 GLM 生成”的可见文案。

### 本次目标

- 左侧不再展示 AI 生成中状态。
- 右侧 AI 看板负责等待生成、生成中和已生成状态。
- UI 中不展示模型供应商名称。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

删除左侧 loading 提示卡片和 provider 来源标签。右侧看板在 loading 状态展示“正在分析今天的时间记录...”，副文案保留“系统会整理事件、标签和时长，再生成结构化复盘。”右侧标题下方只显示“等待生成 / 已生成”。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。未完成真实浏览器点击测试。

### 风险与后续

左侧仍保留 AI 调用失败时的兜底错误提示；若要完全右置所有 AI 状态，下一轮可以把 error 状态也迁移到右侧看板。

## 2026-06-05 - 为时间分布增加昨日同比百分比

### 背景

用户希望在 AI 日复盘左侧时间分布中，每个标签旁边显示与昨天同标签时长相比的百分比变化，例如今天“日常”比昨天“日常”多 10% 就显示 `+10%`。

### 本次目标

- 为每个时间分布标签增加昨日对比百分比。
- 保持 UI 简洁，只显示百分数。
- 使用本地事件数据计算，不依赖 LLM。

### 修改文件

- `components/Calendar.tsx`
- `components/EventPanel.tsx`
- `components/AIDailyReviewModal.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

从 `Calendar` 向 `EventPanel` 和 `AIDailyReviewModal` 传入当前可见事件集合 `comparisonEvents` 与 `referenceDate`。弹窗内按 `referenceDate - 1 day` 聚合昨日同标签时长，并按 `(今天时长 - 昨天时长) / 昨天时长 * 100%` 计算 `changePercent`。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。未完成真实浏览器视觉测试。

### 风险与后续

昨日同标签时长为 0 时当前不显示百分比。后续可考虑显示“新增”，但本轮按用户要求先只显示百分数。

## 2026-06-05 - 为 AI 生成中状态增加图标动效

### 背景

用户希望点击“生成 AI 复盘”后，右侧 AI 图标能有动起来的效果，用来表达生成中。

### 本次目标

- 增强生成中的状态反馈。
- 不引入新依赖。
- 不影响全局图标样式。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

在 `status === 'loading'` 时，为右侧 AI 看板标题图标增加 `animate-spin` 和轻微蓝色光晕；同时让生成中按钮内的星光图标旋转。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。未完成真实浏览器点击测试。

### 风险与后续

当前使用 Tailwind 默认旋转动效，后续如果希望更精致，可以替换为自定义慢速脉冲动效。

## 2026-06-05 - 修复昨日对比百分比缺少数据源

### 背景

用户反馈时间分布标签旁边没有看到 `+10%`、`-8%`、`0%` 这类昨日对比百分比。排查后发现当前日视图通常只加载当天事件，弹窗无法拿到昨天同标签时长。

### 本次目标

- 让当前事件数据额外包含前一天事件，用于 AI 日复盘本地统计对比。
- 不改变日历当前视图的可见事件展示。

### 修改文件

- `App.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

新增 `getEventFetchRange`，在 `getVisibleDateRange` 的基础上将 `startDate` 向前扩展 1 天。事件刷新和首次加载统一使用该范围。当前日历仍通过 `generateCalendarData` 按视图范围过滤展示。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。未完成真实浏览器数据核对。

### 风险与后续

如果昨天没有同标签记录，百分比仍不会显示；这是为了避免把无基数增长误展示为百分数。

## 2026-06-05 - 改为点击小星光后自动生成 AI 复盘

### 背景

用户希望点击右侧日程面板的小星光图标后，就默认开始生成 AI 复盘，不再需要右侧看板中的“已生成真实 AI 复盘 / 重新生成”文本框。

### 本次目标

- 减少生成 AI 复盘的操作步骤。
- 删除右侧看板中多余的操作说明卡片。
- 保留生成中动效和最终 AI 内容展示。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

在弹窗打开 effect 中自动调用 `requestReview()`。删除右侧等待态和成功态的操作卡片，仅保留 loading、success 内容和 error 状态。通过 `autoRequestKeyRef` 防止开发环境重复 effect 造成重复请求或状态闪断。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。未完成真实浏览器点击测试。

### 风险与后续

删除“重新生成”后，用户需要关闭并重新打开弹窗才能再次生成。后续如果需要重试，可以改成标题区的小图标按钮。

## 2026-06-05 - 调整 AI 日复盘右侧看板宽度

### 背景

用户询问左右双看板是否还有优化空间，并指出右侧 AI 复盘内容看板仍然有些窄。

### 本次目标

- 保持左侧本地结构化复盘、右侧 AI 生成结果的职责分工。
- 增加右侧 AI 内容看板宽度，减少中文复盘正文频繁换行。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

将双看板容器从 `max-w-[940px]` 调整为 `max-w-[980px]`，右侧看板从 `w-80` 调整为 `w-[360px]`，左侧主弹窗保持 `max-w-xl` 不变。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。未完成真实浏览器视觉测试。

### 风险与后续

如果中等屏幕下双看板变拥挤，可将右侧看板显示断点从 `md` 提升到 `lg`，或让右侧看板使用响应式宽度。

## 2026-06-05 - 修正 AI 日复盘生成触发方式

### 背景

用户澄清：右侧日程面板的小星光入口不应直接开始在线 LLM 复盘，它只负责打开复盘窗口；真正生成应由窗口内部按钮触发。

### 本次目标

- 撤销打开窗口自动生成。
- 恢复窗口内部的生成按钮。
- 保留右侧看板承载 LLM 生成状态和结果的设计。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

移除自动请求引用和打开弹窗后调用 `requestReview()` 的逻辑。`useEffect` 只负责重置弹窗状态。右侧看板 idle 状态重新显示“生成 AI 复盘”按钮，点击该按钮才调用 `requestReview()`。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。未完成真实浏览器点击测试。

### 风险与后续

当前没有成功后的“重新生成”按钮；如需重试或重新生成，可在右侧标题区增加轻量图标按钮。

## 2026-06-05 - 将生成按钮提升到右侧看板顶部

### 背景

用户希望将右侧内容区里的“生成 AI 复盘”按钮替换到上方“AI 复盘内容”标题和图标 logo 的位置。

### 本次目标

- 减少右侧看板顶部和内容区的信息重复。
- 让顶部区域直接成为生成入口。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

删除右侧看板 header 中的 logo 和标题，改为直接渲染状态化按钮。删除内容区 idle 操作卡片。按钮根据 `status` 显示“生成 AI 复盘 / 生成中 / 已生成 / 重新生成 AI 复盘”。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。未完成真实浏览器点击测试。

### 风险与后续

success 状态下按钮当前不可再次点击；如需重新生成，可后续调整为可点击或增加独立重试入口。

## 2026-06-05 - 删除右侧内容区重复生成中提示

### 背景

用户希望 loading 状态不要展示蓝色说明卡片，只保留顶部按钮中的“生成中”状态。

### 本次目标

- 简化右侧 AI 看板生成中状态。
- 避免顶部按钮和内容区卡片重复表达同一状态。

### 修改文件

- `components/AIDailyReviewModal.tsx`
- `docs/ai-product/07-AI功能迭代记录.md`
- `docs/ai-product/06-ClaudeCode-Codex开发记录.md`

### 关键实现

删除 loading 内容区的蓝色提示卡片和重复按钮，只保留 skeleton 占位。顶部按钮继续显示“生成中”并保留旋转图标。

### 验证方式

执行 `npm run build`。

### 结果

构建通过。未完成真实浏览器点击测试。

### 风险与后续

生成耗时较长时，只有按钮和骨架作为反馈；后续可按需要增加极短辅助文案。
