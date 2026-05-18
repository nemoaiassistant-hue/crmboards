"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Settings,
  Plus,
  Table,
  Columns3,
  CalendarDays,
  GanttChart,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TableView } from "@/components/board/table-view";
import { KanbanView } from "@/components/board/kanban-view";
import { TimelineView } from "@/components/board/timeline-view";
import { CalendarView } from "@/components/board/calendar-view";
import { ItemDetail } from "@/components/board/item-detail";
import type {
  Board,
  Column,
  Group,
  Item,
  ViewType,
  ColumnType,
} from "@/types/database";

type ViewTab = {
  type: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const VIEW_TABS: ViewTab[] = [
  { type: "table", label: "Table", icon: Table },
  { type: "kanban", label: "Kanban", icon: Columns3 },
  { type: "timeline", label: "Timeline", icon: GanttChart },
  { type: "calendar", label: "Calendar", icon: CalendarDays },
];

const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "status", label: "Status" },
  { value: "date", label: "Date" },
  { value: "people", label: "People" },
  { value: "tags", label: "Tags" },
  { value: "timeline", label: "Timeline" },
  { value: "link", label: "Link" },
  { value: "checkbox", label: "Checkbox" },
];

const DEFAULT_STATUS_SETTINGS = {
  labels: [
    { label: "Not Started", color: "#c4c4c4" },
    { label: "Working on it", color: "#fdab3d" },
    { label: "Done", color: "#00c875" },
    { label: "Stuck", color: "#e2445c" },
  ],
};

const DEFAULT_TAGS_SETTINGS = {
  tags: ["High Priority", "Medium", "Low", "Bug", "Feature"],
};

