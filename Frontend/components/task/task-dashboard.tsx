"use client";

import { useState, useEffect } from "react";
import { Plus, Filter, Search, ChevronDown } from "lucide-react";
import TaskColumn from "./task-column";
import type { Task } from "@/app/types/task";
import type { Project } from "@/app/types/project";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import TaskCard from "./task-card";
import { useRouter } from "next/navigation";
import { taskApi } from "@/services/task-api";
import { projectApi } from "@/services/project-api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

export default function TaskDashboard() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Record<string, Task[]>>({
    todo: [],
    inProgress: [],
    done: [],
  });
  const [filteredTasks, setFilteredTasks] = useState<Record<string, Task[]>>({
    todo: [],
    inProgress: [],
    done: [],
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    assignee: string | null;
    project: string | null;
    deliverable: string | null;
    deliverablePhase: string | null;
    date: string | null;
    priority: string | null;
  }>({
    assignee: null,
    project: null,
    deliverable: null,
    deliverablePhase: null,
    date: null,
    priority: null,
  });
  const [projects, setProjects] = useState<
    { id: string; name: string; taskCount: number }[]
  >([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Fetch data only on initial load or when explicitly triggered
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = Cookies.get("token");
        if (!token) {
          console.warn("No token found");
          setIsLoading(false);
          return;
        }

        const decoded: any = jwtDecode(token);
        const userId =
          decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
        const role =
          decoded[
            "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
          ];
        setRole(role);
        setUserId(userId);

        // Get all projects and tasks
        const [projectsResponse, tasksResponse] = await Promise.all([
          projectApi.getProjects(),
          taskApi.getTasks(),
        ]);

        // Process tasks
        if (tasksResponse.success && tasksResponse.data) {
          const fetchedTasks: Task[] = tasksResponse.data as Task[];
          setAllTasks(fetchedTasks);

          // Filter tasks by user permissions
          const visibleTasks = fetchedTasks.filter(
            (task) =>
              role === "Admin" ||
              role === "ProjectManager" ||
              task.assignee === userId
          );

          // Group tasks by status
          const organizedTasks = groupTasksByStatus(visibleTasks);
          setTasks(organizedTasks);
          setFilteredTasks(organizedTasks);

          // Process projects
          if (projectsResponse.success && projectsResponse.data) {
            const allProjects: Project[] = projectsResponse.data as Project[];

            // Filter projects where user is a member or project manager
            const userProjects = allProjects.filter(
              (project) =>
                role === "Admin" ||
                project.members.includes(userId) ||
                project.projectManager === userId
            );

            // Count tasks per project
            const projectsWithTaskCount = userProjects.map((project) => ({
              id: project.id,
              name: project.title, // Map title → name
              taskCount: fetchedTasks.filter(
                (task) => task.projectId === project.id
              ).length,
            }));

            setProjects(projectsWithTaskCount);

            // Optionally select first project
            if (projectsWithTaskCount.length > 0) {
              setSelectedProjectId(projectsWithTaskCount[0].id);

              // Filter tasks for the first project
              const tasksForFirstProject = visibleTasks.filter(
                (task) => task.projectId === projectsWithTaskCount[0].id
              );

              const groupedTasks = groupTasksByStatus(tasksForFirstProject);
              setTasks(groupedTasks);
              setFilteredTasks(groupedTasks);
            }
          }
        } else {
          console.error(tasksResponse.message || "Failed to fetch tasks");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Remove dependency on activeId

  // Group tasks by status
  const groupTasksByStatus = (tasksToGroup: Task[]) => {
    const grouped: Record<string, Task[]> = {
      todo: [],
      inProgress: [],
      done: [],
    };

    tasksToGroup.forEach((task) => {
      if (task.status === "todo") grouped.todo.push(task);
      else if (task.status === "in-progress") grouped.inProgress.push(task);
      else if (task.status === "done") grouped.done.push(task);
    });

    return grouped;
  };

  // Handle project selection
  const handleProjectSelect = (projectId: string | null) => {
    setSelectedProjectId(projectId);

    const token = Cookies.get("token");
    if (!token) return;

    const decoded: any = jwtDecode(token);
    const userId =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
    const role =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

    // Filter tasks by project and user permissions
    const filteredByProject = projectId
      ? allTasks.filter((task) => task.projectId === projectId)
      : allTasks;

    const visibleTasks = filteredByProject.filter(
      (task) =>
        role === "Admin" ||
        role === "ProjectManager" ||
        task.assignee === userId
    );

    const groupedTasks = groupTasksByStatus(visibleTasks);
    setTasks(groupedTasks);
    setFilteredTasks(groupedTasks);
  };

  // Apply filters and search to tasks
  useEffect(() => {
    const newFilteredTasks: Record<string, Task[]> = {};

    Object.keys(tasks).forEach((column) => {
      newFilteredTasks[column] = tasks[column].filter((task) => {
        // Search filter
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          const textMatch = task.text.toLowerCase().includes(searchLower);
          if (!textMatch) return false;
        }

        if (filters.assignee && task.assignee !== filters.assignee)
          return false;
        if (filters.project && task.projectId !== filters.project) return false;
        if (filters.deliverable && task.deliverableId !== filters.deliverable)
          return false;
        if (
          filters.deliverablePhase &&
          task.deliverablePhaseId !== filters.deliverablePhase
        )
          return false;
        if (filters.priority && task.priority !== filters.priority)
          return false;

        if (filters.date) {
          const taskDate = new Date(task.date);
          const filterDate = new Date(filters.date);
          if (
            taskDate.getFullYear() !== filterDate.getFullYear() ||
            taskDate.getMonth() !== filterDate.getMonth() ||
            taskDate.getDate() !== filterDate.getDate()
          ) {
            return false;
          }
        }
        return true;
      });
    });

    // Only update filtered tasks if we're not in the middle of a drag operation
    if (!activeId) {
      setFilteredTasks(newFilteredTasks);
    }
  }, [tasks, filters, searchQuery, activeId]);

  // Utility function to find container of a task
  const findContainer = (id: string) => {
    if (id in tasks) return id;

    return Object.keys(tasks).find((key) =>
      tasks[key].some((item) => item.id === id)
    );
  };

  // Map column ID to status
  const mapColumnIdToStatus = (
    columnId: string
  ): "todo" | "in-progress" | "done" => {
    switch (columnId) {
      case "todo":
        return "todo";
      case "inProgress":
        return "in-progress";
      case "done":
        return "done";
      default:
        return "todo"; // fallback
    }
  };

  // Check if user has permission to drag a task
  const canDragTask = (taskId: string): boolean => {
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return false;

    // Admin can drag any task
    if (role === "Admin") return true;

    // Get user ID from token
    const token = Cookies.get("token");
    if (!token) return false;

    const decoded: any = jwtDecode(token);
    const userId =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];

    // Task assignee can drag their own task
    if (task.assignee === userId) return true;

    // Project manager can drag tasks in their projects
    if (role === "ProjectManager") {
      const project = projects.find((p) => p.id === task.projectId);
      if (project) {
        // We need to check if the user is the project manager
        // Since we only have the project ID in our local state, we'll assume
        // the user has already been filtered to only see projects they manage
        return true;
      }
    }

    return false;
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;

    // Check if user has permission to drag this task
    if (!canDragTask(id)) {
      // Prevent drag operation by returning early
      return;
    }

    const container = findContainer(id);

    if (container) {
      const index = tasks[container].findIndex((item) => item.id === id);
      if (index !== -1) {
        setActiveId(id);
        setActiveTask(tasks[container][index]);
      }
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setActiveTask(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the source container
    const activeContainer = findContainer(activeId);
    if (!activeContainer) {
      setActiveId(null);
      setActiveTask(null);
      return;
    }

    // Determine target container
    let targetContainer = overId;
    if (overId !== "todo" && overId !== "inProgress" && overId !== "done") {
      // Dropping over another task, find its container
      targetContainer = findContainer(overId) || activeContainer;
    }

    // Find the task being moved
    const activeIndex = tasks[activeContainer].findIndex(
      (item) => item.id === activeId
    );
    if (activeIndex === -1) {
      setActiveId(null);
      setActiveTask(null);
      return;
    }

    const taskToMove = tasks[activeContainer][activeIndex];

    // If moving to the same container, just reorder
    if (activeContainer === targetContainer) {
      if (overId !== "todo" && overId !== "inProgress" && overId !== "done") {
        // Reordering within same container
        const overIndex = tasks[activeContainer].findIndex(
          (item) => item.id === overId
        );
        if (overIndex !== -1 && activeIndex !== overIndex) {
          const reorderedItems = arrayMove(
            tasks[activeContainer],
            activeIndex,
            overIndex
          );

          setTasks((prev) => ({
            ...prev,
            [activeContainer]: reorderedItems,
          }));
        }
      }
      setActiveId(null);
      setActiveTask(null);
      return;
    }

    // Moving to different container - update status
    const newStatus = mapColumnIdToStatus(targetContainer);
    const updatedTask = { ...taskToMove, status: newStatus };

    // Store original state for potential rollback
    const originalTasks = { ...tasks };
    const originalFilteredTasks = { ...filteredTasks };
    const originalAllTasks = [...allTasks];

    // Optimistically update all states immediately
    const newTasks = {
      ...tasks,
      [activeContainer]: tasks[activeContainer].filter(
        (item) => item.id !== activeId
      ),
      [targetContainer]: [...tasks[targetContainer], updatedTask],
    };

    const newFilteredTasks = { ...filteredTasks };
    newFilteredTasks[activeContainer] =
      filteredTasks[activeContainer]?.filter((item) => item.id !== activeId) ||
      [];

    // Only add to filtered if it passes current filters
    const passesFilters = checkTaskPassesFilters(updatedTask);
    if (passesFilters) {
      newFilteredTasks[targetContainer] = [
        ...(filteredTasks[targetContainer] || []),
        updatedTask,
      ];
    }

    const newAllTasks = allTasks.map((t) =>
      t.id === taskToMove.id ? updatedTask : t
    );

    // Apply all updates at once
    setTasks(newTasks);
    setFilteredTasks(newFilteredTasks);
    setAllTasks(newAllTasks);

    // Make API call
    try {
      const response = await taskApi.updateTaskStatus(taskToMove.id, newStatus);
      if (!response.success) {
        console.error("Failed to update task status:", response.message);
        // Revert all changes on API failure
        setTasks(originalTasks);
        setFilteredTasks(originalFilteredTasks);
        setAllTasks(originalAllTasks);
      }
      // If successful, keep the optimistic updates
    } catch (error) {
      console.error("Error updating task status:", error);
      // Revert all changes on error
      setTasks(originalTasks);
      setFilteredTasks(originalFilteredTasks);
      setAllTasks(originalAllTasks);
    }

    setActiveId(null);
    setActiveTask(null);
  };

  // Helper function to check if task passes current filters
  const checkTaskPassesFilters = (task: Task): boolean => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const textMatch = task.text.toLowerCase().includes(searchLower);
      if (!textMatch) return false;
    }

    if (filters.assignee && task.assignee !== filters.assignee) return false;
    if (filters.project && task.projectId !== filters.project) return false;
    if (filters.deliverable && task.deliverableId !== filters.deliverable)
      return false;
    if (
      filters.deliverablePhase &&
      task.deliverablePhaseId !== filters.deliverablePhase
    )
      return false;
    if (filters.priority && task.priority !== filters.priority) return false;

    if (filters.date) {
      const taskDate = new Date(task.date);
      const filterDate = new Date(filters.date);
      if (
        taskDate.getFullYear() !== filterDate.getFullYear() ||
        taskDate.getMonth() !== filterDate.getMonth() ||
        taskDate.getDate() !== filterDate.getDate()
      ) {
        return false;
      }
    }
    return true;
  };

  // Handle drag over - for dropping into empty containers
  const handleDragOver = (event: DragOverEvent) => {
    // We'll handle all the logic in handleDragEnd for consistency
    return;
  };

  const handleTaskDelete = (taskId: string) => {
    // Update main tasks state
    setTasks((prevTasks) => {
      const updatedTasks = { ...prevTasks };
      Object.keys(updatedTasks).forEach((status) => {
        updatedTasks[status] = updatedTasks[status].filter(
          (task) => task.id !== taskId
        );
      });
      return updatedTasks;
    });

    // Update filtered tasks state
    setFilteredTasks((prevFiltered) => {
      const updatedFiltered = { ...prevFiltered };
      Object.keys(updatedFiltered).forEach((status) => {
        updatedFiltered[status] = updatedFiltered[status].filter(
          (task) => task.id !== taskId
        );
      });
      return updatedFiltered;
    });

    // Update all tasks array
    setAllTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const totalTasks = Object.values(filteredTasks).reduce(
    (acc, column) => acc + column.length,
    0
  );

  return (
    <div className="h-full">
      {/* Header with title and actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#444444]">Tasks</h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search input */}
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm placeholder-gray-400 shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]"
            />
          </div>

          {/* Add task button */}
          {role !== "TeamMember" && (
            <button
              onClick={() => router.push("/tasks/add")}
              className="flex items-center gap-1.5 rounded-lg border border-[#ffe500] bg-[#ffe500] px-3 py-2 text-sm font-medium text-[#444444] shadow-sm hover:bg-[#f5dc00] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter panel - Only show when filters are toggled */}
      {showFilters && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Project
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]"
                value={selectedProjectId || ""}
                onChange={(e) => handleProjectSelect(e.target.value || null)}
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.taskCount})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]"
                value={filters.priority || ""}
                onChange={(e) =>
                  setFilters({ ...filters, priority: e.target.value || null })
                }
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="med">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Due Date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]"
                value={filters.date || ""}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value || null })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Assignee
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]"
                value={filters.assignee || ""}
                onChange={(e) =>
                  setFilters({ ...filters, assignee: e.target.value || null })
                }
              >
                <option value="">All Assignees</option>
                {/* Add assignee options here */}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              onClick={() =>
                setFilters({
                  assignee: null,
                  project: null,
                  deliverable: null,
                  deliverablePhase: null,
                  date: null,
                  priority: null,
                })
              }
            >
              Reset
            </button>
            <button
              className="rounded-lg border border-[#ffe500] bg-[#ffe500] px-4 py-2 text-sm font-medium text-[#444444] shadow-sm hover:bg-[#f5dc00]"
              onClick={() => setShowFilters(false)}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Project selector */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Project:</span>
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              !selectedProjectId
                ? "bg-[#ffe500] text-[#444444]"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleProjectSelect(null)}
          >
            All Projects
          </button>
          {projects.map((project) => (
            <button
              key={project.id}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                selectedProjectId === project.id
                  ? "bg-[#ffe500] text-[#444444]"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => handleProjectSelect(project.id)}
            >
              {project.name}{" "}
              <span className="text-xs">({project.taskCount})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tasks count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {totalTasks} task{totalTasks !== 1 ? "s" : ""}
        {searchQuery && <span> matching "{searchQuery}"</span>}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#ffe500] border-t-transparent"></div>
            <p className="mt-4 text-gray-500">Loading tasks...</p>
          </div>
        </div>
      ) : (
        /* Tasks Dashboard */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <TaskColumn
              title="To Do"
              count={filteredTasks.todo?.length || 0}
              total={tasks.todo?.length || 0}
              tasks={filteredTasks.todo || []}
              id="todo"
              onTaskDelete={handleTaskDelete}
            />
            <TaskColumn
              title="In Progress"
              count={filteredTasks.inProgress?.length || 0}
              total={tasks.inProgress?.length || 0}
              tasks={filteredTasks.inProgress || []}
              id="inProgress"
              onTaskDelete={handleTaskDelete}
            />
            <TaskColumn
              title="Done"
              count={filteredTasks.done?.length || 0}
              total={tasks.done?.length || 0}
              tasks={filteredTasks.done || []}
              id="done"
              onTaskDelete={handleTaskDelete}
            />
          </div>
          <DragOverlay>
            {activeId && activeTask ? (
              <TaskCard task={activeTask} index={0} isDragging={true} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
