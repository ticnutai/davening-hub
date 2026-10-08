import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as sharedClient } from "@/integrations/supabase/client";
import type { Database } from "./types";

// Community and Torah features intentionally share one authenticated client.
// New Shul uses the local workspace adapter by default. The canonical client
// rejects the original cloud project and requires an explicitly configured new backend.
export const supabase = sharedClient as unknown as SupabaseClient<Database>;
