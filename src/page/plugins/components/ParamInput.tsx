import { ToolProperty } from "@/plugin/plugin";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        <div className="pl-4 flex items-center justify-between gap-2">
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
        <div className="pl-4 flex items-center justify-between gap-2">
          <label className="block text-xs text-muted-foreground">{name}</label>
          <Input
            value={Array.isArray(value) ? value.join(",") : ""}
            onChange={(e) =>
              onChange(e.target.value.split(",").filter(Boolean))
            }
            placeholder={
              property.description || "Input array values, separated by commas"
            }
          />
        </div>
      );
    case "boolean":
      return (
        <div className="pl-4 flex items-center justify-between gap-2">
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
        <div className="pl-4 flex items-center justify-between gap-2">
          <label className="block text-xs text-muted-foreground">{name}</label>
          <Input
            value={value ? String(value) : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={property.description}
            type={property.type === "number" ? "number" : "text"}
          />
        </div>
      );
  }
}
