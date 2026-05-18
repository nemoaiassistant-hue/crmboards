"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Plus, MoreHorizontal } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CardRenderer } from "./card-renderer";
import type { Column, Group, Item } from "@/types/database";

interface KanbanViewProps {
  columns: Column[];
  groups: Group[];
  items: Item[];
  onValueChange: (itemId: string, columnId: string, value: unknown) => void;
  onAddItem: (groupId: string, name: string) => void;
  onItemClick: (itemId: string) => void;
}

export function KanbanView({
  columns,
  groups,
  items,
  onValueChange,
  onAddItem,
  onItemClick,
}: KanbanViewProps) {
  const statusColumns = columns.filter((c) => c.column_type === "status");
  const [selectedColumnId, setSelectedColumnId] = useState<string>(
    statusColumns[0]?.id ?? ""
  );

  const selectedColumn = columns.find((c) => c.id === selectedColumnId);
  const labels: Array<{ label: string; color: string }> =
    selectedColumn?.settings?.labels ?? [];

  // If no status column selected or no labels, show a prompt
  if (!selectedColumn || labels.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-sm font-medium">No status columns available</p>
          <p className="text-xs mt-1">
            Add a status column with labels to use the Kanban view
          </p>
        </div>
      </div>
    );
  }

  // Get items by status label
  const itemsByStatus = useMemo(() => {
    const map: Record<string, Item[]> = {};
    labels.forEach((l) => (map[l.label] = []));
    // Items with no status go to an "unassigned" bucket
    map[""] = [];

    items.forEach((item) => {
      const val = item.values?.find((v) => v.column_id === selectedColumnId);
      const rawVal = val?.value;
      // Value might be a string or {label, color} object
      let statusLabel: string = "";
      if (typeof rawVal === "string") {
        statusLabel = rawVal;
      } else if (rawVal && typeof rawVal === "object" && "label" in rawVal) {
        statusLabel = String((rawVal as { label: string }).label);
      }
      if (map[statusLabel]) {
        map[statusLabel].push(item);
      } else {
        map[""].push(item);
      }
    });
    return map;
  }, [items, selectedColumnId, labels]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const itemId = result.draggableId.replace("kanban-item-", "");
    const statusLabel = result.destination.droppableId.replace("status-", "");
    onValueChange(itemId, selectedColumnId, statusLabel);
  };

  const addItemToStatus = (statusLabel: string) => {
    // Find a group to add to (first group by default)
    const targetGroup = groups[0];
    if (targetGroup) {
      onAddItem(targetGroup.id, "New Item");
    }
  };

  const allLabels = [...labels, { label: "", color: "#c4c4c4" }];

  return (
    <div className="flex flex-col h-full">
      {/* Column selector */}
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Group by:
        </span>
        <Select
          value={selectedColumnId}
          onValueChange={(v) => v && setSelectedColumnId(v)}
        >
          <SelectTrigger size="sm" className="w-48">
            <SelectValue placeholder="Select column..." />
          </SelectTrigger>
          <SelectContent>
            {statusColumns.map((col) => (
              <SelectItem key={col.id} value={col.id}>
                {col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 overflow-x-auto flex-1">
          {allLabels.map((label) => {
            const columnItems = itemsByStatus[label.label] ?? [];
            return (
              <div
                key={label.label || "__empty__"}
                className="flex-shrink-0 w-72 flex flex-col rounded-lg border border-border bg-muted/20"
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm font-semibold text-foreground">
                      {label.label || "Unassigned"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {columnItems.length}
                    </span>
                  </div>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => addItemToStatus(label.label)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Cards */}
                <Droppable droppableId={`status-${label.label}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 space-y-2 min-h-[100px] overflow-y-auto ${
                        snapshot.isDraggingOver ? "bg-accent/20" : ""
                      }`}
                    >
                      {columnItems.map((item, index) => (
                        <Draggable
                          key={item.id}
                          draggableId={`kanban-item-${item.id}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`rounded-lg border border-border bg-background p-3 cursor-pointer shadow-sm hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : ""
                              }`}
                              onClick={() => onItemClick(item.id)}
                            >
                              <CardRenderer
                                item={item}
                                columns={columns.filter(
                                  (c) => c.id !== selectedColumnId
                                )}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
