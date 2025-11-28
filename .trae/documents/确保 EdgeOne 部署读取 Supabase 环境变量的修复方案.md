## 问题
线上“未配置 Supabase”说明打包产物里没有读到 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`，或值被错误包裹（如带反引号/引号）。当前 `utils/supabaseClient.ts` 仅做 `trim()`，无法剥掉这些包裹字符。

## 解决思路
1. 加强环境变量规范化：剥掉两端的 `'"\`` 等字符，避免因为误粘贴导致失效。
2. 确认构建环境：EdgeOne 使用 `npm ci` 安装，`npm run build` 打包，根目录 `./`，输出目录 `dist`，确保变量在构建时注入。
3. 重新部署：保存环境变量后做一次全新构建（必要时清缓存重建）。

## 修改点
- 更新 `utils/supabaseClient.ts`：
```
const norm = (v: any) => typeof v === 'string' ? v.trim().replace(/^['"`]|['"`]$/g,'') : undefined;
const url = norm(import.meta.env.VITE_SUPABASE_URL);
const key = norm(import.meta.env.VITE_SUPABASE_ANON_KEY);
export const supabase = url && key && url.length > 6 && key.length > 6 ? createClient(url, key) : null;
```

## 部署步骤
1. 我来提交上述修改并推送到 `main`。
2. EdgeOne 构建设置：根目录 `./`，输出目录 `dist`，安装命令 `npm ci`，构建命令 `npm run build`，Node 版本 18/20。
3. 环境变量保持：
   - `VITE_SUPABASE_URL=https://qlnwwewhbgjffjevevij.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...K1Xm4wI`
4. 重新部署，验证登录弹窗不再显示红字。

## 预期结果
- 线上成功初始化 Supabase，登录与数据读写正常。

预览链接：http://localhost:3000/