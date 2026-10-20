export const THEME_COOKIE = "eef-theme";

export type Theme = "light" | "dark";

/**
 * Runs before first paint so a saved theme never flashes the other one.
 * With no saved choice the app follows the OS via `data-theme="system"`.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);document.documentElement.dataset.theme=m?m[1]:"system"}catch(e){}})()`;
