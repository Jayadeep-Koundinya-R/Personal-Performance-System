-- ==============================================================================
-- 📚 PPS FOCUS ROOMS: Study Groups, Channels & Real-Time Chat Migration
-- ==============================================================================

-- 1. Study Groups Table
CREATE TABLE IF NOT EXISTS study_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  privacy TEXT DEFAULT 'private' CHECK (privacy IN ('public', 'private')),
  max_members INT DEFAULT 10,
  avatar_emoji TEXT DEFAULT '📚',
  study_topic TEXT DEFAULT 'General Study',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT DEFAULT 'Member',
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'teacher', 'mentor')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'left')),
  current_streak INT DEFAULT 0,
  is_studying BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 3. Group Channels Table
CREATE TABLE IF NOT EXISTS group_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'custom' CHECK (type IN ('general', 'resources', 'custom', 'announcements')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Channel Messages Table
CREATE TABLE IF NOT EXISTS channel_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES group_channels(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL DEFAULT 'User',
  sender_avatar TEXT DEFAULT '👤',
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'link', 'system', 'file')),
  link_url TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_study_groups_invite ON study_groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_channels_group ON group_channels(group_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON channel_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_created ON channel_messages(created_at DESC);

-- 6. Row Level Security (RLS)
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;

-- Study Groups Policies
CREATE POLICY "Public or member read study_groups"
  ON study_groups FOR SELECT
  USING (
    privacy = 'public' OR
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Authenticated users can create study_groups"
  ON study_groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Group creators or admins can update study_groups"
  ON study_groups FOR UPDATE
  USING (
    created_by = auth.uid() OR
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role IN ('admin', 'teacher') AND status = 'active')
  );

-- Group Members Policies
CREATE POLICY "Members can view members in their groups"
  ON group_members FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own member profile or admins can update members"
  ON group_members FOR UPDATE
  USING (
    user_id = auth.uid() OR
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role IN ('admin', 'teacher') AND status = 'active')
  );

-- Group Channels Policies
CREATE POLICY "Members can view group channels"
  ON group_channels FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Admins or teachers can create channels"
  ON group_channels FOR INSERT
  WITH CHECK (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role IN ('admin', 'teacher') AND status = 'active')
  );

-- Channel Messages Policies
CREATE POLICY "Members can view channel messages"
  ON channel_messages FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Members can insert messages"
  ON channel_messages FOR INSERT
  WITH CHECK (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Senders or admins can update messages (pin/edit)"
  ON channel_messages FOR UPDATE
  USING (
    sender_id = auth.uid() OR
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role IN ('admin', 'teacher') AND status = 'active')
  );
