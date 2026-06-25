import { MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface Profile {
  id: string
  title: string
  initials: string
  updatedAt: string
  tags: string[]
}

interface ProfileCardProps {
  profile: Profile
}

export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
        {profile.initials}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-card-foreground">{profile.title}</h3>
        <p className="text-xs text-muted-foreground">{profile.updatedAt}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {profile.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        aria-label="Profile options"
      >
        <MoreVertical className="size-4 text-muted-foreground" />
      </Button>
    </div>
  )
}
