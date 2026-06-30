import * as z from "zod/mini";


export function getFieldError(
  issues: z.core.$ZodIssue[],
  path: PropertyKey): string | undefined {
  return issues.find((issue) => issue.path[0] === path)?.message
}
