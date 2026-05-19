const RESERVED = new Set([
  // Top-level app routes
  "s", "r", "u", "api",
  // Auth
  "login", "logout", "signup", "register",
  // App pages
  "settings", "profile", "about", "privacy", "terms", "contact", "help", "support",
  // Brand / platform
  "admin", "moderator", "staff", "tierstack", "rankr", "system", "official",
  // Common squatting targets
  "anonymous", "null", "undefined", "root", "me", "home", "landing",
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED.has(username.toLowerCase());
}
