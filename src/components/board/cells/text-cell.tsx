"use client";

import { useState, useRef, useEffect } from "react";
import type { Column } from "@/types/database";

interface TextCellProps {
  value: string | null;
  column: Column;
  onChange: (value: string) => void;
}

export function TextCell({ value, column: _column, onChange }: TextCellProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = () => {
    setEditing(false);
    if (local !== (value ?? "")) {
      onChange(local);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-full h-full px-2 text-sm bg-white border border-primary outline-none"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setLocal(value ?? "");
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div
      className="w-full h-full px-2 text-sm text-foreground flex items-center cursor-text truncate"
      onClick={() => {
        setLocal(value ?? "");
        setEditing(true);
      }}
    >
      {value ?? ""}
    </div>
  );
}
