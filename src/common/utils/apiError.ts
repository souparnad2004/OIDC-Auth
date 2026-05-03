export type ApiErrorDetail = {
  field?: string;
  message?: string;
  code?: string;
};

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors: ApiErrorDetail[];
  code: string;

  constructor(
    statusCode: number,
    message: string,
    code: string,
    errors: ApiErrorDetail[] = [],
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = statusCode < 500;
    this.errors = errors;
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(
    message: string = "Bad request",
    errors?: ApiErrorDetail[],
  ) {
    return new ApiError(400, message, "BAD_REQUEST", errors);
  }

  static unauthorized(
    message: string = "Unauthorized",
    errors?: ApiErrorDetail[],
  ) {
    return new ApiError(401, message, "UNAUTHORIZED", errors);
  }

  static forbidden(
    message: string = "Forbidden",
    errors?: ApiErrorDetail[],
  ) {
    return new ApiError(403, message, "FORBIDDEN", errors);
  }

  static notFound(
    message: string = "Not found",
    errors?: ApiErrorDetail[],
  ) {
    return new ApiError(404, message, "NOT_FOUND", errors);
  }

  static conflict(
    message: string = "Conflict",
    errors?: ApiErrorDetail[],
  ) {
    return new ApiError(409, message, "CONFLICT", errors);
  }

  static validation(
    message: string = "Validation failed",
    errors?: ApiErrorDetail[],
  ) {
    return new ApiError(422, message, "VALIDATION_ERROR", errors);
  }

  static tooManyRequests(
    message: string = "Too many requests",
    errors?: ApiErrorDetail[],
  ) {
    return new ApiError(429, message, "RATE_LIMIT", errors);
  }
}