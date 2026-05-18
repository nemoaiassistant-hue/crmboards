"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Plus,
  LogOut,
  Settings,
  User,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { Workspace, Organization, UserProfile } from "@/types/database";

interface SidebarProps {
  workspaces: Workspace[];
  org: Organization | null;
  user: UserProfile | null;
  onWorkspaceCreated?: () => void;
  onBoardCreated?: () => void;
}

export function Sidebar({
  workspaces,
  org,
  user,
  onWorkspaceCreated,
  onBoardCreated,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsedWorkspaces, setCollapsedWorkspaces] = useState<
    Record<string, boolean>
  >({});
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardWorkspaceId, setNewBoardWorkspaceId] = useState("");
  const [creating, setCreating] = useState(false);

  const toggleWorkspace = (id: string) => {
    setCollapsedWorkspaces((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });
      if (res.ok) {
        setNewWorkspaceName("");
        onWorkspaceCreated?.();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !newBoardWorkspaceId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBoardName.trim(),
          workspace_id: newBoardWorkspaceId,
          board_type: "project",
        }),
      });
      if (res.ok) {
        setNewBoardName("");
        setNewBoardWorkspaceId("");
        onBoardCreated?.();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
        <LayoutGrid className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold tracking-tight">CRMboards</span>
      </div>

      {/* Navigation tree */}
      <ScrollArea className="flex-1 px-2 py-3">
        <div className="space-y-1">
          {workspaces.map((ws) => {
            const isCollapsed = collapsedWorkspaces[ws.id];
            return (
              <div key={ws.id}>
                <button
                  onClick={() => toggleWorkspace(ws.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-sidebar-accent transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{ws.name}</span>
                </button>
                {!isCollapsed && ws.boards && ws.boards.length > 0 && (
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {ws.boards.map((board) => {
                      const href = `/boards/${board.id}`;
                      const isActive = pathname === href;
                      return (
                        <Link
                          key={board.id}
                          href={href}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <FolderKanban className="h-4 w-4 shrink-0" />
                          <span className="truncate">{board.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-2">
        <div className="flex gap-2">
          {/* Add Workspace Dialog */}
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-start text-xs"
                />
              }
            >
              <Plus className="mr-1 h-3 w-3" />
              Workspace
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Workspace</DialogTitle>
                <DialogDescription>
                  Create a new workspace to organize your boards.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="ws-name">Name</Label>
                <Input
                  id="ws-name"
                  placeholder="e.g. Marketing"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleCreateWorkspace()
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateWorkspace}
                  disabled={creating || !newWorkspaceName.trim()}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Board Dialog */}
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-start text-xs"
                />
              }
            >
              <Plus className="mr-1 h-3 w-3" />
              Board
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Board</DialogTitle>
                <DialogDescription>
                  Add a board inside a workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="board-ws">Workspace</Label>
                  <select
                    id="board-ws"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={newBoardWorkspaceId}
                    onChange={(e) => setNewBoardWorkspaceId(e.target.value)}
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
                  <Label htmlFor="board-name">Board Name</Label>
                  <Input
                    id="board-name"
                    placeholder="e.g. Sales Pipeline"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleCreateBoard()
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateBoard}
                  disabled={
                    creating ||
                    !newBoardName.trim() ||
                    !newBoardWorkspaceId
                  }
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* User section */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent transition-colors" />
            }
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.name ?? ""} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <p className="truncate font-medium text-sm">
                {user?.name ?? "User"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {org?.name ?? ""}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
