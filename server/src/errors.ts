export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_REQUESTER_CONTEXT"
  | "RESOURCE_NOT_FOUND"
  | "DUPLICATE_REQUEST_CONFLICT"
  | "ATTACHMENT_LIMIT_REACHED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INTERNAL_ERROR";

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function validationError(fieldErrors: FieldErrors): ApiError {
  return new ApiError(400, "VALIDATION_ERROR", "Request validation failed", fieldErrors);
}

export function safeErrorBody(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        },
      },
    };
  }

  return {
    status: 500,
    body: { error: { code: "INTERNAL_ERROR" as const, message: fallbackMessage } },
  };
}
