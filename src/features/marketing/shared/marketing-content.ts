import type { LucideIcon } from "lucide-react";
import {
  Bell,
  MapPin,
  RefreshCw,
  ShoppingCart,
  Truck,
  WifiOff,
} from "lucide-react";

export const LANDING_LOGOS = [
  "Kwame Retail",
  "Accra Mart",
  "NorthGrid Supply",
  "Luma Fashion",
  "TrueStock Co.",
  "Raven Marts",
] as const;

export const LANDING_STATS = [
  { value: "POS + stock", label: "One unified system" },
  { value: "14 days", label: "Professional trial" },
  { value: "Offline", label: "Counter sales supported" },
  { value: "GHS", label: "Local currency ready" },
] as const;

export type FeatureCard = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

export const LANDING_FEATURES: FeatureCard[] = [
  {
    icon: ShoppingCart,
    title: "Counter sales",
    desc: "Fast POS checkout with barcode scan, receipts, and held sales for busy counters.",
  },
  {
    icon: RefreshCw,
    title: "Real-time sync",
    desc: "Stock levels update when a sale, return, or transfer occurs across your locations.",
  },
  {
    icon: MapPin,
    title: "Multi-location hub",
    desc: "View and manage inventory for every store from a single command center.",
  },
  {
    icon: Truck,
    title: "Purchasing",
    desc: "Supplier orders, goods received, and cost tracking tied to your stock ledger.",
  },
  {
    icon: Bell,
    title: "Smart alerts",
    desc: "Get notified when stock dips below safe levels at any location.",
  },
  {
    icon: WifiOff,
    title: "Offline POS",
    desc: "Queue sales when connectivity drops and sync when you are back online.",
  },
];

export const FEATURE_SECTIONS = [
  {
    id: "pos",
    title: "Point of sale",
    bullets: [
      "Barcode and tile-grid checkout for fast counter service",
      "Receipts, held sales, and register/shift context",
      "Works offline for prepared shifts when the network is unreliable",
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    bullets: [
      "Real-time stock levels across locations",
      "Low-stock visibility and stock movements",
      "Transfers, counts, and adjustments with approval flows",
    ],
  },
  {
    id: "purchasing",
    title: "Purchasing",
    bullets: [
      "Supplier records and purchase orders",
      "Goods received posting into stock",
      "Cost tracking for margin and reporting",
    ],
  },
  {
    id: "reports",
    title: "Reports",
    bullets: [
      "Sales, stock, and profit views for owners and managers",
      "Role-gated fields such as cost and margin",
      "Export paths for accountants and auditors",
    ],
  },
  {
    id: "offline",
    title: "Offline",
    bullets: [
      "Durable sale queue during connectivity loss",
      "Prepared catalogue snapshot for counter search",
      "Sync and conflict review when back online",
    ],
  },
  {
    id: "staff",
    title: "Staff & roles",
    bullets: [
      "Owner, manager, cashier, and specialist permissions",
      "Invite team members to your business",
      "Audit-friendly access boundaries per role",
    ],
  },
] as const;

export const PRICING_FAQ = [
  {
    q: "Is there a free trial?",
    a: "Yes — new businesses get a 14-day Professional trial with no credit card required.",
  },
  {
    q: "Can I change plans later?",
    a: "You can upgrade or downgrade from your account. Downgrades take effect at period end.",
  },
  {
    q: "How is a location counted?",
    a: "Each physical store or warehouse you operate counts as one location toward your plan limit.",
  },
  {
    q: "What currency do you bill in?",
    a: "Plans are priced in Ghana cedi (GHS) for businesses registered in Ghana.",
  },
  {
    q: "Does offline POS work on every plan?",
    a: "Offline counter sales are included on Professional and higher tiers. See plan details for limits.",
  },
  {
    q: "Who owns my data?",
    a: "Your business data stays yours. Export options are available from billing settings.",
  },
] as const;

export const PRICING_COMPARISON_ROWS = [
  { feature: "Locations", starter: "1", professional: "3", business: "Unlimited" },
  { feature: "Products", starter: "500", professional: "5,000", business: "Unlimited" },
  { feature: "Staff users", starter: "3", professional: "10", business: "Unlimited" },
  { feature: "Offline POS", starter: "—", professional: "✓", business: "✓" },
  { feature: "Purchasing", starter: "—", professional: "✓", business: "✓" },
  { feature: "Advanced reports", starter: "—", professional: "✓", business: "✓" },
  { feature: "Priority support", starter: "—", professional: "—", business: "✓" },
] as const;
