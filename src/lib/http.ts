export async function readJsonResponse<T = any>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Expected JSON but received: ${text.slice(0, 140)}`);
  }
}

export function responseError(response: Response, body: any, fallback: string) {
  return body?.error || body?.message || `${fallback} (${response.status} ${response.statusText})`;
}
