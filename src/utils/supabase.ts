import {createClient} from "@supabase/supabase-js";
import type {Database} from "@/database.types";

const SUPABASE_URL = "https://edwpbvbkfwgvhsgeppdz.supabase.co"
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vnyyi3Ir4vmhbbLzRZvYRQ_ZagCr3RB"

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
