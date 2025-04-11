import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CheckboxGroupItem {
  id: string;
  label: string;
}

interface CheckboxGroupProps {
  name: string;
  items: CheckboxGroupItem[];
  defaultSelected?: string[];
}

export function CheckboxGroup({ name, items, defaultSelected = [] }: CheckboxGroupProps) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center space-x-2">
          <Checkbox 
            id={`${name}-${item.id}`} 
            name={name} 
            value={item.id} 
            defaultChecked={defaultSelected.includes(item.id)}
          />
          <Label 
            htmlFor={`${name}-${item.id}`}
            className="cursor-pointer"
          >
            {item.label}
          </Label>
        </div>
      ))}
    </div>
  );
}