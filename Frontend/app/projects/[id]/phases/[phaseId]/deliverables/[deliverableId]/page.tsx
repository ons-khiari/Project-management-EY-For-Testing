"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Edit,
  Trash2,
  Target,
  CheckCircle2,
  Clock,
  Calendar,
  Link2,
  CheckCircle,
  Users,
  User,
  FileText,
  ListTodo,
  Plus,
  BarChart3,
  CheckSquare,
  ClipboardList,
} from "lucide-react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import type { Project } from "@/app/types/project";
import type { DeliverablePhase } from "@/app/types/deliverable-phase";
import type { Deliverable } from "@/app/types/deliverable";
import type { Task } from "@/app/types/task";
import withAuth from "@/HOC/withAuth";
import {
  getDeliverableById,
  deleteDeliverable,
} from "@/services/deliverable-api";
import { getProjectById } from "@/services/project-api";
import { getDeliverablePhaseById } from "@/services/deliverablePhase-api";
import type { User as Usertype } from "@/app/types/user";
import { api, getUserById } from "@/services/api";
import * as permissionApi from "@/services/permissions-api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";

const DeliverableDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const phaseId = params.phaseId as string;
  const deliverableId = params.deliverableId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [phase, setPhase] = useState<DeliverablePhase | null>(null);
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverableMembers, setDeliverableMembers] = useState<Usertype[]>([]);
  const [projectManager, setProjectManager] = useState<Usertype | null>(null);
  const [isDeliverableDeleteModalOpen, setIsDeliverableDeleteModalOpen] =
    useState(false);
  const [deliverableToDelete, setDeliverableToDelete] =
    useState<Deliverable | null>(null);
  const [assigneeMap, setAssigneeMap] = useState<Record<string, string>>({});
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isAllowedToEdit, setIsAllowedToEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskStatusCounts, setTaskStatusCounts] = useState({
    todo: 0,
    inProgress: 0,
    done: 0,
  });

  const getAssigneeName = (userId: string): string => {
    return assigneeMap[userId] || "Loading...";
  };

  const getMemberAvatarColor = (id: string) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-green-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
    ];
    const index = id.charCodeAt(id.length - 1) % colors.length;
    return colors[index];
  };

  const calculateTaskStatusCounts = (tasksList: Task[]) => {
    const counts = {
      todo: 0,
      inProgress: 0,
      done: 0,
    };

    tasksList.forEach((task) => {
      if (task.status === "done") {
        counts.done++;
      } else if (task.status === "in-progress") {
        counts.inProgress++;
      } else {
        counts.todo++;
      }
    });

    setTaskStatusCounts(counts);
  };

  const getTaskProgress = () => {
    if (!tasks.length) return 0;
    return Math.round((taskStatusCounts.done / tasks.length) * 100);
  };
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    const decoded: any = jwtDecode(token);
    const currentUserId =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
    const userRole =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    setRole(userRole);
    setUserId(currentUserId);

    const fetchMissingAssignees = async () => {
      const uniqueIds = [...new Set(tasks.map((t) => t.assignee))];
      const missingIds = uniqueIds.filter((id) => !(id in assigneeMap) && id);

      if (missingIds.length === 0) return;

      const newEntries: Record<string, string> = {};
      for (const id of missingIds) {
        try {
          const response = await api.getUserById(id);
          if (response.success && response.data) {
            const user = response.data as Usertype;
            newEntries[id] = `${user.name} ${user.lastname}`;
          } else {
            newEntries[id] = "Unknown User";
          }
        } catch {
          newEntries[id] = "Unknown User";
        }
      }

      if (Object.keys(newEntries).length > 0) {
        setAssigneeMap((prev) => ({ ...prev, ...newEntries }));
      }
    };

    if (tasks.length > 0) fetchMissingAssignees();
  }, [tasks]);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    const decoded: any = jwtDecode(token);
    const userId =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
    const role =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    setLoading(true);
    const fetchDeliverableDetails = async () => {
      try {
        const [deliverableRes, projectRes, phaseRes] = await Promise.all([
          getDeliverableById(deliverableId),
          getProjectById(projectId),
          getDeliverablePhaseById(phaseId),
        ]);

        if (deliverableRes?.data) {
          const deliverableData = deliverableRes.data as Deliverable;
          setDeliverable(deliverableData);

          if (deliverableData.tasks && deliverableData.tasks.length > 0) {
            setTasks(deliverableData.tasks);
          }

          if (deliverableData.assignee && deliverableData.assignee.length > 0) {
            const memberPromises = deliverableData.assignee.map((id: string) =>
              getUserById(id)
            );
            const memberResponses = await Promise.all(memberPromises);

            const validMembers = memberResponses
              .filter((res) => res.success && res.data)
              .map((res) => res.data as Usertype);

            setDeliverableMembers(validMembers);
          }
        }

        // Set Project and fetch Project Manager
        if (projectRes?.data) {
          const projectData = projectRes.data as Project;
          setProject(projectData);

          // Fetch user permissions for this project
          const permissions = await fetchCurrentUserPermissions(
            userId!,
            projectId
          );

          // Determine edit permissions based on role and permissions
          const isAdmin = role === "Admin";
          const isProjectManager =
            role === "ProjectManager" && projectData.projectManager === userId;
          const isTeamMemberWithEditAccess =
            role === "TeamMember" &&
            (permissions.includes("edit") ||
              permissions.includes("manage_deliverables") ||
              permissions.includes("admin") ||
              permissions.includes("full_access_limited"));

          setIsAllowedToEdit(
            isAdmin || isProjectManager || isTeamMemberWithEditAccess
          );

          if (projectData.projectManager) {
            const managerResponse = await getUserById(
              projectData.projectManager
            );
            if (managerResponse.success && managerResponse.data) {
              setProjectManager(managerResponse.data as Usertype);
            }
          }
        }

        // Set Phase
        if (phaseRes?.data) {
          setPhase(phaseRes.data as DeliverablePhase);
        }
      } catch (error) {
        console.error("Error loading deliverable details:", error);
        setError("Failed to load deliverable details");
      } finally {
        setLoading(false);
      }
    };

    if (deliverableId && projectId && phaseId) {
      fetchDeliverableDetails();
    }
  }, [deliverableId, projectId, phaseId]);

  useEffect(() => {
    if (tasks.length > 0) {
      calculateTaskStatusCounts(tasks);
    }
  }, [tasks]);

  const priorityConfig = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: AlertCircle,
          label: "High Priority",
        };
      case "med":
      case "medium":
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200",
          icon: Target,
          label: "Medium Priority",
        };
      case "low":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: Target,
          label: "Low Priority",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: Target,
          label: "Normal Priority",
        };
    }
  };

  const statusConfig = (status: string) => {
    switch (status) {
      case "done":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle2,
          label: "Complete",
        };
      case "in-progress":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: Loader2,
          label: "In Progress",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: Clock,
          label: "To Do",
        };
    }
  };

  const handleEdit = () => {
    router.push(
      `/projects/${projectId}/phases/${phaseId}/deliverables/${deliverableId}/edit`
    );
  };

  const handleDeleteDeliverable = async (id: string) => {
    try {
      const result = await deleteDeliverable(id);
      if (result.success) {
        setIsDeliverableDeleteModalOpen(false);
        setDeliverableToDelete(null);
        router.push(`/projects/${projectId}/phases/${phaseId}`);
      }
    } catch (error) {
      console.error("Error deleting deliverable:", error);
    }
  };

  // Permission check utility functions
  const hasPermission = (permission: string): boolean => {
    // Admin role has all permissions
    if (role === "Admin") return true;

    // Project Manager automatically has all permissions for their projects
    if (role === "ProjectManager" && project?.projectManager === userId)
      return true;

    // Check specific permissions for team members
    if (role === "TeamMember") {
      // Admin permission includes all other permissions
      if (userPermissions.includes("admin")) return true;

      // Full access limited includes most permissions except deletion
      if (
        userPermissions.includes("full_access_limited") &&
        permission !== "admin"
      )
        return true;

      // Check for the specific permission
      return userPermissions.includes(permission);
    }

    return false;
  };

  // Specific permission checks
  const canEditDeliverable = (): boolean => {
    return hasPermission("edit") || hasPermission("manage_deliverables");
  };

  const canDeleteDeliverable = (): boolean => {
    return hasPermission("admin");
  };

  const canManageTasks = (): boolean => {
    return hasPermission("manage_tasks");
  };

  // Function to fetch user's permissions
  const fetchCurrentUserPermissions = async (
    userId: string,
    projectId: string
  ) => {
    try {
      const response = await permissionApi.getPermissionsByProjectAndUser(
        projectId,
        userId
      );
      if (response.success && response.data) {
        const permissions =
          (response.data as { permissions?: string[] }).permissions || [];
        setUserPermissions(permissions);
        return permissions;
      }
      return [];
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      return [];
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col bg-white">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-2 text-gray-600">
                  Loading deliverable details...
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full flex-col bg-white">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
                <h2 className="mt-2 text-xl font-semibold text-gray-800">
                  Error
                </h2>
                <p className="mt-2 text-gray-600">{error}</p>
                <Link
                  href={`/projects/${projectId}/phases/${phaseId}`}
                  className="mt-4 inline-block rounded-md bg-[#ffe500] px-4 py-2 font-medium text-[#444444]"
                >
                  Back to Phase
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!project || !phase || !deliverable) {
    return (
      <div className="flex h-screen w-full flex-col bg-white">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-semibold">Deliverable not found</h2>
                <p className="mt-2 text-gray-600">
                  The deliverable you are looking for does not exist.
                </p>
                <Link
                  href={`/projects/${projectId}/phases/${phaseId}`}
                  className="mt-4 inline-block rounded-md bg-[#ffe500] px-4 py-2 font-medium text-[#444444]"
                >
                  Back to Phase
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const taskProgress = getTaskProgress();
  const priorityDetails = priorityConfig(deliverable.priority);
  const statusDetails = statusConfig(deliverable.status || "todo");
  const PriorityIcon = priorityDetails.icon;
  const StatusIcon = statusDetails.icon;

  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          {/* Header with Breadcrumbs */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-3 rounded-full p-1 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Link
                    href={`/projects/${projectId}`}
                    className="hover:text-gray-700 transition-colors"
                  >
                    {project.title}
                  </Link>
                  <span>/</span>
                  <Link
                    href={`/projects/${projectId}/phases/${phaseId}`}
                    className="hover:text-gray-700 transition-colors"
                  >
                    {phase.title}
                  </Link>
                  <span>/</span>
                  <span>Deliverable</span>
                </div>
                <div className="flex items-center">
                  <h1 className="text-2xl font-semibold text-[#444444] mr-3">
                    {deliverable.title}
                  </h1>
                  <div className="flex items-center gap-2">
                    <div
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${priorityDetails.color}`}
                    >
                      <PriorityIcon className="mr-1 h-3.5 w-3.5" />
                      {priorityDetails.label}
                    </div>
                    <div
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusDetails.color}`}
                    >
                      <StatusIcon className="mr-1 h-3.5 w-3.5" />
                      {statusDetails.label}
                    </div>
                    <div className="inline-flex items-center rounded-full bg-[#ffe500] px-2.5 py-1 text-xs font-medium text-[#444444]">
                      <FileText className="mr-1 h-3.5 w-3.5" />D
                      {deliverable.priorityNumber}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex items-center gap-2">
                {canEditDeliverable() && (
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                )}
                {canDeleteDeliverable() && (
                  <button
                    onClick={() => {
                      setIsDeliverableDeleteModalOpen(true);
                      setDeliverableToDelete(deliverable);
                    }}
                    className="flex items-center gap-1 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <ListTodo className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Tasks
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {tasks.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <CheckSquare className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {taskStatusCounts.done}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Due Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(deliverable.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Progress</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {taskProgress}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                Deliverable Progress
              </h3>
              <span className="text-sm text-gray-500">
                {taskProgress}% Complete
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${taskProgress}%` }}
              ></div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-gray-200"></span>
                <span>To Do: {taskStatusCounts.todo}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-blue-500"></span>
                <span>In Progress: {taskStatusCounts.inProgress}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-green-500"></span>
                <span>Complete: {taskStatusCounts.done}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-lg font-medium text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              Description
            </h3>
            <p className="text-gray-600 whitespace-pre-line">
              {deliverable.description || "No description provided."}
            </p>
          </div>

          {/* Tasks Section */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#444444] flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Tasks
              </h2>
              {canManageTasks() && (
                <button
                  onClick={() =>
                    router.push(
                      `/projects/${projectId}/phases/${phaseId}/deliverables/${deliverableId}/add`
                    )
                  }
                  className="flex items-center gap-1 rounded-md bg-[#ffe500] px-3 py-1.5 text-sm font-medium text-[#444444] hover:bg-[#f5dc00] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
                </button>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <div className="text-center">
                  <ClipboardList className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500 mb-2">No tasks yet</p>
                  {canManageTasks() && (
                    <button
                      onClick={() =>
                        router.push(
                          `/projects/${projectId}/phases/${phaseId}/deliverables/${deliverableId}/add`
                        )
                      }
                      className="flex items-center gap-1 rounded-md bg-[#ffe500] px-3 py-1.5 text-sm font-medium text-[#444444] hover:bg-[#f5dc00] mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Task</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const taskPriority = priorityConfig(task.priority);
                    const taskStatus = statusConfig(task.status);
                    const TaskPriorityIcon = taskPriority.icon;
                    const TaskStatusIcon = taskStatus.icon;

                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors hover:shadow-sm group"
                        onClick={() => {
                          router.push(`/tasks/${task.id}`);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              task.status === "done"
                                ? "bg-green-500 text-white"
                                : task.status === "in-progress"
                                ? "bg-blue-500 text-white"
                                : "border-2 border-gray-300 bg-white"
                            }`}
                          >
                            {task.status === "done" ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : task.status === "in-progress" ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <span className="text-xs font-medium text-gray-500">
                                TODO
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {task.text}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <div
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${taskPriority.color}`}
                              >
                                <TaskPriorityIcon className="mr-1 h-3 w-3" />
                                {taskPriority.label}
                              </div>
                              <div
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${taskStatus.color}`}
                              >
                                <TaskStatusIcon className="mr-1 h-3 w-3" />
                                {taskStatus.label}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="mr-1 h-3.5 w-3.5" />
                            <span>
                              {new Date(task.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          {task.assignee && (
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full ${getMemberAvatarColor(
                                  task.assignee
                                )} text-white text-xs font-medium`}
                              >
                                {getAssigneeName(task.assignee)
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <span className="text-xs text-gray-500">
                                {getAssigneeName(task.assignee)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Details and Assignees Grid */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Deliverable Details */}
            <div>
              <h3 className="mb-4 text-lg font-medium text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Deliverable Details
              </h3>
              <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Due Date:
                  </span>
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                    {new Date(deliverable.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Priority:
                  </span>
                  <div
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${priorityDetails.color}`}
                  >
                    <PriorityIcon className="mr-1 h-3.5 w-3.5" />
                    {priorityDetails.label}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Status:
                  </span>
                  <div
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusDetails.color}`}
                  >
                    <StatusIcon className="mr-1 h-3.5 w-3.5" />
                    {statusDetails.label}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Project:
                  </span>
                  <Link
                    href={`/projects/${projectId}`}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    {project.title}
                  </Link>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Phase:
                  </span>
                  <Link
                    href={`/projects/${projectId}/phases/${phaseId}`}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    {phase.title}
                  </Link>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Project Manager:
                  </span>
                  <div className="flex items-center">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        projectManager
                          ? getMemberAvatarColor(projectManager.id)
                          : "bg-gray-400"
                      } text-xs font-bold text-white mr-2`}
                    >
                      {projectManager
                        ? `${projectManager.name
                            .charAt(0)
                            .toUpperCase()}${projectManager.lastname
                            .charAt(0)
                            .toUpperCase()}`
                        : "?"}
                    </div>
                    <span className="text-sm text-gray-900">
                      {projectManager
                        ? `${getFullName(projectManager.name)} ${getFullName(
                            projectManager.lastname
                          )}`
                        : "Not assigned"}
                    </span>
                  </div>
                </div>

                {deliverable.link && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Document:
                    </span>
                    <a
                      href={deliverable.link}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Link2 className="mr-1 h-4 w-4" />
                      View Document
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Team Members */}
            <div>
              <h3 className="mb-4 text-lg font-medium text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Assigned Team Members
              </h3>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">
                    Team Members:
                  </span>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>{deliverableMembers.length} assignee(s)</span>
                  </div>
                </div>

                {deliverableMembers.length === 0 ? (
                  <div className="flex items-center justify-center h-32 border border-dashed border-gray-300 rounded-lg bg-white">
                    <div className="text-center">
                      <User className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">No team members assigned</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliverableMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full ${getMemberAvatarColor(
                              member.id
                            )} text-sm font-bold text-white shadow-sm`}
                          >
                            {member.name.charAt(0).toUpperCase()}
                            {member.lastname.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getFullName(member.name)}{" "}
                              {getFullName(member.lastname)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {member.email || "No email available"}
                            </div>
                          </div>
                        </div>
                        <div className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                          Assignee
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {isDeliverableDeleteModalOpen && deliverableToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 md:p-8 shadow-xl space-y-6 animate-fadeIn">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Delete Deliverable
                  </h2>
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete deliverable{" "}
                    <strong>"{deliverableToDelete.title}"</strong>?
                    <br />
                    This will also delete all associated tasks. This action
                    cannot be undone.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setIsDeliverableDeleteModalOpen(false);
                      setDeliverableToDelete(null);
                    }}
                    className="w-full py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await handleDeleteDeliverable(deliverableToDelete.id);
                    }}
                    className="w-full py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Helper function to get full name from initials
function getFullName(initials: string): string {
  switch (initials) {
    case "OK":
      return "Ons Khiari";
    case "JD":
      return "John Doe";
    case "AS":
      return "Anna Smith";
    case "MK":
      return "Mike Kim";
    case "RL":
      return "Rachel Lee";
    default:
      return initials;
  }
}

export default withAuth(DeliverableDetailPage);
