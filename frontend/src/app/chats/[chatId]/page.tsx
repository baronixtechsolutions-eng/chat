"use client";

import { useParams } from "next/navigation";
import { Conversation } from "@/components/chat/conversation";

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  // key: switching chats remounts the view, so scroll and draft state never leak between chats
  return <Conversation key={chatId} chatId={chatId} />;
}
