"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Column, UserProfile } from "@/types/database";

interface PeopleCellProps {
  value: Array<{ id: string; name: string }> | null;
  column: Column;
  onChange: (value: Array<{ id: string; name: string }>) => void;
}

export function PeopleCell({ value, column: _column, onChange }: PeopleCellProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<UserProfile[]>([]);
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

  useEffect(() => {
    if (open) {
      // Fetch org members for the dropdown
      fetch("/api/v1/members")
        .then((r) => r.json())
        .then((data) => setMembers(data.members ?? []))
        .catch(() => {});
    }
  }, [open]);

  const assigned = value ?? [];
  const assignedIds = new Set(assigned.map((a) => a.id));

  const toggle = (member: UserProfile) => {
    if (assignedIds.has(member.id)) {
      onChange(assigned.filter((a) => a.id !== member.id));
    } else {
      onChange([...assigned, { id: member.id, name: member.name }]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="w-full h-full px-2 flex items-center gap-1 hover:bg-accent/50 rounded-sm"
        onClick={() => setOpen(!open)}
      >
        {assigned.length === 0 && (
          <span className="text-muted-foreground text-xs">—</span>
        )}
        {assigned.map((person) => (
          <Avatar key={person.id} size="sm">
            <AvatarFallback className="text-[9px]">
              {person.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-48 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg py-1">
          {members.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No members found
            </div>
          )}
          {members.map((member) => (
            <button
              key={member.id}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent ${
                assignedIds.has(member.id) ? "bg-accent/50" : ""
              }`}
              onClick={() => toggle(member)}
            >
              <Avatar size="sm">
                <AvatarFallback className="text-[9px]">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{member.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
