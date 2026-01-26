
import { createClient } from '@supabase/supabase-js';

// NOTE: This client should ONLY be used in server-side API routes.
// It requires SUPABASE_SERVICE_ROLE_KEY to bypass RLS for tasks like updating ELO ratings of other users.
// If SERVICE_ROLE_KEY is missing, it falls back to ANON_KEY (which might fail RLS checks).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase Environment Variables!");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
