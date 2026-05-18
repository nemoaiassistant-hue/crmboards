"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Zap, Trash2, ArrowRight } from "lucide-react";
import type { Automation, Column, Group } from "@/types/database";

interface AutomationBuilderProps {
  boardId: string;
  columns: Column[];
  groups: Group[];
  open: boolean;
  onClose: () => void;
}

type TriggerType = Automation["trigger_type"];
type ActionType = Automation["action_type"];

interface TriggerOption {
  value: TriggerType;
  label: string;
}

interface ActionOption {
  value: ActionType;
  label: string;
}

const TRIGGER_OPTIONS: TriggerOption[] = [
  { value: "status_change", label: "When status changes" },
  { value: "item_created", label: "When item is created" },
  { value: "date_arrives", label: "When date arrives" },
  { value: "assignee_changed", label: "When assignee changes" },
];

const ACTION_OPTIONS: ActionOption[] = [
  { value: "move_to_group", label: "Move to group" },
  { value: "change_status", label: "Change status" },
  { value: "notify", label: "Send notification" },
  { value: "create_item", label: "Create item" },
];

export function AutomationBuilder({
  boardId,
  columns,
  groups,
  open,
  onClose,
}: AutomationBuilderProps) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Builder state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [triggerType, setTriggerType] = useState<TriggerType | "">("");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({});
  const [actionType, setActionType] = useState<ActionType | "">("");
  const [actionConfig, setActionConfig] = useState<Record<string, any>>({});

  // Derived column lists
  const statusColumns = columns.filter((c) => c.column_type === "status");
  const dateColumns = columns.filter((c) => c.column_type === "date");
  const peopleColumns = columns.filter((c) => c.column_type === "people");

  const fetchAutomations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/boards/${boardId}/automations`
      );
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (open) {
      fetchAutomations();
      resetBuilder();
    }
  }, [open, fetchAutomations]);

  function resetBuilder() {
    setStep(1);
    setTriggerType("");
    setTriggerConfig({});
    setActionType("");
    setActionConfig({});
  }

  async function handleSave() {
    if (!triggerType || !actionType) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/v1/boards/${boardId}/automations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trigger_type: triggerType,
            trigger_config: triggerConfig,
            action_type: actionType,
            action_config: actionConfig,
          }),
        }
      );
      if (res.ok) {
        await fetchAutomations();
        resetBuilder();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(automationId: string, enabled: boolean) {
    try {
      const res = await fetch(
        `/api/v1/boards/${boardId}/automations/${automationId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        }
      );
      if (res.ok) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === automationId ? { ...a, enabled } : a))
        );
      }
    } catch {
      // silently fail
    }
  }

  async function handleDelete(automationId: string) {
    try {
      const res = await fetch(
        `/api/v1/boards/${boardId}/automations/${automationId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setAutomations((prev) => prev.filter((a) => a.id !== automationId));
      }
    } catch {
      // silently fail
    }
  }

  // Get status label options from a column's settings
  function getStatusLabels(columnId: string): { label: string; value: number }[] {
    const col = columns.find((c) => c.id === columnId);
    if (!col?.settings?.labels) return [];
    return col.settings.labels.map(
      (l: { label: string }, i: number) => ({ label: l.label, value: i })
    );
  }

  function getTriggerDescription(): string {
    switch (triggerType) {
      case "status_change":
        return "When status changes";
      case "item_created":
        return "When item is created";
      case "date_arrives":
        return "When date arrives";
      case "assignee_changed":
        return "When assignee changes";
      default:
        return "";
    }
  }

  function getActionDescription(): string {
    switch (actionType) {
      case "move_to_group": {
        const group = groups.find((g) => g.id === actionConfig.group_id);
        return `Move to group "${group?.name ?? "unknown"}"`;
      }
      case "change_status": {
        const col = columns.find((c) => c.id === actionConfig.column_id);
        const labels = getStatusLabels(actionConfig.column_id);
        const target = labels.find(
          (l) => String(l.value) === String(actionConfig.new_value)
        );
        return `Change "${col?.name ?? "status"}" to "${target?.label ?? actionConfig.new_value}"`;
      }
      case "notify":
        return `Send notification: "${actionConfig.message || "..."}"`;
      case "create_item":
        return `Create item "${actionConfig.item_name || "New Item"}"`;
      default:
        return "";
    }
  }

  function renderTriggerConfig() {
    switch (triggerType) {
      case "status_change":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">
                Status Column
              </Label>
              <Select
                value={triggerConfig.column_id || ""}
                onValueChange={(v) =>
                  setTriggerConfig((prev) => ({ ...prev, column_id: v }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {statusColumns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {triggerConfig.column_id && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    From Status (optional)
                  </Label>
                  <Select
                    value={
                      triggerConfig.from_status !== undefined
                        ? String(triggerConfig.from_status)
                        : "any"
                    }
                    onValueChange={(v) =>
                      setTriggerConfig((prev) => ({
                        ...prev,
                        from_status: v === "any" ? null : Number(v),
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any status</SelectItem>
                      {getStatusLabels(triggerConfig.column_id).map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    To Status (optional)
                  </Label>
                  <Select
                    value={
                      triggerConfig.to_status !== undefined
                        ? String(triggerConfig.to_status)
                        : "any"
                    }
                    onValueChange={(v) =>
                      setTriggerConfig((prev) => ({
                        ...prev,
                        to_status: v === "any" ? null : Number(v),
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any status</SelectItem>
                      {getStatusLabels(triggerConfig.column_id).map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        );

      case "item_created":
        return (
          <div>
            <Label className="text-xs text-muted-foreground">
              In Group (optional)
            </Label>
            <Select
              value={triggerConfig.group_id || "any"}
              onValueChange={(v) =>
                setTriggerConfig((prev) => ({
                  ...prev,
                  group_id: v === "any" ? null : v,
                }))
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Any group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any group</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "date_arrives":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">
                Date Column
              </Label>
              <Select
                value={triggerConfig.column_id || ""}
                onValueChange={(v) =>
                  setTriggerConfig((prev) => ({ ...prev, column_id: v }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select date column" />
                </SelectTrigger>
                <SelectContent>
                  {dateColumns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Days Before
              </Label>
              <Input
                type="number"
                min={0}
                className="mt-1"
                placeholder="e.g. 1"
                value={triggerConfig.days_before ?? ""}
                onChange={(e) =>
                  setTriggerConfig((prev) => ({
                    ...prev,
                    days_before: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
          </div>
        );

      case "assignee_changed":
        return (
          <div>
            <Label className="text-xs text-muted-foreground">
              People Column
            </Label>
            <Select
              value={triggerConfig.column_id || ""}
              onValueChange={(v) =>
                setTriggerConfig((prev) => ({ ...prev, column_id: v }))
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select people column" />
              </SelectTrigger>
              <SelectContent>
                {peopleColumns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  }

  function renderActionConfig() {
    switch (actionType) {
      case "move_to_group":
        return (
          <div>
            <Label className="text-xs text-muted-foreground">
              Target Group
            </Label>
            <Select
              value={actionConfig.group_id || ""}
              onValueChange={(v) =>
                setActionConfig((prev) => ({ ...prev, group_id: v }))
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: g.color }}
                      />
                      {g.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "change_status":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">
                Status Column
              </Label>
              <Select
                value={actionConfig.column_id || ""}
                onValueChange={(v) =>
                  setActionConfig((prev) => ({ ...prev, column_id: v }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {statusColumns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {actionConfig.column_id && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  New Status
                </Label>
                <Select
                  value={
                    actionConfig.new_value !== undefined
                      ? String(actionConfig.new_value)
                      : ""
                  }
                  onValueChange={(v) =>
                    setActionConfig((prev) => ({
                      ...prev,
                      new_value: Number(v),
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {getStatusLabels(actionConfig.column_id).map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );

      case "notify":
        return (
          <div>
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              className="mt-1"
              placeholder="Enter notification message..."
              value={actionConfig.message || ""}
              onChange={(e) =>
                setActionConfig((prev) => ({
                  ...prev,
                  message: e.target.value,
                }))
              }
            />
          </div>
        );

      case "create_item":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">
                Item Name
              </Label>
              <Input
                className="mt-1"
                placeholder="New item name"
                value={actionConfig.item_name || ""}
                onChange={(e) =>
                  setActionConfig((prev) => ({
                    ...prev,
                    item_name: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Target Group
              </Label>
              <Select
                value={actionConfig.target_group_id || ""}
                onValueChange={(v) =>
                  setActionConfig((prev) => ({
                    ...prev,
                    target_group_id: v,
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  function canProceedStep1(): boolean {
    if (!triggerType) return false;
    if (
      (triggerType === "status_change" || triggerType === "assignee_changed") &&
      !triggerConfig.column_id
    )
      return false;
    if (triggerType === "date_arrives" && !triggerConfig.column_id)
      return false;
    return true;
  }

  function canProceedStep2(): boolean {
    if (!actionType) return false;
    if (actionType === "move_to_group" && !actionConfig.group_id) return false;
    if (
      actionType === "change_status" &&
      (!actionConfig.column_id || actionConfig.new_value === undefined)
    )
      return false;
    if (actionType === "notify" && !actionConfig.message) return false;
    if (actionType === "create_item" && !actionConfig.target_group_id)
      return false;
    return true;
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Automations
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Existing Automations */}
          {automations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Active Automations</h3>
              {automations.map((automation) => (
                <div
                  key={automation.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {TRIGGER_OPTIONS.find(
                          (t) => t.value === automation.trigger_type
                        )?.label ?? automation.trigger_type}
                      </Badge>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs shrink-0">
                        {ACTION_OPTIONS.find(
                          (a) => a.value === automation.action_type
                        )?.label ?? automation.action_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={automation.enabled}
                      onCheckedChange={(checked) =>
                        handleToggle(automation.id, checked)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(automation.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <Separator />
            </div>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}

          {/* Create New Automation */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Create Automation</h3>

            {/* Step indicators */}
            <div className="flex items-center gap-2 text-xs">
              {[
                { n: 1, label: "Trigger" },
                { n: 2, label: "Action" },
                { n: 3, label: "Review" },
              ].map((s, i) => (
                <div key={s.n} className="flex items-center gap-2">
                  {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                  <span
                    className={
                      step === s.n
                        ? "font-semibold text-foreground"
                        : step > s.n
                          ? "text-green-600"
                          : "text-muted-foreground"
                    }
                  >
                    {s.n}. {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 1: Trigger */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Choose a Trigger
                  </Label>
                  <Select
                    value={triggerType}
                    onValueChange={(v) => {
                      setTriggerType(v as TriggerType);
                      setTriggerConfig({});
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {triggerType && renderTriggerConfig()}
                <div className="flex justify-end">
                  <Button
                    disabled={!canProceedStep1()}
                    onClick={() => setStep(2)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Action */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Choose an Action
                  </Label>
                  <Select
                    value={actionType}
                    onValueChange={(v) => {
                      setActionType(v as ActionType);
                      setActionConfig({});
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {actionType && renderActionConfig()}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    disabled={!canProceedStep2()}
                    onClick={() => setStep(3)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                  <h4 className="text-sm font-medium">Automation Preview</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {getTriggerDescription()}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary">
                      {getActionDescription()}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button disabled={saving} onClick={handleSave}>
                    {saving ? "Saving..." : "Create Automation"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
