"use client";

import type React from "react";
import {
  Calendar,
  Clock,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Heart,
  Building,
  LucideUser,
  X,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project } from "@/app/types/project";
import Image from "next/image";
import { useEffect, useState } from "react";
import { clientApi } from "@/services/client-api";
import type { Client } from "@/app/types/client";
import type { User } from "@/app/types/user";
import { api } from "@/services/api";
import { projectApi } from "@/services/project-api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

interface ProjectCardProps {
  project: Project;
  onDelete?: (id: string) => void;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const [isProjectDeleteModalOpen, setIsProjectDeleteModalOpen] =
    useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [projectManager, setProjectManager] = useState<User | null>(null);
  const [members, setMembers] = useState<User[] | null>(null);
  const [isAllowedToEdit, setIsAllowedToEdit] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Progress bar colors with a default fallback
  const progressColors = {
    blue: "bg-blue-500",
    orange: "bg-orange-500",
    yellow: "bg-[#ffe500]",
    green: "bg-green-500",
    default: "bg-gray-500", // Fallback color
  };

  // Use the progressColor if it exists, otherwise use the default
  const progressColor = project.progressColor
    ? progressColors[project.progressColor as keyof typeof progressColors] ||
      progressColors.default
    : progressColors.default;

  // Client type badge colors
  const clientTypeColors = {
    individual: "bg-purple-100 text-purple-800",
    company: "bg-blue-100 text-blue-800",
    government: "bg-green-100 text-green-800",
    "non-profit": "bg-orange-100 text-orange-800",
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/projects/${project.id}/edit`);
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const response = await projectApi.deleteProject(id);
      if (response?.success) {
        if (onDelete) {
          onDelete(id);
        }
        setIsProjectDeleteModalOpen(false);
        setProjectToDelete(null);
      } else {
        console.error(response.message || "Error deleting project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  // Calculate days remaining
  const calculateDaysRemaining = () => {
    const endDate = new Date(project.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = calculateDaysRemaining();
  const isOverdue = daysRemaining < 0;

  // Get status based on progress and due date
  const getStatus = () => {
    if (project.progress === 100) {
      return { label: "Completed", color: "bg-green-500 text-white" };
    } else if (isOverdue) {
      return { label: "Overdue", color: "bg-red-500 text-white" };
    } else if (project.progress === 0) {
      return { label: "Not Started", color: "bg-gray-500 text-white" };
    } else if (project.progress < 50) {
      return { label: "Early Stage", color: "bg-amber-500 text-white" };
    } else {
      return { label: "In Progress", color: "bg-blue-500 text-white" };
    }
  };

  const status = getStatus();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    const decoded: any = jwtDecode(token);
    const userId =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
    const role =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    setRole(role);

    const isAdmin = role === "Admin";
    const isProjectManager =
      role === "ProjectManager" && project.projectManager === userId;
    setIsAllowedToEdit(isAdmin || isProjectManager);

    const fetchClientAndManagerAndMembers = async () => {
      // Fetch the client data
      if (project.clientId) {
        const clientResult = await clientApi.getClientById(project.clientId);
        if (
          clientResult &&
          !(clientResult as any).success === false &&
          clientResult.data
        ) {
          setClient(clientResult.data);
        }
      }

      // Fetch the project manager data
      if (project.projectManager) {
        const managerResult = await api.getUserById(project.projectManager);
        if (
          managerResult &&
          managerResult.success !== false &&
          managerResult.data
        ) {
          setProjectManager(managerResult.data as User);
        }
      }

      // Fetch members data
      if (project.members && project.members.length > 0) {
        const membersData: User[] = [];
        for (const member of project.members) {
          const memberResult = await api.getUserById(member);
          if (
            memberResult &&
            memberResult.success !== false &&
            memberResult.data
          ) {
            membersData.push(memberResult.data as User);
          }
        }
        setMembers(membersData);
      }
    };

    fetchClientAndManagerAndMembers();
  }, [project.clientId, project.projectManager, project.members]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };

    if (showDropdown) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showDropdown]);

  const exportProjectToExcel = async (projectId: string) => {
    const result = await projectApi.exportProjectToExcel(projectId);
    if (result.success && result.data) {
      const url = window.URL.createObjectURL(result.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project_${projectId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      console.error(result.message || "Error exporting project to Excel");
    }
  }  

  return (
    <div
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md">
        {/* Action buttons */}
        {isAllowedToEdit && (
          <div
            className={`absolute right-4 top-4 flex items-center gap-2 transition-opacity duration-200 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Export button */}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                exportProjectToExcel(project.id)
              }}
              title="Export project"
            >
              <Download className="h-4 w-4" />
              <span className="sr-only">Export project</span>
            </button>

            {/* Dropdown button */}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowDropdown(!showDropdown);
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </button>

            {showDropdown && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowDropdown(false);
                    handleEdit(e);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4 text-gray-500" />
                  Edit project
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setProjectToDelete(project);
                    setIsProjectDeleteModalOpen(true);
                    setShowDropdown(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                  Delete project
                </button>
              </div>
            )}
          </div>
        )}

        {/* Delete project modal */}
        {isProjectDeleteModalOpen && projectToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Project
                </h3>
                <button
                  onClick={() => setIsProjectDeleteModalOpen(false)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <Trash2 className="h-6 w-6" />
                </div>
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{projectToDelete.title}</span>
                  ? This action cannot be undone and all associated data will be
                  permanently removed.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsProjectDeleteModalOpen(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProject(projectToDelete.id)}
                  className="flex-1 rounded-lg border border-red-500 bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <Link href={`/projects/${project.id}`} className="block h-full">
          {/* Status badge */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
              >
                {status.label}
              </span>
              {isOverdue && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                  {Math.abs(daysRemaining)} days overdue
                </span>
              )}
            </div>
          </div>

          {/* Client information */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100 border border-gray-200">
              {client?.logo ? (
                <Image
                  src={client.logo || "/placeholder.svg"}
                  alt={client.name || "Client Logo"}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  {client?.type === "Company" && (
                    <Building2 className="h-5 w-5 text-gray-500" />
                  )}
                  {client?.type === "Government" && (
                    <Building className="h-5 w-5 text-gray-500" />
                  )}
                  {client?.type === "Individual" && (
                    <LucideUser className="h-5 w-5 text-gray-500" />
                  )}
                  {client?.type === "NonProfit" && (
                    <Heart className="h-5 w-5 text-gray-500" />
                  )}
                </>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">
                {client?.name || "Unknown Client"}
              </p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  clientTypeColors[
                    client?.type?.toLowerCase() as keyof typeof clientTypeColors
                  ] || "bg-gray-100 text-gray-800"
                }`}
              >
                {client?.type
                  ? client.type.charAt(0).toUpperCase() + client.type.slice(1)
                  : "Unknown Type"}
              </span>
            </div>
          </div>

          <h3 className="mb-2 text-lg font-semibold text-[#444444] line-clamp-1">
            {project.title}
          </h3>

          <p className="mb-4 text-sm text-gray-600 line-clamp-2">
            {project.description || "No description provided"}
          </p>

          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">
                Progress
              </span>
              <span className="text-xs font-medium text-gray-700">
                {project.progress}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full ${progressColor} transition-all duration-500 ease-in-out`}
                style={{ width: `${project.progress}%` }}
              ></div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="rounded-md bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <LucideUser className="h-4 w-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-700">
                  Manager
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#27acaa] text-sm font-medium text-white">
                  {projectManager
                    ? `${projectManager.name?.[0] ?? ""}${
                        projectManager.lastname?.[0] ?? ""
                      }`
                    : "?"}
                </div>
                <span className="text-sm text-gray-700 truncate max-w-[110px] block">
                  {projectManager
                    ? `${projectManager.name} ${projectManager.lastname}`
                    : "Unknown Manager"}
                </span>
              </div>
            </div>

            <div className="rounded-md bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-700">Team</span>
              </div>
              <div className="mt-2 flex -space-x-2 overflow-hidden">
                {members?.slice(0, 5).map((member, index) => (
                  <div
                    key={member.id || index}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8725b] text-xs font-medium text-white ring-2 ring-white"
                    title={`${member.name} ${member.lastname}`}
                  >
                    {`${member.name?.[0] ?? ""}${member.lastname?.[0] ?? ""}`}
                  </div>
                ))}
                {(members?.length || 0) > 5 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 ring-2 ring-white">
                    +{(members?.length || 0) - 5}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-gray-200 pt-3">
            <div className="flex items-center text-xs text-gray-500">
              <Calendar className="mr-1 h-3.5 w-3.5" />
              <span>
                {new Date(project.startDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <div
              className={`flex items-center text-xs ${
                isOverdue ? "text-red-500" : "text-gray-500"
              }`}
            >
              <Clock className="mr-1 h-3.5 w-3.5" />
              <span>
                {isOverdue ? "Overdue" : `${daysRemaining} days left`}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
