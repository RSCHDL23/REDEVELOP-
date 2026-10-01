"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** A Supabase client for the browser, used for photo uploads. */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
