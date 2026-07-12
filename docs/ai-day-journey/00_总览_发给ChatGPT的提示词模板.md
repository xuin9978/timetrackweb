# 发给 ChatGPT 的提示词模板

下面这段话可以直接复制给 ChatGPT，配合整个 `docs` 文档目录一起使用。

---

请先阅读我提供的 `docs` 文档，并基于文档内容帮助我回顾这个项目。

先不要急着给泛泛总结，请按下面方式建立上下文：

1. 先理解这是一个时间管理项目，原本有非 AI 功能。
2. 再理解早期 AI 功能方向叫“AI 自动日复盘”。
3. 再理解为什么这个方向最后收敛成了「一天之旅」。
4. 再重点阅读 `docs/ai-day-journey/` 下的文档，因为这里记录的是最终落地方案、Prompt、Golden、接口、Eval、Badcase 和当前进展。

请优先看这些文件：

- `docs/ai-product/00-时间管理项目当前现状-非AI版PRD-V0.md`
- `docs/ai-product/09-AI自动复盘到一天之旅收敛说明.md`
- `docs/ai-day-journey/00_总览_发给ChatGPT的项目整体介绍与当前进展说明.md`
- `docs/ai-day-journey/00_总览_一天之旅AI功能V0收束总结.md`
- `docs/ai-day-journey/01_PRD_一天之旅AI自动复盘PRD-V0.md`
- `docs/ai-day-journey/一天之旅系统提示词.md`
- `docs/ai-day-journey/03_Golden_一天之旅最终范本.md`
- `docs/ai-day-journey/04_接口_一天之旅AI调用链路说明.md`
- `docs/ai-day-journey/05_Eval_一天之旅生成验收与Badcase记录.md`

请注意以下边界：

- 当前 payload 才是生成某一天内容时的唯一事实来源。
- Golden md 只能作为格式、风格、Eval 标准参考，不能把其中的具体事实混到别的日期里。
- 不要把早期探索文档中的设想，误认为全部已经实现。
- 请区分：哪些内容是“产品规划”，哪些内容是“最终实现”，哪些内容是“质量评估与复盘”。

在阅读后，请帮助我做以下事情中的一种或多种：

1. 帮我做项目复盘总结
2. 帮我整理成 AI 产品经理面试表达
3. 帮我提炼成作品集结构
4. 帮我总结这个项目的产品价值、落地过程、技术链路和 AI 质量控制方法

如果你要输出总结，请尽量按以下结构组织：

- 项目背景
- 非 AI 基础产品
- AI 功能为什么会收敛成「一天之旅」
- 从 0 到 1 的落地过程
- Prompt / Golden / Eval / Badcase 体系
- 接口与前端接入方式
- 当前完成度
- 最适合写进简历或作品集的亮点

---

如果你想更简短一点，也可以只发下面这个版本：

请把这个项目理解为：一个从非 AI 时间管理产品演进而来的、基于 LLM + Workflow 的「一天之旅」AI 复盘功能案例。请先看非 AI 版 PRD，再看“AI 自动日复盘到一天之旅的收敛说明”，再重点看 `docs/ai-day-journey/` 里的总览、Prompt、Golden、接口链路、Eval 和 Badcase 文档，最后帮我做项目复盘、面试表达或作品集提炼。
