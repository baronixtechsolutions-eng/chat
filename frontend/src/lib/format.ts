import type { Chat, Participant } from "./types";

const timeFormat = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("es", { day: "numeric", month: "long" });
const shortDayFormat = new Intl.DateTimeFormat("es", { day: "2-digit", month: "2-digit" });

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const daysAgo = (date: Date) =>
  Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);

export function formatTime(iso: string) {
  return timeFormat.format(new Date(iso));
}

/** Label for the separator between messages of different days */
export function formatDay(iso: string) {
  const date = new Date(iso);
  const diff = daysAgo(date);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return dayFormat.format(date);
}

/** Compact date for the chat list: time today, date otherwise */
export function formatListDate(iso: string) {
  const date = new Date(iso);
  return daysAgo(date) === 0 ? timeFormat.format(date) : shortDayFormat.format(date);
}

export function isSameDay(a: string, b: string) {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

export function otherParticipants(chat: Chat, currentUserId: string): Participant[] {
  return chat.participants.filter((p) => p.id !== currentUserId);
}

export function chatTitle(chat: Chat, currentUserId: string) {
  return otherParticipants(chat, currentUserId)
    .map((p) => p.name)
    .join(", ");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
