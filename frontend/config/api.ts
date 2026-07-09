/**
 * Legacy shim. All calls now flow through `lib/api.ts`; this file exists
 * only to satisfy stale imports until they're all cleaned up.
 */

export const API_CONFIG = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || '',
};

export const API_ENDPOINTS = {};
