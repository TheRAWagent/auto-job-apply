import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Bot,
  CheckIcon,
  Eye,
  Key,
  Lock,
  Shield,
} from "lucide-react"
import * as z from "zod/mini"
import { SecureStorage } from "@/lib/secure-storage"
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from "@/components/reui/stepper"
import { useExtensionStore } from "@/store"

type Step = 1 | 2

const MIN_PASSWORD_LENGTH = 8

const passwordSchema = z.object({
  password: z.string().check(z.minLength(MIN_PASSWORD_LENGTH)),
  confirm: z.string(),
})

const apiKeySchema = z.object({
  apiKey: z.string().check(z.minLength(1)),
  apiBaseUrl: z.union([z.literal(""), z.url()]),
})

function getFieldError(
  issues: z.core.$ZodIssue[],
  path: PropertyKey
): string | undefined {
  return issues.find((issue) => issue.path[0] === path)?.message
}

function Header() {
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

interface PasswordStepProps {
  storage: SecureStorage
  onContinue: () => void
}

function PasswordStep({ storage, onContinue }: PasswordStepProps) {
  const setLoggedIn = useExtensionStore((state) => state.setLoggedIn)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>(
    {}
  )
  const [isLoading, setIsLoading] = useState(false)

  const handleContinue = async () => {
    setErrors({})

    const result = passwordSchema.safeParse({ password, confirm })
    if (!result.success) {
      setErrors({
        password: getFieldError(result.error.issues, "password"),
        confirm: getFieldError(result.error.issues, "confirm"),
      })
      return
    }

    if (password !== confirm) {
      setErrors({ confirm: "Passwords do not match" })
      return
    }

    setIsLoading(true)
    try {
      await storage.initialize(password)
      await storage.unlock(password)
      await storage.createSession(password)
      setLoggedIn(true)
      onContinue()
    } catch (error) {
      setErrors({
        password: error instanceof Error ? error.message : "Failed to save password",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center px-6 pb-8 pt-4">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-foreground/20">
        <Lock className="size-8 text-foreground" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-foreground">
        Set Your Password
      </h2>
      <p className="mb-6 max-w-65 text-center text-sm text-muted-foreground">
        This password will be used to encrypt and protect your data locally.
      </p>

      <div className="flex w-full flex-col gap-3">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            className="h-11 pl-10 pr-10"
            value={password}
            aria-invalid={!!errors.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <Eye className="size-4" />
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password}</p>
        )}

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm password"
            className="h-11 pl-10 pr-10"
            value={confirm}
            aria-invalid={!!errors.confirm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setConfirm(e.target.value)
            }
          />
          <button
            type="button"
            onClick={() => setShowConfirm((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            <Eye className="size-4" />
          </button>
        </div>
        {errors.confirm && (
          <p className="text-xs text-destructive">{errors.confirm}</p>
        )}
      </div>

      <Button
        className="mt-6 h-11 w-full"
        disabled={isLoading}
        onClick={handleContinue}
      >
        {isLoading ? "Saving..." : "Continue"}
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Your password is never stored or sent anywhere.
      </p>
    </div>
  )
}

interface ApiKeyStepProps {
  storage: SecureStorage
  onFinish: () => void
}

function ApiKeyStep({ storage, onFinish }: ApiKeyStepProps) {
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
      onFinish()
    } catch (error) {
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

export function Onboarding() {
  const [step, setStep] = useState<Step>(1)
  const storage = useExtensionStore((state) => state.getSecureStorage)();
  const goToHome = useExtensionStore((state) => state.goToHome)

  const handleFinish = () => {
    goToHome()
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg">
      <Header />
      <Stepper
        value={step}
        onValueChange={(value) => setStep(value as Step)}
        indicators={{
          completed: <CheckIcon className="size-3.5 text-green-700" />,
        }}
      >
        <StepperNav className="flex py-4 px-10 w-full">
          <StepperItem step={1}>
            <StepperTrigger>
              <StepperIndicator>1</StepperIndicator>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem step={2}>
            <StepperTrigger>
              <StepperIndicator>2</StepperIndicator>
            </StepperTrigger>
          </StepperItem>
        </StepperNav>
        <StepperPanel>
          <StepperContent value={1}>
            <PasswordStep storage={storage} onContinue={() => setStep(2)} />
          </StepperContent>
          <StepperContent value={2}>
            <ApiKeyStep storage={storage} onFinish={handleFinish} />
          </StepperContent>
        </StepperPanel>
      </Stepper>
    </div>
  )
}
