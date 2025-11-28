-- 添加 category 字段用于标签持久化到事件表
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS category text;

