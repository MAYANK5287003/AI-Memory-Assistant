import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Images , Brain, LayoutDashboard, PlusCircle, Search, UserCircle, FolderOpen, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/add-memory", icon: PlusCircle, label: "Add Memory" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/face-memory", icon: UserCircle, label: "Face Memory" },
  { to: "/face-gallery", icon: Images, label: "Face Gallery" },
  { to: "/file-manager", icon: FolderOpen, label: "File Manager" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={cn("flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0", collapsed ? "w-16" : "w-60")}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary glow-primary">
          <Brain className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && <span className="font-semibold text-foreground text-sm tracking-tight">AI Memory</span>}
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}
            className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150", collapsed && "justify-center px-0", isActive ? "bg-sidebar-accent text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground")}>
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center h-12 border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors">
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}