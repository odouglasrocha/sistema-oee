import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Cog,
  Factory,
  TrendingUp,
  ClipboardList,
  Users,
  Settings,
  Activity,
  AlertTriangle,
  Brain
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from '@/contexts/AuthContext';

const mainItems = [
  { title: "Dashboard", url: "/", icon: BarChart3, permission: "dashboard.view" },
  { title: "Máquinas", url: "/machines", icon: Factory, permission: "machines.view" },
  { title: "Produção", url: "/production", icon: Activity, permission: "production.view" },
  { title: "Análise Avançada", url: "/analytics", icon: Brain, permission: "analytics.view" },
];

const managementItems = [
  { title: "Relatórios", url: "/reports", icon: ClipboardList, permission: "reports.view" },
  { title: "Usuários", url: "/users", icon: Users, permission: "users.view" },
  { title: "Configurações", url: "/settings", icon: Settings, permission: "settings.view" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavClass = (isActive: boolean) =>
    isActive 
      ? "bg-primary/10 text-primary border-r-2 border-primary font-medium" 
      : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground";

  const hasPermission = (permission?: string) => {
    if (!permission || !user || !user.role) return true;
    return user.role.permissions.includes(permission);
  };

  return (
    <Sidebar
      className={`${isCollapsed ? "w-16" : "w-64"} border-r bg-card transition-all duration-300`}
      collapsible="icon"
    >
      <SidebarContent className="p-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={`${isCollapsed ? 'sr-only' : ''} text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4`}>
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.filter(item => hasPermission(item.permission)).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11">
                    <NavLink 
                      to={item.url} 
                      end 
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${getNavClass(isActive(item.url))}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management Section */}
        <SidebarGroup className="mt-8">
          <SidebarGroupLabel className={`${isCollapsed ? 'sr-only' : ''} text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4`}>
            Gerenciamento
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {managementItems.filter(item => hasPermission(item.permission)).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11">
                    <NavLink 
                      to={item.url} 
                      end 
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${getNavClass(isActive(item.url))}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Status Indicator at Bottom */}
        {!isCollapsed && (
          <div className="mt-auto pt-4">
            <div className="bg-gradient-to-br from-card to-muted/50 border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-foreground">Sistema Online</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Monitorando {3} máquinas
              </p>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}