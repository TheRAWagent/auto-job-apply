import { useEffect, useState } from "react"
import { ArrowLeft, Check, Lock, Shield, X } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SecureStorage } from "@/lib/secure-storage"
import type { ApplicationProfile } from "@/lib/secure-storage"
import { logger } from "@/lib/logger"
import {
  ProfileForm,
  emptyProfile,
  fileToBase64,
  profileSchema,
  type ProfileSchema,
} from "@/components/profile-form"

const LOG_CONTEXT = "create-profile";

export function CreateProfile() {
  const [storage] = useState(() => new SecureStorage())
  const [initialized, setInitialized] = useState<boolean | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [profile, setProfile] = useState<ProfileSchema>(emptyProfile)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    storage.isInitialized()
      .then((value) => {
        setInitialized(value)
        logger.info(LOG_CONTEXT, "Storage initialization checked", { initialized: value })
      })
      .catch((error) => {
        logger.reportError({
          context: LOG_CONTEXT,
          message: "Failed to check storage initialization",
          error,
        })
        setInitialized(false)
      })
  }, [storage])

  const unlockMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!password) {
        throw new Error("Password is required")
      }

      const ok = await storage.unlock(password)
      if (!ok) {
        throw new Error("Incorrect password")
      }

      await storage.createSession(password)
      return true
    },
    onSuccess: () => {
      logger.info(LOG_CONTEXT, "Storage unlocked")
      setUnlocked(true)
    },
    onError: (error) => {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to unlock storage",
        error,
      })
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!pdfFile) {
        throw new Error("Resume PDF is required")
      }

      const parsed = profileSchema.parse(profile)

      const applicationProfile: ApplicationProfile = {
        id: crypto.randomUUID(),
        name: name.trim(),
        pdfBase64: await fileToBase64(pdfFile),
        json: parsed,
        createdAt: Date.now(),
      }

      await storage.saveApplicationProfile(applicationProfile)
      return applicationProfile.id
    },
    onSuccess: (profileId) => {
      logger.info(LOG_CONTEXT, "Profile created", { profileId })
      window.close()
    },
    onError: (error) => {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to create profile",
        error,
      })
    },
  })

  const handleUnlock = () => {
    setValidationError(null)
    unlockMutation.mutate(password)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setValidationError(null)

    if (!name.trim()) {
      setValidationError("Profile name is required")
      return
    }

    if (!pdfFile) {
      setValidationError("Please upload a resume PDF")
      return
    }

    const result = profileSchema.safeParse(profile)
    if (!result.success) {
      setValidationError(
        result.error.issues.map((issue) => issue.message).join("; ")
      )
      return
    }

    submitMutation.mutate()
  }

  if (initialized === null) {
    return null
  }

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md rounded-xl border bg-background p-6 text-center shadow-sm">
          <Shield className="mx-auto mb-4 size-10 text-foreground" />
          <h1 className="mb-2 text-xl font-semibold">Setup required</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Please complete the onboarding flow in the extension popup before
            creating a profile.
          </p>
          <Button onClick={() => window.close()}>Close</Button>
        </div>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Lock className="size-6 text-foreground" />
            </div>
          </div>
          <h1 className="mb-2 text-center text-xl font-semibold">
            Unlock SecureFill
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Enter your local password to create a profile.
          </p>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleUnlock()
              }}
            />
            {unlockMutation.isError && (
              <p className="text-sm text-destructive">
                {unlockMutation.error instanceof Error
                  ? unlockMutation.error.message
                  : "Failed to unlock"}
              </p>
            )}
            <Button
              className="w-full"
              onClick={() => void handleUnlock()}
              disabled={unlockMutation.isPending || !password}
            >
              {unlockMutation.isPending ? "Unlocking..." : "Unlock"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Go back"
              onClick={() => window.close()}
            >
              <ArrowLeft className="size-4 text-muted-foreground" />
            </Button>
            <span className="font-semibold text-foreground">Create Profile</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={() => window.close()}
          >
            <X className="size-4 text-muted-foreground" />
          </Button>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Profile Name</Label>
              <Input
                id="profile-name"
                placeholder="e.g. Software Engineer"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>
                  Enter your profile information. This will be stored as JSON.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileForm
                  profile={profile}
                  onChange={setProfile}
                  pdfFile={pdfFile}
                  onPdfChange={setPdfFile}
                />
              </CardContent>
            </Card>

            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
            {submitMutation.isError && (
              <p className="text-sm text-destructive">
                {submitMutation.error instanceof Error
                  ? submitMutation.error.message
                  : "Failed to save profile"}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="gap-2"
            >
              {submitMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Check className="size-4" />
                  Create Profile
                </>
              )}
            </Button>
          </form>
        </main>
      </div>
    </div>
  )
}
