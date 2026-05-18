"use client";

import type { Column, ItemValue } from "@/types/database";
import { StatusCell } from "./status-cell";
import { TextCell } from "./text-cell";
import { NumberCell } from "./number-cell";
import { DateCell } from "./date-cell";
import { PeopleCell } from "./people-cell";
import { TagsCell } from "./tags-cell";
import { CheckboxCell } from "./checkbox-cell";
import { TimelineCell } from "./timeline-cell";
import { LinkCell } from "./link-cell";

interface CellRendererProps {
  column: Column;
  values: ItemValue[];
  onChange: (columnId: string, value: unknown) => void;
}

/** Extract a plain string from a value that might be {label, color} or just a string */
function extractLabel(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object" && "label" in (val as Record<string, unknown>)) {
    return (val as Record<string, unknown>).label as string;
  }
  return String(val);
}

/** Extract a timeline {start, end} from a value */
function extractTimeline(val: unknown): { start: string; end: string } | null {
  if (val == null) return null;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (parsed.start && parsed.end) return parsed;
    } catch { /* not json */ }
    return null;
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (obj.start && obj.end) return { start: String(obj.start), end: String(obj.end) };
  }
  return null;
}

/** Extract people array */
function extractPeople(val: unknown): Array<{ id: string; name: string }> | null {
  if (val == null) return null;
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return null; }
  }
  return null;
}

export function CellRenderer({ column, values, onChange }: CellRendererProps) {
  const itemValue = values.find((v) => v.column_id === column.id);
  const rawValue = itemValue?.value ?? null;

  switch (column.column_type) {
    case "text":
      return (
        <TextCell
          value={typeof rawValue === "string" ? rawValue : rawValue != null ? String(rawValue) : null}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "number":
      return (
        <NumberCell
          value={typeof rawValue === "number" ? rawValue : rawValue != null ? Number(rawValue) : null}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "status":
      return (
        <StatusCell
          value={extractLabel(rawValue)}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "date":
      return (
        <DateCell
          value={typeof rawValue === "string" ? rawValue : rawValue != null ? String(rawValue) : null}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "people":
      return (
        <PeopleCell
          value={extractPeople(rawValue)}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "tags":
      return (
        <TagsCell
          value={Array.isArray(rawValue) ? rawValue : rawValue != null ? [String(rawValue)] : null}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "checkbox":
      return (
        <CheckboxCell
          value={rawValue as boolean | null}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "timeline":
      return (
        <TimelineCell
          value={extractTimeline(rawValue)}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "link":
      return (
        <LinkCell
          value={rawValue as { url: string; text?: string } | null}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    default:
      return (
        <div className="px-2 text-xs text-muted-foreground">
          {typeof rawValue === "object" ? JSON.stringify(rawValue) : String(rawValue ?? "")}
        </div>
      );
  }
}
