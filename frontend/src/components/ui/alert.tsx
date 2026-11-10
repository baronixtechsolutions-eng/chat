export function Alert({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;

  return (
    <div role="alert" className="animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
      {messages.length === 1 ? (
        messages[0]
      ) : (
        <ul className="list-inside list-disc space-y-0.5">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
