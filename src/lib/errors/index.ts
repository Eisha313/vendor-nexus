export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND', true);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED', true);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN', true);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', true, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(message: string = 'Too many requests', retryAfter: number = 60) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, { retryAfter });
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ExternalServiceError extends AppError {
  public readonly serviceName: string;

  constructor(serviceName: string, message: string, details?: Record<string, unknown>) {
    super(
      `External service error (${serviceName}): ${message}`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      true,
      { serviceName, ...details }
    );
    this.serviceName = serviceName;
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `Database error: ${message}`,
      500,
      'DATABASE_ERROR',
      true,
      details
    );
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class PaymentError extends AppError {
  public readonly paymentProvider: string;
  public readonly providerErrorCode?: string;

  constructor(
    message: string,
    paymentProvider: string = 'stripe',
    providerErrorCode?: string,
    details?: Record<string, unknown>
  ) {
    super(
      `Payment error: ${message}`,
      402,
      'PAYMENT_ERROR',
      true,
      { paymentProvider, providerErrorCode, ...details }
    );
    this.paymentProvider = paymentProvider;
    this.providerErrorCode = providerErrorCode;
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

export class InsufficientStockError extends AppError {
  public readonly productId: string;
  public readonly requestedQuantity: number;
  public readonly availableQuantity: number;

  constructor(
    productId: string,
    requestedQuantity: number,
    availableQuantity: number
  ) {
    super(
      `Insufficient stock for product ${productId}. Requested: ${requestedQuantity}, Available: ${availableQuantity}`,
      400,
      'INSUFFICIENT_STOCK',
      true,
      { productId, requestedQuantity, availableQuantity }
    );
    this.productId = productId;
    this.requestedQuantity = requestedQuantity;
    this.availableQuantity = availableQuantity;
    Object.setPrototypeOf(this, InsufficientStockError.prototype);
  }
}

// Error handler utility
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500, 'INTERNAL_ERROR', false);
  }

  return new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR', false);
}