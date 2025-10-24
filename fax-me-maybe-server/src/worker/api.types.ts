/**
 * API-related types used in my own projects.
 * You can safely ignore these if they are not relevant to your use case.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type ApiSuccess<T> = {
  data: T;
  error: null;
};

export type ApiFailure = {
  data: null;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;