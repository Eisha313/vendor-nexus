import { NextResponse } from 'next/server';
import { handleError, AppError } from '@/lib/errors';
import type { ApiResponse } from '@/lib/types';

type HandlerFunction<T> = () => Promise<T>;

export async function apiHandler<T>(
  handler: HandlerFunction<T>
): Promise<NextResponse<ApiResponse<T>>> {
  try {
    const data = await handler();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function errorResponse(
  code: string,
  message: string,
  status: number = 500,
  details?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(String(field));
    }
  }

  if (missingFields.length > 0) {
    throw new AppError(
      `Missing required fields: ${missingFields.join(', ')}`,
      'VALIDATION_ERROR',
      400,
      { missingFields }
    );
  }
}

export function parseQueryParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  filters: Record<string, string>;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  const filters: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== 'page' && key !== 'limit') {
      filters[key] = value;
    }
  });

  return { page, limit, filters };
}
