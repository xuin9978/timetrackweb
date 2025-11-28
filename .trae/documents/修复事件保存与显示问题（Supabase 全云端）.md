## 问题判断
- 保存失败来源：`utils/eventService.ts` 在 Supabase 客户端为空或写入报错时直接返回空结果，前端在 `App.tsx:107–121` 检测到 `created.length===0` → 弹出“保存失败”。
- 显示失败来源：事件列表始终为空（未写入或读取失败），或被 `visibleTags` 过滤掉（`App.tsx:220–222` 只显示 `visibleTags` 包含的分类）。
- 认证与环境：若 `VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY` 未注入，`supabase=null`（`utils/supabaseClient.ts:3–6`），所有 CRUD 都会失败；或 RLS 拒绝写入（`user_id` 与 `auth.uid()` 不匹配）。

## 立即自检（不改代码）
1) 检查是否已登录（右上角是否显示邮箱）。未登录时所有事件操作在 `App.tsx:108–121` 会直接中止。
2) 检查环境变量：在本地 `.env` 或部署环境中必须设置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`（`utils/supabaseClient.ts:3–6`）。
3) 用 SQL Editor 验证数据、表与策略：一次性粘贴下方 SQL 执行，确认是否真的写入、表结构是否正确、RLS 是否存在。

## 可能原因与定位方法
- 原因 A：Supabase 未配置 → 任何写入都返回空，前端提示“保存失败”。
- 原因 B：表结构不一致（缺列/类型不符）→ insert 报错（当前代码未显示错误详情）。
- 原因 C：RLS 拒绝 → 写入返回错误；查询显示为空。
- 原因 D：事件被筛掉 → `visibleTags` 未包含事件的 `category`（仅显示包含的分类）。

## 修复方案（确认后执行）
- 后端/环境：
  - 补齐环境变量；在 SQL Editor 验证 `events` 表存在且列为 `id uuid, user_id uuid, title text, start_time timestamptz, end_time timestamptz, category text`，并有 RLS 策略 `auth.uid() = user_id`。
- 前端代码（精准小改，不新增文件）：
  1) 在 `utils/eventService.ts` 中对 Supabase `error` 进行显式返回并传播，前端弹出具体错误信息，便于用户辨识是“未配置/权限/表结构”。
  2) 在 `App.tsx` 的保存/导入逻辑里，当 `supabase` 为 `null` 时立即提示“未配置 Supabase”，而不是进入保存逻辑（避免误报）。
  3) 统一 `category` 使用 `tag.id`：新增/导入都强制映射到现有标签的 `id`，并在登录后将 `visibleTags` 初始化为所有标签 `id`，确保不会因类型不一致被过滤（`App.tsx:291–304` 已做并合并事件分类，必要时我们将过滤逻辑容错：当 `visibleTags` 为空时显示全部）。
  4) 在导入/批量替换后统一刷新：已存在（`App.tsx:401–413`、`App.tsx:349–362`），保留。

## 一次性 SQL（直接粘贴到 Supabase SQL Editor 执行）
```
-- 1) 查看当前用户事件（按你提供的 user_id）
select id, title, start_time, end_time, category
from public.events
where user_id = '47cdb2cb-1753-480e-8452-25f7ab09b64d'
order by start_time desc
limit 50;

-- 2) 检查表结构
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'events'
order by ordinal_position;

-- 3) 查看 RLS 策略
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'events';
```

## 验证路径
- 若第 (1) 有数据：说明后端写入正常，显示问题多半是过滤；我们将标准化 `category` 与 `visibleTags` 的一致性并加入容错显示。
- 若第 (2) 表结构缺失：我们将提供迁移 SQL 与最小改动以对齐。
- 若第 (3) 无 RLS 或条件不符：按 `auth.uid() = user_id` 修订策略。

请确认上述计划；确认后我将按步骤实施代码小改（不新增文件），并在本地运行验证，确保“创建/导入事件可保存，重新进入后可显示”。