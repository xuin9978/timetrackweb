-- RLS Policies for Events and Tags tables
-- These policies ensure users can only access their own data

-- Events table policies
CREATE POLICY "Users can view their own events" ON events
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events" ON events
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" ON events
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" ON events
    FOR DELETE
    USING (auth.uid() = user_id);

-- Tags table policies
CREATE POLICY "Users can view their own tags" ON tags
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags" ON tags
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON tags
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON tags
    FOR DELETE
    USING (auth.uid() = user_id);

-- If RLS is not enabled on these tables, enable it:
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tags ENABLE ROW LEVEL SECURITY;