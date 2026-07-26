import {
  ClipboardCheck,
  FileText,
  Images,
  Menu as MenuIcon,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  ListTree,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Tags,
  Truck,
  Users,
  UsersRound,
  Warehouse,
} from "lucide-react"

import { PERMISSIONS } from "@/lib/permissions"
import type { LucideIcon } from "lucide-react"

export type NavItem = {
  href: string
  labelKey: string
  icon: LucideIcon
  /** Nav items are filtered by permission key, never by role name. */
  permission: string | null
}

export type NavSection = {
  labelKey: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: "sectionOverview",
    items: [
      {
        href: "/dashboard",
        labelKey: "dashboard",
        icon: LayoutDashboard,
        permission: null,
      },
    ],
  },
  {
    labelKey: "sectionCatalog",
    items: [
      {
        href: "/products",
        labelKey: "products",
        icon: Package,
        permission: PERMISSIONS.catalogView,
      },
      {
        href: "/brands",
        labelKey: "brands",
        icon: Tags,
        permission: PERMISSIONS.catalogView,
      },
      {
        href: "/categories",
        labelKey: "categories",
        icon: ListTree,
        permission: PERMISSIONS.catalogView,
      },
      {
        href: "/options",
        labelKey: "options",
        icon: SlidersHorizontal,
        permission: PERMISSIONS.catalogView,
      },
    ],
  },
  {
    labelKey: "sectionInventory",
    items: [
      {
        href: "/stock",
        labelKey: "stock",
        icon: Warehouse,
        permission: PERMISSIONS.inventoryView,
      },
      {
        href: "/locations",
        labelKey: "locations",
        icon: Store,
        permission: PERMISSIONS.inventoryView,
      },
      {
        href: "/transfers",
        labelKey: "transfers",
        icon: Truck,
        permission: PERMISSIONS.stockTransfer,
      },
      {
        href: "/counts",
        labelKey: "counts",
        icon: ClipboardCheck,
        permission: PERMISSIONS.stockCount,
      },
    ],
  },
  {
    labelKey: "sectionPurchasing",
    items: [
      {
        href: "/suppliers",
        labelKey: "suppliers",
        icon: UsersRound,
        permission: PERMISSIONS.supplierManage,
      },
      {
        href: "/purchase-orders",
        labelKey: "purchaseOrders",
        icon: ClipboardList,
        permission: PERMISSIONS.purchaseOrderManage,
      },
    ],
  },
  {
    labelKey: "sectionSales",
    items: [
      {
        href: "/orders",
        labelKey: "orders",
        icon: ShoppingCart,
        permission: PERMISSIONS.orderView,
      },
      {
        href: "/customers",
        labelKey: "customers",
        icon: Users,
        permission: PERMISSIONS.customerView,
      },
    ],
  },
  {
    labelKey: "sectionContent",
    items: [
      {
        href: "/banners",
        labelKey: "banners",
        icon: Images,
        permission: PERMISSIONS.cmsView,
      },
      {
        href: "/menus",
        labelKey: "menus",
        icon: MenuIcon,
        permission: PERMISSIONS.cmsView,
      },
      {
        href: "/pages",
        labelKey: "pages",
        icon: FileText,
        permission: PERMISSIONS.cmsView,
      },
    ],
  },
  {
    labelKey: "sectionIdentity",
    items: [
      {
        href: "/users",
        labelKey: "users",
        icon: Users,
        permission: PERMISSIONS.userView,
      },
      {
        href: "/roles",
        labelKey: "roles",
        icon: ShieldCheck,
        permission: PERMISSIONS.roleView,
      },
    ],
  },
  {
    labelKey: "sectionSystem",
    items: [
      {
        href: "/settings",
        labelKey: "settings",
        icon: Settings,
        permission: PERMISSIONS.settingsView,
      },
      {
        href: "/audit",
        labelKey: "audit",
        icon: FileClock,
        permission: PERMISSIONS.auditView,
      },
    ],
  },
]
