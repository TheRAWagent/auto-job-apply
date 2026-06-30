import { MoreVertical, Settings, Shield, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useExtensionStore } from "@/store"

export function HomeHeader() {
  const goToSettings = useExtensionStore((state) => state.goToSettings)

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <Shield className="size-5 text-foreground" />
        <span className="font-semibold text-foreground">SecureFill</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          onClick={goToSettings}
        >
          <Settings className="size-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="More options">
          <MoreVertical className="size-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={() => window.close()}
        >
          <X className="size-4 text-muted-foreground" />
        </Button>
      </div>
    </header>
  )
}
