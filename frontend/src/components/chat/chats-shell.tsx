"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { ChatsProvider } from "@/context/chats-context";
import { SocketProvider } from "@/context/socket-context";
import { ChatSidebar } from "./chat-sidebar";
import { MessageNotifications } from "./message-notifications";

export function ChatsShell({ children }: { children: React.ReactNode }) {
  const { status, retry } = useAuth();
  const router = useRouter();
  const { chatId } = useParams<{ chatId?: string }>();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status === "unavailable") {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-slate-600">No se pudo conectar con el servidor.</p>
        <Button onClick={retry}>Reintentar</Button>
      </main>
    );
  }

  if (status !== "authenticated") return <FullPageSpinner />;

  return (
    <SocketProvider>
      <ChatsProvider activeChatId={chatId}>
        <MessageNotifications activeChatId={chatId} />
        <div className="flex h-full overflow-hidden bg-white md:p-4 md:bg-slate-100">
          <div className="flex w-full overflow-hidden bg-white md:rounded-2xl md:shadow-xl md:shadow-slate-200/70 md:ring-1 md:ring-slate-200">
            {/* On small screens only one pane is visible at a time */}
            <aside className={`w-full shrink-0 border-slate-200 md:block md:w-80 md:border-r ${chatId ? "hidden" : "block"}`}>
              <ChatSidebar activeChatId={chatId} />
            </aside>
            <section className={`min-w-0 flex-1 md:flex ${chatId ? "flex" : "hidden"}`}>{children}</section>
          </div>
        </div>
      </ChatsProvider>
    </SocketProvider>
  );
}

export function FullPageSpinner() {
  return (
    <main className="flex h-full items-center justify-center text-indigo-600">
      <Spinner className="size-8" />
    </main>
  );
}
