"use client";

import { useState, useMemo } from "react";
import {
  format,
  parseISO,
  addDays,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from "date-fns";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Column, Group, Item } from "@/types/database";

type ZoomLevel = "day" | "week" | "month";

interface TimelineViewProps {
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

export function TimelineView({
  columns,
  groups,
  items,
  onValueChange,
  onItemClick,
}: TimelineViewProps) {
  const [zoom, setZoom] = useState<ZoomLevel>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTimelineColumn, setSelectedTimelineColumn] = useState<string>(
    columns.find((c) => c.column_type === "timeline")?.id ??
    columns.find((c) => c.column_type === "date")?.id ?? ""
  );

  const timelineColumns = columns.filter(
    (c) => c.column_type === "timeline" || c.column_type === "date"
  );

  // Calculate visible date range based on zoom
  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;

    switch (zoom) {
      case "day":
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
      case "week":
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case "month":
        start = startOfMonth(subMonths(currentDate, 1));
        end = endOfMonth(addMonths(currentDate, 2));
        break;
    }

    return { start, end };
  }, [currentDate, zoom]);

  // Get date ticks
  const ticks = useMemo(() => {
    switch (zoom) {
      case "day":
        return eachDayOfInterval(dateRange).map((d) => ({
          date: d,
          label: format(d, "EEE d"),
          fullLabel: format(d, "MMM d"),
        }));
      case "week":
        return eachWeekOfInterval(dateRange, { weekStartsOn: 1 }).map((d) => ({
          date: d,
          label: format(d, "MMM d"),
          fullLabel: format(d, "MMM d"),
        }));
      case "month":
        return eachMonthOfInterval(dateRange).map((d) => ({
          date: d,
          label: format(d, "MMM"),
          fullLabel: format(d, "MMMM yyyy"),
        }));
    }
  }, [dateRange, zoom]);

  const totalDays = differenceInDays(dateRange.end, dateRange.start) || 1;

  // Build items with date info
  const timelineItems = useMemo(() => {
    return groups.map((group, gi) => {
      const groupItems = items.filter((item) => item.group_id === group.id);
      return {
        group,
        color: group.color || GROUP_COLORS[gi % GROUP_COLORS.length],
        rows: groupItems.map((item) => {
          const val = item.values?.find(
            (v) => v.column_id === selectedTimelineColumn
          );
          let startStr: string | null = null;
          let endStr: string | null = null;

          if (val?.value) {
            if (
              typeof val.value === "object" &&
              val.value !== null &&
              "start" in val.value &&
              "end" in val.value
            ) {
              startStr = val.value.start;
              endStr = val.value.end;
            } else if (typeof val.value === "string") {
              startStr = val.value;
              endStr = val.value;
            }
          }

          let leftPercent = 0;
          let widthPercent = 0;

          if (startStr && endStr) {
            try {
              const itemStart = parseISO(startStr);
              const itemEnd = parseISO(endStr);
              const startOffset = differenceInDays(itemStart, dateRange.start);
              const duration = differenceInDays(itemEnd, itemStart) || 1;
              leftPercent = (startOffset / totalDays) * 100;
              widthPercent = (duration / totalDays) * 100;
            } catch {
              // Invalid date
            }
          }

          return {
            item,
            startStr,
            endStr,
            leftPercent,
            widthPercent,
          };
        }),
      };
    });
  }, [groups, items, selectedTimelineColumn, dateRange, totalDays]);

  const today = new Date();
  const todayOffset = differenceInDays(today, dateRange.start);
  const todayPercent = (todayOffset / totalDays) * 100;

  const navigateBack = () => {
    switch (zoom) {
      case "day":
        setCurrentDate((d) => subWeeks(d, 1));
        break;
      case "week":
        setCurrentDate((d) => subMonths(d, 1));
        break;
      case "month":
        setCurrentDate((d) => subMonths(d, 3));
        break;
    }
  };

  const navigateForward = () => {
    switch (zoom) {
      case "day":
        setCurrentDate((d) => addWeeks(d, 1));
        break;
      case "week":
        setCurrentDate((d) => addMonths(d, 1));
        break;
      case "month":
        setCurrentDate((d) => addMonths(d, 3));
        break;
    }
  };

  if (timelineColumns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-sm font-medium">No timeline or date columns</p>
          <p className="text-xs mt-1">
            Add a timeline or date column to use the Timeline view
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <Button variant="ghost" size="icon-sm" onClick={navigateBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[140px] text-center">
          {format(dateRange.start, "MMM d, yyyy")} —{" "}
          {format(dateRange.end, "MMM d, yyyy")}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={navigateForward}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <div className="flex items-center gap-1">
          <Button
            variant={zoom === "day" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setZoom("day")}
          >
            Day
          </Button>
          <Button
            variant={zoom === "week" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setZoom("week")}
          >
            Week
          </Button>
          <Button
            variant={zoom === "month" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setZoom("month")}
          >
            Month
          </Button>
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        <Select value={selectedTimelineColumn} onValueChange={(v) => { if (v) setSelectedTimelineColumn(v); }}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue placeholder="Select column..." />
          </SelectTrigger>
          <SelectContent>
            {timelineColumns.map((col) => (
              <SelectItem key={col.id} value={col.id}>
                {col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline grid */}
      <div className="flex-1 overflow-auto">
        {/* Date axis header */}
        <div className="flex sticky top-0 z-10 bg-background border-b border-border">
          <div className="w-48 flex-shrink-0 border-r border-border" />
          <div className="flex-1 flex relative">
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="flex-1 text-center py-1.5 text-[10px] text-muted-foreground border-r border-border/30"
              >
                {tick.label}
              </div>
            ))}
            {/* Today line */}
            {todayPercent >= 0 && todayPercent <= 100 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-20"
                style={{ left: `${todayPercent}%` }}
              >
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 text-[9px] text-red-500 font-medium">
                  Today
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Group rows */}
        {timelineItems.map(({ group, color, rows }) => (
          <div key={group.id} className="border-b border-border">
            {/* Group header */}
            <div
              className="flex items-center h-8 text-xs font-semibold"
              style={{ borderLeft: `3px solid ${color}` }}
            >
              <div className="w-48 flex-shrink-0 px-3 truncate border-r border-border">
                {group.name}
              </div>
              <div className="flex-1 bg-muted/20" />
            </div>

            {/* Item rows */}
            {rows.map(({ item, leftPercent, widthPercent, startStr, endStr }) => (
              <div key={item.id} className="flex hover:bg-accent/10">
                <div className="w-48 flex-shrink-0 flex items-center px-3 border-r border-border/50">
                  <button
                    className="text-xs text-foreground hover:text-primary truncate"
                    onClick={() => onItemClick(item.id)}
                  >
                    {item.name}
                  </button>
                </div>
                <div className="flex-1 relative h-9">
                  {widthPercent > 0 && (
                    <button
                      className="absolute top-1.5 h-5 rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        left: `${Math.max(leftPercent, 0)}%`,
                        width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
                        backgroundColor: color,
                      }}
                      onClick={() => onItemClick(item.id)}
                      title={startStr && endStr ? `${startStr} → ${endStr}` : ""}
                    >
                      <span className="text-[9px] text-white font-medium px-1 truncate block">
                        {item.name}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
