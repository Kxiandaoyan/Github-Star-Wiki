import { NextResponse } from 'next/server';

export interface ApiSuccessPayload<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorPayload {
  success: false;
  message: string;
  errorCode: string;
  details?: unknown;
}

export function apiSuccess<T>(data: T, message = '请求成功。', status = 200) {
  return NextResponse.json<ApiSuccessPayload<T>>(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

export function apiError(message: string, status = 500, errorCode = 'UNKNOWN_ERROR', details?: unknown) {
  return NextResponse.json<ApiErrorPayload>(
    {
      success: false,
      message,
      errorCode,
      ...(details !== undefined ? { details } : {}),
    },
    { status }
  );
}
