"use client";

import { useState, useRef, useEffect } from "react";
import { ExternalLink, Pencil } from "lucide-react";
import type { Column } from "@/types/database";

interface LinkCellProps {
  value: { url: string; text?: string } | null;
  column: Column;
  onChange: (value: { url: string; text?: string } | null) => void;
}

export function LinkCell({ value, column: _column, onChange }: LinkCellProps) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(value?.url ?? "");
  const [text, setText] = useState(value?.text ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setEditing(false);
      }
    }
    if (editing) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editing]);

  const save = () => {
    setEditing(false);
    const trimmedUrl = url.trim();
    if (trimmedUrl) {
      onChange({ url: trimmedUrl, text: text.trim() || undefined });
    } else {
      onChange(null);
    }
  };

  if (editing) {
    return (
      <div ref={ref} className="flex items-center gap-1 px-1">
        <input
          className="w-28 h-6 rounded border border-input px-1.5 text-xs bg-background"
          placeholder="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
        />
        <input
          className="w-20 h-6 rounded border border-input px-1.5 text-xs bg-background"
          placeholder="Label"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button
          className="h-6 px-1.5 rounded bg-primary text-primary-foreground text-[10px]"
          onClick={save}
        >
          ✓
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full px-2 flex items-center gap-1">
      {value?.url ? (
        <>
          <a
            href={value.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline truncate max-w-[80%]"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="inline h-3 w-3 mr-0.5" />
            {value.text || value.url}
          </a>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setUrl(value.url);
              setText(value.text ?? "");
              setEditing(true);
            }}
          >
            <Pencil className="h-3 w-3" />
          </button>
        </>
      ) : (
        <button
          className="text-muted-foreground text-xs hover:text-foreground"
          onClick={() => setEditing(true)}
        >
          + Add link
        </button>
      )}
    </div>
  );
}
