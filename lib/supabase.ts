import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente para el navegador (anon key)
export const supabaseClient = createClient(url, anon);

// Cliente para el servidor (service role — nunca exponer al browser)
export const supabaseServer = createClient(url, service);
