import { DEV_USER_ID, DEV_USER_EMAIL } from "./client";

// Mock auth session for development mode
export interface LocalAuthSession {
  user: {
    id: string;
    email: string;
  };
  access_token: string;
}

// Create a consistent dev session
export function getDevSession(): LocalAuthSession {
  return {
    user: {
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
    },
    access_token: "dev-access-token",
  };
}

// Mock auth user for development mode
export function getDevUser() {
  return {
    id: DEV_USER_ID,
    email: DEV_USER_EMAIL,
  };
}

// Check if we're in development mode
export function isDevelopmentMode(): boolean {
  return process.env.NEXT_PUBLIC_APP_MODE === "development";
}
