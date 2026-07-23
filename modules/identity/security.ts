export function isSameOriginRequest(
  requestOrigin: string | null,
  appUrl: string,
): boolean {
  if (!requestOrigin) {
    return false;
  }

  try {
    return new URL(requestOrigin).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

export function getExpectedRequestOrigin(
  headers: Headers,
  fallbackProtocol: string,
): string | null {
  const host =
    headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    headers.get("host");
  if (!host) {
    return null;
  }

  const protocol =
    headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    fallbackProtocol.replace(":", "");

  return `${protocol}://${host}`;
}
