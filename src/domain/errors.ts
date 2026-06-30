export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ProfileNotFoundError extends DomainError {
  constructor(profileId: string) {
    super(`Profile '${profileId}' not found.`);
  }
}
