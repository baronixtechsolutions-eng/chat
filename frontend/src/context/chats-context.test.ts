import { describe, expect, it } from "vitest";
import type { Chat, Message } from "@/lib/types";
import { chatsReducer, type State } from "./chats-context";

const message = (id: string, chatId: string, createdAt: string, senderId = "u2"): Message => ({
  id,
  chatId,
  content: `mensaje ${id}`,
  createdAt,
  sender: { id: senderId, name: senderId },
});

const chat = (id: string, lastActivityAt: string): Chat => ({
  id,
  participants: [],
  lastMessage: null,
  lastActivityAt,
});

const initial = (): State => ({
  chats: [chat("a", "2026-11-10T10:00:00Z"), chat("b", "2026-11-10T09:00:00Z")],
  chatsError: null,
  conversations: {
    b: {
      status: "ready",
      hasMore: false,
      error: null,
      loadingOlder: false,
      messages: [message("1", "b", "2026-11-10T09:00:00Z")],
    },
  },
  unread: {},
});

describe("chatsReducer", () => {
  it("adds a new message and moves its chat to the top", () => {
    const state = chatsReducer(initial(), {
      type: "message/received",
      message: message("2", "b", "2026-11-10T11:00:00Z"),
      unread: false,
    });
    expect(state.chats!.map((c) => c.id)).toEqual(["b", "a"]);
    expect(state.chats![0].lastMessage?.id).toBe("2");
    expect(state.conversations.b.messages.map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("ignores a message it already has (ack and socket event both deliver it)", () => {
    const event = { type: "message/received", message: message("1", "b", "2026-11-10T09:00:00Z"), unread: true } as const;
    const state = chatsReducer(initial(), event);
    expect(state.conversations.b.messages).toHaveLength(1);
    expect(state.unread).toEqual({});
  });

  it("counts unread messages per chat and clears them when the chat is read", () => {
    let state = initial();
    state = chatsReducer(state, { type: "message/received", message: message("2", "a", "2026-11-10T12:00:00Z"), unread: true });
    state = chatsReducer(state, { type: "message/received", message: message("3", "a", "2026-11-10T12:01:00Z"), unread: true });
    expect(state.unread).toEqual({ a: 2 });

    state = chatsReducer(state, { type: "chat/read", chatId: "a" });
    expect(state.unread).toEqual({});
  });

  it("keeps messages in chronological order when older pages arrive", () => {
    const state = chatsReducer(initial(), {
      type: "conversation/olderLoaded",
      chatId: "b",
      page: { messages: [message("0", "b", "2026-11-10T08:00:00Z")], hasMore: false },
    });
    expect(state.conversations.b.messages.map((m) => m.id)).toEqual(["0", "1"]);
  });

  it("does not duplicate a chat that is created and announced at the same time", () => {
    let state = chatsReducer(initial(), { type: "chat/upserted", chat: chat("c", "2026-11-10T13:00:00Z") });
    state = chatsReducer(state, { type: "chat/upserted", chat: chat("c", "2026-11-10T13:00:00Z") });
    expect(state.chats!.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });
});
