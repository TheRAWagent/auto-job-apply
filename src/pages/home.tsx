import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyProfiles } from "@/components/home/empty-profiles"
import { HomeFooter } from "@/components/home/footer"
import { HomeHeader } from "@/components/home/header"
import { ProfileCard, type Profile } from "@/components/home/profile-card"
import { useExtensionStore } from "@/store"

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    return name.slice(0, 2).toUpperCase()
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function formatUpdatedAt(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "Updated just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Updated ${days} day${days === 1 ? "" : "s"} ago`
  const weeks = Math.floor(days / 7)
  return `Updated ${weeks} week${weeks === 1 ? "" : "s"} ago`
}

function openCreateProfileTab() {
  const url =
    typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL("create-profile.html")
      : "/create-profile.html"

  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    chrome.tabs.create({ url })
  } else {
    window.open(url, "_blank")
  }
}

export function Home() {
  const secureStorage = useExtensionStore((state) => state.secureStorage)
  const isLoggedIn = useExtensionStore((state) => state.isLoggedIn)
  const goToLogin = useExtensionStore((state) => state.goToLogin)

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isLoggedIn) {
      return
    }

    secureStorage
      .getProfiles()
      .then((items) => {
        console.log(items);
        setProfiles(
          items.map((item) => ({
            id: item.id,
            title: item.name,
            initials: getInitials(item.name),
            updatedAt: formatUpdatedAt(item.createdAt),
            tags: [],
          }))
        )
      })
      .catch(() => setProfiles([]))
      .finally(() => setIsLoading(false))
  }, [isLoggedIn, secureStorage])

  useEffect(() => {
    if (!isLoggedIn) {
      goToLogin()
    }
  }, [isLoggedIn, goToLogin])

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
        <HomeHeader />

        <main className="flex flex-1 flex-col overflow-y-auto p-4">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Application Profiles
              </h1>
              <p className="mt-1 max-w-[16rem] text-sm text-muted-foreground">
                Manage your job application profiles and quickly fill forms with
                your saved information.
              </p>
            </div>
            <Button
              className="gap-2 shrink-0"
              size="sm"
              onClick={openCreateProfileTab}
            >
              <Plus className="size-4" />
              New Profile
            </Button>
          </div>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading profiles...</p>
            </div>
          ) : profiles.length > 0 ? (
            <div className="flex flex-col gap-3">
              {profiles.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          ) : (
            <EmptyProfiles onCreate={openCreateProfileTab} />
          )}
        </main>

        <HomeFooter />
      </div>
    </div>
  )
}
