import "server-only";
import { isDemoMode } from "@/lib/env";
import { demoRepo } from "./demo";
import { supabaseRepo } from "./supabaseRepo";
import type { Repo } from "./repo";

/** The data layer for this request: sample data in demo mode, otherwise Supabase. */
export function repo(): Repo {
  return isDemoMode ? demoRepo : supabaseRepo;
}

export * from "./types";
