import Cookies from 'js-cookie';
import { TOKEN_COOKIE_NAME, removeAuthToken } from './jwt-client';

type HttpOptionsType = RequestInit;

type AppResponse = Record<string, any>;

export interface FetchError extends Error {
  status: number;
  message: string;
}

type ApiReturn<ResponseType> = ResponseType;

/**
 * Wrapper around fetch to make it easy to handle errors
 *
 * @param url
 * @param options
 */
export async function httpCall<ResponseType = AppResponse>(
  url: string,
  options?: HttpOptionsType,
): Promise<ApiReturn<ResponseType>> {
  try {
    const isMultiPartFormData = options?.body instanceof FormData;

    const headers = new Headers({
      Accept: 'application/json',
      Authorization: `Bearer ${Cookies.get(TOKEN_COOKIE_NAME)}`,
      ...(options?.headers ?? {}),
    });

    if (!isMultiPartFormData) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    });

    // @ts-ignore
    const doesAcceptHtml = options?.headers?.['Accept'] === 'text/html';

    const data = doesAcceptHtml ? await response.text() : await response.json();

    // Logout user if token is invalid
    if (response.status === 401) {
      removeAuthToken();
      window.location.href = '/login';
      return null as unknown as ApiReturn<ResponseType>;
    }

    if (!response.ok) {
      if (data.errors) {
        const error = new Error() as FetchError;
        error.message = data.message;
        error.status = response.status;
        throw error;
      } else {
        throw new Error('An unexpected error occurred');
      }
    }

    return data as ResponseType;
  } catch (error: any) {
    throw error;
  }
}

export async function httpPost<ResponseType = AppResponse>(
  url: string,
  body: Record<string, any>,
  options?: HttpOptionsType,
): Promise<ApiReturn<ResponseType>> {
  return httpCall<ResponseType>(url, {
    ...options,
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

export async function httpGet<ResponseType = AppResponse>(
  url: string,
  queryParams?: Record<string, any>,
  options?: HttpOptionsType,
): Promise<ApiReturn<ResponseType>> {
  const searchParams = new URLSearchParams(queryParams).toString();
  const queryUrl = searchParams ? `${url}?${searchParams}` : url;

  return httpCall<ResponseType>(queryUrl, {
    credentials: 'include',
    method: 'GET',
    ...options,
  });
}

export async function httpPatch<ResponseType = AppResponse>(
  url: string,
  body: Record<string, any>,
  options?: HttpOptionsType,
): Promise<ApiReturn<ResponseType>> {
  return httpCall<ResponseType>(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function httpPut<ResponseType = AppResponse>(
  url: string,
  body: Record<string, any>,
  options?: HttpOptionsType,
): Promise<ApiReturn<ResponseType>> {
  return httpCall<ResponseType>(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function httpDelete<ResponseType = AppResponse>(
  url: string,
  options?: HttpOptionsType,
): Promise<ApiReturn<ResponseType>> {
  return httpCall<ResponseType>(url, {
    ...options,
    method: 'DELETE',
  });
}
