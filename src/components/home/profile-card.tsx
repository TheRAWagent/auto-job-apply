import { useState, useRef, useEffect } from "react"
import { MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sendAutofillMessage } from "@/lib/extension-messaging"

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

function openManageProfileTab(id: string) {
  const url =
    typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL(`manage-profile.html?id=${encodeURIComponent(id)}`)
      : `/manage-profile.html?id=${encodeURIComponent(id)}`

  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    chrome.tabs.create({ url })
  } else {
    window.open(url, "_blank")
  }
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  return (
    <div className="relative flex items-center gap-4 rounded-xl border bg-card p-4">
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
      <div className="relative" ref={menuRef}>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Profile options"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreVertical className="size-4 text-muted-foreground" />
        </Button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border bg-popover p-1 shadow-md">
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-popover-foreground hover:bg-muted"
              onClick={() => {
                setMenuOpen(false)
                openManageProfileTab(profile.id)
              }}
            >
              Manage
            </button>
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-popover-foreground hover:bg-muted"
              onClick={() => {
                setMenuOpen(false)
                void sendAutofillMessage(profile.id)
              }}
            >
              Autofill page
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
