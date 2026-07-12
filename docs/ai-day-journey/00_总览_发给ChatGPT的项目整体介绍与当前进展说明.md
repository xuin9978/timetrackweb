# 发给 ChatGPT 的项目目录总说明

## 1. 这份文件是干什么的

这份文件不是功能细节文档，而是一个 **目录导航 + 阅读说明 + 上下文入口**。

我会把 `docs` 目录下与这个 AI 功能相关的文件一起发给 ChatGPT，所以这份文件的作用是告诉它：

- 这个项目原本是什么
- AI 功能最后收敛成了什么
- 应该先看哪个文件，再看哪个文件
- 每类文件分别是干什么的
- 哪些文件是最高优先级
- 哪些文件是历史过程记录，不要和最终方案混淆

如果你是 ChatGPT，请先阅读这份文件，再去看其他 md。

---

## 2. 项目一句话介绍

这是一个时间管理项目，原本具备日历、日程、标签、历史记录和 Supabase 同步等能力，后续在此基础上新增了一个 AI 功能：

## 「一天之旅」

它会读取某一天的时间记录 / 日程内容，生成一篇固定结构的 Markdown 日复盘文档。

它不是泛泛的“AI 总结”，而是一个有明确格式标准、Golden Reference、Prompt 版本、Eval 和 Badcase 体系的记录型 AI 功能。

---

## 3. 两个文档目录分别是什么

当前与这个功能最相关的主要有两个目录：

### `docs/ai-product/`

这个目录是 **上位产品规划区 / 早期探索区**。

这里主要回答：

- 非 AI 版产品原本长什么样
- 为什么要做 AI
- 第一版 AI 功能一开始是怎么想的
- 为什么早期方向叫“AI 自动日复盘”

你可以把它理解为：

> “这个功能为什么会被提出，以及最初是怎么定义的”

### `docs/ai-day-journey/`

这个目录是 **最终落地区 / 实现证据区 / Eval 区**。

这里主要回答：

- 「一天之旅」最终是什么
- Prompt 怎么迭代出来的
- Golden 范本是什么
- 接口怎么设计和实现
- 前端怎么接进去
- Golden Set 怎么对比
- Badcase 怎么记录
- 稳定性怎么评估
- 当前做到什么程度

你可以把它理解为：

> “这个功能最终怎么从 0 到 1 落地”

---

## 4. ChatGPT 应该先看哪个目录

建议顺序是：

### 第一步：先看 `docs/ai-product/`

因为它能帮助你建立这个功能的背景，不然你会直接看到大量 Prompt / Eval / 接口文档，却不知道为什么最后会做成「一天之旅」。

### 第二步：再看 `docs/ai-day-journey/`

因为真正的最终方案、实现路径、质量修复和当前状态都在这里。

一句话说：

- `ai-product`：看“为什么做”
- `ai-day-journey`：看“最后做成了什么，以及怎么做出来的”

---

## 5. 推荐阅读顺序

如果你是 ChatGPT，建议按下面顺序阅读。

### A. 先建立项目背景

1. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-product/00-时间管理项目当前现状-非AI版PRD-V0.md`
   - 看非 AI 版产品现状
   - 理解原始产品基础能力、数据基础和 AI 切入点

2. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-product/00.5-AI功能探索与选择记录.md`
   - 看为什么开始探索 AI 功能

3. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-product/01-AI自动复盘-PRD-V0.md`
   - 看早期 AI 自动日复盘是怎么定义的

4. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-product/09-AI自动复盘到一天之旅收敛说明.md`
   - 这是理解整个项目非常关键的一份文档
   - 它说明：为什么最后从“AI 自动日复盘”收敛成「一天之旅」

### B. 再理解最终方案

5. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/00_总览_一天之旅AI功能V0收束总结.md`
   - 看最终收束后的全局总结
   - 这是 `ai-day-journey` 里的总入口之一

6. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/01_PRD_一天之旅AI自动复盘PRD-V0.md`
   - 看反向补写后的 AI PRD
   - 也就是功能做出来以后，再回写的一版产品定义

### C. 再看 Prompt 和标准

7. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/一天之旅系统提示词.md`
   - 这是当前真实使用的系统提示词主文件
   - 优先级非常高

8. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/03_Golden_一天之旅最终范本.md`
   - 这是最高优先级输出标准

9. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/examples/2026年6月4日时间记录与一天之旅.md`
   - 看最终范本对应的 input-output 样例

10. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/02_Prompt_一天之旅提示词迭代记录.md`
11. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/02_Prompt_一天之旅系统提示词版本变更记录.md`
   - 看 Prompt 是如何逐步变稳的

### D. 再看实现与链路

12. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/04_接口_一天之旅接口契约设计.md`
13. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/04_接口_一天之旅AI调用链路说明.md`
14. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/04_接口_一天之旅AI功能接入过程记录.md`

### E. 最后看质量评估

15. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/05_Eval_一天之旅GoldenSet对比记录.md`
16. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/05_Eval_一天之旅Eval运行记录.md`
17. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/05_Eval_一天之旅ConsistencyEval记录.md`
18. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/05_Eval_一天之旅生成验收与Badcase记录.md`

---

## 6. `docs/ai-day-journey/` 目录下各文件大致作用

### 总览类

