"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Column, Item, ItemValue, Update as UpdateType, UserProfile } from "@/types/database";
import { CellRenderer } from "./cells/cell-renderer";

interface ItemDetailProps {
  item: Item | null;
  columns: Column[];
  open: boolean;
  onClose: () => void;
  onRenameItem: (itemId: string, name: string) => void;
  onValueChange: (itemId: string, columnId: string, value: unknown) => void;
  onDeleteItem: (itemId: string) => void;
}

export function ItemDetail({
  item,
  columns,
  open,
  onClose,
  onRenameItem,
  onValueChange,
  onDeleteItem,
}: ItemDetailProps) {
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [updates, setUpdates] = useState<UpdateType[]>([]);
  const [newUpdate, setNewUpdate] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setEditingName(false);
      // Fetch updates for this item
      fetchUpdates(item.id);
    }
  }, [item]);

  const fetchUpdates = async (itemId: string) => {
    try {
      const res = await fetch(`/api/v1/items/${itemId}/updates`);
      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates ?? []);
      }
    } catch {
      // silent
    }
  };

  const saveName = () => {
    setEditingName(false);
    if (item && name.trim() && name.trim() !== item.name) {
      onRenameItem(item.id, name.trim());
    }
  };

  const postUpdate = async () => {
    if (!item || !newUpdate.trim()) return;
    try {
      const res = await fetch(`/api/v1/items/${item.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newUpdate.trim() }),
      });
      if (res.ok) {
        setNewUpdate("");
        fetchUpdates(item.id);
      }
    } catch {
      // silent
    }
  };

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 overflow-y-auto">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle>
            {editingName ? (
              <input
                ref={nameRef}
                className="w-full text-lg font-semibold bg-transparent border-b border-primary outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") {
                    setName(item.name);
                    setEditingName(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <button
                className="text-lg font-semibold text-left hover:text-primary transition-colors"
                onClick={() => setEditingName(true)}
              >
                {item.name}
              </button>
            )}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Created {format(parseISO(item.created_at), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </SheetHeader>

        {/* Column values */}
        <div className="px-4 py-3 space-y-4">
          {columns.map((column) => (
            <div key={column.id}>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                {column.name}
              </label>
              <div className="h-9 rounded-md border border-border overflow-hidden">
                <CellRenderer
                  column={column}
                  values={item.values ?? []}
                  onChange={(colId, value) =>
                    onValueChange(item.id, colId, value)
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Updates / Comments */}
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold mb-3">Updates</h3>

          <div className="space-y-3 mb-4">
            {updates.map((update) => (
              <div key={update.id} className="flex gap-2">
                <Avatar size="sm">
                  <AvatarFallback className="text-[9px]">
                    {update.users?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {update.users?.name ?? "Unknown"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(update.created_at), "MMM d 'at' h:mm a")}
                    </span>
                  </div>
                  <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap">
                    {update.body}
                  </p>
                </div>
              </div>
            ))}
            {updates.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No updates yet
              </p>
            )}
          </div>

          {/* New update */}
          <div className="flex gap-2">
            <Textarea
              className="flex-1 min-h-[40px] text-sm"
              placeholder="Write an update..."
              value={newUpdate}
              onChange={(e) => setNewUpdate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  postUpdate();
                }
              }}
            />
            <Button
              size="icon"
              onClick={postUpdate}
              disabled={!newUpdate.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Danger zone */}
        <div className="px-4 py-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onDeleteItem(item.id);
              onClose();
            }}
          >
            Delete Item
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
