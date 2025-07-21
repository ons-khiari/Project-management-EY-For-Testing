"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Plus,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Edit,
  Trash2,
  X,
  Heart,
  Building,
  LucideUser,
  Shield,
  Eye,
  PenTool,
  Settings,
  Package,
  List,
  Key,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  Users,
  BarChart3,
  CalendarDays,
  Share2,
  AlertCircle,
  Info,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import PortfolioTimeline from "@/components/portfolio-timeline";
import type { Project } from "@/app/types/project";
import type { DeliverablePhase } from "@/app/types/deliverable-phase";
import withAuth from "@/HOC/withAuth";
import type { Client } from "@/app/types/client";
import type { Deliverable } from "@/app/types/deliverable";
import { projectApi } from "@/services/project-api";
import { clientApi } from "@/services/client-api";
import type { User } from "@/app/types/user";
import { api } from "@/services/api";
import { deliverableApi } from "@/services/deliverable-api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { permissionApi } from "@/services/permissions-api";
import { suggestPhase } from "@/services/project-api"; // Adjust path as needed
import { createDeliverablePhase } from "@/services/deliverablePhase-api"; // Adjust path as needed

interface TimelineProject extends Project {
  phases: DeliverablePhase[];
  status: "todo" | "in-progress" | "done";
  color?: string;
}

// Define available permissions
const AVAILABLE_PERMISSIONS = [
  {
    id: "view",
    label: "View Project",
    description: "Can view project details and timeline",
    icon: Eye,
  },
  {
    id: "edit",
    label: "Edit Content",
    description: "Can edit project details and deliverables",
    icon: PenTool,
  },
  {
    id: "manage_phases",
    label: "Manage Phases",
    description: "Can add, edit, and delete project phases",
    icon: Calendar,
  },
  {
    id: "manage_deliverables",
    label: "Manage Deliverables",
    description: "Can add, update and remove project deliverables",
    icon: Package,
  },
  {
    id: "manage_tasks",
    label: "Manage Tasks",
    description: "Can create, update, assign and remove project tasks",
    icon: List,
  },
  {
    id: "full_access_limited",
    label: "Full Access (No Deletion)",
    description: "Has full access to features except delete actions",
    icon: Key,
  },
  {
    id: "admin",
    label: "Admin Access",
    description: "Full administrative access to the project",
    icon: Settings,
  },
];

// Permission presets for quick assignment
const PERMISSION_PRESETS = [
  {
    id: "viewer",
    name: "Viewer",
    permissions: ["view"],
    description: "Can only view project details",
    icon: Eye,
  },
  {
    id: "editor",
    name: "Editor",
    permissions: ["view", "edit", "manage_deliverables"],
    description: "Can view and edit project content",
    icon: PenTool,
  },
  {
    id: "manager",
    name: "Manager",
    permissions: [
      "view",
      "edit",
      "manage_phases",
      "manage_deliverables",
      "manage_tasks",
      "manage_team",
    ],
    description: "Can manage all aspects except deletion",
    icon: Shield,
  },
  {
    id: "admin",
    name: "Administrator",
    permissions: [
      "view",
      "edit",
      "manage_phases",
      "manage_deliverables",
      "manage_tasks",
      "manage_team",
      "admin",
    ],
    description: "Full administrative access",
    icon: Settings,
  },
];

const ProjectDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [deliverablePhases, setDeliverablePhases] = useState<
    DeliverablePhase[]
  >([]);
  const [clientDetails, setClientDetails] = useState<Client | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [timelineData, setTimelineData] = useState<{
    projects: TimelineProject[];
    phases: DeliverablePhase[];
    deliverables: Record<string, Deliverable[]>;
  }>({
    projects: [],
    phases: [],
    deliverables: {},
  });
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [projectManager, setProjectManager] = useState<User | null>(null);
  const [members, setMembers] = useState<User[] | null>(null);
  const [isProjectDeleteModalOpen, setIsProjectDeleteModalOpen] =
    useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "phases" | "team" | "activity"
  >("overview");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [suggestedPhase, setSuggestedPhase] = useState<any>(null);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);

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
  const canEditProject = (): boolean => {
    return hasPermission("edit");
  };

  const canDeleteProject = (): boolean => {
    return hasPermission("admin");
  };

  const canManagePhases = (): boolean => {
    return hasPermission("manage_phases");
  };

  const canManageDeliverables = (): boolean => {
    return hasPermission("manage_deliverables");
  };

  const canManageTasks = (): boolean => {
    return hasPermission("manage_tasks");
  };

  const canManageTeam = (): boolean => {
    return hasPermission("manage_team") || hasPermission("admin");
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "in-progress":
        return (
          <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            In Progress
          </div>
        );
      case "done":
        return (
          <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-800">
            <Clock className="w-3.5 h-3.5" />
            To Do
          </div>
        );
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const response = await projectApi.deleteProject(id);
      if (response?.success) {
        setTimelineData((prevData) => ({
          ...prevData,
          projects: prevData.projects.filter((project) => project.id !== id),
        }));
        setIsProjectDeleteModalOpen(false);
        setProjectToDelete(null);
        router.push("/projects");
      } else {
        console.error(response?.message || "Error deleting project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const [isAllowedToEdit, setIsAllowedToEdit] = useState(false);

  // Fetch current user's permissions
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

  //useEffect to fetch project details
  useEffect(() => {
    setLoading(true);
    const token = Cookies.get("token");
    if (!token) return;

    const decoded: any = jwtDecode(token);
    const currentUserId =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
    const userRole =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    setRole(userRole);
    setUserId(currentUserId);

    const fetchProject = async () => {
      try {
        const projectRes = await projectApi.getProjectById(projectId);
        if (projectRes?.success !== false && projectRes.data) {
          const fetchedProject = projectRes.data as Project;
          setProject(fetchedProject);

          // Fetch user permissions for this project
          const permissions = await fetchCurrentUserPermissions(
            currentUserId,
            projectId
          );

          // Determine edit permissions based on role and permissions
          if (
            userRole === "Admin" ||
            (userRole === "ProjectManager" &&
              fetchedProject.projectManager === currentUserId) ||
            (userRole === "TeamMember" &&
              (permissions.includes("admin") ||
                permissions.includes("edit") ||
                permissions.includes("full_access_limited")))
          ) {
            setIsAllowedToEdit(true);
          } else {
            setIsAllowedToEdit(false);
          }
        } else {
          setError("Failed to fetch project details");
        }
      } catch (err) {
        setError("An error occurred while fetching project data");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchProject();
  }, [projectId]);

  //useEffect to fetch client, project manager and members
  useEffect(() => {
    const fetchClientAndManagerAndMembers = async () => {
      if (!project) return;

      // Fetch client
      if (project.clientId) {
        const clientResult = await clientApi.getClientById(project.clientId);
        if (clientResult?.success !== false && clientResult.data) {
          setClient(clientResult.data);
        } else {
          console.error("Could not fetch client.");
        }
      }

      // Fetch project manager
      if (project.projectManager) {
        const managerResult = await api.getUserById(project.projectManager);
        if (managerResult?.success !== false && managerResult.data) {
          setProjectManager(managerResult.data as User);
        } else {
          console.error("Could not fetch project manager.");
        }
      }

      // Fetch members
      if (project.members?.length > 0) {
        const membersData: User[] = [];

        for (const memberId of project.members) {
          const memberResult = await api.getUserById(memberId);
          if (memberResult?.success !== false && memberResult.data) {
            const member = memberResult.data as User;

            // Fetch real permissions for this user on this project
            const permissions = await fetchUserPermissions(
              member.id,
              projectId
            );

            const extendedMember = {
              ...member,
              permissions: permissions,
            };
            membersData.push(extendedMember);
          } else {
            console.error(`Could not fetch member with ID ${memberId}`);
          }
        }

        setMembers(membersData);
      }
    };

    fetchClientAndManagerAndMembers();
  }, [project, projectId]);

  // Remove the getSamplePermissions function and replace it with:
  const fetchUserPermissions = async (
    userId: string,
    projectId: string
  ): Promise<string[]> => {
    try {
      const response = await permissionApi.getPermissionsByProjectAndUser(
        projectId,
        userId
      );
      if (response.success && response.data) {
        return (response.data as { permissions?: string[] }).permissions || [];
      }
      return [];
    } catch (error) {
      console.error(`Error fetching permissions for user ${userId}:`, error);
      return [];
    }
  };

  const saveUserPermissions = async (userId: string, permissions: string[]) => {
    try {
      const response = await permissionApi.assignPermissions({
        projectId: projectId,
        userId: userId,
        permissions: permissions,
      });

      if (response.success) {
        return true;
      } else {
        console.error("Failed to save permissions:", response.message);
        return false;
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
      return false;
    }
  };

  useEffect(() => {
    const prepareTimelineData = async () => {
      if (!project) return;

      const phases = project.deliverablePhases || [];
      setDeliverablePhases(phases);

      // Timeline project
      const projectForTimeline: TimelineProject = {
        ...project,
        status:
          project.progress === 100
            ? "done"
            : project.progress > 0
            ? "in-progress"
            : "todo",
        color: project.progressColor || "blue",
        phases: phases,
      };

      // Deliverables: Fetch once and group by deliverablePhaseId
      const deliverablesMap: Record<string, Deliverable[]> = {};

      try {
        const res = await deliverableApi.getDeliverables();
        const allDeliverables = Array.isArray(res.data) ? res.data : [];

        // Group deliverables by phase ID
        for (const deliverable of allDeliverables) {
          const phaseId = deliverable.deliverablePhaseId;
          if (!phaseId) continue;

          if (!deliverablesMap[phaseId]) {
            deliverablesMap[phaseId] = [];
          }
          deliverablesMap[phaseId].push(deliverable);
        }
      } catch (err) {
        console.error("Error fetching deliverables", err);
      }

      const filteredDeliverablesMap: Record<string, Deliverable[]> = {};
      for (const phase of phases) {
        if (deliverablesMap[phase.id]) {
          filteredDeliverablesMap[phase.id] = deliverablesMap[phase.id];
        } else {
          filteredDeliverablesMap[phase.id] = [];
        }
      }

      setTimelineData({
        projects: [projectForTimeline],
        phases,
        deliverables: filteredDeliverablesMap,
      });
    };

    prepareTimelineData();
  }, [project]);

  const progressColors = {
    blue: "bg-blue-500",
    orange: "bg-orange-500",
    yellow: "bg-[#ffe500]",
    default: "bg-gray-500",
  };

  const phaseColors = {
    blue: "border-l-4 border-blue-500 bg-blue-50",
    orange: "border-l-4 border-orange-500 bg-orange-50",
    yellow: "border-l-4 border-yellow-500 bg-yellow-50",
    green: "border-l-4 border-green-500 bg-green-50",
    purple: "border-l-4 border-purple-500 bg-purple-50",
    default: "border-l-4 border-gray-500 bg-gray-50",
  };

  const clientTypeColors = {
    individual: "bg-purple-100 text-purple-800",
    company: "bg-blue-100 text-blue-800",
    government: "bg-green-100 text-green-800",
    "non-profit": "bg-orange-100 text-orange-800",
  };

  const handleEdit = () => {
    router.push(`/projects/${projectId}/edit`);
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((p) => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
    // Reset preset selection when manually changing permissions
    setSelectedPreset(null);
  };

  const applyPermissionPreset = (presetId: string) => {
    const preset = PERMISSION_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPermissions(preset.permissions);
      setSelectedPreset(presetId);
    }
  };

  const filteredPermissions = AVAILABLE_PERMISSIONS.filter(
    (permission) =>
      permission.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSuggestPhase = async () => {
    setIsLoadingSuggestion(true);
    try {
      const response = await suggestPhase(projectId);
      if (response?.success !== false && response.data) {
        // Debug log to see what we're getting
        console.log("AI suggestion received:", response.data);
        setSuggestedPhase(response.data);
        setShowSuggestionModal(true);
      } else {
        console.error("Failed to get AI suggestion:", response?.message);
        // You might want to show a toast notification here
      }
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      // You might want to show a toast notification here
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  const handleAcceptSuggestion = async () => {
    if (!suggestedPhase) return;

    try {
      const phaseData = {
        ...suggestedPhase,
        projectId: projectId,
      };

      const response = await createDeliverablePhase(phaseData);
      if (response?.success !== false && response.data) {
        // Refresh the phases list
        const newPhase = response.data as DeliverablePhase;
        const updatedPhases = [...deliverablePhases, newPhase];
        setDeliverablePhases(updatedPhases);

        // Update timeline data
        setTimelineData((prevData) => ({
          ...prevData,
          phases: updatedPhases,
          deliverables: {
            ...prevData.deliverables,
            [newPhase.id]: [],
          },
        }));

        setShowSuggestionModal(false);
        setSuggestedPhase(null);
        // You might want to show a success toast notification here
      } else {
        console.error("Failed to create phase:", response?.message);
        // You might want to show an error toast notification here
      }
    } catch (error) {
      console.error("Error creating phase:", error);
      // You might want to show an error toast notification here
    }
  };

  const handleDeclineSuggestion = () => {
    setShowSuggestionModal(false);
    setSuggestedPhase(null);
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
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-gray-400" />
                <p className="mt-4 text-gray-600">Loading project details...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-screen w-full flex-col bg-white">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="mt-4 text-xl font-semibold">
                  Project not found
                </h2>
                <p className="mt-2 text-gray-600">
                  {error || "The project you are looking for does not exist."}
                </p>
                <Link
                  href="/projects"
                  className="mt-4 inline-block rounded-md bg-[#ffe500] px-4 py-2 font-medium text-[#444444]"
                >
                  Back to Projects
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Use the progressColor if it exists, otherwise use the default
  const progressColor = project.progressColor
    ? progressColors[project.progressColor as keyof typeof progressColors] ||
      progressColors.default
    : progressColors.default;

  // Get project status label
  const getProjectStatusLabel = () => {
    if (project.progress === 100) return "Completed";
    if (project.progress > 0) return "In Progress";
    return "To Do";
  };

  // Get project status color class
  const getProjectStatusColorClass = () => {
    if (project.progress === 100) return "bg-green-100 text-green-800";
    if (project.progress > 0) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  // Get member initials
  const getMemberInitials = (name: string, lastname: string) => {
    return `${name.charAt(0).toUpperCase()}${lastname.charAt(0).toUpperCase()}`;
  };

  // Get random color for member avatar
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

  // Calculate days remaining
  const calculateDaysRemaining = () => {
    const today = new Date();
    const endDate = new Date(project.endDate);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate project duration
  const calculateProjectDuration = () => {
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = calculateDaysRemaining();
  const projectDuration = calculateProjectDuration();
  const completedPhases = deliverablePhases.filter(
    (phase) => phase.status === "done"
  ).length;

  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {/* Project Header */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
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
                        href="/projects"
                        className="hover:text-gray-700 transition-colors"
                      >
                        Projects
                      </Link>
                      <span>/</span>
                      <span className="text-gray-700">{project.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-semibold text-[#444444]">
                        {project.title}
                      </h1>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getProjectStatusColorClass()}`}
                      >
                        {getProjectStatusLabel()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Share button - visible to everyone with view access */}
                  <button className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </button>

                  {/* Edit button - only visible to users with edit permission */}
                  {canEditProject() && (
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  )}

                  {/* Delete button - only visible to users with admin permission */}
                  {canDeleteProject() && (
                    <button
                      onClick={() => {
                        setProjectToDelete(project);
                        setIsProjectDeleteModalOpen(true);
                      }}
                      className="flex items-center gap-1 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Project Navigation Tabs */}
              <div className="mt-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`pb-3 px-1 ${
                      activeTab === "overview"
                        ? "border-b-2 border-[#ffe500] text-[#444444] font-medium"
                        : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } transition-colors`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab("phases")}
                    className={`pb-3 px-1 ${
                      activeTab === "phases"
                        ? "border-b-2 border-[#ffe500] text-[#444444] font-medium"
                        : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } transition-colors`}
                  >
                    Phases
                  </button>
                  <button
                    onClick={() => setActiveTab("team")}
                    className={`pb-3 px-1 ${
                      activeTab === "team"
                        ? "border-b-2 border-[#ffe500] text-[#444444] font-medium"
                        : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } transition-colors`}
                  >
                    Team
                  </button>
                  <button
                    onClick={() => setActiveTab("activity")}
                    className={`pb-3 px-1 ${
                      activeTab === "activity"
                        ? "border-b-2 border-[#ffe500] text-[#444444] font-medium"
                        : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } transition-colors`}
                  >
                    Activity Log
                  </button>
                </nav>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Project Stats Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                        <CalendarDays className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Duration
                        </p>
                        <p className="text-xl font-semibold text-gray-900">
                          {projectDuration} days
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                        <BarChart3 className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Progress
                        </p>
                        <p className="text-xl font-semibold text-gray-900">
                          {project.progress}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                        <Package className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Phases
                        </p>
                        <p className="text-xl font-semibold text-gray-900">
                          {completedPhases}/{deliverablePhases.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Remaining
                        </p>
                        <p className="text-xl font-semibold text-gray-900">
                          {daysRemaining > 0
                            ? `${daysRemaining} days`
                            : "Overdue"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Component */}
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-gray-800">
                    Project Timeline
                  </h2>
                  <PortfolioTimeline
                    projects={timelineData.projects}
                    phases={timelineData.phases}
                    deliverables={timelineData.deliverables}
                    startDate={project.startDate}
                    endDate={project.endDate}
                    selectedProjectId={projectId}
                    autoExpandProject={true}
                  />
                </div>

                {/* Project Description */}
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-gray-800">
                    Project Description
                  </h2>
                  <p className="text-gray-600 whitespace-pre-line">
                    {project.description}
                  </p>
                </div>

                {/* Project Information Section - Redesigned */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Project Details */}
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      Project Details
                    </h3>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">
                            Start Date:
                          </span>
                          <span className="text-sm text-gray-800">
                            {new Date(project.startDate).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">
                            End Date:
                          </span>
                          <span className="text-sm text-gray-800">
                            {new Date(project.endDate).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">
                            Status:
                          </span>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getProjectStatusColorClass()}`}
                          >
                            {getProjectStatusLabel()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">
                            Project Manager:
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                              {projectManager?.name?.charAt(0).toUpperCase() ||
                                "A"}
                              {projectManager?.lastname
                                ?.charAt(0)
                                .toUpperCase() || "A"}
                            </div>
                            <span className="text-sm text-gray-800">
                              {getFullName(projectManager?.name || "")}{" "}
                              {getFullName(projectManager?.lastname || "")}
                            </span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                          <div className="mb-2 text-sm font-medium text-gray-600">
                            Progress:
                          </div>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-gray-500">
                              {project.progress}% completed
                            </span>
                            <span className="text-gray-500">
                              {completedPhases}/{deliverablePhases.length}{" "}
                              phases
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full ${progressColor}`}
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Client Information */}
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-green-600" />
                      Client Information
                    </h3>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                          {client?.logo ? (
                            <Image
                              src={client.logo || "/placeholder.svg"}
                              alt={client.name || "Client Logo"}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <>
                              {client?.type === "Company" && (
                                <Building2 className="h-6 w-6 text-gray-500" />
                              )}
                              {client?.type === "Government" && (
                                <Building className="h-6 w-6 text-gray-500" />
                              )}
                              {client?.type === "Individual" && (
                                <LucideUser className="h-6 w-6 text-gray-500" />
                              )}
                              {client?.type === "NonProfit" && (
                                <Heart className="h-6 w-6 text-gray-500" />
                              )}
                            </>
                          )}
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            {client?.name}
                          </h4>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              clientTypeColors[
                                client?.type?.toLowerCase() as keyof typeof clientTypeColors
                              ] || "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {client?.type || "Unknown"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 border-t border-gray-100 pt-4">
                        {client?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-gray-400" />
                            <a
                              href={`mailto:${client.email}`}
                              className="text-blue-600 hover:underline"
                            >
                              {client.email}
                            </a>
                          </div>
                        )}

                        {client?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-5 w-5 text-gray-400" />
                            <span>{client.phone}</span>
                          </div>
                        )}

                        {client?.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-gray-400" />
                            <a
                              href={
                                client.website.startsWith("http")
                                  ? client.website
                                  : `https://${client.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {client.website}
                            </a>
                          </div>
                        )}

                        {client?.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-5 w-5 text-gray-400" />
                            <span>{client.address}</span>
                          </div>
                        )}

                        {client?.contactPerson && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="mb-2">
                              <span className="font-medium text-gray-700">
                                Contact:{" "}
                              </span>
                              <span>{client.contactPerson}</span>
                            </div>
                            {client.contactEmail && (
                              <div className="flex items-center gap-2 ml-0.5 text-sm">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <a
                                  href={`mailto:${client.contactEmail}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {client.contactEmail}
                                </a>
                              </div>
                            )}
                            {client.contactPhone && (
                              <div className="flex items-center gap-2 ml-0.5 text-sm mt-1">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span>{client.contactPhone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      Recent Activity
                    </h3>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Project created
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(project.startDate).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </p>
                          </div>
                        </div>

                        {deliverablePhases.slice(0, 3).map((phase, index) => (
                          <div key={phase.id} className="flex gap-3">
                            <div className="flex-shrink-0">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                                <Calendar className="h-4 w-4 text-green-600" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Phase added: {phase.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(phase.startDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </p>
                            </div>
                          </div>
                        ))}

                        {members && members.length > 0 && (
                          <div className="flex gap-3">
                            <div className="flex-shrink-0">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                                <Users className="h-4 w-4 text-purple-600" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {members.length} team members assigned
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(project.startDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="pt-2 text-center">
                          <button className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                            View all activity
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Phases Tab */}
            {activeTab === "phases" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[#444444]">
                    Deliverable Phases
                  </h2>
                  {/* Add Phase buttons - only visible to users with manage_phases permission */}
                  {canManagePhases() && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSuggestPhase}
                        disabled={isLoadingSuggestion}
                        className="flex items-center gap-1 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoadingSuggestion ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <BarChart3 className="h-4 w-4" />
                        )}
                        <span>
                          {isLoadingSuggestion
                            ? "Suggesting..."
                            : "Suggest Phase using AI"}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          router.push(`/projects/${project.id}/phases/add`);
                        }}
                        className="flex items-center gap-1 rounded-md bg-[#ffe500] px-3 py-1.5 text-sm font-medium text-[#444444] hover:bg-[#f5dc00] transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Phase</span>
                      </button>
                    </div>
                  )}
                </div>

                {deliverablePhases.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                    <div className="text-center">
                      <Calendar className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                      <p className="text-gray-500 mb-3">
                        No deliverable phases yet
                      </p>
                      {canManagePhases() && (
                        <button
                          onClick={() => {
                            router.push(`/projects/${project.id}/phases/add`);
                          }}
                          className="flex items-center gap-1 rounded-md bg-[#ffe500] px-3 py-1.5 text-sm font-medium text-[#444444] hover:bg-[#f5dc00] mx-auto"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Phase</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {deliverablePhases.map((phase) => (
                      <Link
                        key={phase.id}
                        href={`/projects/${projectId}/phases/${phase.id}`}
                        className="block group"
                      >
                        <div
                          className={`rounded-md border p-4 shadow-sm transition-all hover:shadow-md group-hover:border-gray-300 ${
                            phase.color
                              ? phaseColors[
                                  phase.color as keyof typeof phaseColors
                                ] || phaseColors.default
                              : phaseColors.default
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-800 group-hover:text-[#444444] transition-colors">
                              {phase.title}
                            </h3>
                            <div className="rounded-full px-2 py-0.5 text-xs font-medium">
                              {getStatusChip(phase.status || "todo")}
                            </div>
                          </div>

                          <div className="mb-3 text-sm text-gray-600">
                            <div className="flex items-center text-gray-600 mb-2">
                              <Calendar className="mr-1 h-4 w-4" />
                              <span>
                                {new Date(phase.startDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )}{" "}
                                -{" "}
                                {new Date(phase.endDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>
                                {timelineData.deliverables[phase.id]?.length ||
                                  0}{" "}
                                {timelineData.deliverables[phase.id]?.length ===
                                1
                                  ? "deliverable"
                                  : "deliverables"}
                              </span>
                              <span>
                                {Math.round(
                                  ((timelineData.deliverables[phase.id]?.filter(
                                    (d) => d.status === "done"
                                  ).length || 0) /
                                    (timelineData.deliverables[phase.id]
                                      ?.length || 1)) *
                                    100
                                )}
                                % complete
                              </span>
                            </div>

                            <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
                              <div
                                className={`h-1.5 rounded-full ${
                                  phase.color === "blue"
                                    ? "bg-blue-500"
                                    : phase.color === "orange"
                                    ? "bg-orange-500"
                                    : phase.color === "yellow"
                                    ? "bg-yellow-500"
                                    : phase.color === "green"
                                    ? "bg-green-500"
                                    : phase.color === "purple"
                                    ? "bg-purple-500"
                                    : "bg-gray-500"
                                }`}
                                style={{
                                  width: `${Math.round(
                                    ((timelineData.deliverables[
                                      phase.id
                                    ]?.filter((d) => d.status === "done")
                                      .length || 0) /
                                      (timelineData.deliverables[phase.id]
                                        ?.length || 1)) *
                                      100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end">
                            <button className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                              View details →
                            </button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Team Tab */}
            {activeTab === "team" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[#444444]">
                    Project manager
                  </h2>
                </div>

                {/* Project Manager Card */}
                {projectManager && (
                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white shadow-sm`}
                        >
                          {getMemberInitials(
                            projectManager.name,
                            projectManager.lastname
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {getFullName(projectManager.name)}{" "}
                              {getFullName(projectManager.lastname)}
                            </h3>
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                              Project Manager
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {projectManager.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`mailto:${projectManager.email}`}
                          className="rounded-md border border-gray-300 bg-white p-2 text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                        <button className="rounded-md border border-gray-300 bg-white p-2 text-gray-500 hover:bg-gray-50 transition-colors">
                          <Phone className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Members List */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-200 p-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Team Members
                    </h3>
                  </div>

                  {members && members.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {members.map((member) => (
                        <div key={member.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-full ${getMemberAvatarColor(
                                  member.id
                                )} text-sm font-bold text-white`}
                              >
                                {getMemberInitials(
                                  member.name,
                                  member.lastname
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {getFullName(member.name)}{" "}
                                  {getFullName(member.lastname)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.permissions?.includes("admin")
                                    ? "Administrator"
                                    : member.permissions?.length > 1
                                    ? "Editor"
                                    : "Viewer"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={`mailto:${member.email}`}
                                className="rounded-md border border-gray-300 bg-white p-1.5 text-gray-500 hover:bg-gray-50 transition-colors"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </a>
                              {/* Permissions button - only visible to users with manage_team permission */}
                              {canManageTeam() && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMember(member);
                                    setShowPermissionModal(true);
                                    setSelectedPermissions(
                                      member.permissions || []
                                    );
                                  }}
                                  className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  <Key className="h-3 w-3" />
                                  Permissions
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {member.permissions?.includes("view") && (
                              <div className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                <Eye className="mr-1 h-3 w-3" />
                                View Project
                              </div>
                            )}
                            {member.permissions?.includes("edit") && (
                              <div className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                <FileText className="mr-1 h-3 w-3" />
                                Edit Content
                              </div>
                            )}
                            {member.permissions?.includes("manage_phases") && (
                              <div className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                                <Calendar className="mr-1 h-3 w-3" />
                                Manage Phases
                              </div>
                            )}
                            {member.permissions?.includes(
                              "manage_deliverables"
                            ) && (
                              <div className="inline-flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                                <Package className="mr-1 h-3 w-3" />
                                Manage Deliverables
                              </div>
                            )}
                            {member.permissions?.includes("manage_tasks") && (
                              <div className="inline-flex items-center rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
                                <List className="mr-1 h-3 w-3" />
                                Manage Tasks
                              </div>
                            )}
                            {member.permissions?.includes("manage_team") && (
                              <div className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                                <Users className="mr-1 h-3 w-3" />
                                Manage Team
                              </div>
                            )}
                            {member.permissions?.includes(
                              "full_access_limited"
                            ) && (
                              <div className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                                <Key className="mr-1 h-3 w-3" />
                                Full Access (No Deletion)
                              </div>
                            )}
                            {member.permissions?.includes("admin") && (
                              <div className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                                <Settings className="mr-1 h-3 w-3" />
                                Admin Access
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center">
                      <div className="text-center">
                        <Users className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                        <p className="text-gray-500 mb-3">
                          No team members added yet
                        </p>
                        {/* Add Team Member button - only visible to users with manage_team permission */}
                        {canManageTeam() && (
                          <button className="flex items-center gap-1 rounded-md bg-[#ffe500] px-3 py-1.5 text-sm font-medium text-[#444444] hover:bg-[#f5dc00] mx-auto">
                            <Plus className="h-4 w-4" />
                            <span>Add Team Member</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Log Tab */}
            {activeTab === "activity" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[#444444]">
                    Activity Log
                  </h2>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="p-5">
                    <div className="space-y-6">
                      {/* Activity Timeline */}
                      <div className="relative">
                        {/* Today */}
                        <div className="mb-4">
                          <div className="text-sm font-medium text-gray-500 mb-3">
                            Today
                          </div>
                          <div className="space-y-4">
                            <div className="flex gap-3">
                              <div className="flex-shrink-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900">
                                    Project description updated
                                  </p>
                                  <span className="text-xs text-gray-500">
                                    10:32 AM
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Updated by {projectManager?.name}{" "}
                                  {projectManager?.lastname}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Yesterday */}
                        <div className="mb-4">
                          <div className="text-sm font-medium text-gray-500 mb-3">
                            Yesterday
                          </div>
                          <div className="space-y-4">
                            <div className="flex gap-3">
                              <div className="flex-shrink-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                                  <Users className="h-4 w-4 text-green-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900">
                                    Team member added
                                  </p>
                                  <span className="text-xs text-gray-500">
                                    3:45 PM
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {members && members.length > 0
                                    ? members[0].name +
                                      " " +
                                      members[0].lastname
                                    : "New team member"}{" "}
                                  was added to the project
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-shrink-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                                  <Calendar className="h-4 w-4 text-purple-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900">
                                    Phase status updated
                                  </p>
                                  <span className="text-xs text-gray-500">
                                    11:20 AM
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {deliverablePhases.length > 0
                                    ? deliverablePhases[0].title
                                    : "Phase"}{" "}
                                  marked as in-progress
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Last Week */}
                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-3">
                            Last Week
                          </div>
                          <div className="space-y-4">
                            <div className="flex gap-3">
                              <div className="flex-shrink-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                                  <Package className="h-4 w-4 text-orange-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900">
                                    Deliverable added
                                  </p>
                                  <span className="text-xs text-gray-500">
                                    Mon, 3:22 PM
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  New deliverable added to{" "}
                                  {deliverablePhases.length > 0
                                    ? deliverablePhases[0].title
                                    : "Phase"}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-shrink-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900">
                                    Project created
                                  </p>
                                  <span className="text-xs text-gray-500">
                                    Mon, 10:15 AM
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Project was created by {projectManager?.name}{" "}
                                  {projectManager?.lastname}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Load More Button */}
                      <div className="flex justify-center pt-4">
                        <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                          Load More
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isProjectDeleteModalOpen && projectToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 md:p-8 shadow-xl space-y-6 animate-fadeIn">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Delete Project
                  </h2>
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete{" "}
                    <strong>{project.title}</strong>?
                    <br />
                    This will delete all phases, deliverables, and tasks
                    associated with this project. This action cannot be undone.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setIsProjectDeleteModalOpen(false);
                      setProjectToDelete(null);
                    }}
                    className="w-full py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await handleDeleteProject(project.id);
                      setIsProjectDeleteModalOpen(false);
                    }}
                    className="w-full py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Permission Modal */}
          {showPermissionModal && selectedMember && canManageTeam() && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="w-full max-w-md max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl animate-fadeIn">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-blue-600" />
                      Manage Permissions
                    </h2>
                    <button
                      onClick={() => setShowPermissionModal(false)}
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mt-4 p-4 bg-gradient-to-r from-blue-50 to-gray-50 rounded-lg border border-blue-100">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full ${getMemberAvatarColor(
                        selectedMember.id
                      )} text-sm font-bold text-white shadow-md`}
                    >
                      {getMemberInitials(
                        selectedMember.name,
                        selectedMember.lastname
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-lg">
                        {getFullName(selectedMember.name)}{" "}
                        {getFullName(selectedMember.lastname)}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center">
                        <Mail className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {selectedMember.email || "No email available"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scrollable permission section */}
                <div className="p-6 overflow-y-auto max-h-[40vh]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-gray-700">
                      Permissions ({selectedPermissions.length}/
                      {AVAILABLE_PERMISSIONS.length})
                    </div>

                    <div
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        selectedPermissions.includes("admin")
                          ? "bg-purple-100 text-purple-800"
                          : selectedPermissions.length > 3
                          ? "bg-blue-100 text-blue-800"
                          : selectedPermissions.length > 1
                          ? "bg-teal-100 text-teal-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {selectedPermissions.includes("admin")
                        ? "Admin Access"
                        : selectedPermissions.length > 3
                        ? "Advanced Access"
                        : selectedPermissions.length > 1
                        ? "Standard Access"
                        : "Basic Access"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {filteredPermissions.map((permission, index) => {
                      const IconComponent = permission.icon;
                      const isViewPermission = permission.id === "view";
                      const isChecked =
                        isViewPermission ||
                        selectedPermissions.includes(permission.id);

                      return (
                        <div
                          key={permission.id}
                          className={`flex items-start p-3 rounded-lg border ${
                            isChecked
                              ? permission.id === "admin"
                                ? "border-purple-200 bg-purple-50"
                                : "border-blue-200 bg-blue-50"
                              : "border-gray-200 bg-white"
                          } transition-colors duration-150`}
                        >
                          <div className="flex items-center h-5 mt-0.5">
                            <input
                              type="checkbox"
                              id={permission.id}
                              checked={isChecked}
                              onChange={() =>
                                !isViewPermission &&
                                togglePermission(permission.id)
                              }
                              disabled={isViewPermission}
                              className={`h-4 w-4 rounded focus:ring-2 focus:ring-offset-2 ${
                                permission.id === "admin"
                                  ? "text-purple-600 focus:ring-purple-500"
                                  : "text-blue-600 focus:ring-blue-500"
                              }`}
                            />
                          </div>
                          <div className="ml-3 flex-1">
                            <label
                              htmlFor={permission.id}
                              className="font-medium text-gray-800 flex items-center cursor-pointer"
                            >
                              <IconComponent
                                className={`mr-1.5 h-4 w-4 ${
                                  isChecked
                                    ? permission.id === "admin"
                                      ? "text-purple-600"
                                      : "text-blue-600"
                                    : "text-gray-500"
                                }`}
                              />
                              {permission.label}
                              {isViewPermission && (
                                <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                                  Required
                                </span>
                              )}
                            </label>
                            <p
                              className={`text-sm ${
                                isChecked ? "text-gray-700" : "text-gray-500"
                              }`}
                            >
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowPermissionModal(false)}
                      className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        setIsUpdatingPermissions(true);

                        try {
                          // Save permissions to backend
                          const success = await saveUserPermissions(
                            selectedMember.id,
                            selectedPermissions
                          );

                          if (success) {
                            // Update local state only if backend save was successful
                            const updatedMembers = members?.map((member) => {
                              if (member.id === selectedMember.id) {
                                return {
                                  ...member,
                                  permissions: selectedPermissions,
                                };
                              }
                              return member;
                            });
                            setMembers(updatedMembers || null);
                            setShowPermissionModal(false);
                          }
                        } finally {
                          setIsUpdatingPermissions(false);
                        }
                      }}
                      disabled={isUpdatingPermissions}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center shadow-sm ${
                        isUpdatingPermissions
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-[#ffe500] text-[#444444] hover:bg-[#f5dc00]"
                      }`}
                    >
                      {isUpdatingPermissions ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-1.5" />
                          Update Permissions
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Suggestion Modal */}
          {showSuggestionModal && suggestedPhase && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    AI Phase Suggestion
                  </h2>
                  <button
                    onClick={handleDeclineSuggestion}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div
                  className={`rounded-lg p-4 border ${
                    suggestedPhase.color === "blue"
                      ? "bg-blue-50 border-blue-200"
                      : suggestedPhase.color === "orange"
                      ? "bg-orange-50 border-orange-200"
                      : suggestedPhase.color === "yellow"
                      ? "bg-yellow-50 border-yellow-200"
                      : suggestedPhase.color === "green"
                      ? "bg-green-50 border-green-200"
                      : suggestedPhase.color === "purple"
                      ? "bg-purple-50 border-purple-200"
                      : "bg-blue-50 border-blue-200" // default fallback
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          suggestedPhase.color === "blue"
                            ? "bg-blue-100"
                            : suggestedPhase.color === "orange"
                            ? "bg-orange-100"
                            : suggestedPhase.color === "yellow"
                            ? "bg-yellow-100"
                            : suggestedPhase.color === "green"
                            ? "bg-green-100"
                            : suggestedPhase.color === "purple"
                            ? "bg-purple-100"
                            : "bg-blue-100" // default fallback
                        }`}
                      >
                        <BarChart3
                          className={`h-4 w-4 ${
                            suggestedPhase.color === "blue"
                              ? "text-blue-600"
                              : suggestedPhase.color === "orange"
                              ? "text-orange-600"
                              : suggestedPhase.color === "yellow"
                              ? "text-yellow-600"
                              : suggestedPhase.color === "green"
                              ? "text-green-600"
                              : suggestedPhase.color === "purple"
                              ? "text-purple-600"
                              : "text-blue-600" // default fallback
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-2">
                        {suggestedPhase.title || "Suggested Phase"}
                      </h3>
                      {suggestedPhase.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {suggestedPhase.description}
                        </p>
                      )}

                      

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        {suggestedPhase.startDate && (
                          <div>
                            <span className="font-medium text-gray-500">
                              Start Date:
                            </span>
                            <div className="text-gray-700">
                              {new Date(
                                suggestedPhase.startDate
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                        {suggestedPhase.endDate && (
                          <div>
                            <span className="font-medium text-gray-500">
                              End Date:
                            </span>
                            <div className="text-gray-700">
                              {new Date(
                                suggestedPhase.endDate
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                        {suggestedPhase.color && (
                          <div>
                            <span className="font-medium text-gray-500">
                              Color:
                            </span>
                            <div className="text-gray-700">
                              {suggestedPhase.color}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        AI-Generated Suggestion
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        This phase was suggested by AI based on your project
                        details. Please review and modify as needed before
                        accepting.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleDeclineSuggestion}
                    className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center"
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    Decline
                  </button>
                  <button
                    onClick={async () => {
                      setIsLoadingSuggestion(true);
                      try {
                        const response = await suggestPhase(projectId);
                        if (response?.success !== false && response.data) {
                          setSuggestedPhase(response.data);
                          // Debug log
                          console.log(
                            "New suggestion received:",
                            response.data
                          );
                        } else {
                          console.error(
                            "Failed to get new AI suggestion:",
                            response?.message
                          );
                        }
                      } catch (error) {
                        console.error(
                          "Error getting new AI suggestion:",
                          error
                        );
                      } finally {
                        setIsLoadingSuggestion(false);
                      }
                    }}
                    disabled={isLoadingSuggestion}
                    className="flex-1 py-2.5 px-4 rounded-lg border border-blue-300 bg-white text-blue-600 font-medium text-sm hover:bg-blue-50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingSuggestion ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4 mr-1.5" />
                        Get New Suggestion
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleAcceptSuggestion}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-[#ffe500] text-[#444444] font-medium text-sm hover:bg-[#f5dc00] transition-colors flex items-center justify-center shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Accept & Create Phase
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

export default withAuth(ProjectDetailPage);
