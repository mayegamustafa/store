'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminStore } from '@/stores/admin.store';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import {
  LayoutDashboard, ShoppingBag, Users, Package, Truck, Tag, Image, Settings,
  ChevronDown, ChevronRight, LogOut, BarChart3, Store, Percent, UserCog, Bell,
  MapPin, PlusCircle, List, Film, Radio, Monitor, Boxes, ClipboardList,
  Clock, ShoppingCart, Inbox, Newspaper, Activity, Bookmark, Layers,
  Mail, MessageCircle, PanelLeftClose, PanelLeftOpen, X, Wallet, CreditCard, BadgeCheck,
  ArrowUpFromLine,
} from 'lucide-react';

type NavItem  = { href: string; label: string; icon: React.ElementType };
type NavGroup = { type: 'group'; key: string; label: string; icon: React.ElementType; items: NavItem[] };
type NavLink  = { type: 'link';  href: string; label: string; icon: React.ElementType };
type NavEntry = NavGroup | NavLink;

const NAV: NavEntry[] = [
  { type: 'link', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },

  {
    type: 'group', key: 'products', label: 'Products', icon: Package,
    items: [
      { href: '/products',     label: 'All Products', icon: List },
      { href: '/products/new', label: 'Add Product',  icon: PlusCircle },
    ],
  },
  {
    type: 'group', key: 'orders', label: 'Orders', icon: ShoppingBag,
    items: [
      { href: '/orders',                label: 'All Orders', icon: List },
      { href: '/orders?status=PENDING', label: 'Pending',    icon: Clock },
    ],
  },
  {
    type: 'group', key: 'categories', label: 'Categories', icon: Tag,
    items: [
      { href: '/categories', label: 'All Categories', icon: List },
    ],
  },
  {
    type: 'group', key: 'banners', label: 'Banners', icon: Image,
    items: [
      { href: '/banners', label: 'All Banners', icon: List },
    ],
  },
  {
    type: 'group', key: 'brands', label: 'Top Brands', icon: Bookmark,
    items: [
      { href: '/brands', label: 'All Brands', icon: List },
    ],
  },
  {
    type: 'group', key: 'home-blocks', label: 'Home Blocks', icon: Layers,
    items: [
      { href: '/home-blocks', label: 'Promo Blocks', icon: List },
    ],
  },
  {
    type: 'group', key: 'coupons', label: 'Coupons', icon: Percent,
    items: [
      { href: '/coupons', label: 'All Coupons', icon: List },
    ],
  },
  {
    type: 'group', key: 'sellers', label: 'Sellers / Shops', icon: Store,
    items: [
      { href: '/sellers',                label: 'All Sellers',    icon: List },
      { href: '/sellers?status=PENDING', label: 'Pending Review', icon: Clock },
    ],
  },
  {
    type: 'group', key: 'riders', label: 'Riders', icon: Truck,
    items: [
      { href: '/riders',                label: 'All Riders', icon: List },
      { href: '/riders?status=PENDING', label: 'Pending',    icon: Clock },
      { href: '/live-map',              label: 'Live Map',   icon: MapPin },
    ],
  },
  {
    type: 'group', key: 'buyers', label: 'Buyers', icon: Users,
    items: [
      { href: '/users', label: 'All Buyers', icon: List },
    ],
  },
  {
    type: 'group', key: 'staff', label: 'Staff & Roles', icon: UserCog,
    items: [
      { href: '/staff', label: 'Staff Members', icon: List },
    ],
  },
  {
    type: 'group', key: 'reels', label: 'Reels', icon: Film,
    items: [
      { href: '/reels',     label: 'All Reels', icon: List },
    ],
  },
  {
    type: 'group', key: 'streams', label: 'Live Streams', icon: Radio,
    items: [
      { href: '/live-streams',     label: 'All Streams', icon: List },
    ],
  },
  {
    type: 'group', key: 'pos', label: 'POS', icon: Monitor,
    items: [
      { href: '/pos',           label: 'Sell / Checkout',   icon: ShoppingCart },
      { href: '/pos/inventory', label: 'Inventory',         icon: Boxes },
      { href: '/pos/sessions',  label: 'Sessions & Shifts', icon: ClipboardList },
    ],
  },
  { type: 'link', href: '/subscriptions',  label: 'Subscriptions',    icon: BadgeCheck },
  { type: 'link', href: '/reports',       label: 'Reports',          icon: BarChart3 },
  { type: 'link', href: '/analytics',     label: 'Audit Trail',      icon: Activity },
  { type: 'link', href: '/wallet',            label: 'Wallets',          icon: Wallet },
  { type: 'link', href: '/payouts',           label: 'Payouts',          icon: ArrowUpFromLine },
  { type: 'link', href: '/payment-gateways', label: 'Payment Gateways', icon: CreditCard },
  { type: 'link', href: '/notifications',    label: 'Notifications',    icon: Bell },
  { type: 'link', href: '/emails',           label: 'Emails',           icon: Mail },
  { type: 'link', href: '/support',       label: 'Support Inbox',    icon: Inbox },
  { type: 'link', href: '/messages',      label: 'Messages',         icon: MessageCircle },
  { type: 'link', href: '/blog',          label: 'Blog',             icon: Newspaper },
  { type: 'link', href: '/newsletter',    label: 'Email Promotions', icon: Mail },
  { type: 'link', href: '/settings',      label: 'Settings',         icon: Settings },
];

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function SidebarContent({
  collapsed,
  onToggleCollapse,
  onMobileClose,
  isMobile = false,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const { admin, logout } = useAdminStore();

  const defaultOpen = (NAV.filter((e) => e.type === 'group') as NavGroup[])
    .filter((g) => g.items.some((i) => pathname.startsWith(i.href.split('?')[0])))
    .map((g) => g.key);

  const [openGroups, setOpenGroups] = useState<string[]>(defaultOpen);

  const toggle = (key: string) =>
    setOpenGroups((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const { data: settingsData } = useQuery({
    queryKey: ['admin-settings-logo'],
    queryFn: () =>
      adminApi.getSettings().then((r: any) => {
        const list: { key: string; value: string }[] = Array.isArray(r) ? r : (r?.data ?? []);
        return Object.fromEntries(list.map((s) => [s.key, s.value]));
      }).catch(() => ({})),
    staleTime: 5 * 60_000,
  });

  const logoUrl  = (settingsData as any)?.SITE_LOGO_URL || '/logo.png';
  const siteName = (settingsData as any)?.SITE_NAME     || 'TotalStore';
  const isCollapsed = collapsed && !isMobile;

  return (
    <div
      className={`flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 border-r border-slate-700/50 overflow-hidden transition-all duration-300 ease-in-out ${
        isMobile ? 'w-64' : isCollapsed ? 'w-[62px]' : 'w-[220px]'
      }`}
    >
      {/* ── Logo / Header ──────────────────────────────── */}
      <div className={`flex items-center border-b border-slate-700/50 flex-shrink-0 ${
        isCollapsed ? 'justify-center p-3 h-14' : 'gap-3 px-4 h-14'
      }`}>
        {isMobile && (
          <button onClick={onMobileClose} className="mr-1 p-1.5 rounded-lg hover:bg-slate-700 transition text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
        <Link href="/dashboard" className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? '' : 'flex-1'}`}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/40">
            <img src={logoUrl} alt={siteName} className="w-5 h-5 object-contain" onError={(e) => { (e.target as any).style.display = 'none'; }} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white truncate leading-none">{siteName}</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">Admin Panel</p>
            </div>
          )}
        </Link>
      </div>

      {/* ── Navigation ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-hide">
        {NAV.map((entry) => {
          if (entry.type === 'link') {
            const active =
              pathname === entry.href ||
              (entry.href !== '/dashboard' && pathname.startsWith(entry.href));
            return (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={isMobile ? onMobileClose : undefined}
                title={isCollapsed ? entry.label : undefined}
                className={`sidebar-link ${active ? 'active' : ''} ${isCollapsed ? 'justify-center !px-0' : ''}`}
              >
                <entry.icon className="w-[15px] h-[15px] flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{entry.label}</span>}
                {!isCollapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />}
              </Link>
            );
          }

          const group    = entry as NavGroup;
          const isOpen   = openGroups.includes(group.key);
          const hasActive = group.items.some((i) => pathname.startsWith(i.href.split('?')[0]));

          if (isCollapsed) {
            return (
              <Link
                key={group.key}
                href={group.items[0].href}
                title={group.label}
                className={`sidebar-link justify-center !px-0 ${hasActive ? 'active' : ''}`}
              >
                <group.icon className="w-[15px] h-[15px] flex-shrink-0" />
              </Link>
            );
          }

          return (
            <div key={group.key}>
              <button
                onClick={() => toggle(group.key)}
                className={`sidebar-link w-full ${hasActive ? 'active' : ''}`}
              >
                <group.icon className="w-[15px] h-[15px] flex-shrink-0" />
                <span className="flex-1 text-left truncate">{group.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="ml-3.5 pl-3 border-l border-slate-700/60 mt-0.5 mb-1 space-y-0.5">
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const base   = href.split('?')[0];
                    const active = pathname === base || pathname.startsWith(base + '/');
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={isMobile ? onMobileClose : undefined}
                        className={`sidebar-link !py-1.5 !text-[12px] ${active ? 'active' : ''}`}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{label}</span>
                        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="p-2 border-t border-slate-700/50 space-y-1 flex-shrink-0">
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`sidebar-link w-full text-slate-500 hover:text-slate-300 ${isCollapsed ? 'justify-center !px-0' : ''}`}
          >
            {isCollapsed ? <PanelLeftOpen className="w-[15px] h-[15px]" /> : (
              <><PanelLeftClose className="w-[15px] h-[15px]" /><span>Collapse</span></>
            )}
          </button>
        )}
        <div className={`flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-slate-700/50 transition-colors group ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-[11px] font-semibold">
              {admin?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'}
            </span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-300 truncate leading-none">{admin?.name || 'Admin'}</p>
              <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">{admin?.email}</p>
            </div>
          )}
          <button onClick={logout} title="Logout" className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          onMobileClose={onMobileClose}
          isMobile={false}
        />
      </div>

      {/* Mobile overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onMobileClose}
          aria-hidden
        />
        {/* Drawer */}
        <div
          className={`absolute inset-y-0 left-0 z-50 transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent
            collapsed={false}
            onToggleCollapse={onToggleCollapse}
            onMobileClose={onMobileClose}
            isMobile
          />
        </div>
      </div>
    </>
  );
}
