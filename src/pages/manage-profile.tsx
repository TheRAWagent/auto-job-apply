import { useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Lock,
  Save,
  Shield,
  Trash2,
  X,
} from "lucide-react"
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
  parseProfileJson,
  profileSchema,
  type ProfileSchema,
} from "@/components/profile-form"

const LOG_CONTEXT = "manage-profile";

function getProfileIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get("id")
}

export function ManageProfile() {
  const [storage] = useState(() => new SecureStorage())
  const [initialized, setInitialized] = useState<boolean | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState("")
  const [profileId] = useState<string | null>(() => getProfileIdFromUrl())
  const [originalProfile, setOriginalProfile] = useState<ApplicationProfile | null>(null)
  const [name, setName] = useState("")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [profile, setProfile] = useState<ProfileSchema>(emptyProfile)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)

  useEffect(() => {
    logger.info(LOG_CONTEXT, "Profile ID resolved from URL", { profileId })

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
  }, [storage, profileId])

  useEffect(() => {
    if (!unlocked || !profileId) {
      return
    }

    storage
      .getApplicationProfile(profileId)
      .then((item) => {
        if (!item) {
          setValidationError("Profile not found")
          logger.warn(LOG_CONTEXT, "Profile not found", { profileId })
          return
        }

        setOriginalProfile(item)
        setName(item.name)
        const parsed = parseProfileJson(item.json)
        if (parsed) {
          setProfile(parsed)
        }
        logger.info(LOG_CONTEXT, "Profile loaded", { profileId })
      })
      .catch((error) => {
        logger.reportError({
          context: LOG_CONTEXT,
          message: "Failed to load profile",
          error,
          extra: { profileId },
        })
        setValidationError("Failed to load profile")
      })
  }, [unlocked, profileId, storage])

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profileId || !originalProfile) {
        throw new Error("Profile not loaded")
      }

      const parsed = profileSchema.parse(profile)

      const updatedProfile: ApplicationProfile = {
        ...originalProfile,
        name: name.trim(),
        json: parsed,
        createdAt: Date.now(),
      }

      if (pdfFile) {
        updatedProfile.pdfBase64 = await fileToBase64(pdfFile)
      }

      await storage.saveApplicationProfile(updatedProfile)
    },
    onSuccess: () => {
      logger.info(LOG_CONTEXT, "Profile saved", { profileId })
      window.close()
    },
    onError: (error) => {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to save profile",
        error,
        extra: { profileId },
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!profileId) {
        throw new Error("Profile not loaded")
      }

      await storage.deleteApplicationProfile(profileId)
    },
    onSuccess: () => {
      logger.info(LOG_CONTEXT, "Profile deleted", { profileId })
      window.close()
    },
    onError: (error) => {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Failed to delete profile",
        error,
        extra: { profileId },
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

    const result = profileSchema.safeParse(profile)
    if (!result.success) {
      setValidationError(
        result.error.issues.map((issue) => issue.message).join("; ")
      )
      return
    }

    saveMutation.mutate()
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
            managing a profile.
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
            Enter your local password to manage this profile.
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
            <span className="font-semibold text-foreground">Manage Profile</span>
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
                  Update your profile information and resume.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileForm
                  profile={profile}
                  onChange={setProfile}
                  pdfFile={pdfFile}
                  onPdfChange={setPdfFile}
                  existingPdfName={originalProfile ? "resume.pdf" : null}
                />
              </CardContent>
            </Card>

            {showDeleteWarning && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-5 text-destructive" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium text-destructive">
                      Delete this profile?
                    </p>
                    <p className="text-sm text-destructive/80">
                      This action cannot be undone. Your profile data and resume
                      will be permanently removed.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate()}
                      >
                        {deleteMutation.isPending
                          ? "Deleting..."
                          : "Yes, delete"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteWarning(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(validationError || saveMutation.isError || deleteMutation.isError) && (
              <p className="text-sm text-destructive">
                {validationError ||
                  (saveMutation.error instanceof Error
                    ? saveMutation.error.message
                    : deleteMutation.error instanceof Error
                      ? deleteMutation.error.message
                      : "Failed to process request")}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="size-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="gap-2"
                disabled={deleteMutation.isPending || showDeleteWarning}
                onClick={() => setShowDeleteWarning(true)}
              >
                <Trash2 className="size-4" />
                Delete Profile
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
