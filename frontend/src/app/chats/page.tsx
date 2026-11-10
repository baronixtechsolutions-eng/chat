export default function NoChatSelected() {
  return (
    <div className="flex flex-1 animate-fade-in flex-col items-center justify-center gap-3 p-8 text-center text-slate-400">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-14" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10h8M8 14h5m-9 6 3.5-3H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14z"
        />
      </svg>
      <p className="text-sm">Selecciona una conversación o crea un chat nuevo.</p>
    </div>
  );
}
