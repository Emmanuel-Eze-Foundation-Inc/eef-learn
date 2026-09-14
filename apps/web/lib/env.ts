import { loadWebEnv } from "@eef/core";

/**
 * Boot-time validated env (operator error contract: problem + cause + fix + docs).
 * Import `env` from here everywhere; never read process.env directly in app code.
 */
export const env = loadWebEnv();
