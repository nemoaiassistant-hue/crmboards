"use client";

import { useState, useRef, useEffect } from "react";
import type { Column } from "@/types/database";

interface NumberCellProps {
  value: number | null;
  column: Column;
  onChange: (value: number | null) => void;
}

export function NumberCell({ value, column: _column, onChange }: NumberCellProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value != null ? String(value) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = () => {
    setEditing(false);
    const num = local.trim() === "" ? null : Number(local);
    if (num !== value) {
      onChange(num);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        className="w-full h-full px-2 text-sm bg-white border border-primary outline-none text-right"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setLocal(value != null ? String(value) : "");
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div
      className="w-full h-full px-2 text-sm text-foreground flex items-center justify-end cursor-text"
      onClick={() => {
        setLocal(value != null ? String(value) : "");
        setEditing(true);
      }}
    >
      {value != null ? value : ""}
    </div>
  );
}
