"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { api, ApiError, post } from "@/lib/api";
import type { Chat, Message, MessagePage } from "@/lib/types";
import { useAuth } from "./auth-context";
import { useSocket } from "./socket-context";

export interface Conversation {
  messages: Message[];
  hasMore: boolean;
  status: "loading" | "ready" | "error";
  error: string | null;
  loadingOlder: boolean;
}

interface State {
  chats: Chat[] | null;
  chatsError: string | null;
  conversations: Record<string, Conversation>;
  unread: Record<string, number>;
}

type Action =
  | { type: "chats/loaded"; chats: Chat[] }
  | { type: "chats/failed"; error: string }
  | { type: "chat/upserted"; chat: Chat }
  | { type: "conversation/loading"; chatId: string }
  | { type: "conversation/loaded"; chatId: string; page: MessagePage }
  | { type: "conversation/failed"; chatId: string; error: string }
  | { type: "conversation/olderLoading"; chatId: string; loading: boolean }
  | { type: "conversation/olderLoaded"; chatId: string; page: MessagePage }
  | { type: "message/received"; message: Message; unread: boolean }
  | { type: "chat/read"; chatId: string };

const emptyConversation: Conversation = {
  messages: [],
  hasMore: false,
  status: "loading",
  error: null,
  loadingOlder: false,
};

