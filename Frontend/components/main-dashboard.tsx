"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Loader2,
  Package,
  Plus,
  AlertCircle,
  ArrowUpRight,
  ListTodo,
  CheckSquare,
  Target,
  TrendingUp,
  Calendar,
  Users,
  Activity,
  BarChart3,
  RefreshCw,
  Eye,
  Zap,
} from "lucide-react";
import type { Project } from "@/app/types/project";
import type { Deliverable } from "@/app/types/deliverable";
import type { Task } from "@/app/types/task";
import { projectApi } from "@/services/project-api";
import { deliverablePhaseApi } from "@/services/deliverablePhase-api";
import { deliverableApi } from "@/services/deliverable-api";
import { taskApi } from "@/services/task-api";
import { clientApi } from "@/services/client-api";
import { api } from "@/services/api";
import type { User } from "@/app/types/user";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

// Enhanced helper functions
const getStatusChip = (status: string) => {
  const statusConfig = {
    "in-progress": {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: "In Progress",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
    done: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "Completed",
      className: "bg-green-100 text-green-800 border-green-200",
    },
    todo: {
      icon: <Clock className="h-3 w-3" />,
      label: "To Do",
      className: "bg-gray-100 text-gray-800 border-gray-200",
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.todo;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

const getPriorityBadge = (priority: string) => {
  const priorityConfig = {
    high: {
      icon: <AlertCircle className="h-3 w-3" />,
      label: "High",
      className: "bg-red-100 text-red-800 border-red-200",
    },
    medium: {
      icon: <Target className="h-3 w-3" />,
      label: "Medium",
      className: "bg-orange-100 text-orange-800 border-orange-200",
    },
    low: {
      icon: <Target className="h-3 w-3" />,
      label: "Low",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
  };

  const config =
    priorityConfig[priority?.toLowerCase() as keyof typeof priorityConfig] ||
    priorityConfig.low;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

const getInitials = (name: string, lastname: string) => {
  return `${name.charAt(0)}${lastname.charAt(0)}`.toUpperCase();
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const calculateDaysRemaining = (endDate: string) => {
  const today = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

interface TasksGroupedByPriority {
  High: Task[];
  Medium: Task[];
  Low: Task[];
}

const Dashboard = () => {
  const router = useRouter();
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [deliverableFilter, setDeliverableFilter] = useState("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [teamMembers, setTeamMembers] = useState<User[] | null>(null);
  const [taskStats, setTaskStats] = useState<
    Record<string, { completed: number; total: number }>
  >({});
  const [role, setRole] = useState<string | null>(null);
  const [phasesStats, setPhasesStats] = useState<
    Record<string, { total: number; completed: number }>
  >({});
  const [phases, setPhases] = useState<any[]>([]);
  const [highPriorityTasks, setHighPriorityTasks] = useState<any[]>([]);
  const [mediumPriorityTasks, setMediumPriorityTasks] = useState<any[]>([]);
  const [lowPriorityTasks, setLowPriorityTasks] = useState<any[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskSummary, setTaskSummary] = useState<Record<
    string,
    { allTasks: number; doneTasks: number }
  > | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  // Enhanced computed values
  const dashboardStats = useMemo(() => {
    const completedProjects = projects.filter(
      (project) => project.progress === 100
    ).length;
    const inProgressProjects = projects.filter(
      (project) => project.progress < 100 && project.progress > 0
    ).length;
    const todoProjects = projects.filter(
      (project) => project.progress === 0
    ).length;

    const todoTasks = tasks.filter((task) => task.status === "todo").length;
    const inProgressTasks = tasks.filter(
      (task) => task.status === "in-progress"
    ).length;
    const doneTasks = tasks.filter((task) => task.status === "done").length;

    const completedDeliverables = deliverables.filter(
      (d) => d.status === "done"
    ).length;
    const inProgressDeliverables = deliverables.filter(
      (d) => d.status === "in-progress"
    ).length;

    const overdueTasks = tasks.filter((task) => {
      const taskDate = new Date(task.date);
      const today = new Date();
      return taskDate < today && task.status !== "done";
    }).length;

    const upcomingDeadlines = deliverables.filter((d) => {
      const deliverableDate = new Date(d.date);
      const today = new Date();
      const daysUntilDeadline = Math.ceil(
        (deliverableDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return (
        daysUntilDeadline <= 7 && daysUntilDeadline >= 0 && d.status !== "done"
      );
    }).length;

    return {
      projects: {
        total: projects.length,
        completed: completedProjects,
        inProgress: inProgressProjects,
        todo: todoProjects,
        completionRate:
          projects.length > 0
            ? Math.round((completedProjects / projects.length) * 100)
            : 0,
      },
      tasks: {
        total: tasks.length,
        completed: doneTasks,
        inProgress: inProgressTasks,
        todo: todoTasks,
        overdue: overdueTasks,
        completionRate:
          tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0,
      },
      deliverables: {
        total: deliverables.length,
        completed: completedDeliverables,
        inProgress: inProgressDeliverables,
        upcomingDeadlines,
        completionRate:
          deliverables.length > 0
            ? Math.round((completedDeliverables / deliverables.length) * 100)
            : 0,
      },
      team: {
        total: teamMembers?.length || 0,
        activeMembers:
          teamMembers?.filter(
            (member) => (taskStats[member.id]?.total || 0) > 0
          ).length || 0,
      },
    };
  }, [projects, tasks, deliverables, teamMembers, taskStats]);

  // Simulate loading state
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Enhanced refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setApiErrors([]);
    try {
      // Clear existing data
      setProjects([]);
      setDeliverables([]);
      setTasks([]);
      setTeamMembers(null);
      setTaskStats({});

      // Trigger re-fetch by updating a dependency
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing data:", error);
      setApiErrors((prev) => [...prev, "Failed to refresh data"]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await api.getTeamMembers();
        if (response.success) {
          setTeamMembers(response.data as User[]);
        } else {
          console.warn("Failed to fetch team members:", response.message);
          setTeamMembers([]);
        }
      } catch (error) {
        console.warn("Error fetching team members:", error);
        setTeamMembers([]);
      }
    };

    fetchTeamMembers();
  }, []);

  // Fetch stats task for each team member with improved error handling
  useEffect(() => {
    const fetchTaskStats = async () => {
      if (!teamMembers?.length) return;

      const stats: Record<string, { completed: number; total: number }> = {};
      const errors: string[] = [];

      for (const member of teamMembers) {
        try {
          const response = await taskApi.getTaskSummaryForTeamMember(member.id);

          if (response.success && response.data) {
            stats[member.id] = {
              completed: (response.data as any)?.doneTasks || 0,
              total: (response.data as any)?.totalTasks || 0,
            };
          } else {
            // Set default values for failed requests
            stats[member.id] = { completed: 0, total: 0 };
            if (response.message && !response.message.includes("404")) {
              errors.push(
                `Failed to fetch stats for ${member.name}: ${response.message}`
              );
            }
          }
        } catch (error) {
          stats[member.id] = { completed: 0, total: 0 };
          console.warn(`Error fetching task stats for ${member.name}:`, error);
        }
      }

      setTaskStats(stats);
      if (errors.length > 0) {
        setApiErrors((prev) => [...prev, ...errors]);
      }
    };

    fetchTaskStats();
  }, [teamMembers]);

  // Fetch projects and set the first one as active
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const decoded: any = jwtDecode(token);
      const userId =
        decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      const role =
        decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

      setRole(role);

      const fetchProjectsAndClients = async () => {
        setIsLoading(true);
        try {
          let result;
          if (role === "Admin" || role === "ProjectManager") {
            result = await projectApi.getProjects();
          } else if (role === "TeamMember") {
            result = await projectApi.getProjectsByUserId(userId);
          } else {
            console.error("Unknown role:", role);
            return;
          }

          const projectList = Array.isArray(result)
            ? result
            : (result as any)?.data ?? [];

          if (projectList.length === 0) {
            setProjects([]);
            return;
          }

          setProjects(projectList);
          setActiveProject(projectList[0]);

          // Fetch all unique client names
          interface ProjectWithClient extends Project {
            clientId: string;
          }

          const projectListTyped = projectList as ProjectWithClient[];
          const uniqueClientIds: string[] = [
            ...new Set(projectListTyped.map((p) => p.clientId)),
          ];
          const clientMap: Record<string, string> = {};

          await Promise.all(
            uniqueClientIds.map(async (id) => {
              try {
                const clientRes = await clientApi.getClientById(id);
                if (clientRes.success && clientRes.data) {
                  clientMap[id] = clientRes.data.name;
                } else {
                  clientMap[id] = "Unknown Client";
                }
              } catch (error) {
                console.warn(`Error fetching client ${id}:`, error);
                clientMap[id] = "Unknown Client";
              }
            })
          );

          setClientNames(clientMap);
        } catch (error) {
          console.error("Error fetching projects or clients:", error);
          setApiErrors((prev) => [...prev, "Failed to fetch projects"]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProjectsAndClients();
    } catch (error) {
      console.error("Error decoding token:", error);
      setIsLoading(false);
    }
  }, []);

  // Fetch phases stats for active project
  useEffect(() => {
    const fetchPhasesStats = async () => {
      if (!activeProject) return;

      try {
        const response =
          await deliverablePhaseApi.getDeliverablePhaseStatsByProjectId(
            activeProject.id
          );

        const data = response?.data as { total: number; completed: number };
        if (data && typeof data.total === "number") {
          setPhasesStats((prev) => ({
            ...prev,
            [activeProject.id]: {
              total: data.total,
              completed: data.completed,
            },
          }));
        }
      } catch (error) {
        console.warn("Error fetching phases stats:", error);
      }
    };

    fetchPhasesStats();
  }, [activeProject]);

  // Fetch deliverable phases for active project
  useEffect(() => {
    const fetchPhases = async () => {
      if (!activeProject?.id) return;

      try {
        const response =
          await deliverablePhaseApi.getDeliverablePhasesByProjectId(
            activeProject.id
          );
        if (response.success && Array.isArray(response.data)) {
          setPhases(response.data);
        } else {
          setPhases([]);
        }
      } catch (error) {
        console.warn("Error loading phases", error);
        setPhases([]);
      }
    };

    fetchPhases();
  }, [activeProject]);

  // Fetch tasks priority stats with improved error handling
  useEffect(() => {
    async function fetchTasks() {
      const token = Cookies.get("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const decoded: any = jwtDecode(token);
        const userId =
          decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
        const userRole =
          decoded[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ];
        setRole(userRole);

        let response;

        if (userRole === "Admin") {
          response = await taskApi.getTasksByPriority();
        } else if (userRole === "ProjectManager") {
          response = await taskApi.getTasksByProjectManagerGroupedByPriority(
            userId
          );
        } else if (userRole === "TeamMember") {
          response = await taskApi.getTasksByPriorityForTeamMember(userId);
        } else {
          console.error("Unknown user role:", userRole);
          setIsLoading(false);
          return;
        }

        if (response.success && response.data) {
          const result = response.data as TasksGroupedByPriority;
          setHighPriorityTasks(result.High || []);
          setMediumPriorityTasks(result.Medium || []);
          setLowPriorityTasks(result.Low || []);
        } else {
          // Set empty arrays if API fails
          setHighPriorityTasks([]);
          setMediumPriorityTasks([]);
          setLowPriorityTasks([]);
          console.warn("Failed to fetch priority tasks:", response.message);
        }
      } catch (error) {
        console.warn("Error fetching tasks:", error);
        setHighPriorityTasks([]);
        setMediumPriorityTasks([]);
        setLowPriorityTasks([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTasks();
  }, []);

  // Fetch all deliverables of user logged in
  useEffect(() => {
    async function fetchDeliverables() {
      const token = Cookies.get("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const decoded: any = jwtDecode(token);
        const userId =
          decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
        const userRole =
          decoded[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ];
        setRole(userRole);

        let response;
        if (userRole === "Admin") {
          response = await deliverableApi.getDeliverables();
        } else if (userRole === "ProjectManager") {
          response = await deliverableApi.getDeliverablesManagedBy(userId);
        } else if (userRole === "TeamMember") {
          response = await deliverableApi.getDeliverablesByUserId(userId);
        } else {
          console.error("Unknown user role:", userRole);
          setIsLoading(false);
          return;
        }

        if (response.success && Array.isArray(response.data)) {
          const deliverablesData = response.data as Deliverable[];
          setDeliverables(deliverablesData);

          const uniqueProjectIds = [
            ...new Set(deliverablesData.map((d) => d.projectId)),
          ];

          const projectMap: Record<string, any> = {};
          await Promise.all(
            uniqueProjectIds.map(async (projectId) => {
              try {
                const projectResponse = await projectApi.getProjectById(
                  projectId
                );
                if (projectResponse.success && projectResponse.data) {
                  projectMap[projectId] = projectResponse.data;
                }
              } catch (error) {
                console.warn(`Error fetching project ${projectId}:`, error);
              }
            })
          );

          setProjects(Object.values(projectMap));
        } else {
          console.warn("Failed to fetch deliverables:", response.message);
          setDeliverables([]);
        }
      } catch (error) {
        console.warn("Error decoding token:", error);
        setDeliverables([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDeliverables();
  }, []);

  // Fetch all tasks of user logged in
  useEffect(() => {
    async function fetchTasks() {
      const token = Cookies.get("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const decoded: any = jwtDecode(token);
        const userId =
          decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
        const userRole =
          decoded[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ];
        setRole(userRole);

        let response;
        if (userRole === "Admin") {
          response = await taskApi.getTasks();
        } else if (userRole === "ProjectManager") {
          response = await taskApi.getTasksByProjectManager(userId);
        } else if (userRole === "TeamMember") {
          response = await taskApi.getTasksByAssignee(userId);
        } else {
          console.error("Unknown user role:", userRole);
          setIsLoading(false);
          return;
        }

        if (response.success && Array.isArray(response.data)) {
          const tasksData = response.data as Task[];
          setTasks(tasksData);
          setProjects((prev) =>
            prev.map((project) => ({
              ...project,
              tasks: tasksData.filter((task) => task.projectId === project.id),
            }))
          );
        } else {
          console.warn("Failed to fetch tasks:", response.message);
          setTasks([]);
        }
      } catch (error) {
        console.warn("Error decoding token:", error);
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTasks();
  }, []);

  const filteredDeliverables = deliverables.filter((deliverable) => {
    if (deliverableFilter === "all") return true;
    return deliverable.status === deliverableFilter;
  });

  const colorClassMap = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    orange: "bg-orange-500",
    purple: "bg-purple-500",
    yellow: "bg-yellow-500",
  };

  function getProgressColorClass(color: string | undefined) {
    if (!color) return "bg-gray-500";
    return colorClassMap[color as keyof typeof colorClassMap] || "bg-gray-500";
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-[#F5DC00]"></div>
          <p className="mt-4 text-lg font-medium text-gray-600">
            Loading dashboard...
          </p>
          <p className="text-sm text-gray-500">Fetching your latest data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* API Error Banner */}
      {/* {apiErrors.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Some data may be incomplete due to API issues. The dashboard
                will continue to work with available data.
              </p>
              <button
                onClick={() => setApiErrors([])}
                className="mt-2 text-sm text-yellow-800 underline hover:text-yellow-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )} */}

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back! Here's what's happening with your projects.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F5DC00] disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-2 text-sm font-medium ${
                    viewMode === "grid"
                      ? "bg-[#F5DC00] text-[#444444]"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-2 text-sm font-medium ${
                    viewMode === "list"
                      ? "bg-[#F5DC00] text-[#444444]"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <ListTodo className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Overview Stats */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute right-4 top-4 rounded-full bg-blue-100 p-3 text-blue-600 transition-colors group-hover:bg-blue-200">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  Total Projects
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardStats.projects.total}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-green-600">
                      {dashboardStats.projects.completed}
                    </span>
                    <span className="text-gray-500">completed</span>
                  </div>
                  <div className="text-gray-300">•</div>
                  <div className="flex items-center gap-1 text-sm">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span className="font-medium text-blue-600">
                      {dashboardStats.projects.inProgress}
                    </span>
                    <span className="text-gray-500">active</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">
                    {dashboardStats.projects.completionRate}%
                  </span>
                  <span className="text-sm text-gray-500">completion rate</span>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute right-4 top-4 rounded-full bg-purple-100 p-3 text-purple-600 transition-colors group-hover:bg-purple-200">
                <Layers className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  Active Phases
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {phases.filter((p) => p.status === "in-progress").length}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-green-600">
                      {phases.filter((p) => p.status === "done").length}
                    </span>
                    <span className="text-gray-500">completed</span>
                  </div>
                  <div className="text-gray-300">•</div>
                  <div className="flex items-center gap-1 text-sm">
                    <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                    <span className="font-medium text-gray-600">
                      {phases.filter((p) => p.status === "todo").length}
                    </span>
                    <span className="text-gray-500">upcoming</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute right-4 top-4 rounded-full bg-orange-100 p-3 text-orange-600 transition-colors group-hover:bg-orange-200">
                <Package className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  Deliverables
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardStats.deliverables.total}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-green-600">
                      {dashboardStats.deliverables.completed}
                    </span>
                    <span className="text-gray-500">completed</span>
                  </div>
                  {dashboardStats.deliverables.upcomingDeadlines > 0 && (
                    <>
                      <div className="text-gray-300">•</div>
                      <div className="flex items-center gap-1 text-sm">
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span className="font-medium text-red-600">
                          {dashboardStats.deliverables.upcomingDeadlines}
                        </span>
                        <span className="text-gray-500">due soon</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">
                    {dashboardStats.deliverables.completionRate}%
                  </span>
                  <span className="text-sm text-gray-500">completion rate</span>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute right-4 top-4 rounded-full bg-green-100 p-3 text-green-600 transition-colors group-hover:bg-green-200">
                <CheckSquare className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Tasks</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardStats.tasks.total}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-green-600">
                      {dashboardStats.tasks.completed}
                    </span>
                    <span className="text-gray-500">completed</span>
                  </div>
                  {dashboardStats.tasks.overdue > 0 && (
                    <>
                      <div className="text-gray-300">•</div>
                      <div className="flex items-center gap-1 text-sm">
                        <AlertCircle className="h-3 w-3 text-red-500" />
                        <span className="font-medium text-red-600">
                          {dashboardStats.tasks.overdue}
                        </span>
                        <span className="text-gray-500">overdue</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">
                    {dashboardStats.tasks.completionRate}%
                  </span>
                  <span className="text-sm text-gray-500">completion rate</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Projects and Tasks Column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Enhanced Project Selection */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Projects Overview
                      </h2>
                      <p className="text-sm text-gray-600">
                        Select a project to view detailed information
                      </p>
                    </div>
                    {role !== "TeamMember" && (
                      <button
                        onClick={() => router.push("/projects/add")}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#F5DC00] px-4 py-2 text-sm font-medium text-[#444444] shadow-sm transition-colors hover:bg-[#e6c500] focus:outline-none focus:ring-2 focus:ring-[#F5DC00] focus:ring-offset-2"
                      >
                        <Plus className="h-4 w-4" />
                        New Project
                      </button>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {projects.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-center">
                      <div>
                        <FileText className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          No projects found
                        </p>
                      </div>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project.id}
                        className={`group w-full px-6 py-4 text-left transition-all hover:bg-gray-50 ${
                          activeProject && activeProject.id === project.id
                            ? "bg-blue-50 border-l-4 border-blue-500"
                            : ""
                        }`}
                        onClick={() => setActiveProject(project)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                              <FileText className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 group-hover:text-blue-600">
                                {project.title}
                              </div>
                              <div className="text-sm text-gray-600">
                                {clientNames[project.clientId] || "Loading..."}
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                <Calendar className="h-3 w-3" />
                                {formatDate(project.startDate)} -{" "}
                                {formatDate(project.endDate)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {getStatusChip(
                              project.progress === 0
                                ? "todo"
                                : project.progress === 100
                                ? "done"
                                : "in-progress"
                            )}
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                {project.progress}%
                              </div>
                              <div className="text-xs text-gray-500">
                                Complete
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-2 rounded-full transition-all ${getProgressColorClass(
                              project.progressColor
                            )}`}
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
                  <div className="text-sm text-gray-600">
                    Showing {projects.length} projects
                  </div>
                  <button
                    onClick={() => router.push("/projects")}
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
                  >
                    View All Projects
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Enhanced Active Project Details */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {activeProject ? activeProject.title : "Select a Project"}
                    </h2>
                    {activeProject && (
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(activeProject.startDate)} -{" "}
                          {formatDate(activeProject.endDate)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {calculateDaysRemaining(activeProject.endDate)} days
                          remaining
                        </div>
                      </div>
                    )}
                  </div>
                  {activeProject && (
                    <Link href={`/projects/${activeProject.id}`} passHref>
                      <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F5DC00]">
                        <Eye className="h-4 w-4" />
                        View Project
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </Link>
                  )}
                </div>

                {activeProject ? (
                  <>
                    {/* Enhanced Project Progress */}
                    <div className="mb-8 rounded-lg bg-gray-50 p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                          Overall Progress
                        </h3>
                        <div className="text-2xl font-bold text-gray-900">
                          {activeProject.progress}%
                        </div>
                      </div>
                      <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-3 rounded-full transition-all ${getProgressColorClass(
                            activeProject.progressColor
                          )}`}
                          style={{ width: `${activeProject.progress}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">
                            Phases Completed
                          </span>
                          <span className="font-medium">
                            {(activeProject &&
                              phasesStats[activeProject.id]?.completed) ??
                              0}
                            /
                            {(activeProject &&
                              phasesStats[activeProject.id]?.total) ??
                              0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Days Remaining</span>
                          <span className="font-medium">
                            {calculateDaysRemaining(activeProject.endDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Project Phases */}
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                          Project Phases
                        </h3>
                        <div className="text-sm text-gray-600">
                          {phases.length} phases
                        </div>
                      </div>
                      <div className="space-y-4">
                        {phases.length === 0 ? (
                          <div className="flex h-32 items-center justify-center text-center">
                            <div>
                              <Layers className="mx-auto h-8 w-8 text-gray-400" />
                              <p className="mt-2 text-sm text-gray-600">
                                No phases found for this project
                              </p>
                            </div>
                          </div>
                        ) : (
                          phases.map((phase) => (
                            <div
                              key={phase.id}
                              className={`group rounded-lg border-l-4 p-4 transition-all hover:shadow-sm ${
                                phase.color === "blue"
                                  ? "border-blue-500 bg-blue-50 hover:bg-blue-100"
                                  : phase.color === "purple"
                                  ? "border-purple-500 bg-purple-50 hover:bg-purple-100"
                                  : phase.color === "orange"
                                  ? "border-orange-500 bg-orange-50 hover:bg-orange-100"
                                  : "border-green-500 bg-green-50 hover:bg-green-100"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {phase.title}
                                  </h4>
                                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(phase.startDate)} -{" "}
                                    {formatDate(phase.endDate)}
                                  </div>
                                </div>
                                {getStatusChip(phase.status)}
                              </div>
                              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white bg-opacity-50">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    phase.color === "blue"
                                      ? "bg-blue-500"
                                      : phase.color === "purple"
                                      ? "bg-purple-500"
                                      : phase.color === "orange"
                                      ? "bg-orange-500"
                                      : "bg-green-500"
                                  }`}
                                  style={{
                                    width: `${
                                      phase.deliverableCount > 0
                                        ? (phase.completedDeliverables /
                                            phase.deliverableCount) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <div className="mt-2 flex items-center justify-between text-sm">
                                <span className="text-gray-600">
                                  {phase.completedDeliverables || 0}/
                                  {phase.deliverableCount || 0} deliverables
                                  completed
                                </span>
                                <span className="font-medium">
                                  {phase.deliverableCount > 0
                                    ? Math.round(
                                        ((phase.completedDeliverables || 0) /
                                          phase.deliverableCount) *
                                          100
                                      )
                                    : 0}
                                  %
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-64 items-center justify-center text-center">
                    <div>
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        No Project Selected
                      </h3>
                      <p className="mt-2 text-sm text-gray-600">
                        Choose a project from the list above to view its details
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Team and Activity Column */}
            <div className="space-y-6">
              {/* Enhanced Team Members */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Team Members
                      </h2>
                      <p className="text-sm text-gray-600">
                        {dashboardStats.team.activeMembers} of{" "}
                        {dashboardStats.team.total} members active
                      </p>
                    </div>
                    <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {!teamMembers || teamMembers.length === 0 ? (
                      <div className="flex h-32 items-center justify-center text-center">
                        <div>
                          <Users className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            No team members found
                          </p>
                        </div>
                      </div>
                    ) : (
                      teamMembers.map((member) => {
                        const memberStats = taskStats[member.id] || {
                          completed: 0,
                          total: 0,
                        };
                        const completionRate =
                          memberStats.total > 0
                            ? Math.round(
                                (memberStats.completed / memberStats.total) *
                                  100
                              )
                            : 0;

                        return (
                          <div
                            key={member.id}
                            className="group flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-gray-50"
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white shadow-sm">
                              {getInitials(member.name, member.lastname)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {member.name} {member.lastname}
                              </div>
                              <div className="text-sm text-gray-600 truncate">
                                {member.email}
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                                  <div
                                    className="h-1.5 rounded-full bg-green-500 transition-all"
                                    style={{ width: `${completionRate}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {completionRate}%
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-gray-900">
                                {memberStats.completed}/{memberStats.total}
                              </div>
                              <div className="text-xs text-gray-500">Tasks</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
                  <div className="text-sm text-gray-600">
                    Team performance overview
                  </div>
                  {role !== "TeamMember" && (
                    <button
                      onClick={() => router.push("/users")}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
                    >
                      Manage Team
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Enhanced Priority Tasks */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Priority Tasks
                      </h2>
                      <p className="text-sm text-gray-600">
                        Tasks that need immediate attention
                      </p>
                    </div>
                    <div className="rounded-full bg-red-100 p-2 text-red-600">
                      <Zap className="h-5 w-5" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-red-500"></div>
                          <span className="text-sm font-medium text-gray-900">
                            High
                          </span>
                        </div>
                        <div className="mt-1 text-2xl font-bold text-red-600">
                          {highPriorityTasks.length}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                          <span className="text-sm font-medium text-gray-900">
                            Medium
                          </span>
                        </div>
                        <div className="mt-1 text-2xl font-bold text-orange-600">
                          {mediumPriorityTasks.length}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                          <span className="text-sm font-medium text-gray-900">
                            Low
                          </span>
                        </div>
                        <div className="mt-1 text-2xl font-bold text-blue-600">
                          {lowPriorityTasks.length}
                        </div>
                      </div>
                    </div>

                    {highPriorityTasks.length > 0 && (
                      <>
                        <div className="border-t border-gray-100 pt-4">
                          <h4 className="mb-3 text-sm font-medium text-gray-900">
                            High Priority Tasks
                          </h4>
                          <div className="space-y-3">
                            {highPriorityTasks.slice(0, 3).map((task) => (
                              <div
                                key={task.id}
                                className="rounded-lg border border-red-200 bg-red-50 p-3"
                              >
                                <div className="font-medium text-gray-900">
                                  {task.text}
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Calendar className="h-3 w-3" />
                                    Due: {formatDate(task.date)}
                                  </div>
                                  {getPriorityBadge("high")}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
                  <div className="text-sm text-gray-600">
                    Priority task overview
                  </div>
                  <button
                    onClick={() => router.push("/tasks")}
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
                  >
                    View All Tasks
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Enhanced Recent Activity */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Recent Activity
                      </h2>
                      <p className="text-sm text-gray-600">
                        Latest updates from your team
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#F5DC00] focus:outline-none focus:ring-2 focus:ring-[#F5DC00]"
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex h-32 items-center justify-center text-center">
                    <div>
                      <Activity className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Activity feed coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Deliverables Section */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Deliverables
                  </h2>
                  <p className="text-sm text-gray-600">
                    Track deliverables across all your projects
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1">
                    {["all", "todo", "in-progress", "done"].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setDeliverableFilter(filter)}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          deliverableFilter === filter
                            ? "bg-[#F5DC00] text-[#444444] shadow-sm"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {filter === "all"
                          ? "All"
                          : filter === "todo"
                          ? "Upcoming"
                          : filter === "in-progress"
                          ? "In Progress"
                          : "Completed"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredDeliverables.length === 0 ? (
                  <div className="col-span-full flex h-32 items-center justify-center text-center">
                    <div>
                      <Package className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        No deliverables found
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredDeliverables.map((deliverable) => {
                    const progressWidth =
                      taskSummary?.[deliverable.id]?.allTasks &&
                      taskSummary?.[deliverable.id]?.doneTasks
                        ? (taskSummary[deliverable.id].doneTasks /
                            taskSummary[deliverable.id].allTasks) *
                          100
                        : 0;

                    return (
                      <div
                        onClick={() =>
                          router.push(
                            `/projects/${deliverable.projectId}/phases/${deliverable.deliverablePhaseId}/deliverables/${deliverable.id}`
                          )
                        }
                        key={deliverable.id}
                        className="group cursor-pointer rounded-lg border border-gray-200 p-5 transition-all hover:border-gray-300 hover:shadow-md"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                              <Package className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-medium text-gray-600 truncate">
                              {projects.find(
                                (p) => p.id === deliverable.projectId
                              )?.title || "Unknown Project"}
                            </span>
                          </div>
                          {getStatusChip(deliverable.status || "todo")}
                        </div>
                        <h3 className="mb-3 font-semibold text-gray-900 group-hover:text-blue-600">
                          {deliverable.title}
                        </h3>
                        <div className="mb-4 flex items-center gap-2">
                          {getPriorityBadge(deliverable.priority)}
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800">
                            <Calendar className="h-3 w-3" />
                            {formatDate(deliverable.date)}
                          </span>
                        </div>
                        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${progressWidth}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {taskSummary?.[deliverable.id]?.doneTasks ?? 0}/
                            {taskSummary?.[deliverable.id]?.allTasks ?? 0} tasks
                          </span>
                          <div className="flex -space-x-2">
                            {deliverable.assignee.slice(0, 3).map((userId) => {
                              const user = teamMembers?.find(
                                (m: { id: string }) => m.id === userId
                              );
                              return (
                                <div
                                  key={userId}
                                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-medium text-white shadow-sm"
                                >
                                  {user
                                    ? getInitials(user.name, user.lastname)
                                    : "??"}
                                </div>
                              );
                            })}
                            {deliverable.assignee.length > 3 && (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600 shadow-sm">
                                +{deliverable.assignee.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
              <div className="text-sm text-gray-600">
                Showing {filteredDeliverables.length} deliverables
              </div>
              <button
                onClick={() => router.push("/deliverables")}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
              >
                View All Deliverables
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
