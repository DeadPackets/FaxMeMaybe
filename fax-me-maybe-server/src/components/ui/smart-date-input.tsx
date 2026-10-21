import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SmartDateInputProps {
  id?: string;
  inputClassName?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Common natural language date examples
const DATE_SUGGESTIONS = [
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "Next week", value: "next week" },
  { label: "Next Monday", value: "next monday" },
  { label: "In 3 days", value: "in 3 days" },
  { label: "End of week", value: "friday" },
];

export function SmartDateInput({
  id,
  inputClassName,
  value,
  onChange,
  placeholder = "Enter date or 'tomorrow at 2pm'",
  disabled = false,
}: SmartDateInputProps) {
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);

  // Check if value looks like a standard date format (YYYY-MM-DD)
  const isStandardDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(value);

  // Parse the date if it's in standard format
  React.useEffect(() => {
    if (isStandardDateFormat) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setSelectedDate(parsed);
      }
    } else {
      setSelectedDate(undefined);
    }
  }, [value, isStandardDateFormat]);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      // Format as YYYY-MM-DD for standard format
      const formatted = format(date, "yyyy-MM-dd");
      onChange(formatted);
      setSelectedDate(date);
    }
    setShowCalendar(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Clear calendar selection if text doesn't match date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newValue)) {
      setSelectedDate(undefined);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setSelectedDate(undefined);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={id ? `${id}-hint` : undefined}
          className={cn(inputClassName, "pr-11")}
        />
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 size-10 -translate-y-1/2 text-ink hover:bg-accent"
              disabled={disabled}
              aria-label="Pick a date from the calendar"
            >
              <CalendarIcon aria-hidden="true" className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {DATE_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.value}
            type="button"
            aria-pressed={value === suggestion.value}
            onClick={() => handleSuggestionClick(suggestion.value)}
            disabled={disabled}
            className="h-8 rounded-full border-[1.5px] border-ink px-3 font-mono text-[0.6875rem] text-ink transition-colors duration-150 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal aria-pressed:bg-ink aria-pressed:text-paper disabled:opacity-60"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
      <p id={id ? `${id}-hint` : undefined} className="text-xs text-ink-soft">
        Type a date in plain English, like "next Monday at 2pm".
      </p>
    </div>
  );
}
