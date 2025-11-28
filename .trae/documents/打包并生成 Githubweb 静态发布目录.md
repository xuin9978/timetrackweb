## 目标
- 在同级目录生成纯静态发布文件夹 `Githubweb/`，不包含任何 Supabase 配置或代码。

## 快速方案（零代码改动）
1. 运行 `npm run build` 生成 `dist/`（package.json:7-9）。
2. 创建 `Githubweb/` 并将 `dist/` 全量复制到其根目录。
3. 不包含任何 `.env*` 文件与开发脚本；构建后运行时 `supabase` 为 `null`，不会发起 Supabase 请求（utils/supabaseClient.ts:1-6）。

## 彻底剥离方案（构建时排除 Supabase 代码）
1. 在 `vite.config.ts` 中添加 `resolve.alias`，将 `@supabase/supabase-js` 指向一个空实现模块（仅导出空函数/常量）。
2. 运行 `npm run build` 后，包体不再包含 Supabase 依赖代码。
3. 创建 `Githubweb/` 并复制构建产物。

## GitHub 与 EdgeOne
- 将 `Githubweb` 作为仓库根提交并推送；在 EdgeOne 选择该仓库，一键部署静态站点：构建命令留空，发布目录设为仓库根 `/`。

预览链接: http://localhost:3000/