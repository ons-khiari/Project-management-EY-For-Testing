"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Project } from "@/app/types/project";
import {
  Calendar,
  Clock,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  StarOff,
  ExternalLink,
  ChevronRight,
  X,
} from "lucide-react";
import type { Client } from "@/app/types/client";
import type { User } from "@/app/types/user";
import { clientApi } from "@/services/client-api";
import { api } from "@/services/api";
import { projectApi } from "@/services/project-api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

interface ProjectListItemProps {
  project: Project;
  onDelete?: (id: string) => void;
}

export default function ProjectListItem({
  project,
  onDelete,
}: ProjectListItemProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/projects/${project.id}/edit`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const response = await projectApi.deleteProject(project.id);
      if (response?.success) {
        if (onDelete) {
          onDelete(project.id);
        }
        setIsDeleteModalOpen(false);
      } else {
        console.error(response.message || "Error deleting project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
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

  // Determine status badge
  const getStatusBadge = () => {
    if (project.progress === 100) {
      return (
        <span className="inline-flex items-center rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-medium text-white">
          Completed
        </span>
      );
    } else if (isOverdue) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-medium text-white">
          Overdue
        </span>
      );
    } else if (project.progress === 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-gray-500 px-2.5 py-0.5 text-xs font-medium text-white">
          Not Started
        </span>
      );
    } else if (project.progress < 50) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-medium text-white">
          Early Stage
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-medium text-white">
          In Progress
        </span>
      );
    }
  };

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    const decoded: any = jwtDecode(token);
    const userId =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
    const role =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

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

  return (
    <>
      <div
        className="group relative rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-300 overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link href={`/projects/${project.id}`} className="block p-4">
          <div className="flex items-center gap-4">
            {/* Favorite button */}
            <button
              onClick={toggleFavorite}
              className="flex-shrink-0 rounded-full p-1 text-gray-400 hover:text-yellow-500 transition-colors"
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
            >
              {isFavorite ? (
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-5 w-5" />
              )}
            </button>

            {/* Client logo */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 border border-gray-200">
              {client?.logo ? (
                <Image
                  src={client.logo || "/placeholder.svg"}
                  alt={client.name || "Client Logo"}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-6 w-6 text-gray-500" />
              )}
            </div>

            {/* Project info */}
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-[#444444] truncate">
                  {project.title}
                </h3>
                {getStatusBadge()}
              </div>
              <div className="flex flex-wrap items-center text-xs text-gray-500 mb-2 gap-2">
                <span className="font-medium">
                  {client?.name || "Unknown Client"}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center">
                  <Calendar className="inline mr-1 h-3 w-3" />
                  {new Date(project.startDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="hidden sm:inline">•</span>
                <span
                  className={`flex items-center ${
                    isOverdue ? "text-red-500" : ""
                  }`}
                >
                  <Clock className="inline mr-1 h-3 w-3" />
                  {isOverdue ? "Overdue" : `${daysRemaining} days left`}
                </span>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <div className="h-2 flex-grow overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-2 rounded-full ${progressColor} transition-all duration-500 ease-in-out`}
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-gray-700 w-8 text-right">
                  {project.progress}%
                </span>
              </div>
            </div>

            {/* Team members */}
            <div className="flex-shrink-0 hidden md:flex items-center gap-1">
              <div className="flex -space-x-2">
                {members?.slice(0, 3).map((member, index) => (
                  <div
                    key={member.id || index}
                    className="h-8 w-8 rounded-full bg-[#e8725b] flex items-center justify-center text-xs font-medium text-white border-2 border-white"
                    title={`${member.name} ${member.lastname}`}
                  >
                    {`${member.name?.[0] ?? ""}${member.lastname?.[0] ?? ""}`}
                  </div>
                ))}
                {(members?.length || 0) > 3 && (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white">
                    +{(members?.length || 0) - 3}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {isAllowedToEdit && (
                <>
                  <button
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                      isHovered
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        : "text-transparent"
                    }`}
                    onClick={handleEdit}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </button>

                  <div className="relative">
                    <button
                      className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                        isHovered
                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          : "text-transparent"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
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
                          onClick={toggleFavorite}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {isFavorite ? (
                            <>
                              <StarOff className="h-4 w-4 text-gray-500" />
                              Remove from favorites
                            </>
                          ) : (
                            <>
                              <Star className="h-4 w-4 text-gray-500" />
                              Add to favorites
                            </>
                          )}
                        </button>
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/projects/${project.id}`);
                          }}
                        >
                          <ExternalLink className="h-4 w-4 text-gray-500" />
                          View details
                        </button>
                        <div className="my-1 h-px w-full bg-gray-200"></div>
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDeleteModalOpen(true);
                            setShowDropdown(false);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                          Delete project
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              <ChevronRight
                className={`h-5 w-5 ${
                  isHovered ? "text-gray-400" : "text-gray-200"
                } transition-colors`}
              />
            </div>
          </div>
        </Link>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Project
              </h3>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
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
                <span className="font-semibold">{project.title}</span>? This
                action cannot be undone and all associated data will be
                permanently removed.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg border border-red-500 bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
