import { ToolProperty } from "@/plugin/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TbPlus, TbTrash } from "react-icons/tb";

interface ParamInputProps {
  property: ToolProperty;
  name: string;
  value: unknown;
  onChange: (value: unknown) => void;
  path?: string[];
}

export function ParamInput({
  property,
  name,
  value,
  onChange,
  path = [],
}: ParamInputProps): JSX.Element {
  const currentPath = [...path, name];

  switch (property.type) {
    case "object":
      return (
        <div className="pl-2 space-y-2">
          <label className="block text-xs font-medium text-muted-foreground">
            {name}
          </label>
          {property.properties &&
            Object.entries(property.properties).map(([key, prop]) => (
              <ParamInput
                key={key}
                name={key}
                property={prop}
                value={
                  value && typeof value === "object"
                    ? (value as Record<string, unknown>)[key]
                    : undefined
                }
                onChange={(newValue) => {
                  const newObj = {
                    ...(value && typeof value === "object" ? value : {}),
                  } as Record<string, unknown>;
                  if (newValue === undefined) {
                    delete newObj[key];
                  } else {
                    newObj[key] = newValue;
                  }
                  onChange(newObj);
                }}
                path={currentPath}
              />
            ))}
        </div>
      );
    case "array":
      return (
        <div className="pl-2 space-y-2">
          <label className="block text-xs text-muted-foreground">{name}</label>
          <InputArray
            value={value}
            description={property.description}
            onChange={onChange}
          />
        </div>
      );
    case "boolean":
      return (
        <div className="pl-2 space-y-2">
          <label className="block text-xs text-muted-foreground">{name}</label>
          <Select
            value={String(value)}
            onValueChange={(v) => onChange(v === "true")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Boolean Value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    default:
      return (
        <div className="pl-2 space-y-2">
          <label className="block text-xs text-muted-foreground">{name}</label>
          <Input
            value={value ? String(value) : ""}
            className="rounded-[8px] bg-muted-foreground/10"
            onChange={(e) => onChange(e.target.value)}
            placeholder={property.description}
            type={property.type === "number" ? "number" : "text"}
          />
        </div>
      );
  }
}

function InputArray({
  value,
  onChange,
  description,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  description?: string;
}) {
  const items = Array.isArray(value) ? value : [];

  const addItem = () => {
    onChange([...items, ""]);
  };

  const updateItem = (index: number, newValue: string) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={String(item)}
            onChange={(e) => updateItem(index, e.target.value)}
            className="flex-1 rounded-[8px] bg-muted-foreground/10"
            placeholder={description || "输入值"}
          />
          <Button size={"icon"} onClick={() => removeItem(index)}>
            <TbTrash />
          </Button>
        </div>
      ))}
      <Button size={"icon"} onClick={addItem}>
        <TbPlus />
      </Button>
    </div>
  );
}