- `00_总览_README.md`
  - 目录用途说明
  - 告诉你这个目录是干什么的

- `00_总览_一天之旅AI功能V0收束总结.md`
  - 目前最完整的全局总结文档之一

- `00_总览_发给ChatGPT的项目整体介绍与当前进展说明.md`
  - 也就是当前这份文件
  - 用来给外部 AI 做目录导航和上下文入口

### PRD 类

- `01_PRD_一天之旅AI自动复盘PRD-V0.md`
  - 功能完成后反向补写的 AI PRD

### Prompt 类

- `一天之旅系统提示词.md`
  - 当前真实系统提示词主文件

- `02_Prompt_一天之旅提示词迭代记录.md`
  - 人工模板与 Prompt 迭代过程

- `02_Prompt_一天之旅系统提示词版本变更记录.md`
  - V1、V1.1、V1.3、V1.4、V1.6 等版本变化说明

### Golden / 样例类

- `03_Golden_一天之旅最终范本.md`
  - 最高优先级格式标准

- `examples/`
  - 4 个 Golden Case
  - 用于对比、Eval、作品集证据

### 接口与实现类

- `04_接口_一天之旅接口契约设计.md`
  - 先设计后实现的接口文档

- `04_接口_一天之旅AI调用链路说明.md`
  - 描述前端、接口、模型、保存之间的链路

- `04_接口_一天之旅AI功能接入过程记录.md`
  - 像实施日志，记录这个功能是如何一步步接进去的

### Eval 类

- `05_Eval_一天之旅GoldenSet对比记录.md`
  - 各日期 Golden 对比

- `05_Eval_一天之旅Eval运行记录.md`
  - 更偏具体回归测试记录

- `05_Eval_一天之旅ConsistencyEval记录.md`
  - 同一日期多次生成的一致性测试

- `05_Eval_一天之旅生成验收与Badcase记录.md`
  - 验收标准与问题记录

### 测试类

- `06_测试_一天之旅接口测试记录.md`
  - 接口层真实调用记录

- `test-payloads/`
  - 各日期测试输入

- `test-results/`
  - 各日期测试输出和 response 结果

### 面试 / 作品集类

- `08_面试_文科生够用工程概念词典.md`
  - 把工程词翻成更适合产品表达的话

- `08_面试_一天之旅无线画布作品集草图.md`
  - 偏作品集呈现思路

---

## 7. 哪些文件优先级最高

如果时间有限，请至少先看下面 8 份：

1. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-product/00-时间管理项目当前现状-非AI版PRD-V0.md`
2. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-product/09-AI自动复盘到一天之旅收敛说明.md`
3. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/00_总览_一天之旅AI功能V0收束总结.md`
4. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/01_PRD_一天之旅AI自动复盘PRD-V0.md`
5. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/一天之旅系统提示词.md`
6. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/03_Golden_一天之旅最终范本.md`
7. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/04_接口_一天之旅AI调用链路说明.md`
8. `/Users/xubilin/Trae.ai网页.ai/正式版/ios-26-liquid-calendar (3).1当前/docs/ai-day-journey/05_Eval_一天之旅生成验收与Badcase记录.md`

---

## 8. 当前项目真实进展（给 ChatGPT 的快速结论）

截至目前，你可以先默认以下事实：

- 这个 AI 功能不是概念阶段，而是已经做出可运行版本
- 「一天之旅」已经接入前端看板
- 后端 `/api/ai/day-journey` 已经实现
- Prompt 已经多轮迭代，当前主版本是 V1.6
- 已经做过 Golden Set 对比与 Consistency Eval
- 已经沉淀了大量 Badcase 和修复记录
- 功能重点不再是“能不能调用模型”，而是“质量是否稳定、事实是否干净、体验是否收束”

---

## 9. ChatGPT 阅读这些文件时要注意什么

请注意以下边界：

1. 不要把早期 `ai-product` 里的想法，当成最终已实现能力。
2. 不要把 `examples/` 里的具体事实，误认为所有日期都应出现。
3. `一天之旅系统提示词.md` 是当前主规则来源，优先级高于旧的讨论文档。
4. `03_Golden_一天之旅最终范本.md` 是格式标准，不等于所有输出都要逐字照抄。
5. `ConsistencyEval` 和 `Badcase` 文档比“单次成功生成”更能代表这个功能是否成熟。
6. 如果要继续推进这个项目，应优先遵循：
   - 当前 payload 是唯一事实来源
   - Golden 只能作为格式和 Rubric 参考
   - 生成质量需要通过 Eval，而不是只看单次效果

---

## 10. 给 ChatGPT 的一句任务指令

如果你要继续帮助我理解、复盘、总结或迭代这个项目，请先基于以下顺序建立上下文：

> 先理解非 AI 基础产品，再理解 AI 自动日复盘为什么收敛为「一天之旅」，再阅读一天之旅的总览、Prompt、Golden、接口链路、Eval 和 Badcase 文档，最后再给出你的分析、总结或建议。

如果需要一句更短的版本，可以用：

> 请把这个项目理解为：一个从非 AI 时间管理产品演进而来的、基于 LLM + Workflow 的「一天之旅」AI 复盘功能案例；当前重点是复盘其产品定义、Prompt 演化、Golden Set、Eval 机制、实现链路和落地质量，而不是重新发明功能方向。
