import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format NIM dengan pola xx.x.x.xx.xxx
 * Hanya menerima digit, otomatis menambahkan titik.
 * Contoh: "261101001" → "26.1.1.01.001"
 */
export function formatNIM(value: string): string {
  const digits = value.replace(/\D/g, "");
  let formatted = "";

  for (let i = 0; i < digits.length && i < 9; i++) {
    // Sisipkan titik sebelum digit pada posisi tertentu
    if (i === 2 || i === 3 || i === 4 || i === 6) {
      formatted += ".";
    }
    formatted += digits[i];
  }

  return formatted;
}
