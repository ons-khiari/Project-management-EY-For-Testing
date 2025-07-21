"use client";

import {
  Bell,
  HelpCircle,
  Settings,
  LogOut,
  Moon,
  Sun,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import eylogo from "../public/images/EY-logo.png";
import Image from "next/image";
import { api } from "@/services/api";
import type { User as UserType } from "@/app/types/user";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { getNotifications } from "@/services/notification";
import { notificationApi } from "@/services/notification";

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt?: string;
  isRead?: boolean;
  type?: "info" | "success" | "warning" | "error";
  priority?: "low" | "medium" | "high";
}

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [bgColor, setBgColor] = useState<string>("#F5DC00");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isLoading, setIsLoading] = useState(false);

  // Custom dropdown states
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Refs for click outside handling
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadUserAndNotifications() {
      setIsLoading(true);
      try {
        // Fetch logged-in user
        const userResponse = await api.getUser();

        if (!userResponse.success) {
          if (userResponse.message === "Not Found") {
            Cookies.remove("token");
            router.push("/");
          }
        } else if (userResponse.success && userResponse.data) {
          const currentUser = userResponse.data as UserType;
          setUser(currentUser);

          // Fetch notifications for this user
          const notifResponse = await getNotifications();
          if (notifResponse.success) {
            setNotifications(notifResponse.data ?? []);
          } else {
            setNotifications([]);
            console.error(
              "Failed to fetch notifications:",
              notifResponse.message
            );
          }
        }
      } catch (error) {
        console.error("Error loading user and notifications:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserAndNotifications();

    // Handle clicks outside of dropdowns
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [router]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await notificationApi.markNotificationAsRead(
        Number(notificationId)
      );

      if (!response.success) {
        console.error("Failed to mark notification as read:", response.message);
        return;
      }

      // Update notifications state locally
      setNotifications((prevNotifications) =>
        prevNotifications.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.isRead);

      // Mark all unread notifications as read
      await Promise.all(
        unreadNotifications.map((notif) =>
          notificationApi.markNotificationAsRead(Number(notif.id))
        )
      );

      // Update local state
      setNotifications((prevNotifications) =>
        prevNotifications.map((notif) => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      // Remove from local state immediately for better UX
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notif) => notif.id !== notificationId)
      );

      // Call API to delete (assuming you have this endpoint)
      // await notificationApi.deleteNotification(Number(notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
      // Revert the local state change if API call fails
      // You might want to refetch notifications here
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-yellow-500";
      default:
        return "border-l-blue-500";
    }
  };

  const getInitials = (name: string, lastname: string) => {
    const firstNameInitial = name?.charAt(0).toUpperCase() || "";
    const lastNameInitial = lastname?.charAt(0).toUpperCase() || "";
    return firstNameInitial + lastNameInitial;
  };

  const handleLogout = () => {
    Cookies.remove("token");
    router.push("/");
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
    // Apply theme to document
    document.documentElement.classList.toggle("dark");
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Don't show the header on the login page
  if (pathname === "/") {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center">
        <Image
          src={eylogo || "/placeholder.svg"}
          alt="EY Logo"
          width={100}
          height={0}
          className="mr-4"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Action buttons - Collapsed into dropdown on mobile */}
        <div className="hidden items-center gap-1 sm:flex">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              aria-haspopup="true"
              aria-expanded={isNotificationsOpen}
              aria-label={`Notifications (${unreadCount} new)`}
              className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F5DC00] dark:text-gray-400 dark:hover:bg-gray-800"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Enhanced notifications dropdown */}
            {isNotificationsOpen && (
              <div
                role="menu"
                aria-label="Notifications list"
                className="absolute right-0 mt-2 w-96 max-w-sm rounded-lg border border-gray-200 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      Notifications
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900 dark:text-red-300">
                        {unreadCount} new
                      </span>
                    )}
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="rounded-md p-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900"
                        title="Mark all as read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications list */}
                <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
                  {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#F5DC00]"></div>
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`group relative ${
                          !notification.isRead
                            ? `${getPriorityColor(
                                notification.priority
                              )} border-l-4`
                            : ""
                        } border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 ${
                          !notification.isRead
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : ""
                        }`}
                        role="menuitem"
                        tabIndex={0}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 pt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p
                                  className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${
                                    !notification.isRead ? "font-semibold" : ""
                                  }`}
                                >
                                  {notification.title}
                                </p>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <Clock className="h-3 w-3" />
                                    {formatTimeAgo(notification.createdAt)}
                                  </span>
                                  {!notification.isRead && (
                                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                  )}
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.isRead && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAsRead(notification.id);
                                    }}
                                    className="rounded-md p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-800"
                                    title="Mark as read"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        No notifications yet
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        We'll notify you when something important happens
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="border-t border-gray-100 p-2 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        // Navigate to notifications page
                      }}
                      className="w-full rounded-md p-2 text-sm font-medium text-[#F5DC00] transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F5DC00] dark:hover:bg-gray-700"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Help */}
          <button
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F5DC00] dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Help"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          {/* Theme toggle */}
          <button
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F5DC00] dark:text-gray-400 dark:hover:bg-gray-800"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </button>

          {/* Settings */}
          <button
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F5DC00] dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile dropdown for action buttons */}
        <div className="relative sm:hidden" ref={mobileMenuRef}>
          <button
            className="relative rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Enhanced mobile menu dropdown */}
          {isMobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsNotificationsOpen(true);
                }}
              >
                <Bell className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900 dark:text-red-300">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">
                <HelpCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>Help</span>
              </button>
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
                onClick={toggleTheme}
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <Sun className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
                <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">
                <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>Settings</span>
              </button>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            className="flex items-center gap-2 focus:outline-none"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            {user && (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-[#444444] ring-2 ring-white transition-transform hover:scale-105"
                style={{ backgroundColor: bgColor }}
              >
                {getInitials(user.name, user.lastname)}
              </div>
            )}
          </button>

          {/* Enhanced user dropdown */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              {user && (
                <div className="border-b border-gray-100 p-4 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: bgColor }}
                    >
                      {getInitials(user.name, user.lastname)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.name} {user.lastname}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                      <span
                        className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                          Number(user.role) === 0
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : Number(user.role) === 1
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : Number(user.role) === 2
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {Number(user.role) === 0
                          ? "Admin"
                          : Number(user.role) === 1
                          ? "Project Manager"
                          : Number(user.role) === 2
                          ? "Team Member"
                          : "Unknown Role"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 py-1 dark:border-gray-700">
                <button
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
