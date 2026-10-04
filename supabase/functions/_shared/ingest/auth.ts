/**
 * Read the signed-in user's token from a request's Authorization header ("Bearer <token>").
 * Returns null when the header is missing or isn't a bearer token.
 */
export function bearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

/**
 * Headers that make database queries run as the signed-in user, so row-level security applies.
 * The key must be exactly "Authorization": supabase-js already sets that key to the project key, and a
 * differently-cased duplicate (e.g. "authorization") gets merged with it into an invalid header.
 */
export function userAuthHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
