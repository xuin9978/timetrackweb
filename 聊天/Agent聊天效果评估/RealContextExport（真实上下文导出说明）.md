# RealContextExport（真实上下文导出说明）

本文件说明如何生成 real 模式评估需要的真实 `clientContext`。real 模式有两种导出路径：

一、前端手动导出：复用当前登录后的产品页面数据。

二、Supabase 授权导出：在本地提供当前用户的 Supabase access token 后，由脚本读取该用户自己的历史数据并保存到 private。

两种方式都不提交真实上下文，不在日志中打印密钥或 token。

## 路径一：前端手动导出

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

## 路径二：Supabase 授权导出

如果真实上下文就是 Supabase 中的历史时间段/日程数据，可以用本地脚本生成：

```bash
SUPABASE_ACCESS_TOKEN='你的当前登录用户 access token' npx tsx 'scripts/export-real-context-from-supabase（从Supabase导出真实上下文）.ts'
```

脚本会读取：

一、`events`：全部历史日程。

二、`tags`：标签名称和颜色，用于解释分类。

三、`diary_entries`：如果表存在且当前用户有数据，会一起纳入；如果没有日记，会按缺失上下文处理。

脚本输出：

```text
聊天/Agent聊天效果评估/private/clientContext.real.local（真实上下文本地导出）.json
```

如果没有提供 `SUPABASE_ACCESS_TOKEN`，脚本会停止。这是因为项目 RLS 按 `auth.uid() = user_id` 保护数据，只有 anon key 时命令行不能代表你的登录用户读取历史记录。

## 隐私边界

real 上下文文件只保存在 `private` 目录。该目录由 `.gitignore` 保护，不应提交 Git。

real 模式默认不启用 LLM judge，只使用规则评分。除非你明确接受真实上下文和真实输出发送给评审模型，否则不要传 `--allow-real-judge`。

## 当前阻塞条件

如果评估脚本报错：

```text
找不到上下文文件：聊天/Agent聊天效果评估/private/clientContext.real.local（真实上下文本地导出）.json
```

说明还没有完成前端手动导出。这不是脚本失败，而是 real 评估缺少必要输入。

如果 Supabase 导出脚本提示缺少 access token，说明当前命令行没有你的登录态。请改用前端导出，或只在本地临时提供 `SUPABASE_ACCESS_TOKEN`。
