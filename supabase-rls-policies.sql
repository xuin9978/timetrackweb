-- =============================================
-- Supabase RLS 策略配置脚本
-- 在 Supabase 控制台 → SQL Editor 中执行
-- =============================================

-- 1. 启用 RLS（如果未启用）
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 2. tags 表策略
-- 允许用户查询自己的标签
CREATE POLICY "Users can view their own tags" ON tags
  FOR SELECT USING (auth.uid() = user_id);

-- 允许用户插入自己的标签
CREATE POLICY "Users can insert their own tags" ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 允许用户更新自己的标签
CREATE POLICY "Users can update their own tags" ON tags
  FOR UPDATE USING (auth.uid() = user_id);

-- 允许用户删除自己的标签
CREATE POLICY "Users can delete their own tags" ON tags
  FOR DELETE USING (auth.uid() = user_id);

-- 3. events 表策略
-- 允许用户查询自己的事件
CREATE POLICY "Users can view their own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

-- 允许用户插入自己的事件
CREATE POLICY "Users can insert their own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 允许用户更新自己的事件
CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

-- 允许用户删除自己的事件
CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (auth.uid() = user_id);
