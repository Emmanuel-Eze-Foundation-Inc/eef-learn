export const DASHBOARD_TABS = ["learning", "created", "requests", "settings"] as const;
export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export function isDashboardTab(value: string | undefined): value is DashboardTab {
  return (DASHBOARD_TABS as readonly string[]).includes(value ?? "");
}
