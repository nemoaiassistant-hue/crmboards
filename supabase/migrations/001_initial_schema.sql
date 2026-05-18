-- CRMboards Database Schema
-- Multi-tenant project management (Monday.com-style)

-- =====================================================
-- HELPER: SECURITY DEFINER function to avoid RLS recursion
-- =====================================================
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT om.org_id
  FROM org_members om
  WHERE om.user_id = auth.uid()
    AND om.accepted_at IS NOT NULL
  LIMIT 1;
$$;

-- =====================================================
-- ORGANIZATIONS
-- =====================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_can_read" ON organizations
  FOR SELECT USING (id = get_my_org_id());

-- =====================================================
-- ORG MEMBERS
-- =====================================================
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(org_id, user_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_own" ON org_members
  FOR SELECT USING (user_id = auth.uid() OR org_id = get_my_org_id());
CREATE POLICY "members_insert" ON org_members
  FOR INSERT WITH CHECK (org_id = get_my_org_id());
CREATE POLICY "members_update" ON org_members
  FOR UPDATE USING (org_id = get_my_org_id());

-- =====================================================
-- USER PROFILES (public mirror of auth.users)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- WORKSPACES
-- =====================================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_org_scoped" ON workspaces
  FOR ALL USING (org_id = get_my_org_id());

-- =====================================================
-- BOARDS
-- =====================================================
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  board_type TEXT NOT NULL DEFAULT 'custom' CHECK (board_type IN ('project', 'crm', 'task', 'custom')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "board_org_scoped" ON boards
  FOR ALL USING (org_id = get_my_org_id());

-- =====================================================
-- GROUPS (colored sections within a board)
-- =====================================================
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#579bfc',
  position INT NOT NULL DEFAULT 0,
  collapsed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_org_scoped" ON groups
  FOR ALL USING (board_id IN (SELECT id FROM boards WHERE org_id = get_my_org_id()));

-- =====================================================
-- COLUMNS (field definitions per board)
-- =====================================================
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  column_type TEXT NOT NULL CHECK (column_type IN ('text', 'number', 'status', 'date', 'people', 'tags', 'timeline', 'link', 'checkbox', 'formula')),
  settings JSONB DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "column_org_scoped" ON columns
  FOR ALL USING (board_id IN (SELECT id FROM boards WHERE org_id = get_my_org_id()));

-- =====================================================
-- ITEMS (rows)
-- =====================================================
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_org_scoped" ON items
  FOR ALL USING (board_id IN (SELECT id FROM boards WHERE org_id = get_my_org_id()));

-- =====================================================
-- ITEM VALUES (EAV — cell data)
-- =====================================================
CREATE TABLE item_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  value JSONB,
  UNIQUE(item_id, column_id)
);

ALTER TABLE item_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_value_org_scoped" ON item_values
  FOR ALL USING (item_id IN (SELECT id FROM items WHERE board_id IN (SELECT id FROM boards WHERE org_id = get_my_org_id())));

-- =====================================================
-- VIEWS (saved board view configurations)
-- =====================================================
CREATE TABLE board_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  view_type TEXT NOT NULL CHECK (view_type IN ('table', 'kanban', 'timeline', 'calendar')),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE board_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_org_scoped" ON board_views
  FOR ALL USING (board_id IN (SELECT id FROM boards WHERE org_id = get_my_org_id()));

-- =====================================================
-- UPDATES (comments on items)
-- =====================================================
CREATE TABLE updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "update_org_scoped" ON updates
  FOR ALL USING (item_id IN (SELECT id FROM items WHERE board_id IN (SELECT id FROM boards WHERE org_id = get_my_org_id())));

-- =====================================================
-- AUTOMATIONS
-- =====================================================
CREATE TABLE automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('status_change', 'date_arrives', 'item_created', 'assignee_changed')),
  trigger_config JSONB DEFAULT '{}',
  action_type TEXT NOT NULL CHECK (action_type IN ('move_to_group', 'change_status', 'notify', 'create_item')),
  action_config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true
);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_org_scoped" ON automations
  FOR ALL USING (board_id IN (SELECT id FROM boards WHERE org_id = get_my_org_id()));

-- =====================================================
-- ACTIVITY LOG
-- =====================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_org_scoped" ON activity_log
  FOR SELECT USING (org_id = get_my_org_id());

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_boards_workspace ON boards(workspace_id);
CREATE INDEX idx_boards_org ON boards(org_id);
CREATE INDEX idx_groups_board ON groups(board_id);
CREATE INDEX idx_columns_board ON columns(board_id);
CREATE INDEX idx_items_board ON items(board_id);
CREATE INDEX idx_items_group ON items(group_id);
CREATE INDEX idx_item_values_item ON item_values(item_id);
CREATE INDEX idx_item_values_column ON item_values(column_id);
CREATE INDEX idx_updates_item ON updates(item_id);
CREATE INDEX idx_automations_board ON automations(board_id);
CREATE INDEX idx_activity_org ON activity_log(org_id);
