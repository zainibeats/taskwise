import { useState, useCallback } from "react";
import { format } from "date-fns";

export function useDatePicker(initialDate: Date | undefined = new Date()) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);

  // Handler for clearing the selected date
  const handleClearDate = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // Utility: check if selected date is today
  const isToday = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return {
    selectedDate,
    setSelectedDate,
    handleClearDate,
    isToday,
  };
}
