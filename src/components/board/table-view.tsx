"use client";

import { useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  GripVertical,
  MoreHorizontal,
  Trash2,
  Edit3,
  ArrowUpAZ,
  ArrowDownZA,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CellRenderer } from "./cells/cell-renderer";
import type { Column, Group, Item, ItemValue } from "@/types/database";

interface TableViewProps {
  columns: Column[];
  groups: Group[];
  items: Item[];
  onAddItem: (groupId: string, name: string) => void;
  onToggleGroup: (groupId: string, collapsed: boolean) => void;
  onReorderItems: (itemId: string, groupId: string, position: number) => void;
  onDeleteItem: (itemId: string) => void;
  onRenameItem: (itemId: string, name: string) => void;
  onValueChange: (itemId: string, columnId: string, value: unknown) => void;
  onColumnRename: (columnId: string, name: string) => void;
  onColumnDelete: (columnId: string) => void;
  onColumnReorder: (columnId: string, sortOrder: number) => void;
  onSortColumn: (columnId: string, direction: "asc" | "desc") => void;
  onItemClick: (itemId: string) => void;
}

const ROW_HEIGHT = 36;

export function TableView({
  columns,
  groups,
  items,
  onAddItem,
  onToggleGroup,
  onReorderItems,
  onDeleteItem,
  onRenameItem,
  onValueChange,
  onColumnRename,
  onColumnDelete,
  onColumnReorder,
  onSortColumn,
  onItemClick,
}: TableViewProps) {
  const [newItemNames, setNewItemNames] = useState<Record<string, string>>({});
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [headerValue, setHeaderValue] = useState("");
  const [sortState, setSortState] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  } | null>(null);

  const getItemsForGroup = useCallback(
    (groupId: string) => {
      let groupItems = items.filter((item) => item.group_id === groupId);
      if (sortState) {
        const col = columns.find((c) => c.id === sortState.columnId);
        if (col) {
          groupItems = [...groupItems].sort((a, b) => {
            const aVal = a.values?.find((v) => v.column_id === sortState.columnId)?.value ?? "";
            const bVal = b.values?.find((v) => v.column_id === sortState.columnId)?.value ?? "";
            const aStr = typeof aVal === "string" ? aVal : JSON.stringify(aVal);
            const bStr = typeof bVal === "string" ? bVal : JSON.stringify(bVal);
            const cmp = aStr.localeCompare(bStr);
            return sortState.direction === "asc" ? cmp : -cmp;
          });
        }
      }
      return groupItems;
    },
    [items, columns, sortState]
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const itemId = draggableId.replace("item-", "");
    const targetGroupId = destination.droppableId.replace("group-", "");
    onReorderItems(itemId, targetGroupId, destination.index);
  };

  const handleHeaderDoubleClick = (column: Column) => {
    setEditingHeader(column.id);
    setHeaderValue(column.name);
  };

  const saveHeader = (columnId: string) => {
    if (headerValue.trim()) {
      onColumnRename(columnId, headerValue.trim());
    }
    setEditingHeader(null);
  };

  const handleSort = (columnId: string, direction: "asc" | "desc") => {
    setSortState({ columnId, direction });
    onSortColumn(columnId, direction);
  };

  const addItem = (groupId: string) => {
    const name = newItemNames[groupId]?.trim();
    if (name) {
      onAddItem(groupId, name);
      setNewItemNames((prev) => ({ ...prev, [groupId]: "" }));
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="w-full overflow-x-auto">
        {/* Column headers */}
        <div className="flex border-b border-border bg-muted/30 sticky top-0 z-10">
          {/* Name column header */}
          <div
            className="flex-shrink-0 border-r border-border flex items-center px-3 font-medium text-xs text-muted-foreground uppercase tracking-wider"
            style={{ width: 280, minWidth: 280, height: ROW_HEIGHT }}
          >
            Item
          </div>

          {columns.map((column) => (
            <div
              key={column.id}
              className="flex-shrink-0 border-r border-border flex items-center justify-between px-2 group/header"
              style={{ width: 160, minWidth: 160, height: ROW_HEIGHT }}
            >
              {editingHeader === column.id ? (
                <input
                  className="w-full h-6 px-1 text-xs font-medium bg-background border border-primary rounded outline-none"
                  value={headerValue}
                  onChange={(e) => setHeaderValue(e.target.value)}
                  onBlur={() => saveHeader(column.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveHeader(column.id);
                    if (e.key === "Escape") setEditingHeader(null);
                  }}
                  autoFocus
                />
              ) : (
                <>
                  <span
                    className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate cursor-pointer"
                    onDoubleClick={() => handleHeaderDoubleClick(column)}
                  >
                    {column.name}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button className="opacity-0 group-hover/header:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded" />
                      }
                    >
                      <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem
                        onClick={() => handleHeaderDoubleClick(column)}
                      >
                        <Edit3 className="mr-2 h-3.5 w-3.5" />
                        Rename column
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSort(column.id, "asc")}
                      >
                        <ArrowUpAZ className="mr-2 h-3.5 w-3.5" />
                        Sort A → Z
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSort(column.id, "desc")}
                      >
                        <ArrowDownZA className="mr-2 h-3.5 w-3.5" />
                        Sort Z → A
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onColumnDelete(column.id)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete column
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Groups */}
        {groups.map((group) => {
          const groupItems = getItemsForGroup(group.id);
          const isCollapsed = group.collapsed;

          return (
            <div key={group.id} className="border-b border-border">
              {/* Group header */}
              <div
                className="flex items-center h-9 cursor-pointer select-none"
                style={{ borderLeft: `4px solid ${group.color}` }}
                onClick={() => onToggleGroup(group.id, !isCollapsed)}
              >
                <div className="flex items-center gap-2 px-3">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {group.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {groupItems.length}
                  </span>
                </div>
              </div>

              {/* Items */}
              {!isCollapsed && (
                <Droppable droppableId={`group-${group.id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`${
                        snapshot.isDraggingOver ? "bg-accent/20" : ""
                      }`}
                    >
                      {groupItems.map((item, index) => (
                        <Draggable
                          key={item.id}
                          draggableId={`item-${item.id}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex border-b border-border/50 hover:bg-accent/20 transition-colors ${
                                snapshot.isDragging
                                  ? "bg-accent/40 shadow-lg"
                                  : ""
                              }`}
                              style={{
                                height: ROW_HEIGHT,
                                ...provided.draggableProps.style,
                              }}
                            >
                              {/* Name column */}
                              <div
                                className="flex-shrink-0 border-r border-border flex items-center px-2 gap-1.5"
                                style={{ width: 280, minWidth: 280 }}
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab text-muted-foreground hover:text-foreground"
                                >
                                  <GripVertical className="h-3.5 w-3.5" />
                                </div>
                                <ItemNameCell
                                  name={item.name}
                                  onRename={(name) =>
                                    onRenameItem(item.id, name)
                                  }
                                  onClick={() => onItemClick(item.id)}
                                />
                                <button
                                  className="opacity-0 hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                  onClick={() => onDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Value columns */}
                              {columns.map((column) => (
                                <div
                                  key={column.id}
                                  className="flex-shrink-0 border-r border-border/50 overflow-hidden"
                                  style={{ width: 160, minWidth: 160 }}
                                >
                                  <CellRenderer
                                    column={column}
                                    values={item.values ?? []}
                                    onChange={(colId, value) =>
                                      onValueChange(item.id, colId, value)
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {/* Add item row */}
                      <div
                        className="flex items-center px-3 gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        style={{ height: ROW_HEIGHT }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <input
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          placeholder="Add item"
                          value={newItemNames[group.id] ?? ""}
                          onChange={(e) =>
                            setNewItemNames((prev) => ({
                              ...prev,
                              [group.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addItem(group.id);
                          }}
                          onBlur={() => {
                            if (newItemNames[group.id]?.trim()) {
                              addItem(group.id);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

// Inline-editable item name cell
function ItemNameCell({
  name,
  onRename,
  onClick,
}: {
  name: string;
  onRename: (name: string) => void;
  onClick: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  const save = () => {
    setEditing(false);
    if (value.trim() && value.trim() !== name) {
      onRename(value.trim());
    } else {
      setValue(name);
    }
  };

  if (editing) {
    return (
      <input
        className="flex-1 h-6 px-1 text-sm font-medium bg-background border border-primary rounded outline-none"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setValue(name);
            setEditing(false);
          }
        }}
        autoFocus
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      className="flex-1 text-left text-sm font-medium text-foreground truncate hover:text-primary transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {name}
    </button>
  );
}
