import { authClient } from "~/lib/auth-client";

/**
 * Returns the current tenant ID, derived from the authenticated user's session.
 * Falls back to "demo-user-1" if no session is available (e.g., during SSR or loading).
 */
export function useTenant() {
  const { data: session } = authClient.useSession();

  const tenantId = session?.user?.id ?? "demo-user-1";

  return {
    tenantId,
    // changeTenant is no longer needed — tenant is derived from auth session
    changeTenant: (_id: string) => {
      console.warn("changeTenant is deprecated. Tenant is now derived from the authenticated session.");
    },
  };
}
