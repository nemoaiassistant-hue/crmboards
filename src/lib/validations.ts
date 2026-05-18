import { z } from "zod";

// ── Organization ──────────────────────────────────────────────────────────────

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens"
    ),
});

// ── Workspace ─────────────────────────────────────────────────────────────────

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  icon: z.string().max(10).optional(),
});

// ── Board ─────────────────────────────────────────────────────────────────────

export const createBoardSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  board_type: z.enum(["project", "crm", "task", "custom"]),
  workspace_id: z.string().uuid("Invalid workspace ID"),
});

// ── Column ────────────────────────────────────────────────────────────────────

export const createColumnSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  column_type: z.enum([
    "text",
    "number",
    "status",
    "date",
    "people",
    "tags",
    "timeline",
    "link",
    "checkbox",
    "formula",
  ]),
  settings: z.record(z.string(), z.any()).default({}),
});

// ── Item ──────────────────────────────────────────────────────────────────────

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  group_id: z.string().uuid("Invalid group ID"),
});

// ── Item Value ────────────────────────────────────────────────────────────────

export const updateItemValueSchema = z.object({
  column_id: z.string().uuid("Invalid column ID"),
  value: z.any(),
});

// ── Automation ────────────────────────────────────────────────────────────────

export const createAutomationSchema = z.object({
  trigger_type: z.enum([
    "status_change",
    "date_arrives",
    "item_created",
    "assignee_changed",
  ]),
  trigger_config: z.record(z.string(), z.any()),
  action_type: z.enum([
    "move_to_group",
    "change_status",
    "notify",
    "create_item",
  ]),
  action_config: z.record(z.string(), z.any()),
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemValueInput = z.infer<typeof updateItemValueSchema>;
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
