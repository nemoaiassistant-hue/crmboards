"use client";

import { useState, useRef, useEffect } from "react";
import type { Column } from "@/types/database";

interface TagsCellProps {
  value: string[] | null;
  column: Column;
  onChange: (value: string[]) => void;
}

const TAG_COLORS = [
  "#579bfc",
  "#00c875",
  "#fdab3d",
  "#e2445c",
  "#a25ddc",
  "#ff642e",
  "#0086c0",
  "#037f4c",
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function TagsCell({ value, column, onChange }: TagsCellProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const tags = value ?? [];
  const availableTags: string[] = column.settings?.tags ?? [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      onChange(tags.filter((t) => t !== tag));
    } else {
      onChange([...tags, tag]);
    }
  };

  const addCustom = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
    }
    setInput("");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="w-full h-full px-2 flex items-center gap-1 flex-wrap hover:bg-accent/50 rounded-sm"
        onClick={() => setOpen(!open)}
      >
        {tags.length === 0 && (
          <span className="text-muted-foreground text-xs">—</span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full px-2 py-0 text-[10px] font-medium text-white"
            style={{ backgroundColor: getTagColor(tag) }}
          >
            {tag}
          </span>
        ))}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-52 rounded-lg border border-border bg-popover shadow-lg p-2">
          <div className="flex flex-wrap gap-1 mb-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white transition-opacity ${
                  tags.includes(tag) ? "opacity-100" : "opacity-40"
                }`}
                style={{ backgroundColor: getTagColor(tag) }}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              className="flex-1 h-6 rounded border border-input px-2 text-xs bg-background"
              placeholder="Add tag..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <button
              className="h-6 px-2 rounded bg-primary text-primary-foreground text-xs"
              onClick={addCustom}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
