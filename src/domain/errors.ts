export type StoryBookErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "SESSION_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "INVALID_RESPONSE"
  | "TIMEOUT"
  | "CONFIGURATION_ERROR";

export class StoryBookError extends Error {
  readonly code: StoryBookErrorCode;
  readonly status?: number;

  constructor(code: StoryBookErrorCode, message: string, status?: number) {
    super(message);
    this.name = "StoryBookError";
    this.code = code;
    this.status = status;
  }
}

export function mapHttpStatusToError(status: number, message: string): StoryBookError {
  switch (status) {
    case 401:
      return new StoryBookError("AUTHENTICATION_REQUIRED", message, status);
    case 403:
      return new StoryBookError("FORBIDDEN", message, status);
    case 404:
      return new StoryBookError("NOT_FOUND", message, status);
    case 429:
      return new StoryBookError("RATE_LIMITED", message, status);
    default:
      if (status >= 500) {
        return new StoryBookError("UPSTREAM_ERROR", message, status);
      }
      return new StoryBookError("UPSTREAM_ERROR", message, status);
  }
}
