export type ErrorType =
  | "validation"
  | "notfound"
  | "forbidden"
  | "conflict"
  | "external"
  | "server";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly type: ErrorType,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (err instanceof Error) return new AppError(500, "server", err.message);
  return new AppError(500, "server", String(err));
}
