import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateRoomCode(length = 6): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No I, L, 1, O, 0
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result; // e.g., XJ9-2B (formatting will be handled by UI or here)
}