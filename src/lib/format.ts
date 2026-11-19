// Утилиты форматирования: цены, даты, склонения.

/**
 * Склонение существительного по числу (русский язык).
 *
 * @param n     количество
 * @param forms тройка форм: [one, few, many]
 *              one  — для 1, 21, 31, ... (mod10 === 1, кроме 11)
 *              few  — для 2-4, 22-24, ... (mod10 ∈ {2,3,4}, кроме 12-14)
 *              many — для 0, 5-20, 25-30, 11-14, ...
 *
 * @example
 *   pluralize(1, ["билет", "билета", "билетов"])  // → "билет"
 *   pluralize(2, ["билет", "билета", "билетов"])  // → "билета"
 *   pluralize(5, ["билет", "билета", "билетов"])  // → "билетов"
 *   pluralize(11, ["билет", "билета", "билетов"]) // → "билетов"
 *   pluralize(21, ["билет", "билета", "билетов"]) // → "билет"
 */
export function pluralize(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** Удобный шорткат: возвращает строку "N форма" */
export function plural(n: number, forms: [string, string, string]): string {
  return `${n} ${pluralize(n, forms)}`;
}

/** Форматирование цены: "1 500 ₽" */
export function formatPrice(value: number | string | { toString(): string }): string {
  const n = typeof value === "number" ? value : Number(value.toString());
  return `${n.toLocaleString("ru-RU")} ₽`;
}
