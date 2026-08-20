"use client";

import { useEffect, useState } from "react";

import {
  User,
  Menu,
  Folder,
  PanelLeftClose,
  MessageCircleIcon,
  User2Icon,
} from "lucide-react";

import { useRouter, usePathname } from "next/navigation";
import clsx from "clsx";
import { useMediaQuery } from "@/lib/use-media-query";
import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import ProfileDrawer from "../ProfileDrawer";

const navItems = [
  {
    name: "Projects",
    icon: Folder,
    path: "/projects",
  },
  {
    name: "Invites",
    icon: MessageCircleIcon,
    path: "/invites",
  },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 767px)");

  const NavItems = () => (
    <nav className="flex flex-col gap-1 p-2">
      {navItems.map(({ name, icon: Icon, path }) => {
        const isActive = pathname?.startsWith(path);

        const button = (
          <Button
            variant="ghost"
            onClick={() => {
              router.push(path);

              setSheetOpen(false);
            }}
            className={clsx(
              "h-11 w-full rounded-xl px-3 transition-all",
              "flex items-center gap-3",

              collapsed ? "justify-center" : "justify-start",

              isActive
                ? "bg-primary text-primary-foreground shadow-sm font-semibold hover:bg-primary/90"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon size={20} className="shrink-0" />

            {!collapsed && (
              <span className="truncate text-sm font-medium">{name}</span>
            )}
          </Button>
        );

        return (
          <div key={name}>
            {collapsed ? (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>

                <TooltipContent side="right">
                  <span>{name}</span>
                </TooltipContent>
              </Tooltip>
            ) : (
              button
            )}
          </div>
        );
      })}
    </nav>
  );

  const SidebarContent = (
    <>
      <div
        className={clsx(
          "flex h-14 items-center border-b border-border px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && (
          <div className="leading-tight">
            <h1 className="font-bold text-primary">Legacy</h1>

            <p className="text-xs text-muted-foreground">Codebase Analyzer</p>
          </div>
        )}

        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0 rounded-full"
          >
            {collapsed ? <Menu size={20} /> : <PanelLeftClose size={20} />}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <NavItems />
      </div>

      <SidebarUser user={user} collapsed={collapsed} />
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-4 top-4 z-50 rounded-full bg-background/90 backdrop-blur border shadow-sm md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="w-[85vw] max-w-xs p-0">
          <SheetHeader className="sr-only">Sidebar</SheetHeader>

          <div className="flex h-full flex-col bg-background">
            {SidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <TooltipProvider>
      <aside
        className={clsx(
          "sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-background transition-all duration-300",
          collapsed ? "w-18" : "w-72",
        )}
      >
        {SidebarContent}
      </aside>
    </TooltipProvider>
  );
}

function SidebarUser({ user, collapsed }: { user: any; collapsed: boolean }) {
  const [showProfilePanel, setShowProfilePanel] = useState(false);

  return (
    <div className="border-t border-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="w-full focus:outline-none">
          <div
            className={clsx(
              "flex items-center rounded-xl transition-all hover:bg-muted/60",

              collapsed ? "justify-center p-2" : "gap-3 p-2",
            )}
          >
            <Avatar className="h-9 w-9 shrink-0 border shadow-sm hover:bg-accent cursor-pointer">
              <AvatarImage src={user?.photoURL ?? undefined} />

              <AvatarFallback>
                <User2Icon size={18} />
              </AvatarFallback>
            </Avatar>

            {!collapsed && (
              <div className="min-w-0 overflow-hidden text-left">
                <span className="block truncate text-sm font-semibold hover:bg-accent">
                  {user?.name ?? "User"}
                </span>

                <span className="block truncate text-xs text-muted-foreground hover:bg-accent">
                  {user?.email ?? ""}
                </span>
              </div>
            )}
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" className="w-52">
          <DropdownMenuLabel className="text-muted-foreground">
            My Account
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setShowProfilePanel(true)}>
            <User className="mr-2 h-4 w-4" />

            <span>Profile</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showProfilePanel && (
        <ProfileDrawer user={user} onClose={() => setShowProfilePanel(false)} />
      )}
    </div>
  );
}
