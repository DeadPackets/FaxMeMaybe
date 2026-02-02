import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface LabelOption {
  name: string;
  color?: string;
}

interface LabelSelectorProps {
  labels: LabelOption[];
  selectedLabels: string[];
  onLabelsChange: (labels: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  maxLabels?: number;
}

// Todoist color mapping
const TODOIST_COLORS: Record<string, string> = {
  berry_red: "#b8255f",
  red: "#db4035",
  orange: "#ff9933",
  yellow: "#fad000",
  olive_green: "#afb83b",
  lime_green: "#7ecc49",
  green: "#299438",
  mint_green: "#6accbc",
  teal: "#158fad",
  sky_blue: "#14aaf5",
  light_blue: "#96c3eb",
  blue: "#4073ff",
  grape: "#884dff",
  violet: "#af38eb",
  lavender: "#eb96eb",
  magenta: "#e05194",
  salmon: "#ff8d85",
  charcoal: "#808080",
  grey: "#b8b8b8",
  taupe: "#ccac93",
};

function getLabelColor(color?: string): string {
  if (!color) return "#808080";
  return TODOIST_COLORS[color] || color;
}

export function LabelSelector({
  labels,
  selectedLabels,
  onLabelsChange,
  placeholder = "Select labels...",
  disabled = false,
  allowCustom = true,
  maxLabels = 5,
}: LabelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleSelect = (labelName: string) => {
    if (selectedLabels.includes(labelName)) {
      onLabelsChange(selectedLabels.filter((l) => l !== labelName));
    } else if (selectedLabels.length < maxLabels) {
      onLabelsChange([...selectedLabels, labelName]);
    }
  };

  const handleRemove = (labelName: string) => {
    onLabelsChange(selectedLabels.filter((l) => l !== labelName));
  };

  const handleCreateCustom = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !selectedLabels.includes(trimmed) && selectedLabels.length < maxLabels) {
      onLabelsChange([...selectedLabels, trimmed]);
      setInputValue("");
    }
  };

  const filteredLabels = labels.filter(
    (label) =>
      label.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedLabels.includes(label.name)
  );

  const showCreateOption =
    allowCustom &&
    inputValue.trim() &&
    !labels.some((l) => l.name.toLowerCase() === inputValue.toLowerCase()) &&
    !selectedLabels.includes(inputValue.trim()) &&
    selectedLabels.length < maxLabels;

  return (
    <div className="space-y-2">
      {/* Selected labels display */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLabels.map((labelName) => {
            const label = labels.find((l) => l.name === labelName);
            const color = getLabelColor(label?.color);
            return (
              <Badge
                key={labelName}
                variant="secondary"
                className="gap-1 pr-1"
                style={{
                  backgroundColor: `${color}20`,
                  borderColor: color,
                  color: color,
                }}
              >
                {labelName}
                <button
                  type="button"
                  className="ml-1 rounded-full outline-none hover:opacity-75 focus:ring-1"
                  onClick={() => handleRemove(labelName)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Label selector popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedLabels.length && "text-muted-foreground"
            )}
            disabled={disabled || selectedLabels.length >= maxLabels}
          >
            {selectedLabels.length >= maxLabels
              ? `Maximum ${maxLabels} labels`
              : selectedLabels.length > 0
              ? `${selectedLabels.length} label${selectedLabels.length > 1 ? "s" : ""} selected`
              : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search or create label..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                {showCreateOption ? (
                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={handleCreateCustom}
                  >
                    Create "{inputValue.trim()}"
                  </button>
                ) : (
                  "No labels found"
                )}
              </CommandEmpty>
              {showCreateOption && filteredLabels.length > 0 && (
                <CommandGroup heading="Create new">
                  <CommandItem onSelect={handleCreateCustom}>
                    Create "{inputValue.trim()}"
                  </CommandItem>
                </CommandGroup>
              )}
              {filteredLabels.length > 0 && (
                <CommandGroup heading="Available labels">
                  {filteredLabels.map((label) => {
                    const color = getLabelColor(label.color);
                    return (
                      <CommandItem
                        key={label.name}
                        value={label.name}
                        onSelect={() => handleSelect(label.name)}
                      >
                        <span
                          className="mr-2 h-3 w-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {label.name}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedLabels.length >= maxLabels && (
        <p className="text-xs text-muted-foreground">
          Maximum of {maxLabels} labels allowed
        </p>
      )}
    </div>
  );
}
