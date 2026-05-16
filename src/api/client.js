export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}

export function fileUrl(relativePath, cacheKey = "") {
  const params = new URLSearchParams({ path: relativePath || "" });
  if (cacheKey) params.set("v", cacheKey);
  return `/api/file?${params.toString()}`;
}