const GROUP_COLORS = [
  "#579bfc",
  "#00c875",
  "#fdab3d",
  "#e2445c",
  "#a25ddc",
  "#ff642e",
  "#0086c0",
  "#037f4c",
];

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>("table");
  const [editingName, setEditingName] = useState(false);
  const [boardName, setBoardName] = useState("");

  // Item detail panel
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Add column dialog
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<ColumnType>("text");

  // Add group dialog
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/boards/${boardId}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      setBoard(data.board);
      setColumns(data.board.columns ?? []);
      setGroups(data.board.groups ?? []);
      setItems(data.board.items ?? []);
      setBoardName(data.board.name);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [boardId, router]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Board name save
  const saveBoardName = async () => {
    setEditingName(false);
    if (boardName.trim() && boardName.trim() !== board?.name) {
      await fetch(`/api/v1/boards/${boardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: boardName.trim() }),
      });
      setBoard((b) => (b ? { ...b, name: boardName.trim() } : b));
    }
  };

  // Add column
  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    let settings = {};
    if (newColumnType === "status") settings = DEFAULT_STATUS_SETTINGS;
    if (newColumnType === "tags") settings = DEFAULT_TAGS_SETTINGS;

    const res = await fetch(`/api/v1/boards/${boardId}/columns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newColumnName.trim(),
        column_type: newColumnType,
        settings,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setColumns((prev) => [...prev, data.column]);
      setNewColumnName("");
      setNewColumnType("text");
      setAddColumnOpen(false);
    }
  };

  // Add group
  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    const res = await fetch(`/api/v1/boards/${boardId}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newGroupName.trim(),
        color: newGroupColor,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setGroups((prev) => [...prev, data.group]);
      setNewGroupName("");
      setNewGroupColor(GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]);
      setAddGroupOpen(false);
    }
  };

  // Add item
  const handleAddItem = async (groupId: string, name: string) => {
    const res = await fetch(`/api/v1/boards/${boardId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, group_id: groupId }),
    });
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => [...prev, data.item]);
    }
  };

  // Toggle group collapse
  const handleToggleGroup = async (groupId: string, collapsed: boolean) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, collapsed } : g))
    );
    await fetch(`/api/v1/boards/${boardId}/groups/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collapsed }),
    });
  };

  // Reorder items
  const handleReorderItems = async (
    itemId: string,
    groupId: string,
    position: number
  ) => {
    // Optimistically update
    setItems((prev) => {
      const item = prev.find((i) => i.id === itemId);
      if (!item) return prev;
      const filtered = prev.filter((i) => i.id !== itemId);
      const updated = { ...item, group_id: groupId, position };
      return [...filtered, updated];
    });

    await fetch(`/api/v1/boards/${boardId}/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: groupId, position }),
    });
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    if (selectedItemId === itemId) setSelectedItemId(null);
    await fetch(`/api/v1/boards/${boardId}/items/${itemId}`, {
      method: "DELETE",
    });
  };

  // Rename item
  const handleRenameItem = async (itemId: string, name: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, name } : i))
    );
    await fetch(`/api/v1/boards/${boardId}/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  };

  // Value change
  const handleValueChange = async (
    itemId: string,
    columnId: string,
    value: unknown
  ) => {
    // Optimistically update
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const values = item.values ?? [];
        const existingIdx = values.findIndex((v) => v.column_id === columnId);
        let newValues;
        if (existingIdx >= 0) {
          newValues = values.map((v, i) =>
            i === existingIdx ? { ...v, value } : v
          );
        } else {
          newValues = [
            ...values,
            {
              id: `temp-${columnId}`,
              item_id: itemId,
              column_id: columnId,
              value,
            },
          ];
        }
        return { ...item, values: newValues };
      })
    );

    await fetch(`/api/v1/items/${itemId}/values`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column_id: columnId, value }),
    });
  };

  // Column rename
  const handleColumnRename = async (columnId: string, name: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, name } : c))
    );
    await fetch(`/api/v1/boards/${boardId}/columns/${columnId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  };

  // Column delete
  const handleColumnDelete = async (columnId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    await fetch(`/api/v1/boards/${boardId}/columns/${columnId}`, {
      method: "DELETE",
    });
  };

  // Column reorder (no-op stub for now)
  const handleColumnReorder = async (_columnId: string, _sortOrder: number) => {
    // TODO: implement column reorder via API
  };

  // Sort column (client-side only, already handled in TableView)
  const handleSortColumn = (_columnId: string, _direction: "asc" | "desc") => {
    // Sort is handled in the view component
  };

  const selectedItem = selectedItemId
    ? items.find((i) => i.id === selectedItemId) ?? null
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading board...</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">
          Board not found or you don&apos;t have access.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          {/* Board name */}
          {editingName ? (
            <input
              className="text-lg font-bold bg-transparent border-b border-primary outline-none px-1"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              onBlur={saveBoardName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveBoardName();
                if (e.key === "Escape") {
                  setBoardName(board.name);
                  setEditingName(false);
                }
              }}
              autoFocus
            />
          ) : (
            <button
              className="text-lg font-bold text-foreground hover:text-primary transition-colors"
              onClick={() => setEditingName(true)}
            >
              {board.name}
            </button>
          )}

          <Separator orientation="vertical" className="h-5" />

          {/* View switcher tabs */}
          <div className="flex items-center gap-1">
            {VIEW_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.type;
              return (
                <Button
                  key={tab.type}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView(tab.type)}
                  className="gap-1.5"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">{tab.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Group */}
          <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
            <DialogTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <Plus className="h-4 w-4 mr-1" />
              Group
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Group</DialogTitle>
                <DialogDescription>
                  Add a new group section to organize your items.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Group name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddGroup();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    {GROUP_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          newGroupColor === color
                            ? "border-foreground scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewGroupColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddGroup}
                  disabled={!newGroupName.trim()}
                >
                  Create Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Column */}
          <Dialog open={addColumnOpen} onOpenChange={setAddColumnOpen}>
            <DialogTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <Plus className="h-4 w-4 mr-1" />
              Column
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Column</DialogTitle>
                <DialogDescription>
                  Add a column to define a field for your items.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Column Name</Label>
                  <Input
                    placeholder="e.g. Status, Priority"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Column Type</Label>
                  <Select
                    value={newColumnType}
                    onValueChange={(v) => setNewColumnType(v as ColumnType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_TYPES.map((ct) => (
                        <SelectItem key={ct.value} value={ct.value}>
                          {ct.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddColumn}
                  disabled={!newColumnName.trim()}
                >
                  Create Column
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Settings */}
          <Button variant="ghost" size="icon-sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-auto">
        {activeView === "table" && (
          <TableView
            columns={columns}
            groups={groups}
            items={items}
            onAddItem={handleAddItem}
            onToggleGroup={handleToggleGroup}
            onReorderItems={handleReorderItems}
            onDeleteItem={handleDeleteItem}
            onRenameItem={handleRenameItem}
            onValueChange={handleValueChange}
            onColumnRename={handleColumnRename}
            onColumnDelete={handleColumnDelete}
            onColumnReorder={handleColumnReorder}
            onSortColumn={handleSortColumn}
            onItemClick={setSelectedItemId}
          />
        )}
        {activeView === "kanban" && (
          <KanbanView
            columns={columns}
            groups={groups}
            items={items}
            onValueChange={handleValueChange}
            onAddItem={handleAddItem}
            onItemClick={setSelectedItemId}
          />
        )}
        {activeView === "timeline" && (
          <TimelineView
            columns={columns}
            groups={groups}
            items={items}
            onValueChange={handleValueChange}
            onItemClick={setSelectedItemId}
          />
        )}
        {activeView === "calendar" && (
          <CalendarView
            columns={columns}
            groups={groups}
            items={items}
            onValueChange={handleValueChange}
            onItemClick={setSelectedItemId}
          />
        )}
      </div>

      {/* Item detail panel */}
      <ItemDetail
        item={selectedItem}
        columns={columns}
        open={!!selectedItemId}
        onClose={() => setSelectedItemId(null)}
        onRenameItem={handleRenameItem}
        onValueChange={handleValueChange}
        onDeleteItem={handleDeleteItem}
      />
    </div>
  );
}
