import { ExternalLink, Lock } from "lucide-react"

export function HomeFooter() {
  return (
    <footer className="flex items-center justify-between border-t px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5" />
        <span>Your data is encrypted and stored locally.</span>
      </div>
      <a
        href="#"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        Learn more
        <ExternalLink className="size-3" />
      </a>
    </footer>
  )
}
