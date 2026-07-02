import { getFieldError } from "@/lib/common"
import type { SecureStorage } from "@/lib/secure-storage"
import { logger } from "@/lib/logger"
import { useExtensionStore } from "@/store"
import { useState } from "react"
import * as z from "zod/mini"
import { Input } from "@/components/ui/input"
import { Eye, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

const LOG_CONTEXT = "onboarding-password";

interface PasswordStepProps {
  storage: SecureStorage
  onContinue: () => void
}

const MIN_PASSWORD_LENGTH = 8

const passwordSchema = z.object({
  password: z.string().check(z.minLength(MIN_PASSWORD_LENGTH)),
  confirm: z.string(),
})

export function PasswordStep({ storage, onContinue }: PasswordStepProps) {
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
      logger.info(LOG_CONTEXT, "Onboarding password set and storage initialized")
      onContinue()
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to initialize storage during onboarding",
        error,
      })
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
