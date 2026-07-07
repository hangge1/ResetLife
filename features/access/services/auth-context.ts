export const DEFAULT_ADMIN_USER_ID = "default-admin";
export const USER_SESSION_COOKIE = "slimming_user_session";
export const GUEST_SESSION_COOKIE = "slimming_guest_session";

export type UserRole = "admin" | "user";

export type UserAuthContext = {
  mode: "user";
  userId: string;
  role: UserRole;
};

export type GuestAuthContext = {
  mode: "guest";
  guestSessionId: string;
};

export type AuthContext = UserAuthContext | GuestAuthContext;

export function getUserIdForPersistence(auth: AuthContext) {
  return auth.mode === "user" ? auth.userId : null;
}
