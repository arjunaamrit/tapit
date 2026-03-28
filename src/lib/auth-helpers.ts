import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the current user's access token for use in edge function calls.
 * Returns null if the user is not authenticated.
 */
export async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Returns headers object with Authorization bearer token for edge function fetch calls.
 * Throws if the user is not authenticated.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('You must be signed in to use this feature.');
  }
  return {
    'Authorization': `Bearer ${token}`,
  };
}
