# Supabase Auth Metadata Safety Guardrail

## 适用范围

任何涉及以下内容的分析或代码修改，都必须先完整阅读本文档：

- Supabase Auth、登录、注册、刷新会话或退出登录。
- 用户资料、昵称、签名、头像或个人资料同步。
- `user_metadata`、`app_metadata`、JWT 或 `supabase.auth.updateUser()`。
- Supabase 客户端自定义 `fetch`、代理或鉴权请求头。

## 已发生事故

用户上传头像后，前端通过 `FileReader.readAsDataURL()` 得到 Base64 Data URL，并把整张图片写入 `user_metadata.avatar_url`。

事故链路：

1. Base64 头像进入 `auth.users.raw_user_meta_data`。
2. Supabase 将用户元数据带入访问令牌，JWT 体积异常增大。
3. `Authorization` 请求头超过 Cloudflare 或 Node 的请求头限制。
4. `events`、`tags` 等读取和写入请求在到达 PostgREST 与 RLS 之前被拒绝。
5. 浏览器只暴露 `TypeError: Failed to fetch`，容易被误判为普通网络故障。

本次事故中，头像字段约 206 KB，JWT 约 275 KB。清理头像字段后，用户元数据缩减到约 188 字符，日程同步恢复。

## 强制规则

- 禁止把 Base64、Data URL、Blob、文件内容、富文本正文或其他大段内容写入 `user_metadata`。
- `user_metadata` 只保存小型结构化资料，例如昵称、短签名和普通 HTTPS URL。
- 单个用户元数据字符串字段默认不得超过 2 KB；超过时必须重新选择存储位置。
- 仅本机使用的头像保存到设备本地存储。
- 需要跨设备同步的图片上传到 Supabase Storage，用户元数据只保存对象路径或 HTTPS URL。
- 不得使用 `service_role`、关闭 RLS 或放宽策略来规避 JWT、请求头或客户端网络问题。
- 不得在日志、测试输出、文档或错误提示中打印 JWT、API Key、刷新令牌或完整用户元数据。

## 当前实现

- `utils/profileAvatar.ts`：识别内联图片并阻止其进入用户元数据。
- `App.tsx`：把内联头像迁移到用户隔离的设备本地存储，并刷新会话。
- `utils/supabaseProxy.ts`：通过同源代理传输 Supabase 请求，避免内置浏览器直连失败。
- `server/supabaseProxy.ts`：仅允许转发到当前 Supabase 项目的已知 API 路径，并继续使用当前用户 JWT 和 RLS。

修改这些文件时，必须保留上述安全边界。

## 实施检查

修改个人资料或鉴权逻辑前：

1. 列出即将写入 `updateUser({ data: ... })` 的所有字段。
2. 检查字段是否可能包含 `data:`、Base64、文件内容或超过 2 KB 的文本。
3. 判断该数据应该进入本地存储、Supabase Storage 还是独立业务表。
4. 确认修改不会扩大 JWT、绕过 RLS或暴露凭证。

修改完成后必须运行：

```bash
npx tsx tests/test-profile-avatar.ts
npx tsx tests/test-supabase-proxy.ts
npx tsc --noEmit
npm run build
```

如果行为涉及真实同步，还必须在登录状态下验证一次创建、云端读回和删除流程，并清理测试数据。

## 故障排查顺序

当页面出现 `Failed to fetch`、保存回滚或同步失败时：

1. 确认本地服务器与 Supabase 项目是否健康。
2. 区分“没有 HTTP 响应”和“收到 400/401/403/431/5xx 响应”。
3. 仅记录请求路径、方法、状态码、耗时和请求头长度，不记录请求头内容。
4. 检查 `Authorization` 长度以及 `raw_user_meta_data` 各字段长度。
5. 如果请求头过大，优先检查头像 Data URL 和其他用户元数据，不要先修改 RLS。
6. 修复后用真实的创建、读取、删除闭环证明同步恢复。

## 禁止的修复方式

- 仅把底层错误替换成更友好的提示，却不处理根因。
- 把失败请求无限重试。
- 把完整 JWT 或用户元数据输出到控制台。
- 为了让请求成功而使用管理员密钥、禁用 RLS 或扩大匿名权限。
- 只验证页面乐观更新，不验证数据是否真正写入云端。
