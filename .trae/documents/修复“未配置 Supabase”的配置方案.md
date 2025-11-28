## 问题定位
- 代码 `utils/supabaseClient.ts` 读取 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`（两者缺任意一个就返回 null）。随后各服务在 `supabase` 为空时抛出“未配置 Supabase”。
- 项目根目录当前没有本地环境变量文件（.env/.env.local），因此本地开发会出现该提示。

## 解决方案
### 本地开发（避免“未配置”）
1. 在项目根目录 `/Users/xubilin/Trae.ai/antigravity/ios-26-liquid-calendar (3).1` 新建文件 `.env.local`，内容：
```
VITE_SUPABASE_URL=https://qlnwwewhbgjffjevevij.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...K1Xm4wI
```
2. 重启本地开发服务器（关闭再重新运行），登录弹窗不再显示“未配置 Supabase”。
3. 可用项目内脚本验证连接：`node test-supabase-connection.js`（若需要）。

### EdgeOne 构建（线上环境）
1. 环境变量面板保持两行：
   - `VITE_SUPABASE_URL` = 项目 URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
2. 构建设置：根目录 `./`，输出目录 `dist`，构建命令 `npm run build`，安装命令 `npm ci`（仓库已有 package-lock.json），Node 版本 18 或 20。
3. 若仍报错，确认仓库最外层含 `package.json` 与 `vite.config.ts`；并重新部署。

## 预期效果
- 本地与线上都能正确初始化 Supabase，登录与数据读写不再出现“未配置”。

预览链接：http://localhost:3000/