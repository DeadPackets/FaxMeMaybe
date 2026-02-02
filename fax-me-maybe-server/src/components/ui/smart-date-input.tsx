import * as React from "react";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SmartDateInputProps {
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
        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              disabled={disabled}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
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

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-1">
        {DATE_SUGGESTIONS.map((suggestion) => (
          <TooltipProvider key={suggestion.value}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-6 text-xs",
                    value === suggestion.value && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleSuggestionClick(suggestion.value)}
                  disabled={disabled}
                >
                  {suggestion.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Set due date to "{suggestion.value}"</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {/* Help text */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <p>
          Supports natural language like "tomorrow at 2pm", "next Monday", "in 3 days",
          or pick a date from the calendar.
        </p>
      </div>
    </div>
  );
}
