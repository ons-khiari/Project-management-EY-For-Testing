"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  Check,
  CheckSquare,
  ChevronRight,
  Edit,
  ExternalLink,
  FileText,
  Layers,
  LinkIcon,
  MessageSquare,
  Plus,
  Tag,
  Trash2,
  UserIcon,
  X,
} from "lucide-react";

import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { taskApi } from "@/services/task-api";
import { commentApi } from "@/services/comment-api";
import { subTaskApi } from "@/services/subtask-api";
import * as permissionApi from "@/services/permissions-api";
import { projectApi } from "@/services/project-api";
import { deliverableApi } from "@/services/deliverable-api";
import { deliverablePhaseApi } from "@/services/deliverablePhase-api";
import type { Task } from "@/app/types/task";
import type { Project } from "@/app/types/project";
import type { User } from "@/app/types/user";
import type { Deliverable } from "@/app/types/deliverable";
import type { DeliverablePhase } from "@/app/types/deliverable-phase";
import type { Comment } from "@/app/types/comment";
import type { SubTask } from "@/app/types/subtask";
import { api } from "@/services/api";

// Utility functions
const getAvatarColor = (id: string) => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEEAD",
    "#D4A5A5",
    "#9B6B70",
    "#E9967A",
  ];
  const hash = id.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  return colors[hash % colors.length];
};

