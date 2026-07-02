import { getFieldError } from "@/lib/common"
import type { SecureStorage } from "@/lib/secure-storage"
import { logger } from "@/lib/logger"
import { Bot, Key } from "lucide-react"
import { useState } from "react"
import * as z from "zod/mini"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const LOG_CONTEXT = "onboarding-api-key";

interface ApiKeyStepProps {
  storage: SecureStorage
  onFinish: () => void
}

export function ApiKeyStep({ storage, onFinish }: ApiKeyStepProps) {
  const [apiKey, setApiKey] = useState("")
  const [apiBaseUrl, setApiBaseUrl] = useState("")
  const [errors, setErrors] = useState<{
    apiKey?: string
    apiBaseUrl?: string
  }>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleFinish = async () => {
    setErrors({})

    const result = apiKeySchema.safeParse({ apiKey, apiBaseUrl })
    if (!result.success) {
      setErrors({
        apiKey: getFieldError(result.error.issues, "apiKey"),
        apiBaseUrl: getFieldError(result.error.issues, "apiBaseUrl"),
      })
      return
    }

    setIsLoading(true)
    try {
      await storage.saveApiKey(apiKey)
      await storage.saveApiBaseUrl(apiBaseUrl)
      await storage.syncSessionCredentials()
      logger.info(LOG_CONTEXT, "API credentials saved during onboarding")
      onFinish()
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to save API credentials during onboarding",
        error,
      })
      setErrors({
        apiKey: error instanceof Error ? error.message : "Failed to save credentials",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center px-6 pb-8 pt-4">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-foreground/20">
        <Bot className="size-8 text-foreground" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-foreground">
        Setup your LLM credentials
      </h2>

      <p className="mb-6 max-w-65 text-center text-sm text-muted-foreground">
        Enter your API key to connect SecureFill to the service.
      </p>

      <div className="relative w-full">
        <Key className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Enter API key"
          className="h-11 pl-10"
          value={apiKey}
          aria-invalid={!!errors.apiKey}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setApiKey(e.target.value)
          }
        />
      </div>
      {errors.apiKey && (
        <p className="mt-1 text-xs text-destructive">{errors.apiKey}</p>
      )}

      <p className="mb-6 mt-3 text-center text-sm text-muted-foreground">
        You can find your API key in your account dashboard.
      </p>

      <div className="relative w-full">
        <Key className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="https://api.openai.com/v1"
          className="h-11 pl-10"
          value={apiBaseUrl}
          aria-invalid={!!errors.apiBaseUrl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setApiBaseUrl(e.target.value)
          }
        />
      </div>
      {errors.apiBaseUrl && (
        <p className="mt-1 text-xs text-destructive">{errors.apiBaseUrl}</p>
      )}

      <p className="mt-3 text-center text-sm text-muted-foreground">
        Enter your API base URL to connect to the service, defaults to OpenAI
      </p>

      <Button
        className="mt-6 h-11 w-full"
        disabled={isLoading}
        onClick={handleFinish}
      >
        {isLoading ? "Saving..." : "Save & Finish"}
      </Button>

      <button
        type="button"
        className="mt-4 text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        Skip for now
      </button>
    </div>
  )
}
const apiKeySchema = z.object({
  apiKey: z.string().check(z.minLength(1)),
  apiBaseUrl: z.union([z.literal(""), z.url()]),
})
