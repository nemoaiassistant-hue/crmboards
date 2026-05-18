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

export function CellRenderer({ column, values, onChange }: CellRendererProps) {
  const itemValue = values.find((v) => v.column_id === column.id);
  const rawValue = itemValue?.value ?? null;

  switch (column.column_type) {
    case "text":
      return (
        <TextCell
          value={rawValue as string | null}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "number":
      return (
        <NumberCell
          value={rawValue as number | null}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "status":
      return (
        <StatusCell
          value={rawValue as string | null}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "date":
      return (
        <DateCell
          value={rawValue as string | null}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "people":
      return (
        <PeopleCell
          value={rawValue as Array<{ id: string; name: string }> | null}
          column={column}
          onChange={(v) => onChange(column.id, v)}
        />
      );
    case "tags":
      return (
        <TagsCell
          value={rawValue as string[] | null}
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
          value={rawValue as { start: string; end: string } | null}
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
          {JSON.stringify(rawValue)}
        </div>
      );
  }
}
