"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FolderKanban,
  ListTodo,
  Zap,
  Users,
  Plus,
  UserPlus,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Organization, Workspace, ActivityLog } from "@/types/database";

export default function DashboardPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [stats, setStats] = useState({
    totalBoards: 0,
    totalItems: 0,
    activeAutomations: 0,
    teamMembers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return;

    // Get org
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", authUser.id)
      .eq("accepted_at", "not.null")
      .single();

    if (membership) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", membership.org_id)
        .single();
      setOrg(orgData);

      // Fetch stats in parallel
      const orgId = membership.org_id;

      const [boardsRes, itemsRes, membersRes] = await Promise.all([
        supabase.from("boards").select("id", { count: "exact" }).eq("org_id", orgId),
        supabase
          .from("items")
          .select("id", { count: "exact" })
          .eq("org_id" as never, orgId),
        supabase
          .from("org_members")
          .select("id", { count: "exact" })
          .eq("org_id", orgId)
          .eq("accepted_at", "not.null"),
      ]);

      setStats({
        totalBoards: boardsRes.count ?? 0,
        totalItems: itemsRes.count ?? 0,
        activeAutomations: 0,
        teamMembers: membersRes.count ?? 0,
      });
    }

    // Fetch workspaces
    try {
      const res = await fetch("/api/v1/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces ?? []);
      }
    } catch {
      // silent
    }

    // Fetch recent activity
    if (membership) {
      const { data: activity } = await supabase
        .from("activity_log")
        .select("*")
        .eq("org_id", membership.org_id)
        .order("created_at", { ascending: false })
        .limit(10);
      setRecentActivity(activity ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const statCards = [
    {
      title: "Total Boards",
      value: stats.totalBoards,
      icon: FolderKanban,
      color: "text-blue-600",
    },
    {
      title: "Total Items",
      value: stats.totalItems,
      icon: ListTodo,
      color: "text-green-600",
    },
    {
      title: "Active Automations",
      value: stats.activeAutomations,
      icon: Zap,
      color: "text-amber-600",
    },
    {
      title: "Team Members",
      value: stats.teamMembers,
      icon: Users,
      color: "text-purple-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome to CRMboards
          {org?.name ? (
            <span className="text-muted-foreground font-normal">
              {" "}
              — {org.name}
            </span>
          ) : null}
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your boards, track progress, and automate workflows.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <CreateBoardDialog
          workspaces={workspaces}
          onCreated={fetchDashboardData}
        />
        <Button variant="outline" size="sm" disabled>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom row: Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest actions across your boards</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No activity yet. Start by creating a board!
              </p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate">{entry.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Jump to your boards</CardDescription>
          </CardHeader>
          <CardContent>
            {workspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No workspaces yet. Create one from the sidebar!
              </p>
            ) : (
              <ul className="space-y-2">
                {workspaces.map((ws) =>
                  ws.boards?.map((board) => (
                    <li key={board.id}>
                      <Link
                        href={`/boards/${board.id}`}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                        <span>{board.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {ws.name}
                        </span>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* Inline create-board dialog used on the dashboard */
function CreateBoardDialog({
  workspaces,
  onCreated,
}: {
  workspaces: Workspace[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !workspaceId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          workspace_id: workspaceId,
          board_type: "project",
        }),
      });
      if (res.ok) {
        setName("");
        setWorkspaceId("");
        onCreated();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger
        render={<Button size="sm" />}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Board
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Board</DialogTitle>
          <DialogDescription>
            Add a new board to organize your work.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Workspace</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
            >
              <option value="">Select workspace...</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Board Name</Label>
            <Input
              placeholder="e.g. Sales Pipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !workspaceId}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
