import type { SessionSnapshot } from "../../shared/auth/access-policy";
import { isOnboardingComplete } from "../../features/onboarding/onboarding-steps";

export interface NavItem {
  to: string;
  label: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const OWNER_ADMIN = new Set(["Owner", "Administrator", "Admin"]);
const MANAGER_ROLES = new Set(["Manager", ...OWNER_ADMIN]);
const SETUP_ROLES = OWNER_ADMIN;

function hasPermission(session: SessionSnapshot, permission: string): boolean {
  return session.permissions.includes(permission);
}

function canManageStock(session: SessionSnapshot): boolean {
  return hasPermission(session, "ManageStock") || MANAGER_ROLES.has(session.role);
}

function canSell(session: SessionSnapshot): boolean {
  return hasPermission(session, "Sell");
}

function canViewReports(session: SessionSnapshot): boolean {
  return (
    hasPermission(session, "ViewReports") ||
    session.role === "Accountant" ||
    MANAGER_ROLES.has(session.role)
  );
}

function canManagePurchasing(session: SessionSnapshot): boolean {
  return (
    hasPermission(session, "ManagePurchasing") ||
    OWNER_ADMIN.has(session.role) ||
    session.role === "Manager"
  );
}

function canManageUsers(session: SessionSnapshot): boolean {
  return hasPermission(session, "ManageUsers") || OWNER_ADMIN.has(session.role);
}

function canReviewOffline(session: SessionSnapshot): boolean {
  return MANAGER_ROLES.has(session.role);
}

export function buildNavigationGroups(
  session: SessionSnapshot,
  onboardingChecklist: Record<string, boolean> | undefined,
): NavGroup[] {
  const groups: NavGroup[] = [];

  const today: NavItem[] = [{ to: "/dashboard", label: "Dashboard" }];
  if (canSell(session)) {
    today.push(
      { to: "/pos", label: "Sell" },
      { to: "/registers", label: "Tills" },
      { to: "/sales", label: "Sales history" },
      { to: "/returns", label: "Returns" },
    );
  }
  today.push({ to: "/notifications", label: "Notifications" });
  groups.push({ id: "today", label: "Today", items: today });

  if (canSell(session) || canManageStock(session)) {
    const stock: NavItem[] = [];
    if (canManageStock(session)) {
      stock.push({ to: "/locations", label: "Locations" });
    }
    if (canManageStock(session) || canSell(session)) {
      stock.push({ to: "/catalogue/products", label: "Products" });
    }
    if (canManageStock(session)) {
      stock.push(
        { to: "/catalogue/categories", label: "Categories" },
        { to: "/inventory", label: "Inventory" },
        { to: "/inventory/opening-stock", label: "Opening stock" },
        { to: "/inventory/batches", label: "Batches" },
      );
    } else if (canSell(session)) {
      stock.push({ to: "/inventory/stock", label: "Stock levels" });
    }
    if (stock.length > 0) groups.push({ id: "stock", label: "Stock", items: stock });
  }

  if (canManagePurchasing(session)) {
    groups.push({
      id: "buy",
      label: "Buy",
      items: [{ to: "/purchasing", label: "Purchasing" }],
    });
  }

  if (canViewReports(session)) {
    groups.push({
      id: "insights",
      label: "Insights",
      items: [{ to: "/reports", label: "Reports" }],
    });
  }

  if (canManageUsers(session)) {
    groups.push({
      id: "team",
      label: "Team",
      items: [{ to: "/staff", label: "Staff" }],
    });
  }

  const settings: NavItem[] = [];
  if (SETUP_ROLES.has(session.role)) {
    settings.push(
      { to: "/settings/business", label: "Business" },
      { to: "/settings/receipts", label: "Receipts" },
    );
  }
  if (session.role === "Owner") {
    settings.push({ to: "/settings/billing", label: "Billing" });
  }
  settings.push({ to: "/settings/security", label: "Security" });
  if (settings.length > 0) {
    groups.push({ id: "settings", label: "Settings", items: settings });
  }

  if (
    SETUP_ROLES.has(session.role) &&
    onboardingChecklist &&
    !isOnboardingComplete(onboardingChecklist)
  ) {
    groups.push({
      id: "setup",
      label: "Setup",
      items: [{ to: "/onboarding", label: "Get started" }],
    });
  }

  if (canReviewOffline(session)) {
    groups.push({
      id: "offline",
      label: "Offline",
      items: [{ to: "/offline/review", label: "Offline review" }],
    });
  }

  return groups;
}

export function flattenNavigationGroups(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((group) => group.items);
}
