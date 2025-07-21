"use client";

import type React from "react";
import type { Task } from "@/app/types/task";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Clock,
  GripVertical,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { projectApi } from "@/services/project-api";
import { deliverableApi } from "@/services/deliverable-api";
import type { Project } from "@/app/types/project";
import type { Deliverable } from "@/app/types/deliverable";
import { taskApi } from "@/services/task-api";
import type { User } from "@/app/types/user";
import { api } from "@/services/api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import * as permissionApi from "@/services/permissions-api";

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  index: number;
  onSelect?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

export default function TaskCard({
  task,
  isDragging = false,
  index,
  onSelect,
  onDelete,
}: TaskCardProps) {
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [assignee, setAssignee] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAllowedToEdit, setIsAllowedToEdit] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease", // Smooth transition
    zIndex: isDragging ? 999 : "auto",
    opacity: isDragging ? 0.9 : 1, // Slightly reduce opacity when dragging
    scale: isDragging ? 1.05 : 1, // Slightly enlarge the card when dragging
  };

  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    med: "bg-orange-100 text-orange-800",
    high: "bg-red-100 text-red-800",
    default: "bg-gray-100 text-gray-800",
  };

  const statusColors = {
    todo: "bg-gray-100 text-gray-800",
    "in-progress": "bg-[#27acaa]/10 text-[#27acaa]",
    done: "bg-[#ffe500]/10 text-yellow-700",
    default: "bg-gray-100 text-gray-800",
  };

  // Permission check utility functions
  const hasPermission = (permission: string): boolean => {
    // Admin role has all permissions
    if (role === "Admin") return true;

    // Project Manager automatically has all permissions for their projects
    if (role === "ProjectManager" && project?.projectManager === userId)
      return true;

    // Check specific permissions for team members using API-fetched permissions
    if (role === "TeamMember") {
      // Admin permission includes all other permissions
      if (permissions.includes("admin")) return true;

      // Full access limited includes most permissions except deletion
      if (permissions.includes("full_access_limited") && permission !== "admin")
        return true;

      // Check for the specific permission in the fetched permissions array
      return permissions.includes(permission);
    }

    return false;
  };

  // Specific permission checks
  const canEditTask = (): boolean => {
    // Admin and ProjectManager (for their projects) can edit
    if (role === "Admin") return true;
    if (role === "ProjectManager" && project?.projectManager === userId)
      return true;
    // TeamMember can edit if they have manage_tasks or edit permission
    if (
      role === "TeamMember" &&
      (hasPermission("manage_tasks") || hasPermission("edit"))
    )
      return true;
    return false;
  };

  const canDeleteTask = (): boolean => {
    // Admin and ProjectManager (for their projects) can delete
    if (role === "Admin") return true;
    if (role === "ProjectManager" && project?.projectManager === userId)
      return true;
    // TeamMember can delete if they have manage_tasks or admin permission
    if (
      role === "TeamMember" &&
      (hasPermission("manage_tasks") || hasPermission("admin"))
    )
      return true;
    return false;
  };

  const canManageTasks = (): boolean => {
    return hasPermission("manage_tasks");
  };

  const isTaskAssignee = (): boolean => {
    return task.assignee === userId;
  };

  const canDragTask = (): boolean => {
    // Admin and ProjectManager can always drag
    if (role === "Admin") return true;
    if (role === "ProjectManager" && project?.projectManager === userId)
      return true;

    // TeamMember can drag if they have manage_tasks permission OR if they are the assignee
    if (role === "TeamMember") {
      return (
        hasPermission("manage_tasks") ||
        hasPermission("edit") ||
        isTaskAssignee()
      );
    }

    return false;
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

    const fetchData = async () => {
      if (task.projectId) {
        // Fetch project data
        const res = await projectApi.getProjectById(task.projectId);
        if (res?.success !== false && res.data) {
          const projectData = res.data as Project;
          setProject(projectData);
        }

        // Fetch user permissions for this specific project
        try {
          const permissionsResponse =
            await permissionApi.getPermissionsByProjectAndUser(
              task.projectId,
              currentUserId
            );
          if (permissionsResponse.success && permissionsResponse.data) {
            // Explicitly type the data to inform TypeScript about the 'permissions' property
            const data = permissionsResponse.data as { permissions: string[] };
            const userPermissions = data.permissions || [];
            setPermissions(userPermissions);
          }
        } catch (error) {
          console.error("Error fetching user permissions:", error);
          setPermissions([]);
        }
      }

      if (task.deliverableId) {
        const res = await deliverableApi.getDeliverableById(task.deliverableId);
        if (res?.success !== false && res.data) {
          setDeliverable(res.data as Deliverable);
        }
      }

      if (task.assignee) {
        const res = await api.getUserById(task.assignee);
        if (res?.success !== false && res.data) {
          setAssignee(res.data as User);
        }
      }
    };

    fetchData();
  }, [task.projectId, task.deliverableId, task.assignee]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    router.push(`/tasks/${task.id}/edit`);
  };

  const handleDeleteButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const result = await taskApi.deleteTask(task.id);
      if (result.success) {
        setIsDeleteModalOpen(false);
        if (onDelete) {
          onDelete(task.id);
        }
      } else {
        console.error(result.message);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(task);
    } else {
      router.push(`/tasks/${task.id}`);
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
          onClick={handleClick}
        >
          {/* Status indicator */}
          <div className="absolute left-0 top-0 h-1 w-full">
            {task.status === "todo" && (
              <div className="h-full w-full bg-gray-400" title="To Do" />
            )}
            {task.status === "in-progress" && (
              <div className="h-full w-full bg-[#27acaa]" title="In Progress" />
            )}
            {task.status === "done" && (
              <div className="h-full w-full bg-[#ffe500]" title="Done" />
            )}
          </div>

          {/* Drag handle - only visible to users with drag permission */}
          {canDragTask() && (
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
          {(canEditTask() || canDeleteTask()) && (
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
                  {canEditTask() && (
                    <button
                      className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      onClick={handleEdit}
                    >
                      <Pencil className="mr-2 h-4 w-4 text-gray-500" />
                      Edit Task
                    </button>
                  )}
                  {canDeleteTask() && (
                    <>
                      {canEditTask() && (
                        <div className="my-1 h-px w-full bg-gray-200"></div>
                      )}
                      <button
                        className="flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        onClick={handleDeleteButtonClick}
                      >
                        <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                        Delete Task
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Task content */}
          <div className="pr-6 mt-2">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-800 line-clamp-2">
                {task.text}
              </p>
            </div>

            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  priorityColors[
                    task.priority as keyof typeof priorityColors
                  ] || priorityColors.default
                }`}
              >
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>

              {task.status && (
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    statusColors[task.status as keyof typeof statusColors] ||
                    statusColors.default
                  }`}
                >
                  {task.status === "todo"
                    ? "To Do"
                    : task.status === "in-progress"
                    ? "In Progress"
                    : "Done"}
                </span>
              )}
            </div>

            {/* Deliverable info */}
            {task.deliverableId && deliverable && (
              <div className="mb-2 flex items-center text-xs text-gray-500">
                <FileText className="mr-1 h-3 w-3" />
                <span className="truncate">{deliverable.title}</span>
              </div>
            )}

            {/* Due date and assignee */}
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {new Date(task.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              {assignee && (
                <div className="flex -space-x-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#94a3b8] text-xs font-medium text-white border-2 border-white"
                    title={`${assignee.name} ${assignee.lastname}`}
                  >
                    {`${assignee.name?.[0] ?? ""}${
                      assignee.lastname?.[0] ?? ""
                    }`}
                  </div>
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
                Delete Task
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
                <span className="font-semibold">{task.text}</span>? This action
                cannot be undone.
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
                onClick={confirmDelete}
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
