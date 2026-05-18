// Organizations
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  invited_at: string;
  accepted_at: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

// Workspaces
export interface Workspace {
  id: string;
  org_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
  boards?: Board[];
}

// Boards
export interface Board {
  id: string;
  workspace_id: string;
  org_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  board_type: "project" | "crm" | "task" | "custom";
  sort_order: number;
  created_at: string;
  groups?: Group[];
  columns?: Column[];
}

// Groups (colored sections within a board)
export interface Group {
  id: string;
  board_id: string;
  name: string;
  color: string;
  position: number;
  collapsed: boolean;
  created_at: string;
}

// Columns (field definitions per board)
export type ColumnType =
  | "text"
  | "number"
  | "status"
  | "date"
  | "people"
  | "tags"
  | "timeline"
  | "link"
  | "checkbox"
  | "formula";

export interface Column {
  id: string;
  board_id: string;
  name: string;
  column_type: ColumnType;
  settings: Record<string, any>; // e.g., { labels: [{label:"Done",color:"#00c875"}] }
  sort_order: number;
  created_at: string;
}

// Items (rows)
export interface Item {
  id: string;
  board_id: string;
  group_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
  values?: ItemValue[];
}

// Item Values (cell data — EAV pattern)
export interface ItemValue {
  id: string;
  item_id: string;
  column_id: string;
  value: any; // JSONB — structure depends on column_type
}

// Views
export type ViewType = "table" | "kanban" | "timeline" | "calendar";

export interface BoardView {
  id: string;
  board_id: string;
  name: string;
  view_type: ViewType;
  config: Record<string, any>; // filters, sorting, visible columns
  created_at: string;
}

// Updates (comments/activity on items)
export interface Update {
  id: string;
  item_id: string;
  user_id: string;
  body: string;
  created_at: string;
  users?: UserProfile;
}

// Automations
export interface Automation {
  id: string;
  board_id: string;
  trigger_type:
    | "status_change"
    | "date_arrives"
    | "item_created"
    | "assignee_changed";
  trigger_config: Record<string, any>;
  action_type: "move_to_group" | "change_status" | "notify" | "create_item";
  action_config: Record<string, any>;
  enabled: boolean;
}

// Activity Log
export interface ActivityLog {
  id: string;
  org_id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}
