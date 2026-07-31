export function createAuthorizationHeader(
  token: string | null | undefined,
): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
