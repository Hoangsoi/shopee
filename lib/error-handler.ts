// Centralized error handling utilities

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
  statusCode: number;
}

export class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;

  constructor(message: string, statusCode: number = 500, code?: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error codes
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

// Error handler function
export function handleError(error: unknown): NextResponse {
  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation error',
        code: ERROR_CODES.VALIDATION_ERROR,
        details: process.env.NODE_ENV === 'development' 
          ? error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
          : undefined,
      },
      { status: 400 }
    );
  }

  // Custom AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code || ERROR_CODES.INTERNAL_ERROR,
        details: process.env.NODE_ENV === 'development' ? error.details : undefined,
      },
      { status: error.statusCode }
    );
  }

  // Database errors
  if (error && typeof error === 'object' && 'message' in error) {
    const errorMessage = String(error.message);
    
    // Handle common database errors
    if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
      return NextResponse.json(
        {
          error: 'Resource already exists',
          code: ERROR_CODES.ALREADY_EXISTS,
        },
        { status: 409 }
      );
    }

    if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
      return NextResponse.json(
        {
          error: 'Resource not found',
          code: ERROR_CODES.NOT_FOUND,
        },
        { status: 404 }
      );
    }

    if (errorMessage.includes('foreign key') || errorMessage.includes('constraint')) {
      return NextResponse.json(
        {
          error: 'Invalid reference',
          code: ERROR_CODES.VALIDATION_ERROR,
        },
        { status: 400 }
      );
    }
  }

  // Unknown errors
  const errorMessage = error instanceof Error ? error.message : 'Internal server error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Unhandled error:', error);
  }

  return NextResponse.json(
    {
      error: 'Internal server error',
      code: ERROR_CODES.INTERNAL_ERROR,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
    },
    { status: 500 }
  );
}

// Helper to create common errors
export const createError = {
  unauthorized: (message: string = 'Unauthorized') => 
    new AppError(message, 401, ERROR_CODES.UNAUTHORIZED),
  
  forbidden: (message: string = 'Forbidden') => 
    new AppError(message, 403, ERROR_CODES.FORBIDDEN),
  
  notFound: (message: string = 'Resource not found') => 
    new AppError(message, 404, ERROR_CODES.NOT_FOUND),
  
  conflict: (message: string = 'Resource already exists') => 
    new AppError(message, 409, ERROR_CODES.ALREADY_EXISTS),
  
  validation: (message: string, details?: unknown) => 
    new AppError(message, 400, ERROR_CODES.VALIDATION_ERROR, details),
  
  internal: (message: string = 'Internal server error', details?: unknown) => 
    new AppError(message, 500, ERROR_CODES.INTERNAL_ERROR, details),
};

