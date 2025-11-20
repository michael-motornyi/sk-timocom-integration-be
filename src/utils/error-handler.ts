/**
 * Centralized error handling utilities
 */

export interface ErrorDetails {
  message: string;
  code?: string | undefined;
  status?: number | undefined;
  originalError?: unknown;
}

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error occurred';
}

/**
 * Extract error details with additional context
 */
export function getErrorDetails(error: unknown, context?: string): ErrorDetails {
  const message = getErrorMessage(error);
  const details: ErrorDetails = {
    message: context ? `${context}: ${message}` : message,
    originalError: error,
  };

  // Handle axios errors
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: { code?: string };
      };
      code?: string;
    };
    if (axiosError.response) {
      if (axiosError.response.status !== undefined) {
        details.status = axiosError.response.status;
      }
      const responseCode = axiosError.response.data?.code || axiosError.code;
      if (responseCode !== undefined) {
        details.code = responseCode;
      }
    }
  }

  // Handle standard errors with codes
  if (error instanceof Error && 'code' in error) {
    const errorWithCode = error as Error & { code: unknown };
    details.code = String(errorWithCode.code);
  }

  return details;
}

/**
 * Log error with consistent formatting
 */
export function logError(error: unknown, context?: string): void {
  const details = getErrorDetails(error, context);
  console.error(`❌ ${details.message}`);

  if (details.code) {
    console.error(`   Code: ${details.code}`);
  }

  if (details.status) {
    console.error(`   Status: ${details.status}`);
  }

  // Log full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('   Full error:', details.originalError);
  }
}

/**
 * Create standardized API error response
 */
export function createErrorResponse(error: unknown, defaultMessage: string) {
  const details = getErrorDetails(error);

  return {
    success: false,
    error: details.message || defaultMessage,
    code: details.code,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle API route errors consistently
 */
export function handleRouteError(error: unknown, context: string, defaultMessage: string) {
  logError(error, context);
  return createErrorResponse(error, defaultMessage);
}
