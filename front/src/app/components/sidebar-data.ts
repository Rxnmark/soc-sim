import React from "react";
import { LayoutDashboard, AlertTriangle, Server, Network, BarChart3, Briefcase, FileText, Users } from "lucide-react";

export type Role = "CEO" | "CISO" | "PM";

export const USERS_DATA: Record<Role, { name: string; title: string; role: Role; initial: string; color: string; desc: string }> = {
  CEO: { 
    name: "Olena Vance", 
    title: "Chief Executive Officer", 
    role: "CEO",
    initial: "E", 
    color: "bg-indigo-500", 
    desc: "Strategic overview, full access to security & risk metrics."
  },
  CISO: { 
    name: "Dmitro Volhov", 
    title: "Chief Info. Security Officer", 
    role: "CISO",
    initial: "D", 
    color: "bg-purple-500", 
    desc: "Technical focus on threats, assets, and access control."
  },
  PM: { 
    name: "Chloe Dubois", 
    title: "Lead Risk Manager", 
    role: "PM",
    initial: "C", 
    color: "bg-emerald-500", 
    desc: "Compliance reporting, project analytics, and financial risks."
  }
};

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Navigation item definitions with translation keys (not translated values)
export const CYBER_NAV_ITEMS: Array<{ translationKey: string; href: string; icon: React.ComponentType<{ className?: string }> }> = [
  { translationKey: "sidebar.dashboard", href: "/cybersecurity", icon: LayoutDashboard },
  { translationKey: "sidebar.threats", href: "/cybersecurity/threats", icon: AlertTriangle },
  { translationKey: "sidebar.assets", href: "/cybersecurity/assets", icon: Server },
  { translationKey: "sidebar.access_control", href: "/cybersecurity/access", icon: Network },
  { translationKey: "sidebar.security_analytics", href: "/cybersecurity/analytics", icon: BarChart3 },
];

export const RISK_NAV_ITEMS: Array<{ translationKey: string; href: string; icon: React.ComponentType<{ className?: string }> }> = [
  { translationKey: "riskManagement.sidebarTitle", href: "/", icon: LayoutDashboard },
  { translationKey: "sidebar.projects", href: "/projects", icon: Briefcase },
  { translationKey: "sidebar.analytics", href: "/analytics", icon: BarChart3 },
  { translationKey: "sidebar.reports", href: "/reports", icon: FileText },
  { translationKey: "sidebar.team", href: "/team", icon: Users },
];
