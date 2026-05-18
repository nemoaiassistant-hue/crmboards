"use client";

import { useState, useRef, useEffect } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import type { Column } from "@/types/database";

interface TimelineCellProps {
  value: { start: string; end: string } | null;
  column: Column;
  onChange: (value: { start: string; end: string }) => void;
}

export function TimelineCell({ value, column: _column, onChange }: TimelineCellProps) {
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
    ? `${format(parseISO(value.start), "MMM d")} → ${format(parseISO(value.end), "MMM d")}`
    : "";

  const barWidth = value
    ? Math.min(Math.max(differenceInDays(parseISO(value.end), parseISO(value.start)), 2) * 3, 100)
    : 0;

  return (
    <div className="relative" ref={ref}>
      <button
        className="w-full h-full px-2 flex items-center gap-2 hover:bg-accent/50 rounded-sm"
        onClick={() => setOpen(!open)}
      >
        {value && (
          <div className="flex items-center gap-1.5 w-full">
            <div
              className="h-2.5 rounded-full bg-[#579bfc]"
              style={{ width: `${Math.max(barWidth, 10)}%` }}
            />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {display}
            </span>
          </div>
        )}
        {!value && <span className="text-muted-foreground text-xs">—</span>}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 rounded-lg border border-border bg-popover shadow-lg p-3 space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">Start</label>
            <input
              type="date"
              className="w-full rounded border border-input px-2 py-1 text-sm bg-background"
              value={value?.start ?? ""}
              onChange={(e) => {
                const start = e.target.value;
                onChange({
                  start,
                  end: value?.end && value.end >= start ? value.end : start,
                });
              }}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">End</label>
            <input
              type="date"
              className="w-full rounded border border-input px-2 py-1 text-sm bg-background"
              value={value?.end ?? ""}
              min={value?.start ?? ""}
              onChange={(e) => {
                if (value?.start) {
                  onChange({ start: value.start, end: e.target.value });
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
