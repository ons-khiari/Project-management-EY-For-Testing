"use client";

import {
  LayoutGrid,
  Calendar,
  FolderKanban,
  FileText,
  CheckSquare,
  LogOut,
  Users,
  Building2,
  Menu,
  X,
  TimerIcon as Timeline,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

// const navItems = [
//   { icon: LayoutGrid, label: "Dashboard", href: "/dashboard" },
//   { icon: Calendar, label: "Schedule", href: "/schedule" },
//   { icon: Timeline, label: "Timeline", href: "/timeline" },
//   { icon: FolderKanban, label: "Projects", href: "/projects" },
//   { icon: FileText, label: "Deliverables", href: "/deliverables" },
//   { icon: CheckSquare, label: "Tasks", href: "/tasks" },
//   { icon: Users, label: "Users", href: "/users" },
//   { icon: Building2, label: "Clients", href: "/clients" },
// ];

export default function Sidebar() {
  const pathname = usePathname(); // Get current route
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  // Handle window resize to automatically collapse sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsExpanded(false);
      } else {
        setIsExpanded(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Check token and set role in the state
  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        const roleAA =
          decodedToken[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ];
        setRole(roleAA);
      } catch (err) {
        console.error("Failed to decode token", err);
      }
    }
  }, []);

  const handleLogout = () => {
    Cookies.remove("token");
    router.push("/");
  };

  const navItems = [
    { icon: LayoutGrid, label: "Dashboard", href: "/dashboard" },
    { icon: Calendar, label: "Schedule", href: "/schedule" },
    { icon: Timeline, label: "Timeline", href: "/timeline" },
    { icon: FolderKanban, label: "Projects", href: "/projects" },
    { icon: FileText, label: "Deliverables", href: "/deliverables" },
    { icon: CheckSquare, label: "Tasks", href: "/tasks" },
    ...(role === "Admin"
      ? [
          { icon: Users, label: "Users", href: "/users" },
          { icon: Building2, label: "Clients", href: "/clients" },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile sidebar toggle button - fixed to the left side of the screen */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-md bg-white shadow-md lg:hidden"
        aria-label={isMobileOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isMobileOpen ? (
          <X className="h-5 w-5 text-gray-600" />
        ) : (
          <Menu className="h-5 w-5 text-gray-600" />
        )}
      </button>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:translate-x-0 ${isExpanded ? "lg:w-48" : "lg:w-16"}`}
      >
        {/* Desktop sidebar toggle button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm lg:flex"
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <ChevronLeftIcon className="h-3 w-3" />
          ) : (
            <ChevronRightIcon className="h-3 w-3" />
          )}
        </button>

        <nav className="flex flex-1 flex-col py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`group flex items-center rounded-md px-3 py-2 ${
                      isActive
                        ? "border-l-4 border-[#ffe500] bg-gray-100 font-medium text-[#444444]"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    title={!isExpanded ? item.label : undefined}
                  >
                    <item.icon
                      className={`${isExpanded ? "mr-3" : "mx-auto"} h-5 w-5`}
                    />
                    {(isExpanded || isMobileOpen) && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout} // Call the logout function on button click
            className="flex w-full items-center rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100"
            title={!isExpanded ? "Logout" : undefined}
          >
            <LogOut className={`${isExpanded ? "mr-3" : "mx-auto"} h-5 w-5`} />
            {(isExpanded || isMobileOpen) && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// Custom chevron icons for the toggle button
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
