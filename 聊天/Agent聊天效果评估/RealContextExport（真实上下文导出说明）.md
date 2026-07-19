# RealContextExport（真实上下文导出说明）

本文件说明如何生成 real 模式评估需要的真实 `clientContext`。real 模式必须由用户从前端手动导出，评估脚本不直接读取 Supabase，不绕过产品权限，也不自动抓取真实日记或日程。

## 导出步骤

一、启动本地应用并打开聊天页。

二、等待聊天页完成日历和日记上下文读取。

三、点击聊天页右上角的“导出上下文”按钮。

四、浏览器会下载文件：

```text
clientContext.real.local（真实上下文本地导出）.json
```

五、把该文件放到：

```text
聊天/Agent聊天效果评估/private/clientContext.real.local（真实上下文本地导出）.json
```

六、运行 real 私有评估：

```bash
npx tsx 'scripts/run-agent-golden-set（运行Agent金标集评估）.ts' --mode real --retries=2
```

## 隐私边界

real 上下文文件只保存在 `private` 目录。该目录由 `.gitignore` 保护，不应提交 Git。

real 模式默认不启用 LLM judge，只使用规则评分。除非你明确接受真实上下文和真实输出发送给评审模型，否则不要传 `--allow-real-judge`。

## 当前阻塞条件

如果评估脚本报错：

```text
找不到上下文文件：聊天/Agent聊天效果评估/private/clientContext.real.local（真实上下文本地导出）.json
```

说明还没有完成前端手动导出。这不是脚本失败，而是 real 评估缺少必要输入。
