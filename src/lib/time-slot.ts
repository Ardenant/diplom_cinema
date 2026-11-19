// Утилита определения "слота" сеанса по времени начала.
// Используется только для отображения лейблов ("утренний", "дневной", "вечерний"),
// в БД ничего не хранится — поле выводится на лету из startsAt.

export type TimeSlot = "morning" | "day" | "evening";

export const timeSlotLabels: Record<TimeSlot, string> = {
  morning: "Утренний",
  day: "Дневной",
  evening: "Вечерний",
};

export function getTimeSlot(date: Date): TimeSlot {
  const h = date.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "day";
  return "evening";
}
