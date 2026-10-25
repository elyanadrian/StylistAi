/**
 * Returns `value` if it is a same-origin path, otherwise "/". Use it for every
 * user-supplied post-login redirect (the `next` param / form field).
 *
 * Starting with "/" isn't enough on its own: browsers treat "//host" and
 * "/\host" as protocol-relative URLs to another site.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  if (value[1] === "/" || value[1] === "\\") return "/";
  // Control characters (tabs, newlines) are stripped by URL parsers, so "/\t/host" becomes "//host".
  if (/[\x00-\x1f\x7f]/.test(value)) return "/";
  return value;
}
