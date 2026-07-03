import type { ProfileSchema } from "@/components/profile-form";

export function getFullName(
  profile: Pick<ProfileSchema, "firstName" | "middleName" | "lastName">
): string {
  return [profile.firstName, profile.middleName, profile.lastName]
    .filter((part): part is string => Boolean(part))
    .join(" ")
}

export function getFullPhoneNumber(
  profile: Pick<ProfileSchema, "countryCode" | "phoneNumber">
): string {
  return `${profile.countryCode}${profile.phoneNumber}`
}
