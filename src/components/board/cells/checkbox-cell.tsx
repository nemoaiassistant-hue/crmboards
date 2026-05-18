"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { Column } from "@/types/database";

interface CheckboxCellProps {
  value: boolean | null;
  column: Column;
  onChange: (value: boolean) => void;
}

export function CheckboxCell({ value, column: _column, onChange }: CheckboxCellProps) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Checkbox
        checked={value ?? false}
        onCheckedChange={(checked) => onChange(!!checked)}
      />
    </div>
  );
}
