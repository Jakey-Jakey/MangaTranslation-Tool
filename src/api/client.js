export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const error = data && typeof data === "object" ? data.error : "";
    throw new Error(error || text || response.statusText || `Request failed with status ${response.status}`);
  }
  return data;
}

export function fileUrl(relativePath, cacheKey = "") {
  const params = new URLSearchParams({ path: relativePath || "" });
  if (cacheKey) params.set("v", cacheKey);
  return `/api/file?${params.toString()}`;
}
