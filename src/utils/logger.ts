/**
 * Thin log helpers — silent in production builds.
 * Prefer these over bare console.* for game logic noise.
 */

const isDev = import.meta.env.DEV;

export const log = {
  debug(...args: unknown[]): void {
    if (isDev) console.log(...args);
  },
  info(...args: unknown[]): void {
    if (isDev) console.info(...args);
  },
  warn(...args: unknown[]): void {
    // Keep warnings in prod for real issues, but prefix lightly
    console.warn(...args);
  },
  error(...args: unknown[]): void {
    console.error(...args);
  },
};
