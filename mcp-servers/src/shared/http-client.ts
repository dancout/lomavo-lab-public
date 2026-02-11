/**
 * Typed HTTP client for querying homelab service APIs.
 * Supports custom headers for authenticated APIs (Immich, Pi-hole).
 */

export interface HttpResponse<T> {
  status: number;
  data: T;
}

export async function httpGet<T = unknown>(
  url: string,
  params?: Record<string, string>,
  headers?: Record<string, string>,
): Promise<HttpResponse<T>> {
  const urlObj = new URL(url);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      urlObj.searchParams.set(key, value);
    }
  }

  const response = await fetch(urlObj.toString(), {
    headers: { Accept: 'application/json', ...headers },
  });

  const data = (await response.json()) as T;
  return { status: response.status, data };
}

export async function httpPost<T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<HttpResponse<T>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as T;
  return { status: response.status, data };
}

export async function httpPut<T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<HttpResponse<T>> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as T;
  return { status: response.status, data };
}
