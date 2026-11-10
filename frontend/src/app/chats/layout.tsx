import { Suspense } from "react";
import { ChatsShell, FullPageSpinner } from "@/components/chat/chats-shell";

// The shell reads the session and the URL in the browser, so it streams in after the static spinner
export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ChatsShell>{children}</ChatsShell>
    </Suspense>
  );
}
