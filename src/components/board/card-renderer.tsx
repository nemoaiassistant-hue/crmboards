"use client";

import { format, parseISO } from "date-fns";
import type { Item, Column, ItemValue } from "@/types/database";

interface CardRendererProps {
  item: Item;
  columns: Column[];
}

export function CardRenderer({ item, columns }: CardRendererProps) {
  // Show up to 3 key fields
  const displayColumns = columns.slice(0, 3);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground truncate">
        {item.name}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {displayColumns.map((col) => {
          const val = item.values?.find((v) => v.column_id === col.id);
          return (
            <CardFieldValue key={col.id} column={col} value={val?.value} />
          );
        })}
      </div>
    </div>
  );
}

function CardFieldValue({ column, value }: { column: Column; value: unknown }) {
  if (value == null) return null;

  switch (column.column_type) {
    case "status": {
      const labels: Array<{ label: string; color: string }> =
        column.settings?.labels ?? [];
      const label = labels.find((l) => l.label === value);
      return (
        <span
          className="inline-flex items-center rounded-sm px-2 py-0 text-[10px] font-medium text-white"
          style={{ backgroundColor: label?.color ?? "#c4c4c4" }}
        >
          {String(value)}
        </span>
      );
    }
    case "date":
      try {
        return (
          <span className="text-[10px] text-muted-foreground">
            📅 {format(parseISO(value as string), "MMM d")}
          </span>
        );
      } catch {
        return null;
      }
    case "text":
      return (
        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
          {String(value)}
        </span>
      );
    case "number":
      return (
        <span className="text-[10px] text-muted-foreground">
          {String(value)}
        </span>
      );
    case "people": {
      const people = value as Array<{ name: string }>;
      return (
        <span className="text-[10px] text-muted-foreground">
          👤 {people?.length ?? 0}
        </span>
      );
    }
    case "tags": {
      const tags = value as string[];
      return (
        <span className="text-[10px] text-muted-foreground">
          {tags?.join(", ")}
        </span>
      );
    }
    case "checkbox":
      return (
        <span className="text-[10px]">
          {value ? "✅" : "⬜"}
        </span>
      );
    default:
      return null;
  }
}