const getInitials = (user?: User | null) => {
  return `${user?.name?.[0] ?? ""}${user?.lastname?.[0] ?? ""}`.toUpperCase();
};

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const TaskDetailsPage = () => {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  // State
  const [task, setTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [newComment, setNewComment] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [projectManager, setProjectManager] = useState<User | null>(null);
  const [assignee, setAssignee] = useState<User | null>(null);
  const [deliverablePhase, setDeliverablePhase] =
    useState<DeliverablePhase | null>(null);
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [isTaskAssignee, setIsTaskAssignee] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [assignees, setAssignees] = useState<Record<string, User>>({});
  const [currentUserId, setCurrentUserId] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentText, setEditedCommentText] = useState("");
  const [showDeleteCommentConfirm, setShowDeleteCommentConfirm] = useState<
    string | null
  >(null);
  const [newSubTaskText, setNewSubTaskText] = useState("");
  const [showAddSubTask, setShowAddSubTask] = useState(false);
  const [editingSubTaskId, setEditingSubTaskId] = useState<string | null>(null);
  const [editedSubTaskText, setEditedSubTaskText] = useState("");
  const [showDeleteSubTaskConfirm, setShowDeleteSubTaskConfirm] = useState<
    string | null
  >(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Permission check utility functions
  const hasPermission = (permission: string): boolean => {
    // Admin role has all permissions
    if (userRole === "Admin") return true;

    // Project Manager automatically has all permissions for their projects
    if (
      userRole === "ProjectManager" &&
      project?.projectManager === currentUserId
    )
      return true;

    // Check specific permissions for team members
    if (userRole === "TeamMember") {
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
  const canEditTask = (): boolean => {
    return (
      hasPermission("edit") || hasPermission("manage_tasks") || isTaskAssignee
    );
  };

  const canDeleteTask = (): boolean => {
    return hasPermission("admin");
  };

  const canManageSubTasks = (): boolean => {
    return (
      hasPermission("manage_tasks") ||
      hasPermission("manage_subtasks") ||
      isTaskAssignee
    );
  };

  const canManageComments = (): boolean => {
    return (
      hasPermission("manage_tasks") ||
      hasPermission("manage_comments") ||
      isTaskAssignee
    );
  };

  const canModifyComment = (commentAssigneeId: string): boolean => {
    // User can modify their own comments
    if (currentUserId === commentAssigneeId) return true;

    // Admin and project managers can modify any comment
    if (userRole === "Admin") return true;
    if (
      userRole === "ProjectManager" &&
      project?.projectManager === currentUserId
    )
      return true;

    // Team members with admin permission can modify any comment
    if (userRole === "TeamMember" && userPermissions.includes("admin"))
      return true;

    return false;
  };

  const canDeleteComment = (commentAssigneeId: string): boolean => {
    // User can delete their own comments
    if (currentUserId === commentAssigneeId) return true;

    // Only admin permission allows deleting other users' comments
    return hasPermission("admin");
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

  useEffect(() => {
    const fetchData = async () => {
      if (!taskId) return;

      const [commentRes, subTaskRes] = await Promise.all([
        commentApi.getCommentsByTaskId(taskId),
        subTaskApi.getSubTasksByTaskId(taskId),
      ]);

      if (commentRes.success && commentRes.data) {
        setComments(commentRes.data);

        // Extract unique assignee IDs from comments
        const assigneeIds = Array.from(
          new Set(
            commentRes.data.map((c: Comment) => c.assignee).filter(Boolean)
          )
        );

        // Fetch all assignee users in parallel
        const userPromises = assigneeIds.map((id: string) =>
          api.getUserById(id)
        );
        const usersResponses = await Promise.all(userPromises);

        // Build a map of userId => user data (only successful fetches)
        const usersMap: Record<string, User> = {};
        usersResponses.forEach((res, idx: number) => {
          const userRes = res as ApiResponse<User>;
          if (userRes.success && userRes.data) {
            usersMap[assigneeIds[idx]] = userRes.data;
          }
        });

        setAssignees(usersMap);
      }

      if (subTaskRes.success && subTaskRes.data) {
        setSubTasks(subTaskRes.data);
      }
    };

    fetchData();
  }, [taskId]);

  useEffect(() => {
    const fetchTaskAndRelatedData = async () => {
      if (!taskId) {
        router.push("/tasks");
        return;
      }

      const token = Cookies.get("token");
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const userId =
        decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      const role =
        decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      setUserRole(role);
      setCurrentUserId(userId);
      setLoading(true);

      try {
        const taskRes = await taskApi.getTaskById(taskId);
        if (!taskRes.success || !taskRes.data) {
          console.error(taskRes.message || "Failed to fetch task");
          setError("Failed to load task details");
          return;
        }

        const taskData = taskRes.data as Task;
        setTask(taskData);

        // Check if the logged-in user is the assignee of the task
        if (taskData.assignee === userId) {
          setIsTaskAssignee(true);
        }

        // Fetch project and related data
        const projectRes = await projectApi.getProjectById(taskData.projectId);
        if (projectRes.success && projectRes.data) {
          const project = projectRes.data as Project;
          setProject(project);

          // Fetch user permissions for this project
          await fetchCurrentUserPermissions(userId, project.id);

          // Fetch project manager
          const managerRes = await api.getUserById(project.projectManager);
          if (managerRes.success && managerRes.data) {
            setProjectManager(managerRes.data as User);
          }
        }

        // Fetch assignee
        if (taskData.assignee) {
          const assigneeRes = await api.getUserById(taskData.assignee);
          if (assigneeRes.success && assigneeRes.data) {
            setAssignee(assigneeRes.data as User);
          }
        }

        // Fetch deliverable phase
        if (taskData.deliverablePhaseId) {
          const phaseRes = await deliverablePhaseApi.getDeliverablePhaseById(
            taskData.deliverablePhaseId
          );
          if (phaseRes.success && phaseRes.data) {
            setDeliverablePhase(phaseRes.data as DeliverablePhase);
          }
        }

        // Fetch deliverable
        if (taskData.deliverableId) {
          const deliverableRes = await deliverableApi.getDeliverableById(
            taskData.deliverableId
          );
          if (deliverableRes.success && deliverableRes.data) {
            setDeliverable(deliverableRes.data as Deliverable);
          }
        }
      } catch (error) {
        console.error("Error loading task details:", error);
        setError("Failed to load task details");
      } finally {
        setLoading(false);
      }
    };

    fetchTaskAndRelatedData();
  }, [taskId, router]);

  const handleDelete = async () => {
    if (!taskId || !canDeleteTask()) return;

    try {
      const res = await taskApi.deleteTask(taskId);
      if (res.success) {
        setShowDeleteConfirm(false);
        router.push("/tasks");
      } else {
        console.error(res.message);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !taskId || !currentUserId || !canManageComments())
      return;

    try {
      const commentData = {
        taskId: taskId,
        assignee: currentUserId,
        description: newComment,
      };

      const res = await commentApi.createComment(commentData);

      if (res.success && res.data) {
        // Refresh comments after adding
        const commentRes = await commentApi.getCommentsByTaskId(taskId);
        if (commentRes.success && commentRes.data) {
          setComments(commentRes.data);

          // Fetch user data for the new comment if needed
          if (!assignees[currentUserId]) {
            const userRes = await api.getUserById(currentUserId);
            if (userRes.success && userRes.data) {
              setAssignees({
                ...assignees,
                [currentUserId]: userRes.data as User,
              });
            }
          }
        }

        setNewComment("");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const toggleSubtaskCompletion = async (id: string) => {
    if (!canManageSubTasks()) return;

    try {
      const subTask = subTasks.find((st) => st.id === id);
      if (!subTask) return;

      const updatedSubTask = {
        ...subTask,
        isCompleted: !subTask.isCompleted,
        updatedAt: new Date().toISOString(),
      };

      const res = await subTaskApi.updateSubTask(id, updatedSubTask);

      if (res.success) {
        const subTaskRes = await subTaskApi.getSubTasksByTaskId(taskId);
        if (subTaskRes.success && subTaskRes.data) {
          setSubTasks(subTaskRes.data);
        }
      }
    } catch (error) {
      console.error("Error updating subtask:", error);
    }
  };

  const startEditingComment = (comment: Comment) => {
    if (!canModifyComment(comment.assignee)) return;
    setEditingCommentId(comment.id);
    setEditedCommentText(comment.description);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditedCommentText("");
  };

  const saveEditedComment = async () => {
    if (!editingCommentId || !editedCommentText.trim() || !taskId) return;

    try {
      const existingComment = comments.find((c) => c.id === editingCommentId);
      if (!existingComment || !canModifyComment(existingComment.assignee))
        return;

      const updatedComment = {
        ...existingComment,
        description: editedCommentText,
        updatedAt: new Date().toISOString(),
      };

      const res = await commentApi.updateComment(
        editingCommentId,
        updatedComment
      );

      if (res.success) {
        const commentRes = await commentApi.getCommentsByTaskId(taskId);
        if (commentRes.success && commentRes.data) {
          setComments(commentRes.data);
        }
        setEditingCommentId(null);
        setEditedCommentText("");
      }
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const confirmDeleteComment = (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment || !canDeleteComment(comment.assignee)) return;
    setShowDeleteCommentConfirm(commentId);
  };

  const deleteCommentHandler = async () => {
    if (!showDeleteCommentConfirm || !taskId) return;

    try {
      const comment = comments.find((c) => c.id === showDeleteCommentConfirm);
      if (!comment || !canDeleteComment(comment.assignee)) return;

      const res = await commentApi.deleteComment(showDeleteCommentConfirm);

      if (res.success) {
        const commentRes = await commentApi.getCommentsByTaskId(taskId);
        if (commentRes.success && commentRes.data) {
          setComments(commentRes.data);
        }
        setShowDeleteCommentConfirm(null);
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const addSubTask = async () => {
    if (
      !newSubTaskText.trim() ||
      !taskId ||
      !currentUserId ||
      !canManageSubTasks()
    )
      return;

    try {
      const subTaskData = {
        taskId: taskId,
        assignee: currentUserId,
        description: newSubTaskText,
        isCompleted: false,
      };

      const res = await subTaskApi.createSubTask(subTaskData);

      if (res.success) {
        const subTaskRes = await subTaskApi.getSubTasksByTaskId(taskId);
        if (subTaskRes.success && subTaskRes.data) {
          setSubTasks(subTaskRes.data);
        }
        setNewSubTaskText("");
        setShowAddSubTask(false);
      }
    } catch (error) {
      console.error("Error adding subtask:", error);
    }
  };

  const startEditingSubTask = (subTask: SubTask) => {
    if (!canManageSubTasks()) return;
    setEditingSubTaskId(subTask.id);
    setEditedSubTaskText(subTask.description);
  };

  const cancelEditingSubTask = () => {
    setEditingSubTaskId(null);
    setEditedSubTaskText("");
  };

  const saveEditedSubTask = async () => {
    if (
      !editingSubTaskId ||
      !editedSubTaskText.trim() ||
      !taskId ||
      !canManageSubTasks()
    )
      return;

    try {
      const existingSubTask = subTasks.find((st) => st.id === editingSubTaskId);
      if (!existingSubTask) return;

      const updatedSubTask = {
        ...existingSubTask,
        description: editedSubTaskText,
        updatedAt: new Date().toISOString(),
      };

      const res = await subTaskApi.updateSubTask(
        editingSubTaskId,
        updatedSubTask
      );

      if (res.success) {
        const subTaskRes = await subTaskApi.getSubTasksByTaskId(taskId);
        if (subTaskRes.success && subTaskRes.data) {
          setSubTasks(subTaskRes.data);
        }
        setEditingSubTaskId(null);
        setEditedSubTaskText("");
      }
    } catch (error) {
      console.error("Error updating subtask:", error);
    }
  };

  const confirmDeleteSubTask = (subTaskId: string) => {
    if (!canManageSubTasks()) return;
    setShowDeleteSubTaskConfirm(subTaskId);
  };

  const deleteSubTaskHandler = async () => {
    if (!showDeleteSubTaskConfirm || !taskId || !canManageSubTasks()) return;

    try {
      const res = await subTaskApi.deleteSubTask(showDeleteSubTaskConfirm);

      if (res.success) {
        const subTaskRes = await subTaskApi.getSubTasksByTaskId(taskId);
        if (subTaskRes.success && subTaskRes.data) {
          setSubTasks(subTaskRes.data);
        }
        setShowDeleteSubTaskConfirm(null);
      }
    } catch (error) {
      console.error("Error deleting subtask:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col bg-white">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6 bg-gray-50">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#27acaa] mx-auto mb-4"></div>
                <p className="text-gray-500">Loading task details...</p>
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
          <main className="flex-1 overflow-auto p-6 bg-gray-50">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
                <h2 className="mt-2 text-xl font-semibold text-gray-800">
                  Error
                </h2>
                <p className="mt-2 text-gray-600">{error}</p>
                <button
                  onClick={() => router.push("/tasks")}
                  className="mt-4 inline-block rounded-md bg-[#27acaa] px-4 py-2 font-medium text-white hover:bg-[#1d8a89]"
                >
                  Back to Tasks
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-screen w-full flex-col bg-white">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6 bg-gray-50">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-semibold">Task not found</h2>
                <p className="mt-2 text-gray-600">
                  The task you are looking for does not exist.
                </p>
                <button
                  onClick={() => router.push("/tasks")}
                  className="mt-4 inline-block rounded-md bg-[#27acaa] px-4 py-2 font-medium text-white hover:bg-[#1d8a89]"
                >
                  Back to Tasks
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Priority colors
  const priorityColors = {
    low: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-200",
      icon: "text-blue-500",
      gradient: "from-blue-50 to-blue-100",
    },
    med: {
      bg: "bg-orange-100",
      text: "text-orange-800",
      border: "border-orange-200",
      icon: "text-orange-500",
      gradient: "from-orange-50 to-orange-100",
    },
    high: {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-200",
      icon: "text-red-500",
      gradient: "from-red-50 to-red-100",
    },
  };

  // Status colors
  const statusColors = {
    todo: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-200",
      icon: "text-gray-500",
      gradient: "from-gray-50 to-gray-100",
    },
    "in-progress": {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-200",
      icon: "text-blue-500",
      gradient: "from-blue-50 to-blue-100",
    },
    done: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-200",
      icon: "text-green-500",
      gradient: "from-green-50 to-green-100",
    },
  };

  const priorityColor =
    priorityColors[task.priority as keyof typeof priorityColors] ||
    priorityColors.low;
  const statusColor = task.status
    ? statusColors[task.status as keyof typeof statusColors]
    : statusColors.todo;

  const completedSubtasks = subTasks.filter((st) => st.isCompleted).length;
  const totalSubtasks = subTasks.length;
  const completionPercentage =
    totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6">
            {/* Breadcrumb navigation */}
            <div className="mb-6">
              <div className="flex items-center text-sm text-gray-500">
                <button
                  onClick={() => router.push("/tasks")}
                  className="hover:text-[#27acaa] transition-colors"
                >
                  Tasks
                </button>
                <ChevronRight className="h-4 w-4 mx-2" />
                <span className="font-medium text-gray-900">Task Details</span>
              </div>
            </div>

            {/* Back button and title */}
            <div className="mb-8 flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 rounded-full p-2 text-gray-500 hover:bg-white hover:text-[#27acaa] hover:shadow-sm transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Task Details</h1>
            </div>

            {/* Task header card */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="relative">
                {/* Colored top border based on priority */}
                <div className={`h-1.5 w-full ${priorityColor.bg}`}></div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColor.bg} ${priorityColor.text} ${priorityColor.border} flex items-center`}
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {task.priority.charAt(0).toUpperCase() +
                          task.priority.slice(1)}{" "}
                        Priority
                      </span>
                      {task.status && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text} ${statusColor.border} flex items-center`}
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {task.status === "todo"
                            ? "To Do"
                            : task.status === "in-progress"
                            ? "In Progress"
                            : "Done"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {canEditTask() && (
                        <button
                          onClick={() => router.push(`/tasks/${task.id}/edit`)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                      )}
                      {canDeleteTask() && (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-300 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 hover:shadow-sm transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    {task.text}
                  </h2>

                  {/* Task metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <UserIcon
                        className={`h-5 w-5 mr-3 ${priorityColor.icon}`}
                      />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Assigned to
                        </p>
                        <div className="flex items-center">
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center text-xs text-white mr-2"
                            style={{
                              backgroundColor: getAvatarColor(task.assignee),
                            }}
                          >
                            {getInitials(assignee)}
                          </div>
                          <span className="text-sm font-medium">
                            {assignee?.name} {assignee?.lastname}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <Calendar
                        className={`h-5 w-5 mr-3 ${priorityColor.icon}`}
                      />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Due date</p>
                        <p className="text-sm font-medium">
                          {new Date(task.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <Briefcase
                        className={`h-5 w-5 mr-3 ${priorityColor.icon}`}
                      />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Project</p>
                        <p className="text-sm font-medium">
                          {project?.title || "Not assigned"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar for subtasks */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Progress ({completedSubtasks}/{totalSubtasks} subtasks)
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {completionPercentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#27acaa] rounded-full transition-all duration-500 ease-in-out"
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all">
                      <LinkIcon className="h-4 w-4" />
                      <span>Copy link</span>
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all">
                      <ExternalLink className="h-4 w-4" />
                      <span>Open in new tab</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200 bg-white rounded-t-xl shadow-sm">
              <div className="flex">
                <button
                  className={`flex items-center gap-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "details"
                      ? "border-b-2 border-[#27acaa] text-[#444444] bg-white"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveTab("details")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Details
                </button>
                <button
                  className={`flex items-center gap-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "subtasks"
                      ? "border-b-2 border-[#27acaa] text-[#444444] bg-white"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveTab("subtasks")}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Sub-tasks ({completedSubtasks}/{totalSubtasks})
                </button>
                <button
                  className={`flex items-center gap-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === "comments"
                      ? "border-b-2 border-[#27acaa] text-[#444444] bg-white"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveTab("comments")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Comments ({comments.length})
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-b-xl shadow-sm p-6 mb-8">
              {/* Details Tab */}
              {activeTab === "details" && (
                <div className="space-y-8">
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-[#27acaa]" />
                        Task Information
                      </h3>
                      {canEditTask() && (
                        <button
                          onClick={() => router.push(`/tasks/${task.id}/edit`)}
                          className="text-sm text-[#27acaa] hover:text-[#1d8a89] hover:underline flex items-center transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center p-3 rounded-lg bg-white border border-gray-100 hover:border-[#27acaa] transition-colors">
                          <UserIcon className="h-4 w-4 text-gray-500 mr-3" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-600 block mb-1">
                              Assigned to:
                            </span>
                            <div className="flex items-center">
                              <div
                                className="h-6 w-6 rounded-full flex items-center justify-center text-xs text-white"
                                style={{
                                  backgroundColor: getAvatarColor(
                                    task.assignee
                                  ),
                                }}
                              >
                                {getInitials(assignee)}
                              </div>
                              <span className="text-sm ml-2 font-medium">
                                {assignee?.name} {assignee?.lastname}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center p-3 rounded-lg bg-white border border-gray-100 hover:border-[#27acaa] transition-colors">
                          <Calendar className="h-4 w-4 text-gray-500 mr-3" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-600 block mb-1">
                              Due date:
                            </span>
                            <span className="text-sm font-medium">
                              {new Date(task.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center p-3 rounded-lg bg-white border border-gray-100 hover:border-[#27acaa] transition-colors">
                          <Briefcase className="h-4 w-4 text-gray-500 mr-3" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-600 block mb-1">
                              Project:
                            </span>
                            <span className="text-sm font-medium">
                              {project?.title || "Not assigned"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center p-3 rounded-lg bg-white border border-gray-100 hover:border-[#27acaa] transition-colors">
                          <Layers className="h-4 w-4 text-gray-500 mr-3" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-600 block mb-1">
                              Phase:
                            </span>
                            <span className="text-sm font-medium">
                              {deliverablePhase?.title || "Not assigned"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center p-3 rounded-lg bg-white border border-gray-100 hover:border-[#27acaa] transition-colors">
                          <FileText className="h-4 w-4 text-gray-500 mr-3" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-600 block mb-1">
                              Deliverable:
                            </span>
                            <span className="text-sm font-medium">
                              {deliverable?.title || "Not assigned"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center p-3 rounded-lg bg-white border border-gray-100 hover:border-[#27acaa] transition-colors">
                        <UserIcon className="h-4 w-4 text-gray-500 mr-3" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-600 block mb-1">
                            Project Manager:
                          </span>
                          <div className="flex items-center">
                            <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs text-white bg-[#27acaa]">
                              {getInitials(projectManager)}
                            </div>
                            <span className="text-sm ml-2 font-medium">
                              {projectManager?.name} {projectManager?.lastname}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <MessageSquare className="h-5 w-5 mr-2 text-[#27acaa]" />
                        Description
                      </h3>
                      {canEditTask() && (
                        <button
                          onClick={() => router.push(`/tasks/${task.id}/edit`)}
                          className="text-sm text-[#27acaa] hover:text-[#1d8a89] hover:underline flex items-center transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                      )}
                    </div>

                    <div className="p-4 bg-white rounded-lg border border-gray-100">
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">
                        {task.text || "No description provided."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtasks Tab */}
              {activeTab === "subtasks" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <CheckSquare className="h-5 w-5 mr-2 text-[#27acaa]" />
                      Sub-tasks ({completedSubtasks}/{totalSubtasks})
                    </h3>
                    {canManageSubTasks() && (
                      <button
                        onClick={() => setShowAddSubTask(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#27acaa] text-white rounded-md text-sm font-medium hover:bg-[#1d8a89] transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Add Sub-task
                      </button>
                    )}
                  </div>

                  {showAddSubTask && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 animate-fadeIn">
                      <textarea
                        className="w-full min-h-[80px] p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#27acaa] focus:ring-1 focus:ring-[#27acaa] resize-none transition-all"
                        placeholder="Enter subtask description..."
                        value={newSubTaskText}
                        onChange={(e) => setNewSubTaskText(e.target.value)}
                      ></textarea>
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => {
                            setShowAddSubTask(false);
                            setNewSubTaskText("");
                          }}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addSubTask}
                          className="px-3 py-1.5 bg-[#27acaa] text-white rounded-md text-sm font-medium hover:bg-[#1d8a89] transition-colors"
                        >
                          Add Sub-task
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {subTasks.map((subTask) => (
                      <div
                        key={subTask.id}
                        className="group flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-[#27acaa] transition-colors"
                      >
                        <div className="flex items-center flex-1">
                          {canManageSubTasks() ? (
                            <input
                              type="checkbox"
                              checked={subTask.isCompleted}
                              onChange={() =>
                                toggleSubtaskCompletion(subTask.id)
                              }
                              className="h-4 w-4 rounded border-gray-300 text-[#27acaa] focus:ring-[#27acaa] cursor-pointer"
                            />
                          ) : (
                            <div
                              className={`h-4 w-4 rounded border ${
                                subTask.isCompleted
                                  ? "bg-[#27acaa]"
                                  : "border-gray-300"
                              }`}
                            />
                          )}
                          {editingSubTaskId === subTask.id ? (
                            <input
                              type="text"
                              value={editedSubTaskText}
                              onChange={(e) =>
                                setEditedSubTaskText(e.target.value)
                              }
                              className="ml-3 flex-1 p-1 border border-gray-300 rounded focus:outline-none focus:border-[#27acaa]"
                              autoFocus
                            />
                          ) : (
                            <span
                              className={`ml-3 text-sm ${
                                subTask.isCompleted
                                  ? "line-through text-gray-500"
                                  : "text-gray-700"
                              }`}
                            >
                              {subTask.description}
                            </span>
                          )}
                        </div>

                        {canManageSubTasks() && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {editingSubTaskId === subTask.id ? (
                              <>
                                <button
                                  onClick={saveEditedSubTask}
                                  className="text-[#27acaa] hover:text-[#1d8a89]"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={cancelEditingSubTask}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditingSubTask(subTask)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    confirmDeleteSubTask(subTask.id)
                                  }
                                  className="text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {subTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No sub-tasks yet</p>
                      {canManageSubTasks() && (
                        <button
                          onClick={() => setShowAddSubTask(true)}
                          className="mt-2 text-[#27acaa] hover:text-[#1d8a89] text-sm"
                        >
                          Add the first sub-task
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Comments Tab */}
              {activeTab === "comments" && (
                <div className="space-y-6">
                  {canManageComments() && (
                    <div className="mb-6">
                      <textarea
                        className="w-full min-h-[100px] p-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#27acaa] focus:ring-1 focus:ring-[#27acaa] resize-none transition-all"
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      ></textarea>
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={addComment}
                          disabled={!newComment.trim()}
                          className="px-4 py-2 bg-[#27acaa] text-white rounded-md text-sm font-medium hover:bg-[#1d8a89] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Post Comment
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:border-[#27acaa] transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-sm text-white mr-2"
                              style={{
                                backgroundColor: getAvatarColor(
                                  comment.assignee
                                ),
                              }}
                            >
                              {getInitials(assignees[comment.assignee])}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">
                                {assignees[comment.assignee]?.name}{" "}
                                {assignees[comment.assignee]?.lastname}
                              </span>
                              <p className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canModifyComment(comment.assignee) && (
                              <button
                                onClick={() => startEditingComment(comment)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                            {canDeleteComment(comment.assignee) && (
                              <button
                                onClick={() => confirmDeleteComment(comment.id)}
                                className="text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        {editingCommentId === comment.id ? (
                          <div>
                            <textarea
                              value={editedCommentText}
                              onChange={(e) =>
                                setEditedCommentText(e.target.value)
                              }
                              className="w-full min-h-[80px] p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#27acaa] focus:ring-1 focus:ring-[#27acaa] resize-none transition-all"
                            ></textarea>
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={cancelEditingComment}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={saveEditedComment}
                                className="px-3 py-1.5 bg-[#27acaa] text-white rounded-md text-sm font-medium hover:bg-[#1d8a89] transition-colors"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">
                            {comment.description}
                          </p>
                        )}
                      </div>
                    ))}

                    {/* No comments message */}
                    {comments.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No comments yet</p>
                        {canManageComments() && (
                          <p className="text-sm mt-1">
                            Be the first to comment!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Delete Task Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Delete Task</h2>
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete this task? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Comment Confirmation Modal */}
      {showDeleteCommentConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Delete Comment</h2>
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteCommentConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={deleteCommentHandler}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Sub-task Confirmation Modal */}
      {showDeleteSubTaskConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Delete Sub-task</h2>
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete this sub-task? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteSubTaskConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={deleteSubTaskHandler}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetailsPage;
