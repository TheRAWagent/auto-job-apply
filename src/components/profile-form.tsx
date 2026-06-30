import { useRef } from "react"
import { FileText, Plus, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { z } from "zod"

export const educationSchema = z.object({
  degree: z.string().min(1, "Degree is required"),
  institution: z.string().min(1, "Institution is required"),
  year: z.number().int().min(1900).max(2100),
  coursework: z.array(z.string()),
})

export const experienceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company: z.string().min(1, "Company is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().nullable(),
  location: z.string().min(1, "Location is required"),
  description: z.array(z.string().min(1)),
})

export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().min(1, "Description is required"),
  sourceCode: z.string().nullable(),
  liveDemo: z.string().nullable(),
  blogPost: z.string().nullable(),
})

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  website: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  education: z.array(educationSchema),
  experience: z.array(experienceSchema),
  projects: z.array(projectSchema),
  skills: z.array(z.string().min(1)),
})

export type ProfileSchema = z.infer<typeof profileSchema>

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export function emptyProfile(): ProfileSchema {
  return {
    name: "",
    email: "",
    phone: "",
    website: null,
    linkedin: null,
    github: null,
    education: [],
    experience: [],
    projects: [],
    skills: [],
  }
}

export function parseProfileJson(json: unknown): ProfileSchema | null {
  const result = profileSchema.safeParse(json)
  return result.success ? result.data : null
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
            className="cursor-pointer gap-1"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-3.5" />
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

function ArrayStringInput({
  values,
  onChange,
  placeholder,
  addLabel,
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
  addLabel: string
}) {
  return (
    <div className="space-y-2">
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={value}
            placeholder={placeholder}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const next = [...values]
              next[index] = e.target.value
              onChange(next)
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(values.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => onChange([...values, ""])}
      >
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  )
}

export interface ProfileFormProps {
  profile: ProfileSchema
  onChange: (profile: ProfileSchema) => void
  pdfFile: File | null
  onPdfChange: (file: File | null) => void
  pdfLabel?: string
  existingPdfName?: string | null
}

export function ProfileForm({
  profile,
  onChange,
  pdfFile,
  onPdfChange,
  pdfLabel = "Upload your resume PDF",
  existingPdfName,
}: ProfileFormProps) {
  const updateField = <K extends keyof ProfileSchema>(
    field: K,
    value: ProfileSchema[K]
  ) => {
    onChange({ ...profile, [field]: value })
  }

  const pdfDisplayName = pdfFile
    ? pdfFile.name
    : existingPdfName
      ? `${existingPdfName} (current)`
      : null

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Resume PDF</Label>
        <FileInputField
          id="pdf-file"
          accept=".pdf"
          label={pdfDisplayName ?? pdfLabel}
          file={pdfFile}
          onChange={onPdfChange}
        />
        {existingPdfName && !pdfFile && (
          <p className="text-xs text-muted-foreground">
            Upload a new PDF to replace the current resume.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full-name">Full Name</Label>
          <Input
            id="full-name"
            value={profile.name}
            onChange={(e) => updateField("name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={profile.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={profile.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={profile.website ?? ""}
            onChange={(e) =>
              updateField("website", e.target.value ? e.target.value : null)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedin">LinkedIn</Label>
          <Input
            id="linkedin"
            value={profile.linkedin ?? ""}
            onChange={(e) =>
              updateField("linkedin", e.target.value ? e.target.value : null)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="github">GitHub</Label>
          <Input
            id="github"
            value={profile.github ?? ""}
            onChange={(e) =>
              updateField("github", e.target.value ? e.target.value : null)
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Skills</Label>
        <ArrayStringInput
          values={profile.skills}
          onChange={(skills) => updateField("skills", skills)}
          placeholder="e.g. TypeScript"
          addLabel="Add skill"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Education</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              updateField("education", [
                ...profile.education,
                {
                  degree: "",
                  institution: "",
                  year: new Date().getFullYear(),
                  coursework: [],
                },
              ])
            }
          >
            <Plus className="size-3.5" />
            Add education
          </Button>
        </div>
        {profile.education.map((edu, index) => (
          <div key={index} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Education {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  updateField(
                    "education",
                    profile.education.filter((_, i) => i !== index)
                  )
                }
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Degree"
                value={edu.degree}
                onChange={(e) => {
                  const next = [...profile.education]
                  next[index] = { ...edu, degree: e.target.value }
                  updateField("education", next)
                }}
              />
              <Input
                placeholder="Institution"
                value={edu.institution}
                onChange={(e) => {
                  const next = [...profile.education]
                  next[index] = { ...edu, institution: e.target.value }
                  updateField("education", next)
                }}
              />
              <Input
                type="number"
                placeholder="Year"
                value={edu.year}
                onChange={(e) => {
                  const next = [...profile.education]
                  next[index] = { ...edu, year: Number(e.target.value) }
                  updateField("education", next)
                }}
              />
            </div>
            <ArrayStringInput
              values={edu.coursework}
              onChange={(coursework) => {
                const next = [...profile.education]
                next[index] = { ...edu, coursework }
                updateField("education", next)
              }}
              placeholder="Coursework"
              addLabel="Add coursework"
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Experience</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              updateField("experience", [
                ...profile.experience,
                {
                  title: "",
                  company: "",
                  startDate: "",
                  endDate: null,
                  location: "",
                  description: [],
                },
              ])
            }
          >
            <Plus className="size-3.5" />
            Add experience
          </Button>
        </div>
        {profile.experience.map((exp, index) => (
          <div key={index} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Experience {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  updateField(
                    "experience",
                    profile.experience.filter((_, i) => i !== index)
                  )
                }
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Title"
                value={exp.title}
                onChange={(e) => {
                  const next = [...profile.experience]
                  next[index] = { ...exp, title: e.target.value }
                  updateField("experience", next)
                }}
              />
              <Input
                placeholder="Company"
                value={exp.company}
                onChange={(e) => {
                  const next = [...profile.experience]
                  next[index] = { ...exp, company: e.target.value }
                  updateField("experience", next)
                }}
              />
              <Input
                placeholder="Start date"
                value={exp.startDate}
                onChange={(e) => {
                  const next = [...profile.experience]
                  next[index] = { ...exp, startDate: e.target.value }
                  updateField("experience", next)
                }}
              />
              <Input
                placeholder="End date (leave blank if current)"
                value={exp.endDate ?? ""}
                onChange={(e) => {
                  const next = [...profile.experience]
                  next[index] = {
                    ...exp,
                    endDate: e.target.value ? e.target.value : null,
                  }
                  updateField("experience", next)
                }}
              />
              <Input
                placeholder="Location"
                value={exp.location}
                onChange={(e) => {
                  const next = [...profile.experience]
                  next[index] = { ...exp, location: e.target.value }
                  updateField("experience", next)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description bullets</Label>
              <ArrayStringInput
                values={exp.description}
                onChange={(description) => {
                  const next = [...profile.experience]
                  next[index] = { ...exp, description }
                  updateField("experience", next)
                }}
                placeholder="Responsibility or achievement"
                addLabel="Add bullet"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Projects</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              updateField("projects", [
                ...profile.projects,
                {
                  name: "",
                  description: "",
                  sourceCode: null,
                  liveDemo: null,
                  blogPost: null,
                },
              ])
            }
          >
            <Plus className="size-3.5" />
            Add project
          </Button>
        </div>
        {profile.projects.map((proj, index) => (
          <div key={index} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Project {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  updateField(
                    "projects",
                    profile.projects.filter((_, i) => i !== index)
                  )
                }
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <Input
              placeholder="Project name"
              value={proj.name}
              onChange={(e) => {
                const next = [...profile.projects]
                next[index] = { ...proj, name: e.target.value }
                updateField("projects", next)
              }}
            />
            <Textarea
              placeholder="Description"
              value={proj.description}
              onChange={(e) => {
                const next = [...profile.projects]
                next[index] = { ...proj, description: e.target.value }
                updateField("projects", next)
              }}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="Source code URL"
                value={proj.sourceCode ?? ""}
                onChange={(e) => {
                  const next = [...profile.projects]
                  next[index] = {
                    ...proj,
                    sourceCode: e.target.value ? e.target.value : null,
                  }
                  updateField("projects", next)
                }}
              />
              <Input
                placeholder="Live demo URL"
                value={proj.liveDemo ?? ""}
                onChange={(e) => {
                  const next = [...profile.projects]
                  next[index] = {
                    ...proj,
                    liveDemo: e.target.value ? e.target.value : null,
                  }
                  updateField("projects", next)
                }}
              />
              <Input
                placeholder="Blog post URL"
                value={proj.blogPost ?? ""}
                onChange={(e) => {
                  const next = [...profile.projects]
                  next[index] = {
                    ...proj,
                    blogPost: e.target.value ? e.target.value : null,
                  }
                  updateField("projects", next)
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
