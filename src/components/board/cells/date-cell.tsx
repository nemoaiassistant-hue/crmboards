"use client";

import { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import type { Column } from "@/types/database";

interface DateCellProps {
  value: string | null;
  column: Column;
  onChange: (value: string) => void;
}

export function DateCell({ value, column: _column, onChange }: DateCellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const display = value
    ? format(parseISO(value), "MMM d, yyyy")
    : "";

  return (
    <div className="relative" ref={ref}>
      <button
        className="w-full h-full px-2 text-sm text-foreground flex items-center hover:bg-accent/50 rounded-sm"
        onClick={() => setOpen(!open)}
      >
        {display || <span className="text-muted-foreground">—</span>}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 rounded-lg border border-border bg-popover shadow-lg p-2">
          <input
            type="date"
            className="w-full rounded border border-input px-2 py-1 text-sm bg-background"
            value={value ?? ""}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            onBlur={() => setOpen(false)}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
