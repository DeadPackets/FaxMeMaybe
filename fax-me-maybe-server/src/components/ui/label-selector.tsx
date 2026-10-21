import * as React from "react";
import { X } from "lucide-react";
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
  maxLabels?: number;
  "aria-labelledby"?: string;
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
  maxLabels = 5,
  "aria-labelledby": labelledBy,
}: LabelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const triggerId = React.useId();
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

  const filteredLabels = labels.filter(
    (label) =>
      label.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedLabels.includes(label.name)
  );

  return (
    <div className="space-y-2">
      {/* Selected labels display */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLabels.map((labelName) => {
            const label = labels.find((l) => l.name === labelName);
            const color = getLabelColor(label?.color);
            return (
              <span
                key={labelName}
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink py-0.5 pr-0.5 pl-2.5 font-mono text-xs text-ink"
              >
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                {labelName}
                <button
                  type="button"
                  aria-label={`Remove label ${labelName}`}
                  className="grid size-6 place-items-center rounded-full hover:bg-accent focus-visible:outline-2 focus-visible:outline-signal"
                  onClick={() => handleRemove(labelName)}
                  disabled={disabled}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </span>
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
            id={triggerId}
            aria-labelledby={labelledBy ? `${labelledBy} ${triggerId}` : undefined}
            className={cn(
              "h-auto w-full justify-start rounded-none border-0 border-b-2 border-ink bg-transparent px-0 py-1.5 text-left text-[1.0625rem] font-normal shadow-none hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal focus-visible:ring-0",
              !selectedLabels.length && "text-ink-soft"
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
              placeholder="Search labels..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>No labels found</CommandEmpty>
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
        <p className="text-xs text-ink-soft">
          Maximum of {maxLabels} labels allowed
        </p>
      )}
    </div>
  );
}
