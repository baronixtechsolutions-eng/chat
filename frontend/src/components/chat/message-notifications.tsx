"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";
import { useChats } from "@/context/chats-context";
import { useSocket } from "@/context/socket-context";
import type { Message } from "@/lib/types";

const TOAST_MS = 5000;
const MAX_TOASTS = 3;
const BASE_TITLE = "Chat en tiempo real";

const preview = (text: string) => (text.length > 120 ? `${text.slice(0, 117)}…` : text);

/**
 * Tells the user about messages they are not looking at: an in-app toast when the
 * tab is visible, a system notification when it is in the background, and the
 * unread total in the tab title.
 */
export function MessageNotifications({ activeChatId }: { activeChatId?: string }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { unread } = useChats();
  const router = useRouter();
  const [toasts, setToasts] = useState<Message[]>([]);
  const activeRef = useRef(activeChatId);
  useEffect(() => {
    activeRef.current = activeChatId;
  });

  const totalUnread = Object.values(unread).reduce((sum, n) => sum + n, 0);
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) ${BASE_TITLE}` : BASE_TITLE;
  }, [totalUnread]);
  useEffect(() => () => void (document.title = BASE_TITLE), []);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (message: Message) => {
      if (message.sender.id === user!.id) return;

      if (document.visibilityState === "hidden") {
        if ("Notification" in window && Notification.permission === "granted") {
          const notification = new Notification(message.sender.name, {
            body: preview(message.content),
            tag: message.chatId,
          });
          notification.onclick = () => {
            window.focus();
            router.push(`/chats/${message.chatId}`);
            notification.close();
          };
        }
        return;
      }

      if (message.chatId === activeRef.current) return;
      setToasts((current) => [message, ...current].slice(0, MAX_TOASTS));
      setTimeout(() => setToasts((current) => current.filter((t) => t.id !== message.id)), TOAST_MS);
    };

    socket.on("message:new", onMessage);
    return () => {
      socket.off("message:new", onMessage);
    };
  }, [socket, user, router]);

  const open = (message: Message) => {
    setToasts((current) => current.filter((t) => t.chatId !== message.chatId));
    router.push(`/chats/${message.chatId}`);
  };

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-4 z-40 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6">
      {toasts.map((message) => (
        <button
          key={message.id}
          onClick={() => open(message)}
          className="pointer-events-auto flex w-full max-w-sm animate-dialog-in items-start gap-3 rounded-xl bg-white p-3 text-left shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50 sm:w-80"
        >
          <Avatar name={message.sender.name} seed={message.sender.id} size="size-9" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{message.sender.name}</span>
            <span className="line-clamp-2 text-sm text-slate-600">{message.content}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
