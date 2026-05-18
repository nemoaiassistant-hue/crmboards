"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sidebar } from "@/components/sidebar";
import { useTheme } from "@/components/theme-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";
import type { Workspace, Organization, UserProfile } from "@/types/database";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    // Get user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      // Get user profile
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      setUser(profile);

      // Get org membership
      const { data: membership } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", authUser.id)
        .not("accepted_at", "is", null)
        .single();

      if (membership) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", membership.org_id)
          .single();
        setOrg(orgData);
      }
    }

    // Fetch workspaces with boards from API
    try {
      const res = await fetch("/api/v1/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces ?? []);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Build breadcrumb from pathname with board name lookup
  const buildBreadcrumb = () => {
    const segments = pathname.split("/").filter(Boolean);

    // Build a flat map of board id -> name from workspaces
    const boardNames: Record<string, string> = {};
    workspaces.forEach((ws) => {
      ws.boards?.forEach((b) => {
        boardNames[b.id] = b.name;
      });
    });

    const labelMap: Record<string, string> = {
      dashboard: "Dashboard",
      boards: "Boards",
      login: "Login",
      register: "Register",
    };

    return segments.map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/");
      const label =
        boardNames[segment] ||
        labelMap[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1);
      return { label, href };
    });
  };

  const breadcrumb = buildBreadcrumb();

  const sidebarContent = (
    <Sidebar
      workspaces={workspaces}
      org={org}
      user={user}
      onWorkspaceCreated={fetchData}
      onBoardCreated={fetchData}
    />
  );

  return (
    <ThemeProvider>
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border transition-all duration-200 ${
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-[280px]"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header */}
        <header className="flex h-12 items-center gap-3 border-b border-border px-4 shrink-0">
          {/* Mobile sidebar toggle */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="lg:hidden" />
              }
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              {sidebarContent}
            </SheetContent>
          </Sheet>

          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumb.map((item, index) => (
              <span key={item.href} className="flex items-center gap-1">
                {index > 0 && <span className="text-muted-foreground/50">/</span>}
                <a
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </a>
              </span>
            ))}
          </nav>

          {/* Theme toggle */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
              >
                {theme === "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : theme === "light" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
    </ThemeProvider>
  );
}
