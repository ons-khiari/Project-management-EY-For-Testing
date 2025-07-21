"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Target,
  CheckCircle2,
  Loader2,
  AlertCircle,
  UserIcon,
  FileText,
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import type { Project } from "@/app/types/project";
import type { DeliverablePhase } from "@/app/types/deliverable-phase";
import type { Deliverable } from "@/app/types/deliverable";
import withAuth from "@/HOC/withAuth";
import { deliverablePhaseApi } from "@/services/deliverablePhase-api";
import { getProjectById } from "@/services/project-api";
import LoadingScreen from "@/components/loading-screen";
import { api } from "@/services/api";
import type { User } from "@/app/types/user";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { permissionApi } from "@/services/permissions-api";

const DeliverablePhaseDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const phaseId = params.phaseId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [phase, setPhase] = useState<DeliverablePhase | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectManager, setProjectManager] = useState<User | null>(null);
  const [deliverableMembersMap, setDeliverableMembersMap] = useState<
    Record<string, User[]>
  >({});
  const [isDeliverableDeleteModalOpen, setIsDeliverableDeleteModalOpen] =
    useState(false);
  const [deliverablePhaseToDelete, setDeliverablePhaseToDelete] =
    useState<DeliverablePhase | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isAllowedToEdit, setIsAllowedToEdit] = useState(false);

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
  const canEditPhase = (): boolean => {
    return hasPermission("edit") || hasPermission("manage_phases");
  };

  const canDeletePhase = (): boolean => {
    return hasPermission("admin");
  };

  const canManageDeliverables = (): boolean => {
    return hasPermission("manage_deliverables");
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

  const getStatusChip = (status: string) => {
    switch (status) {
      case "in-progress":
        return (
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            In Progress
          </div>
        );
      case "done":
        return (
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700">
            <Clock className="w-3.5 h-3.5" />
            To Do
          </div>
        );
    }
  };

  const getPriorityConfig = (priority: string) => {
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

  const getMemberInitials = (name: string, lastname: string) => {
    return `${name.charAt(0).toUpperCase()}${lastname.charAt(0).toUpperCase()}`;
  };

  const calculatePhaseDuration = () => {
    if (!phase) return "N/A";

    const startDate = new Date(phase.startDate);
    const endDate = new Date(phase.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return "Invalid dates";
    }

    const diffInTime = endDate.getTime() - startDate.getTime();
    const diffInDays = Math.ceil(diffInTime / (1000 * 60 * 60 * 24));

    if (diffInDays === 1) return "1 day";
    if (diffInDays < 7) return `${diffInDays} days`;
    if (diffInDays < 30) return `${Math.ceil(diffInDays / 7)} weeks`;
    return `${Math.ceil(diffInDays / 30)} months`;
  };

  const getPhaseProgress = () => {
    if (!deliverables.length) return 0;
    const completedDeliverables = deliverables.filter(
      (d) => d.status === "done"
    ).length;
    return Math.round((completedDeliverables / deliverables.length) * 100);
  };

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    const decoded: any = jwtDecode(token);
    const userId =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
    const userRole =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    setRole(userRole);
    setUserId(userId);

    const fetchData = async () => {
      try {
        const projectData = await getProjectById(projectId);
        if (projectData.success) {
          const fetchedProject = projectData.data as Project;
          setProject(fetchedProject); // Fetch user permissions for this project
          const permissions = await fetchCurrentUserPermissions(
            userId,
            projectId
          );

          // Determine edit permissions based on role and permissions
          const isAdmin = userRole === "Admin";
          const isProjectManager =
            userRole === "ProjectManager" &&
            fetchedProject.projectManager === userId;
          const isTeamMemberWithEditAccess =
            userRole === "TeamMember" &&
            (permissions.includes("edit") ||
              permissions.includes("manage_phases") ||
              permissions.includes("admin") ||
              permissions.includes("full_access_limited"));

          setIsAllowedToEdit(
            isAdmin || isProjectManager || isTeamMemberWithEditAccess
          );

          // Fetch project manager
          if (fetchedProject.projectManager) {
            const managerData = await api.getUserById(
              fetchedProject.projectManager
            );
            if (managerData.success) {
              setProjectManager(managerData.data as User);
            }
          }
        } else {
          setError(projectData.message || "Failed to fetch project");
          return;
        }

        const phaseData = await deliverablePhaseApi.getDeliverablePhaseById(
          phaseId
        );
        if (phaseData.success) {
          const phaseDetails = phaseData.data as DeliverablePhase;
          setPhase(phaseDetails);
          setDeliverables(phaseDetails.deliverables || []);

          if (phaseDetails.deliverables) {
            const deliverableAssigneesMap: Record<string, User[]> = {};

            for (const deliverable of phaseDetails.deliverables) {
              const assigneeIds = deliverable.assignee?.filter(Boolean) || [];
              const assignees = await Promise.all(
                assigneeIds.map((id) => api.getUserById(id))
              );
              deliverableAssigneesMap[deliverable.id] = assignees
                .filter((res) => res.success)
                .map((res) => res.data as User);
            }

            setDeliverableMembersMap(deliverableAssigneesMap);
          }
        } else {
          setError(phaseData.message || "Failed to fetch deliverable phase");
        }
      } catch (error) {
        setError("Error fetching project or deliverable phase");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, phaseId]);

  useEffect(() => {
    if (userId && projectId) {
      fetchCurrentUserPermissions(userId, projectId);
    }
  }, [userId, projectId]);

  const handleEdit = () => {
    router.push(`/projects/${projectId}/phases/${phaseId}/edit`);
  };

  const handleDeleteDeliverablePhase = async (id: string) => {
    try {
      const result = await deliverablePhaseApi.deleteDeliverablePhase(id);
      if (result.success) {
        setIsDeliverableDeleteModalOpen(false);
        setDeliverablePhaseToDelete(null);
        router.push(`/projects/${projectId}`);
      }
    } catch (error) {
      console.error("Error deleting deliverable phase:", error);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading phase details..." />;
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
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Error</h2>
                <p className="mt-2 text-gray-600">{error}</p>
                <Link
                  href={`/projects/${projectId}`}
                  className="mt-4 inline-block rounded-md bg-[#ffe500] px-4 py-2 font-medium text-[#444444] hover:bg-[#f5dc00]"
                >
                  Back to Project
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!project || !phase) {
    return (
      <div className="flex h-screen w-full flex-col bg-white">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-semibold">Phase not found</h2>
                <p className="mt-2 text-gray-600">
                  The deliverable phase you are looking for does not exist.
                </p>
                <Link
                  href={`/projects/${projectId}`}
                  className="mt-4 inline-block rounded-md bg-[#ffe500] px-4 py-2 font-medium text-[#444444]"
                >
                  Back to Project
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const phaseProgress = getPhaseProgress();

  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          {/* Header with Breadcrumb */}
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
                  <span>Phase Details</span>
                </div>
                <h1 className="text-2xl font-semibold text-[#444444]">
                  {phase.title}
                </h1>
              </div>
            </div>{" "}
            <div className="flex items-center gap-2">
              {canEditPhase() && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Phase</span>
                </button>
              )}
              {canDeletePhase() && (
                <button
                  onClick={() => {
                    setIsDeliverableDeleteModalOpen(true);
                    setDeliverablePhaseToDelete(phase);
                  }}
                  className="flex items-center gap-1 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Phase</span>
                </button>
              )}
            </div>
          </div>

          {/* Phase Overview Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Duration</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {calculatePhaseDuration()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Deliverables
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {deliverables.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Progress</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {phaseProgress}%
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
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <div className="mt-1">
                    {getStatusChip(phase.status || "todo")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                Phase Progress
              </h3>
              <span className="text-sm text-gray-500">
                {phaseProgress}% Complete
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${phaseProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Deliverables Section */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#444444] flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Deliverables
              </h2>{" "}
              {canManageDeliverables() && (
                <button
                  onClick={() =>
                    router.push(
                      `/projects/${projectId}/phases/${phaseId}/deliverables/add`
                    )
                  }
                  className="flex items-center gap-1 rounded-md bg-[#ffe500] px-3 py-1.5 text-sm font-medium text-[#444444] hover:bg-[#f5dc00] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Deliverable</span>
                </button>
              )}
            </div>

            {deliverables.length === 0 ? (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <div className="text-center">
                  <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500 mb-2">No deliverables yet</p>{" "}
                  {canManageDeliverables() && (
                    <button
                      onClick={() =>
                        router.push(
                          `/projects/${projectId}/phases/${phaseId}/deliverables/add`
                        )
                      }
                      className="flex items-center gap-1 rounded-md bg-[#ffe500] px-3 py-1.5 text-sm font-medium text-[#444444] hover:bg-[#f5dc00] mx-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Deliverable</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {deliverables.map((deliverable) => {
                  const priorityConfig = getPriorityConfig(
                    deliverable.priority
                  );
                  const PriorityIcon = priorityConfig.icon;
                  const assignees = deliverableMembersMap[deliverable.id] || [];

                  return (
                    <Link
                      key={deliverable.id}
                      href={`/projects/${projectId}/phases/${phaseId}/deliverables/${deliverable.id}`}
                      className="block group"
                    >
                      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-300 group-hover:scale-[1.02] relative">
                        {/* Deliverable Number Badge */}
                        <div className="absolute -top-3 -left-3 w-8 h-8 bg-[#ffe500] rounded-full flex items-center justify-center font-bold text-[#444444] border-2 border-white shadow-md">
                          D{deliverable.priorityNumber}
                        </div>

                        {/* Header */}
                        <div className="mb-3 flex items-start justify-between pl-6">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${priorityConfig.color}`}
                          >
                            <PriorityIcon className="h-3 w-3" />
                            {priorityConfig.label}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(deliverable.date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="mb-4">
                          <h3 className="mb-2 text-lg font-semibold text-gray-900 line-clamp-2">
                            {deliverable.title}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {deliverable.description}
                          </p>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {assignees.length > 0 ? (
                              <>
                                <div className="flex -space-x-2">
                                  {assignees.slice(0, 3).map((member) => (
                                    <div
                                      key={member.id}
                                      className={`flex h-7 w-7 items-center justify-center rounded-full ${getMemberAvatarColor(
                                        member.id
                                      )} text-xs font-medium text-white border-2 border-white`}
                                      title={`${member.name} ${member.lastname}`}
                                    >
                                      {getMemberInitials(
                                        member.name,
                                        member.lastname
                                      )}
                                    </div>
                                  ))}
                                  {assignees.length > 3 && (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-400 text-xs font-medium text-white border-2 border-white">
                                      +{assignees.length - 3}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {assignees.length} assignee
                                  {assignees.length !== 1 ? "s" : ""}
                                </span>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <UserIcon className="h-3 w-3" />
                                <span>Unassigned</span>
                              </div>
                            )}
                          </div>
                          {getStatusChip(deliverable.status || "todo")}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Phase Details */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold text-[#444444]">
              Phase Details
            </h2>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Phase Information */}
              <div>
                <h3 className="mb-4 text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Phase Information
                </h3>
                <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Phase Name:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {phase.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Start Date:
                    </span>
                    <span className="text-sm text-gray-900">
                      {new Date(phase.startDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      End Date:
                    </span>
                    <span className="text-sm text-gray-900">
                      {new Date(phase.endDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Project:
                    </span>
                    <Link
                      href={`/projects/${projectId}`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {project.title}
                    </Link>
                  </div>
                  {projectManager && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">
                        Project Manager:
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                          {getMemberInitials(
                            projectManager.name,
                            projectManager.lastname
                          )}
                        </div>
                        <span className="text-sm text-gray-900">
                          {getFullName(projectManager.name)}{" "}
                          {getFullName(projectManager.lastname)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline & Statistics */}
              <div>
                <h3 className="mb-4 text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  Timeline & Statistics
                </h3>
                <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Duration:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {calculatePhaseDuration()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Status:
                    </span>
                    {getStatusChip(phase.status || "todo")}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Total Deliverables:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {deliverables.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Completed:
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      {deliverables.filter((d) => d.status === "done").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      In Progress:
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                      {
                        deliverables.filter((d) => d.status === "in-progress")
                          .length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Pending:
                    </span>
                    <span className="text-sm font-semibold text-gray-600">
                      {
                        deliverables.filter(
                          (d) => !d.status || d.status === "todo"
                        ).length
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {isDeliverableDeleteModalOpen && deliverablePhaseToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 md:p-8 shadow-xl space-y-6 animate-fadeIn">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Delete Phase
                  </h2>
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete phase{" "}
                    <strong>"{deliverablePhaseToDelete.title}"</strong>?<br />
                    This will also delete all associated deliverables. This
                    action cannot be undone.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setIsDeliverableDeleteModalOpen(false);
                      setDeliverablePhaseToDelete(null);
                    }}
                    className="w-full py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await handleDeleteDeliverablePhase(
                        deliverablePhaseToDelete.id
                      );
                    }}
                    className="w-full py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
                  >
                    Delete Phase
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

export default withAuth(DeliverablePhaseDetailPage);
