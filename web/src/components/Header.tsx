import { Wallet } from "lucide-react";

export default function Header({ email }: { email?: string }) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-black/20 border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-yellow-400/90 grid place-items-center">
            <Wallet className="size-4 text-black" />
          </div>
          <span className="font-semibold tracking-wide">Exlite</span>
          <span className="ml-3 text-xs text-white/60 hidden sm:inline">paper trading · demo</span>
        </div>
        <div className="text-xs text-white/70">{email}</div>
      </div>
    </header>
  );
}
