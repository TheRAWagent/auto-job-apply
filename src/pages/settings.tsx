import { useEffect, useState } from "react"
import { ArrowLeft, Eye, EyeOff, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useExtensionStore } from "@/store"

export function Settings() {
  const secureStorage = useExtensionStore((state) => state.secureStorage)
  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.openai.com/v1")
  const isLoggedIn = useExtensionStore((state) => state.isLoggedIn)
  const goBack = useExtensionStore((state) => state.goBack)
  const goToLogin = useExtensionStore((state) => state.goToLogin)

  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) {
      return
    }

    Promise.all([
      
      secureStorage
      .getApiKey()
      .then((key) => {
        setApiKey(key ?? "")
      })
      .catch(() => setApiKey("")),
      secureStorage
      .getApiBaseUrl()
      .then((url) => {
        setApiBaseUrl(url ?? "https://api.openai.com/v1")
      })
      .catch(() => setApiBaseUrl("https://api.openai.com/v1")),
    ])
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      await secureStorage.saveApiKey(apiKey)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      alert("Failed to save API key. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-4">
      <div className="w-full max-w-sm rounded-4xl border bg-background p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={goBack}
            type="button"
          >
            <ArrowLeft className="size-5 text-muted-foreground" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                placeholder="Enter your API key"
                value={apiKey}
                disabled={isLoading}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setApiKey(e.target.value)
                }
                className="pr-10"
              />
              <Input
                id="api-base-url"
                type="text"
                placeholder="Enter API base URL"
                value={apiBaseUrl}
                disabled={isLoading}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setApiBaseUrl(e.target.value)
                }
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
                className="absolute top-1/2 right-0 size-8 -translate-y-1/2"
                onClick={() => setShowApiKey((prev) => !prev)}
              >
                {showApiKey ? (
                  <EyeOff className="size-4 text-muted-foreground" />
                ) : (
                  <Eye className="size-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your API key is encrypted and stored locally in the browser.
            </p>
          </div>

          <Button type="submit" disabled={isLoading || isSaving} className="gap-2">
            <Save className="size-4" />
            {saved ? "Saved" : isSaving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </div>
    </div>
  )
}
