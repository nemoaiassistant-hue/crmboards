"use client";

import { useState, useRef, useEffect } from "react";
import type { Column } from "@/types/database";

interface StatusCellProps {
  value: string | null;
  column: Column;
  onChange: (value: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  "#00c875": "bg-[#00c875] text-white",
  "#fdab3d": "bg-[#fdab3d] text-white",
  "#e2445c": "bg-[#e2445c] text-white",
  "#0086c0": "bg-[#0086c0] text-white",
  "#a25ddc": "bg-[#a25ddc] text-white",
  "#ff642e": "bg-[#ff642e] text-white",
  "#579bfc": "bg-[#579bfc] text-white",
  "#c4c4c4": "bg-[#c4c4c4] text-white",
  "#037f4c": "bg-[#037f4c] text-white",
  "#bb3354": "bg-[#bb3354] text-white",
};

export function StatusCell({ value, column, onChange }: StatusCellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const labels: Array<{ label: string; color: string }> =
    column.settings?.labels ?? [];

  const currentLabel = labels.find((l) => l.label === value);
  const colorClass = currentLabel
    ? STATUS_COLORS[currentLabel.color] ?? "bg-gray-300 text-gray-700"
    : "bg-gray-100 text-gray-500";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        className={`w-full h-full px-3 text-xs font-medium rounded-sm transition-opacity hover:opacity-90 ${colorClass}`}
        onClick={() => setOpen(!open)}
      >
        {value || ""}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-40 rounded-lg border border-border bg-popover shadow-lg py-1">
          {labels.map((label) => {
            const cls =
              STATUS_COLORS[label.color] ?? "bg-gray-300 text-gray-700";
            return (
              <button
                key={label.label}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:opacity-80 ${cls} ${
                  label.label === value ? "ring-2 ring-ring ring-offset-1" : ""
                }`}
                onClick={() => {
                  onChange(label.label);
                  setOpen(false);
                }}
              >
                {label.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
