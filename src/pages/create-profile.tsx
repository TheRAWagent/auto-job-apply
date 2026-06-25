import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  Check,
  FileText,
  Link2,
  Lock,
  Shield,
  Upload,
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { SecureStorage } from "@/lib/secure-storage"
import type { ApplicationProfile } from "@/lib/secure-storage"

type SourceMode = "file" | "url"

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`)
  }
  const blob = await response.blob()
  return fileToBase64(new File([blob], "resume.pdf", { type: blob.type }))
}

function SourceToggle({
  mode,
  onChange,
}: {
  mode: SourceMode
  onChange: (mode: SourceMode) => void
}) {
  return (
    <div className="inline-flex rounded-lg border p-1">
      <Button
        type="button"
        variant={mode === "file" ? "secondary" : "ghost"}
        size="sm"
        className="gap-1.5"
        onClick={() => onChange("file")}
      >
        <Upload className="size-3.5" />
        Upload
      </Button>
      <Button
        type="button"
        variant={mode === "url" ? "secondary" : "ghost"}
        size="sm"
        className="gap-1.5"
        onClick={() => onChange("url")}
      >
        <Link2 className="size-3.5" />
        URL
      </Button>
    </div>
  )
}

function FileInputField({
  id,
  accept,
  label,
  file,
  onChange,
}: {
  id: string
  accept: string
  label: string
  file: File | null
  onChange: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="rounded-lg border border-dashed p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <FileText className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {file ? file.name : label}
        </p>
        <Label htmlFor={id} asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            Choose file
          </Button>
        </Label>
        <Input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.files?.[0] ?? null)
          }
        />
      </div>
    </div>
  )
}

function UrlInputField({
  value,
  onChange,
  onLoad,
  loading,
}: {
  value: string
  onChange: (value: string) => void
  onLoad: () => void
  loading: boolean
}) {
  return (
    <div className="flex gap-2">
      <Input
        type="url"
        placeholder="https://example.com/document"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
      />
      <Button
        type="button"
        variant="outline"
        onClick={onLoad}
        disabled={!value || loading}
      >
        {loading ? "Loading..." : "Load"}
      </Button>
    </div>
  )
}

export function CreateProfile() {
  const [storage] = useState(() => new SecureStorage())
  const [initialized, setInitialized] = useState<boolean | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState("")

  const [name, setName] = useState("")
  const [pdfMode, setPdfMode] = useState<SourceMode>("file")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState("")
  const [includeMarkdown, setIncludeMarkdown] = useState(false)
  const [mdMode, setMdMode] = useState<SourceMode>("file")
  const [mdFile, setMdFile] = useState<File | null>(null)
  const [mdUrl, setMdUrl] = useState("")
  const [markdownPreview, setMarkdownPreview] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    storage.isInitialized().then(setInitialized)
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
    onSuccess: () => setUnlocked(true),
  })

  const loadMarkdownMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load URL: ${response.status}`)
      }
      return response.text()
    },
    onSuccess: (text) => setMarkdownPreview(text),
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const profile: ApplicationProfile = {
        id: crypto.randomUUID(),
        name: name.trim(),
        createdAt: Date.now(),
      }

      if (pdfMode === "file" && pdfFile) {
        profile.pdfBase64 = await fileToBase64(pdfFile)
      } else if (pdfMode === "url" && pdfUrl) {
        try {
          profile.pdfBase64 = await urlToBase64(pdfUrl)
        } catch {
          profile.pdfUrl = pdfUrl
        }
      }

      if (includeMarkdown) {
        if (mdMode === "file" && mdFile) {
          const reader = new FileReader()
          profile.markdown = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error("Failed to read markdown"))
            reader.readAsText(mdFile)
          })
        } else if (mdMode === "url" && mdUrl) {
          profile.markdownUrl = mdUrl
          profile.markdown = markdownPreview
        }
      }

      const existing = await storage.getProfiles()
      await storage.saveProfiles([...existing, profile])
    },
    onSuccess: () => window.close(),
  })

  const handleUnlock = () => {
    setValidationError(null)
    unlockMutation.mutate(password)
  }

  const handleMarkdownFileChange = (file: File | null) => {
    setMdFile(file)
    if (!file) {
      setMarkdownPreview("")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setMarkdownPreview(String(event.target?.result ?? ""))
    }
    reader.readAsText(file)
  }

  const handleMarkdownUrlLoad = () => {
    if (!mdUrl) return
    setValidationError(null)
    loadMarkdownMutation.mutate(mdUrl)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setValidationError(null)

    if (!name.trim()) {
      setValidationError("Profile name is required")
      return
    }

    const hasPdf = pdfMode === "file" ? !!pdfFile : !!pdfUrl
    if (!hasPdf) {
      setValidationError("Please provide a resume PDF")
      return
    }

    if (includeMarkdown) {
      const hasMarkdown = mdMode === "file" ? !!mdFile : !!mdUrl
      if (!hasMarkdown) {
        setValidationError("Please provide a markdown resume or turn off the option")
        return
      }
      if (!markdownPreview.trim()) {
        setValidationError("Markdown preview is empty. Upload a file or load a URL first.")
        return
      }
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
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Resume PDF</Label>
                <SourceToggle mode={pdfMode} onChange={setPdfMode} />
              </div>
              {pdfMode === "file" ? (
                <FileInputField
                  id="pdf-file"
                  accept=".pdf"
                  label="Upload your resume PDF"
                  file={pdfFile}
                  onChange={setPdfFile}
                />
              ) : (
                <UrlInputField
                  value={pdfUrl}
                  onChange={setPdfUrl}
                  onLoad={() => setValidationError(null)}
                  loading={false}
                />
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="markdown-switch" className="cursor-pointer">
                  Provide markdown version
                </Label>
                <p className="text-xs text-muted-foreground">
                  Add a markdown resume in addition to the PDF.
                </p>
              </div>
              <Switch
                id="markdown-switch"
                checked={includeMarkdown}
                onCheckedChange={setIncludeMarkdown}
              />
            </div>

            {includeMarkdown && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Markdown Resume</Label>
                  <SourceToggle mode={mdMode} onChange={setMdMode} />
                </div>
                {mdMode === "file" ? (
                  <FileInputField
                    id="md-file"
                    accept=".md,.markdown"
                    label="Upload your markdown resume"
                    file={mdFile}
                    onChange={handleMarkdownFileChange}
                  />
                ) : (
                  <UrlInputField
                    value={mdUrl}
                    onChange={setMdUrl}
                    onLoad={handleMarkdownUrlLoad}
                    loading={loadMarkdownMutation.isPending}
                  />
                )}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  Review the uploaded resume and extracted markdown before
                  saving.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Resume PDF:</span>
                  <span className="truncate font-medium">
                    {pdfMode === "file"
                      ? pdfFile?.name ?? "No file selected"
                      : pdfUrl || "No URL provided"}
                  </span>
                </div>
                {includeMarkdown && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">
                      Extracted Markdown
                    </span>
                    <Textarea
                      readOnly
                      value={markdownPreview}
                      placeholder="Markdown preview will appear here..."
                      className="min-h-32 resize-none"
                    />
                  </div>
                )}
                {!pdfFile && !pdfUrl && !markdownPreview && (
                  <p className="text-sm text-muted-foreground">
                    Upload or link a resume to see a preview.
                  </p>
                )}
              </CardContent>
            </Card>

            {(validationError || submitMutation.isError || loadMarkdownMutation.isError) && (
              <p className="text-sm text-destructive">
                {validationError ||
                  (submitMutation.error instanceof Error
                    ? submitMutation.error.message
                    : submitMutation.isError
                      ? "Failed to save profile"
                      : null) ||
                  (loadMarkdownMutation.error instanceof Error
                    ? loadMarkdownMutation.error.message
                    : loadMarkdownMutation.isError
                      ? "Could not load markdown URL"
                      : null)}
              </p>
            )}

            <Button type="submit" className="gap-2" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Check className="size-4" />
                  Submit Profile
                </>
              )}
            </Button>
          </form>
        </main>
      </div>
    </div>
  )
}
