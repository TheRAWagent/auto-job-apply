import { FolderOpen, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyProfilesProps {
  onCreate: () => void
}

export function EmptyProfiles({ onCreate }: EmptyProfilesProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="relative mb-6">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-muted/50">
          <FolderOpen className="size-10 text-muted-foreground" />
        </div>
        <Sparkles className="absolute -right-3 -top-2 size-4 text-muted-foreground" />
        <Plus className="absolute -left-3 top-2 size-4 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        No profiles yet
      </h3>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        Create your first application profile to start filling job application
        forms faster.
      </p>
      <Button className="gap-2" onClick={onCreate}>
        <Plus className="size-4" />
        Create Your First Profile
      </Button>
    </div>
  )
}
