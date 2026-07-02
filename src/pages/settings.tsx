import { useEffect, useState } from "react"
import { ArrowLeft, Eye, EyeOff, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useExtensionStore } from "@/store"
import { logger } from "@/lib/logger"

const LOG_CONTEXT = "settings";

interface FetchedModel {
  id: string;
}

interface ModelsResponse {
  data?: FetchedModel[];
  error?: { message: string };
}

type ModelFetchState = "idle" | "loading" | "done" | "error";

export function Settings() {
  const secureStorage = useExtensionStore((state) => state.secureStorage)
  const isLoggedIn = useExtensionStore((state) => state.isLoggedIn)
  const goBack = useExtensionStore((state) => state.goBack)
  const goToLogin = useExtensionStore((state) => state.goToLogin)

  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.openai.com/v1")
  const [apiKey, setApiKey] = useState("")
  const [savedModel, setSavedModel] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [models, setModels] = useState<string[]>([])
  const [fetchState, setFetchState] = useState<ModelFetchState>("idle")
  const [modelError, setModelError] = useState<string | null>(null)

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
        .catch((error) => {
          logger.reportError({
            context: LOG_CONTEXT,
            message: "Failed to load API key",
            error,
          })
          setApiKey("")
        }),
      secureStorage
        .getApiBaseUrl()
        .then((url) => {
          setApiBaseUrl(url ?? "https://api.openai.com/v1")
        })
        .catch((error) => {
          logger.reportError({
            context: LOG_CONTEXT,
            message: "Failed to load API base URL",
            error,
          })
          setApiBaseUrl("https://api.openai.com/v1")
        }),
      secureStorage
        .getModel()
        .then((storedModel) => {
          const model = storedModel ?? ""
          setSavedModel(model)
        })
        .catch((error) => {
          logger.reportError({
            context: LOG_CONTEXT,
            message: "Failed to load model",
            error,
          })
          setSavedModel("")
        }),
    ]).finally(() => setIsLoading(false))
  }, [isLoggedIn, secureStorage])

  useEffect(() => {
    if (!isLoggedIn) {
      goToLogin()
    }
  }, [isLoggedIn, goToLogin])

  function resetModelFetchState(): void {
    setFetchState("idle")
    setModels([])
  }

  function updateApiKey(value: string): void {
    setApiKey(value)
    resetModelFetchState()
  }

  function updateApiBaseUrl(value: string): void {
    setApiBaseUrl(value)
    resetModelFetchState()
  }

  async function fetchModels(): Promise<void> {
    if (fetchState === "loading" || fetchState === "done") {
      return
    }

    if (!apiKey || !apiBaseUrl) {
      setModelError("Enter an API key and base URL before selecting a model.")
      return
    }

    setFetchState("loading")
    setModelError(null)

    try {
      const baseUrl = apiBaseUrl.replace(/\/$/, "")
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      const data = (await response.json()) as ModelsResponse

      if (!response.ok || data.error) {
        throw new Error(data.error?.message ?? `HTTP ${response.status}`)
      }

      const modelIds = (data.data ?? []).map((m) => m.id)
      setModels(modelIds)
      setFetchState("done")
      logger.info(LOG_CONTEXT, "Models fetched", { count: modelIds.length })

      if (savedModel && modelIds.includes(savedModel) && !selectedModel) {
        setSelectedModel(savedModel)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch models"
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to fetch models",
        error,
      })
      setModelError(message)
      setFetchState("error")
      setModels([])
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    logger.info(LOG_CONTEXT, "Saving settings")
    try {
      await Promise.all([
        secureStorage.saveApiKey(apiKey),
        secureStorage.saveApiBaseUrl(apiBaseUrl),
        secureStorage.saveModel(selectedModel),
      ])
      await secureStorage.syncSessionCredentials()
      setSavedModel(selectedModel)
      setSaved(true)
      logger.info(LOG_CONTEXT, "Settings saved")
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to save settings",
        error,
      })
      alert("Failed to save settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isLoggedIn) {
    return null
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
                  updateApiKey(e.target.value)
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
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="api-base-url">API Base URL</Label>
            <Input
              id="api-base-url"
              type="text"
              placeholder="Enter API base URL"
              value={apiBaseUrl}
              disabled={isLoading}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateApiBaseUrl(e.target.value)
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="model">Model</Label>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              onOpenChange={(open) => {
                if (open) {
                  void fetchModels()
                }
              }}
              disabled={isLoading || fetchState === "loading"}
            >
              <SelectTrigger id="model" className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {fetchState === "idle" && (
                  <SelectItem value="__fetch__" disabled>
                    Click to load available models
                  </SelectItem>
                )}
                {fetchState === "loading" && (
                  <SelectItem value="__loading__" disabled>
                    Loading models…
                  </SelectItem>
                )}
                {fetchState === "error" && models.length === 0 && (
                  <SelectItem value="__error__" disabled>
                    Could not load models
                  </SelectItem>
                )}
                {models.map((modelId) => (
                  <SelectItem key={modelId} value={modelId}>
                    {modelId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modelError && (
              <p className="text-xs text-destructive">{modelError}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Your API key and base URL are encrypted and stored locally. The model choice is stored alongside them.
          </p>

          <Button type="submit" disabled={isLoading || isSaving} className="gap-2">
            <Save className="size-4" />
            {saved ? "Saved" : isSaving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </div>
    </div>
  )
}
