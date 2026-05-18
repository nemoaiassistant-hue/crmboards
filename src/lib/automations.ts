import { createClient } from "@/lib/supabase/server";
import type { Automation } from "@/types/database";

export interface TriggerData {
  itemId: string;
  columnId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  groupId?: string;
  boardId?: string;
}

export interface AutomationResult {
  automationId: string;
  actionType: string;
  success: boolean;
  error?: string;
}

/**
 * Execute all matching automations for a board when a trigger fires.
 * Called from API routes after relevant data changes.
 */
export async function executeAutomations(
  boardId: string,
  triggerType: string,
  triggerData: TriggerData
): Promise<AutomationResult[]> {
  const supabase = await createClient();

  // Fetch all enabled automations matching the trigger type
  const { data: automations, error } = await supabase
    .from("automations")
    .select("*")
    .eq("board_id", boardId)
    .eq("enabled", true)
    .eq("trigger_type", triggerType);

  if (error || !automations || automations.length === 0) {
    return [];
  }

  const results: AutomationResult[] = [];

  for (const automation of automations as Automation[]) {
    try {
      const shouldExecute = matchesTriggerConfig(
        triggerType,
        automation.trigger_config,
        triggerData
      );

      if (!shouldExecute) continue;

      const result = await executeAction(
        boardId,
        automation.action_type,
        automation.action_config,
        triggerData
      );

      results.push({
        automationId: automation.id,
        actionType: automation.action_type,
        success: result,
      });
    } catch (err) {
      results.push({
        automationId: automation.id,
        actionType: automation.action_type,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Check if the trigger data matches the automation's trigger configuration.
 */
function matchesTriggerConfig(
  triggerType: string,
  config: Record<string, any>,
  data: TriggerData
): boolean {
  switch (triggerType) {
    case "status_change": {
      // If config specifies a column, only match that column
      if (config.column_id && config.column_id !== data.columnId) {
        return false;
      }
      // If config specifies a "from" status, check old value matches
      if (
        config.from_status !== undefined &&
        config.from_status !== null &&
        config.from_status !== data.oldValue
      ) {
        return false;
      }
      // If config specifies a "to" status, check new value matches
      if (
        config.to_status !== undefined &&
        config.to_status !== null &&
        config.to_status !== data.newValue
      ) {
        return false;
      }
      return true;
    }

    case "item_created": {
      // If config specifies a group, only match items in that group
      if (config.group_id && config.group_id !== data.groupId) {
        return false;
      }
      return true;
    }

    case "date_arrives": {
      // Date-based triggers would normally be checked by a cron job
      // For now, match if column matches
      if (config.column_id && config.column_id !== data.columnId) {
        return false;
      }
      return true;
    }

    case "assignee_changed": {
      if (config.column_id && config.column_id !== data.columnId) {
        return false;
      }
      return true;
    }

    default:
      return false;
  }
}

/**
 * Execute a single automation action.
 */
async function executeAction(
  boardId: string,
  actionType: string,
  config: Record<string, any>,
  triggerData: TriggerData
): Promise<boolean> {
  const supabase = await createClient();

  switch (actionType) {
    case "move_to_group": {
      const targetGroupId = config.group_id;
      if (!targetGroupId) return false;

      const { error } = await supabase
        .from("items")
        .update({ group_id: targetGroupId })
        .eq("id", triggerData.itemId)
        .eq("board_id", boardId);

      if (error) {
        throw new Error(`Failed to move item: ${error.message}`);
      }
      return true;
    }

    case "change_status": {
      const { column_id: columnId, new_value: newValue } = config;
      if (!columnId || newValue === undefined) return false;

      const { error } = await supabase
        .from("item_values")
        .upsert(
          {
            item_id: triggerData.itemId,
            column_id: columnId,
            value: newValue,
          },
          { onConflict: "item_id,column_id" }
        );

      if (error) {
        throw new Error(`Failed to change status: ${error.message}`);
      }
      return true;
    }

    case "notify": {
      // For now, insert a notification record into an updates entry on the item
      // This can be replaced with a proper notification system later
      const message =
        config.message || "Automation notification triggered";

      // Get current user from auth context is not available here,
      // so use a system-like approach: insert into updates
      const { error } = await supabase.from("updates").insert({
        item_id: triggerData.itemId,
        user_id: null, // System notification
        body: `[Automation] ${message}`,
      });

      if (error) {
        throw new Error(`Failed to send notification: ${error.message}`);
      }
      return true;
    }

    case "create_item": {
      const {
        target_board_id: targetBoardId,
        target_group_id: targetGroupId,
        item_name: itemName,
      } = config;

      const effectiveBoardId = targetBoardId || boardId;
      if (!targetGroupId) return false;

      // Get current max position in the target group
      const { data: existing } = await supabase
        .from("items")
        .select("position")
        .eq("board_id", effectiveBoardId)
        .eq("group_id", targetGroupId)
        .order("position", { ascending: false })
        .limit(1);

      const position = (existing?.[0]?.position ?? -1) + 1;

      const { error } = await supabase.from("items").insert({
        board_id: effectiveBoardId,
        group_id: targetGroupId,
        name: itemName || "New Item (automation)",
        position,
      });

      if (error) {
        throw new Error(`Failed to create item: ${error.message}`);
      }
      return true;
    }

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}
