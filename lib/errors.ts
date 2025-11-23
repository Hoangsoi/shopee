// Centralized error handling utilities

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Không có quyền truy cập') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Không có quyền thực hiện hành động này') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Không tìm thấy tài nguyên') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Tài nguyên đã tồn tại') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    public resetTime?: number
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// Error handler for API routes
export function handleApiError(error: unknown): {
  status: number;
  body: {
    error: string;
    code?: string;
    details?: unknown;
  };
} {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error);
  }

  // Handle known AppError instances
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        error: error.message,
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.details : undefined,
      },
    };
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ message: string }> };
    return {
      status: 400,
      body: {
        error: zodError.issues[0]?.message || 'Dữ liệu không hợp lệ',
        code: 'VALIDATION_ERROR',
        details: process.env.NODE_ENV === 'development' ? zodError.issues : undefined,
      },
    };
  }

  // Handle generic errors
  const errorMessage = error instanceof Error ? error.message : 'Lỗi server';
  const errorStack = error instanceof Error ? error.stack : undefined;

  return {
    status: 500,
    body: {
      error: 'Lỗi server',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? { message: errorMessage, stack: errorStack } : undefined,
    },
  };
}

// Safe async handler wrapper
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const { status, body } = handleApiError(error);
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}

