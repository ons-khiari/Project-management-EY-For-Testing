"use client";

import type React from "react";
import {
  Calendar,
  Link2,
  Users,
  GripVertical,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Layers,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Deliverable } from "@/app/types/deliverable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect } from "react";
import { getProjectById } from "@/services/project-api";
import { getDeliverablePhaseById } from "@/services/deliverablePhase-api";
import type { Project } from "@/app/types/project";
import type { DeliverablePhase } from "@/app/types/deliverable-phase";
import type { User } from "@/app/types/user";
import { getClientById } from "@/services/client-api";
import type { Client } from "@/app/types/client";
import { api } from "@/services/api";
import { deliverableApi } from "@/services/deliverable-api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import * as permissionApi from "@/services/permissions-api";

export interface DeliverableCardProps {
  deliverable: Deliverable;
  index: number;
  onSelect?: (deliverable: Deliverable) => void;
  onDelete?: (deliverableId: string) => void;
}

export default function DeliverableCard({
  deliverable,
  index,
  onSelect,
  onDelete,
}: DeliverableCardProps) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deliverable.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    med: "bg-orange-100 text-orange-800",
    high: "bg-red-100 text-red-800",
    default: "bg-gray-100 text-gray-800",
  };

  const priorityBadges = {
    low: "Low",
    med: "Medium",
    high: "High",
    default: "Normal",
  };

  const [project, setProject] = useState<Project | null>(null);
  const [deliverablePhase, setDeliverablePhase] =
    useState<DeliverablePhase | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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
      if (permissions.includes("admin")) return true;

      // Full access limited includes most permissions except admin actions
      if (permissions.includes("full_access_limited") && permission !== "admin")
        return true;

      // Check for the specific permission
      return permissions.includes(permission);
    }

    return false;
  };

  // Specific permission checks for deliverables
  const canEditDeliverable = (): boolean => {
    // Admin and ProjectManager (for their projects) can edit
    if (role === "Admin") return true;
    if (role === "ProjectManager" && project?.projectManager === userId)
      return true;

    // TeamMember can only edit if they have manage_deliverables or edit permission
    if (
      role === "TeamMember" &&
      (hasPermission("manage_deliverables") || hasPermission("edit"))
    )
      return true;

    return false;
  };

  const canDeleteDeliverable = (): boolean => {
    // Admin and ProjectManager (for their projects) can delete
    if (role === "Admin") return true;
    if (role === "ProjectManager" && project?.projectManager === userId)
      return true;

    // TeamMember can only delete if they have manage_deliverables or admin permission
    if (
      role === "TeamMember" &&
      (hasPermission("manage_deliverables") || hasPermission("admin"))
    )
      return true;

    return false;
  };

  const canDragDeliverable = (): boolean => {
    // Admin and ProjectManager can always drag
    if (role === "Admin") return true;
    if (role === "ProjectManager" && project?.projectManager === userId)
      return true;

    // TeamMember can drag if they have manage_deliverables or edit permission
    if (
      role === "TeamMember" &&
      (hasPermission("manage_deliverables") || hasPermission("edit"))
    )
      return true;

    return false;
  };

  const isDeliverableAssignee = () => {
    return deliverable.assignee?.includes(userId || "");
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

    const fetchProjectAndPhase = async () => {
      try {
        const projectRes = await getProjectById(deliverable.projectId);
        if (projectRes.success && projectRes.data) {
          const projectData = projectRes.data as Project;
          setProject(projectData);
        }

        // Fetch user permissions for this specific project using API
        try {
          const permissionsResponse =
            await permissionApi.getPermissionsByProjectAndUser(
              deliverable.projectId,
              currentUserId
            );
          if (permissionsResponse.success && permissionsResponse.data) {
            const userPermissions = (permissionsResponse.data as { permissions?: string[] }).permissions || [];
            setPermissions(userPermissions);
          }
        } catch (error) {
          console.error("Error fetching user permissions:", error);
          setPermissions([]);
        }

        const phaseRes = await getDeliverablePhaseById(
          deliverable.deliverablePhaseId
        );
        if (phaseRes.success && phaseRes.data) {
          setDeliverablePhase(phaseRes.data as DeliverablePhase);
        }

        const clientRes = await getClientById(deliverable.clientId);
        if (clientRes.success && clientRes.data) {
          setClient(clientRes.data as Client);
        }

        // Fetch members data
        if (deliverable.assignee && deliverable.assignee.length > 0) {
          const membersData: User[] = [];
          for (const member of deliverable.assignee) {
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
      } catch (error) {
        console.error("Failed to fetch project or deliverable phase:", error);
      }
    };

    fetchProjectAndPhase();
  }, [deliverable]);

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(deliverable);
    } else {
      router.push(
        `/projects/${deliverable.projectId}/phases/${deliverable.deliverablePhaseId}/deliverables/${deliverable.id}`
      );
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    router.push(
      `/projects/${deliverable.projectId}/phases/${deliverable.deliverablePhaseId}/deliverables/${deliverable.id}/edit`
    );
  };

  const handleDeleteButtonClick = (
    e: React.MouseEvent<HTMLButtonElement>
  ): void => {
    e.stopPropagation();
    setShowDropdown(false);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deliverableApi.deleteDeliverable(deliverable.id);
      if (onDelete) {
        onDelete(deliverable.id);
      } else {
        router.push("/deliverables");
      }
    } catch (error) {
      console.error("Error deleting deliverable:", error);
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

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
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? "opacity-50" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md cursor-pointer"
          onClick={handleCardClick}
        >
          {/* Status indicator */}
          <div className="absolute left-0 top-0 h-1 w-full">
            {deliverable.status === "todo" && (
              <div className="h-full w-full bg-gray-400" title="To Do" />
            )}
            {deliverable.status === "in-progress" && (
              <div className="h-full w-full bg-[#27acaa]" title="In Progress" />
            )}
            {deliverable.status === "done" && (
              <div className="h-full w-full bg-[#ffe500]" title="Done" />
            )}
          </div>

          {/* Drag handle */}
          {canDragDeliverable() && (
            <div
              className={`absolute right-3 top-3 z-10 cursor-grab active:cursor-grabbing rounded-full p-1 hover:bg-gray-100 transition-opacity ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
          )}

          {/* Action buttons */}
          {(canEditDeliverable() || canDeleteDeliverable()) && (
            <div
              className={`absolute right-10 top-3 z-10 transition-opacity ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
            >
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent hover:bg-gray-100 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </button>

              {/* Action Buttons Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-20">
                  {canEditDeliverable() && (
                    <button
                      className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      onClick={handleEdit}
                    >
                      <Pencil className="mr-2 h-4 w-4 text-gray-500" />
                      Edit Deliverable
                    </button>
                  )}
                  {canDeleteDeliverable() && (
                    <>
                      {canEditDeliverable() && (
                        <div className="my-1 h-px w-full bg-gray-200"></div>
                      )}
                      <button
                        className="flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        onClick={handleDeleteButtonClick}
                      >
                        <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                        Delete Deliverable
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Priority badges */}
          <div className="mb-3 mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                priorityColors[
                  deliverable.priority as keyof typeof priorityColors
                ] || priorityColors.default
              }`}
            >
              {priorityBadges[
                deliverable.priority as keyof typeof priorityBadges
              ] || priorityBadges.default}
            </span>
            <span className="rounded-full bg-[#ffe500] px-2 py-1 text-xs font-medium text-gray-800">
              D{deliverable.priorityNumber}
            </span>
            {/* Status badge */}
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                deliverable.status === "todo"
                  ? "bg-gray-100 text-gray-800"
                  : deliverable.status === "in-progress"
                  ? "bg-[#27acaa]/10 text-[#27acaa]"
                  : "bg-[#ffe500]/10 text-yellow-700"
              }`}
            >
              {deliverable.status === "todo"
                ? "To Do"
                : deliverable.status === "in-progress"
                ? "In Progress"
                : "Done"}
            </span>
          </div>

          <h3 className="mb-2 text-base font-semibold text-gray-800 line-clamp-1">
            {deliverable.title}
          </h3>

          <p className="mb-4 text-sm text-gray-600 line-clamp-2">
            {deliverable.description}
          </p>

          {/* Phase information */}
          <div className="mb-2 flex items-center text-xs text-gray-500">
            <Layers className="mr-1 h-3 w-3" />
            <span className="font-medium mr-1">Phase:</span>
            <span className="truncate">{deliverablePhase?.title || "—"}</span>
          </div>

          {/* Display client information if available */}
          {deliverable.clientId && client && (
            <div className="mb-2 flex items-center text-xs text-gray-500">
              <Building2 className="mr-1 h-3 w-3" />
              <span className="font-medium mr-1">Client:</span>
              <span className="truncate">{client.name}</span>
            </div>
          )}

          {/* Due date */}
          <div className="mb-2 flex items-center text-xs text-gray-500">
            <Calendar className="mr-1 h-3 w-3" />
            <span className="font-medium mr-1">Due:</span>
            <span>
              {new Date(deliverable.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          {/* Link if available */}
          {deliverable.link && (
            <div className="mb-3 flex items-center text-xs text-blue-500 hover:underline">
              <Link2 className="mr-1 h-3 w-3" />
              <span className="truncate">{deliverable.link}</span>
            </div>
          )}

          {/* Assignees */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-gray-500">
                {deliverable.assignee?.length || 0} assignee(s)
              </span>
            </div>
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((member, index) => (
                <div
                  key={member.id || index}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8725b] text-xs font-medium text-white border-2 border-white"
                  title={`${member.name} ${member.lastname}`}
                >
                  {`${member.name?.[0] ?? ""}${member.lastname?.[0] ?? ""}`}
                </div>
              ))}
              {members.length > 4 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 border-2 border-white">
                  +{members.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Deliverable
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
                <span className="font-semibold">{deliverable.title}</span>? This
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