function mergeMessages(current: Message[], incoming: Message[]) {
  const byId = new Map(current.map((m) => [m.id, m]));
  incoming.forEach((m) => byId.set(m.id, m));
  return [...byId.values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}

const byActivity = (a: Chat, b: Chat) => b.lastActivityAt.localeCompare(a.lastActivityAt);

function reducer(state: State, action: Action): State {
  const updateConversation = (chatId: string, patch: Partial<Conversation>) => ({
    ...state,
    conversations: {
      ...state.conversations,
      [chatId]: { ...(state.conversations[chatId] ?? emptyConversation), ...patch },
    },
  });

  switch (action.type) {
    case "chats/loaded":
      return { ...state, chats: action.chats, chatsError: null };
    case "chats/failed":
      return { ...state, chatsError: action.error };
    case "chat/upserted": {
      const others = (state.chats ?? []).filter((c) => c.id !== action.chat.id);
      return { ...state, chats: [action.chat, ...others].sort(byActivity) };
    }
    case "conversation/loading":
      return updateConversation(action.chatId, { status: "loading", error: null });
    case "conversation/loaded": {
      // Merge instead of replace: after a reconnect this keeps what is already on screen
      const current = state.conversations[action.chatId]?.messages ?? [];
      return updateConversation(action.chatId, {
        status: "ready",
        messages: mergeMessages(current, action.page.messages),
        hasMore: current.length > 0 ? state.conversations[action.chatId].hasMore : action.page.hasMore,
      });
    }
    case "conversation/failed":
      return updateConversation(action.chatId, { status: "error", error: action.error });
    case "conversation/olderLoading":
      return updateConversation(action.chatId, { loadingOlder: action.loading });
    case "conversation/olderLoaded":
      return updateConversation(action.chatId, {
        loadingOlder: false,
        hasMore: action.page.hasMore,
        messages: mergeMessages(state.conversations[action.chatId]?.messages ?? [], action.page.messages),
      });
    case "chat/read": {
      if (!state.unread[action.chatId]) return state;
      const unread = { ...state.unread };
      delete unread[action.chatId];
      return { ...state, unread };
    }
    case "message/received": {
      const { message } = action;
      const chat = state.chats?.find((c) => c.id === message.chatId);
      const conversation = state.conversations[message.chatId];
      const unread = action.unread && !conversation?.messages.some((m) => m.id === message.id);
      return {
        ...state,
        chats: chat
          ? [
              { ...chat, lastMessage: message, lastActivityAt: message.createdAt },
              ...state.chats!.filter((c) => c.id !== chat.id),
            ].sort(byActivity)
          : state.chats,
        conversations: conversation
          ? {
              ...state.conversations,
              [message.chatId]: {
                ...conversation,
                messages: mergeMessages(conversation.messages, [message]),
              },
            }
          : state.conversations,
        unread: unread
          ? { ...state.unread, [message.chatId]: (state.unread[message.chatId] ?? 0) + 1 }
          : state.unread,
      };
    }
  }
}

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : "Ha ocurrido un error inesperado";

interface ChatsContextValue {
  chats: Chat[] | null;
  chatsError: string | null;
  unread: Record<string, number>;
  reloadChats: () => Promise<void>;
  conversation: (chatId: string) => Conversation | undefined;
  openConversation: (chatId: string) => Promise<void>;
  loadOlder: (chatId: string) => Promise<void>;
  /** Resolves with an error message, or null when the message was stored */
  sendMessage: (chatId: string, content: string) => Promise<string | null>;
  createChat: (participantIds: string[]) => Promise<Chat>;
}

const ChatsContext = createContext<ChatsContextValue | null>(null);

const SEND_TIMEOUT_MS = 8000;

interface ProviderProps {
  /** Chat on screen: its messages are never counted as unread */
  activeChatId?: string;
  children: React.ReactNode;
}

export function ChatsProvider({ activeChatId, children }: ProviderProps) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const userId = user!.id;
  const [state, dispatch] = useReducer(reducer, {
    chats: null,
    chatsError: null,
    conversations: {},
    unread: {},
  });
  const stateRef = useRef(state);
  const activeRef = useRef(activeChatId);
  useEffect(() => {
    stateRef.current = state;
    activeRef.current = activeChatId;
  });

  useEffect(() => {
    if (activeChatId) dispatch({ type: "chat/read", chatId: activeChatId });
  }, [activeChatId]);

  const reloadChats = useCallback(async () => {
    try {
      dispatch({ type: "chats/loaded", chats: await api<Chat[]>("/chats") });
    } catch (error) {
      dispatch({ type: "chats/failed", error: errorMessage(error) });
    }
  }, []);

  const fetchLatest = useCallback(async (chatId: string) => {
    try {
      const page = await api<MessagePage>(`/chats/${chatId}/messages`);
      dispatch({ type: "conversation/loaded", chatId, page });
    } catch (error) {
      dispatch({ type: "conversation/failed", chatId, error: errorMessage(error) });
    }
  }, []);

  const openConversation = useCallback(
    async (chatId: string) => {
      const current = stateRef.current.conversations[chatId];
      if (current?.status === "ready") return;
      dispatch({ type: "conversation/loading", chatId });
      await fetchLatest(chatId);
    },
    [fetchLatest],
  );

  const loadOlder = useCallback(async (chatId: string) => {
    const current = stateRef.current.conversations[chatId];
    if (!current?.hasMore || current.loadingOlder || current.messages.length === 0) return;
    dispatch({ type: "conversation/olderLoading", chatId, loading: true });
    try {
      const page = await api<MessagePage>(
        `/chats/${chatId}/messages?before=${current.messages[0].id}`,
      );
      dispatch({ type: "conversation/olderLoaded", chatId, page });
    } catch {
      dispatch({ type: "conversation/olderLoading", chatId, loading: false });
    }
  }, []);

  useEffect(() => {
    void reloadChats();
  }, [reloadChats]);

  useEffect(() => {
    if (!socket) return;
    let connectedBefore = socket.connected;

    const onMessage = (message: Message) => {
      const unread = message.sender.id !== userId && message.chatId !== activeRef.current;
      dispatch({ type: "message/received", message, unread });
      // A message for a chat we do not know yet (created while offline)
      if (!stateRef.current.chats?.some((c) => c.id === message.chatId)) void reloadChats();
    };
    const onChat = (chat: Chat) => dispatch({ type: "chat/upserted", chat });
    // Messages sent while we were offline never reached us: fetch them again
    const onConnect = () => {
      if (connectedBefore) {
        void reloadChats();
        Object.keys(stateRef.current.conversations).forEach((id) => void fetchLatest(id));
      }
      connectedBefore = true;
    };

    socket.on("message:new", onMessage);
    socket.on("chat:new", onChat);
    socket.on("connect", onConnect);
    return () => {
      socket.off("message:new", onMessage);
      socket.off("chat:new", onChat);
      socket.off("connect", onConnect);
    };
  }, [socket, userId, reloadChats, fetchLatest]);

  const sendMessage = useCallback(
    async (chatId: string, content: string) => {
      if (!socket?.connected) return "Sin conexión con el servidor. Espera a que se restablezca.";
      try {
        const ack = await socket
          .timeout(SEND_TIMEOUT_MS)
          .emitWithAck("message:send", { chatId, content });
        if (ack.error) return ack.error as string;
        dispatch({ type: "message/received", message: ack.message, unread: false });
        return null;
      } catch {
        return "El servidor no respondió. Inténtalo de nuevo.";
      }
    },
    [socket],
  );

  const createChat = useCallback(async (participantIds: string[]) => {
    const chat = await post<Chat>("/chats", { participantIds });
    dispatch({ type: "chat/upserted", chat });
    return chat;
  }, []);

  const value = useMemo<ChatsContextValue>(
    () => ({
      chats: state.chats,
      chatsError: state.chatsError,
      unread: state.unread,
      reloadChats,
      conversation: (chatId) => state.conversations[chatId],
      openConversation,
      loadOlder,
      sendMessage,
      createChat,
    }),
    [state, reloadChats, openConversation, loadOlder, sendMessage, createChat],
  );

  return <ChatsContext value={value}>{children}</ChatsContext>;
}

export function useChats() {
  const context = useContext(ChatsContext);
  if (!context) throw new Error("useChats must be used inside ChatsProvider");
  return context;
}
