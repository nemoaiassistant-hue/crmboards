"use client";

import { useState, useMemo } from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Column, Group, Item } from "@/types/database";

interface CalendarViewProps {
  columns: Column[];
  groups: Group[];
  items: Item[];
  onValueChange: (itemId: string, columnId: string, value: unknown) => void;
  onItemClick: (itemId: string) => void;
}

const GROUP_COLORS = [
  "#579bfc", "#00c875", "#fdab3d", "#e2445c", "#a25ddc",
  "#ff642e", "#0086c0", "#037f4c", "#bb3354",
];

export function CalendarView({
  columns,
  groups,
  items,
  onValueChange,
  onItemClick,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateColumn, setSelectedDateColumn] = useState<string>(
    columns.find((c) => c.column_type === "date")?.id ??
    columns.find((c) => c.column_type === "timeline")?.id ?? ""
  );

  const dateColumns = columns.filter(
    (c) => c.column_type === "date" || c.column_type === "timeline"
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Map items to dates
  const itemsByDate = useMemo(() => {
    const map: Record<string, Array<{ item: Item; color: string }>> = {};
    days.forEach((d) => {
      map[format(d, "yyyy-MM-dd")] = [];
    });

    items.forEach((item) => {
      const val = item.values?.find(
        (v) => v.column_id === selectedDateColumn
      );
      if (!val?.value) return;

      let dateStr: string | null = null;
      if (typeof val.value === "string") {
        dateStr = val.value;
      } else if (
        typeof val.value === "object" &&
        val.value !== null &&
        "start" in val.value
      ) {
        dateStr = (val.value as { start: string }).start;
      }

      if (dateStr) {
        try {
          const key = format(parseISO(dateStr), "yyyy-MM-dd");
          if (map[key]) {
            const group = groups.find((g) => g.id === item.group_id);
            const gi = groups.indexOf(group!);
            const color = group?.color || GROUP_COLORS[gi % GROUP_COLORS.length];
            map[key].push({ item, color });
          }
        } catch {
          // skip
        }
      }
    });
    return map;
  }, [items, selectedDateColumn, groups, days]);

  if (dateColumns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-sm font-medium">No date columns available</p>
          <p className="text-xs mt-1">
            Add a date or timeline column to use the Calendar view
          </p>
        </div>
      </div>
    );
  }

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCurrentDate((d) => subMonths(d, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[140px] text-center">
          {format(currentDate, "MMMM yyyy")}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCurrentDate((d) => addMonths(d, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentDate(new Date())}
        >
          Today
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Select value={selectedDateColumn} onValueChange={(v) => { if (v) setSelectedDateColumn(v); }}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue placeholder="Select column..." />
          </SelectTrigger>
          <SelectContent>
            {dateColumns.map((col) => (
              <SelectItem key={col.id} value={col.id}>
                {col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center py-2 text-xs font-medium text-muted-foreground border-r border-border/30 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar rows */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const dayItems = itemsByDate[key] ?? [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={i}
                className={`min-h-[100px] border-b border-r border-border/30 last:border-r-0 p-1 ${
                  isCurrentMonth ? "bg-background" : "bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs ${
                      isCurrentDay
                        ? "w-5 h-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium"
                        : isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayItems.slice(0, 3).map(({ item, color }) => (
                    <button
                      key={item.id}
                      className="w-full text-left text-[10px] px-1 py-0.5 rounded-sm truncate text-white font-medium hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: color }}
                      onClick={() => onItemClick(item.id)}
                    >
                      {item.name}
                    </button>
                  ))}
                  {dayItems.length > 3 && (
                    <span className="text-[10px] text-muted-foreground pl-1">
                      +{dayItems.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
