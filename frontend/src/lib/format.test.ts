import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chatTitle, formatDay, initials, isSameDay, otherParticipants } from "./format";
import type { Chat } from "./types";

const chat: Chat = {
  id: "c1",
  participants: [
    { id: "me", name: "Ana" },
    { id: "u2", name: "Ben" },
    { id: "u3", name: "Carl" },
  ],
  lastMessage: null,
  lastActivityAt: "2026-11-10T10:00:00.000Z",
};

describe("chat helpers", () => {
  it("leaves the current user out of the title", () => {
    expect(otherParticipants(chat, "me").map((p) => p.name)).toEqual(["Ben", "Carl"]);
    expect(chatTitle(chat, "me")).toBe("Ben, Carl");
  });

  it("builds initials from up to two words", () => {
    expect(initials("ana pérez gómez")).toBe("AP");
    expect(initials("Ben")).toBe("B");
  });
});

describe("dates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 10, 15, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("labels today and yesterday", () => {
    expect(formatDay(new Date(2026, 10, 10, 9, 0).toISOString())).toBe("Hoy");
    expect(formatDay(new Date(2026, 10, 9, 23, 0).toISOString())).toBe("Ayer");
    expect(formatDay(new Date(2026, 10, 1, 12, 0).toISOString())).toMatch(/1.*noviembre/);
  });

  it("compares calendar days, not 24-hour windows", () => {
    expect(isSameDay(new Date(2026, 10, 9, 23, 59).toISOString(), new Date(2026, 10, 10, 0, 1).toISOString())).toBe(false);
    expect(isSameDay(new Date(2026, 10, 10, 0, 1).toISOString(), new Date(2026, 10, 10, 23, 59).toISOString())).toBe(true);
  });
});
