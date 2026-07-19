# 隐私边界

这套评估机制支持 synthetic 和 real 两种上下文。默认使用 synthetic，真实上下文必须显式导出和本地运行。

## synthetic 模式

synthetic 模式使用合成日程和合成日记。它适合：

- 作品集展示。
- 公开提交。
- 自动化回归。
- LLM judge 默认评分。

synthetic 结果可以提交到 Git。

## real 模式

real 模式读取真实 `clientContext` JSON。默认推荐前端手动导出；如果用户明确授权，也可以用本地 Supabase 导出脚本读取当前登录用户自己的历史数据。

真实上下文默认路径：

```text
聊天/Agent聊天效果评估/private/clientContext.real.local（真实上下文本地导出）.json
```

真实评估输出默认路径：

```text
聊天/Agent聊天效果评估/private/evaluation-real.latest.local（真实上下文最新评估）.md
聊天/Agent聊天效果评估/private/evaluation-flows-real.latest.local（真实多轮流程最新评估）.md
聊天/Agent聊天效果评估/private/runs/real/
```

这些文件默认不提交 Git。

## real judge 规则

real 模式如需调用 LLM judge，必须显式传入：

```bash
--allow-real-judge
```

这表示你明确知道：

一、真实上下文会发送给被测 LLM。

二、真实输出和评估材料会发送给评审 LLM。

三、结果仍会写入 private 目录，不提交 Git。

四、如果用于作品集展示，必须手动脱敏，或改用 synthetic 结果。

## 禁止事项

- 不把真实日记原文提交到 Git。
- 不把真实评估输出提交到 Git。
- 不把 API Key、JWT、`.env` 内容写入评估日志。
- 不在公开作品集中展示未经脱敏的真实上下文。

## 检查清单

| 检查项 | 要求 | 当前机制 |
| --- | --- | --- |
| private 路径保护 | real 上下文和 real 输出不提交 Git | 根 `.gitignore` 和 `private/.gitignore` 双重保护 |
| Supabase 权限 | 不绕过用户权限读取真实数据 | 默认前端导出；授权脚本必须使用当前用户 access token |
| synthetic 公开性 | synthetic 上下文和结果可用于作品集 | 使用 `synthetic-context（合成上下文）.json` |
| real judge 开关 | real 模式默认不调用 LLM judge | 必须显式传 `--allow-real-judge` |
| API Key | 不写入日志、不进入文档 | 脚本只从环境变量读取 |
| 真实输出展示 | 公开前必须脱敏 | 建议优先使用 synthetic 结果 |

## real 模式脱敏标准

必须删除：

一、真实姓名、手机号、邮箱、地址、公司内部项目名。

二、日记原文中可识别个人关系、健康、财务、账号的信息。

三、会议链接、客户名称、合同金额、账号凭据。

可以泛化：

一、具体人名改为“同事 A / 客户 B”。

二、具体项目改为“作品集项目 / 面试准备 / 客户方案”。

三、具体日期可保留相对时间，例如“本周二上午”，但不要暴露敏感事件。

不能展示：

一、未经脱敏的 real `clientContext`。

二、包含真实日记原文的评估输出。

三、任何 API Key、JWT、`.env`、Supabase 连接信息。
