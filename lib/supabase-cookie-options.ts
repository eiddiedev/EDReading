type CookieProtocol = "http:" | "https:";

interface CookieOptionsInput {
  protocol?: string | null;
}

const COOKIE_NAME = "sb-edreading-auth-token";

function normalizeProtocol(protocol?: string | null): CookieProtocol | undefined {
  if (!protocol) return undefined;
  return protocol === "https:" ? "https:" : protocol === "http:" ? "http:" : undefined;
}

export function getSupabaseCookieOptions(input: CookieOptionsInput = {}) {
  const protocol = normalizeProtocol(input.protocol);
  const isHttps = protocol ? protocol === "https:" : process.env.NODE_ENV === "production";

  return {
    name: COOKIE_NAME,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax" as const,
    secure: isHttps,
  };
}

export function getBrowserCookieOptions() {
  const protocol =
    typeof window !== "undefined" ? window.location.protocol : undefined;

  return getSupabaseCookieOptions({ protocol });
}

export function getRequestProtocol(headers: Headers) {
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedProto === "https" || forwardedProto === "http") {
    return `${forwardedProto}:`;
  }

  const origin = headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).protocol;
    } catch {
      return undefined;
    }
  }

  const referer = headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).protocol;
    } catch {
      return undefined;
    }
  }

  return undefined;
}
