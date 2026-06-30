import { Shield } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <Shield className="size-5 text-foreground" />
        <span className="font-semibold text-foreground">SecureFill</span>
      </div>
      <div className="flex items-center gap-1" />
    </header>
  )
}
