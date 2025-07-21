"use client";

import { useState, useEffect } from "react";
import { Plus, Filter, Search, ChevronDown } from "lucide-react";
import DeliverableColumn from "./deliverable-column";
import type { Deliverable } from "@/app/types/deliverable";
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
import DeliverableCard from "./deliverable-card";
import { useRouter } from "next/navigation";
import {
  getDeliverables,
  updateDeliverableStatus,
} from "@/services/deliverable-api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import type { Project } from "@/app/types/project";
import { projectApi } from "@/services/project-api";

export default function DeliverablesDashboard() {
  const router = useRouter();
  const [deliverables, setDeliverables] = useState<
    Record<string, Deliverable[]>
  >({
    todo: [],
    inProgress: [],
    done: [],
  });
  const [filteredDeliverables, setFilteredDeliverables] = useState<
    Record<string, Deliverable[]>
  >({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDeliverable, setActiveDeliverable] =
    useState<Deliverable | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    assignees: string[] | null;
    project: string | null;
    deliverablePhase: string | null;
    priority: string | null;
    priorityNumber: number | null;
    date: string | null;
  }>({
    assignees: null,
    project: null,
    deliverablePhase: null,
    priority: null,
    priorityNumber: null,
    date: null,
  });
  const [projects, setProjects] = useState<
    { id: string; name: string; deliverableCount: number }[]
  >([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [allDeliverables, setAllDeliverables] = useState<Deliverable[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
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

        // Get all projects and deliverables
        const [projectsResponse, deliverablesResponse] = await Promise.all([
          projectApi.getProjects(),
          getDeliverables(),
        ]);

        const allProjects: Project[] = Array.isArray(projectsResponse.data)
          ? (projectsResponse.data as Project[])
          : [];
        const allDeliverables: Deliverable[] = Array.isArray(
          deliverablesResponse?.data
        )
          ? deliverablesResponse.data
          : [];

        setAllDeliverables(allDeliverables);

        // Filter projects where user is a member or project manager
        const userProjects = allProjects.filter(
          (project) =>
            role === "Admin" ||
            project.members.includes(userId) ||
            project.projectManager === userId
        );

        setProjects(
          userProjects.map((project) => ({
            id: project.id,
            name: project.title, // Map title → name
            deliverableCount: allDeliverables.filter(
              (d) => d.projectId === project.id
            ).length,
          }))
        );

        // Optionally select first project and load deliverables
        if (userProjects.length > 0) {
          const firstProject = userProjects[0];
          setSelectedProjectId(firstProject.id);

          const deliverablesForFirstProject = allDeliverables.filter(
            (d) =>
              d.projectId === firstProject.id &&
              (role === "Admin" ||
                role === "ProjectManager" ||
                d.assignee.includes(userId))
          );

          groupDeliverablesByStatus(deliverablesForFirstProject);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const groupDeliverablesByStatus = (deliverablesToGroup: Deliverable[]) => {
    const grouped: Record<string, Deliverable[]> = {
      todo: [],
      inProgress: [],
      done: [],
    };

    deliverablesToGroup.forEach((d) => {
      if (d.status === "todo") grouped.todo.push(d);
      else if (d.status === "in-progress") grouped.inProgress.push(d);
      else if (d.status === "done") grouped.done.push(d);
    });

    setDeliverables(grouped);
    setFilteredDeliverables(grouped);
  };

  const handleProjectSelect = (projectId: string | null) => {
    setSelectedProjectId(projectId);

    const token = Cookies.get("token");
    if (!token) return;

    const decoded: any = jwtDecode(token);
    const userId =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
    const role =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

    const filteredByProject = projectId
      ? allDeliverables.filter((d) => d.projectId === projectId)
      : allDeliverables;

    const visibleDeliverables = filteredByProject.filter(
      (d) =>
        role === "Admin" ||
        role === "ProjectManager" ||
        d.assignee.includes(userId)
    );

    groupDeliverablesByStatus(visibleDeliverables);
  };

  // Apply filters and search to deliverables
  useEffect(() => {
    const newFilteredDeliverables: Record<string, Deliverable[]> = {};

    Object.keys(deliverables).forEach((column) => {
      newFilteredDeliverables[column] = deliverables[column].filter(
        (deliverable) => {
          // Search filter
          if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const titleMatch = deliverable.title
              .toLowerCase()
              .includes(searchLower);
            const descMatch = deliverable.description
              ? deliverable.description.toLowerCase().includes(searchLower)
              : false;

            if (!titleMatch && !descMatch) return false;
          }

          // Filter by assignees (multi-select)
          if (filters.assignees && filters.assignees.length > 0) {
            const hasMatchingAssignee = filters.assignees.some((a) =>
              deliverable.assignee.includes(a)
            );
            if (!hasMatchingAssignee) return false;
          }

          // Filter by project
          if (filters.project && deliverable.projectId !== filters.project) {
            return false;
          }

          // Filter by deliverable phase
          if (
            filters.deliverablePhase &&
            deliverable.deliverablePhaseId !== filters.deliverablePhase
          ) {
            return false;
          }

          // Filter by priority
          if (filters.priority && deliverable.priority !== filters.priority) {
            return false;
          }

          // Filter by priority number
          if (
            filters.priorityNumber &&
            deliverable.priorityNumber !== filters.priorityNumber
          ) {
            return false;
          }

          // Filter by date
          if (filters.date) {
            const deliverableDate = new Date(deliverable.date);
            const filterDate = new Date(filters.date);

            if (
              deliverableDate.getFullYear() !== filterDate.getFullYear() ||
              deliverableDate.getMonth() !== filterDate.getMonth() ||
              deliverableDate.getDate() !== filterDate.getDate()
            ) {
              return false;
            }
          }

          return true;
        }
      );
    });

    setFilteredDeliverables(newFilteredDeliverables);
  }, [deliverables, filters, searchQuery]);

  // Utility function to find container of a deliverable
  const findContainer = (id: string) => {
    if (id in deliverables) return id;

    return Object.keys(deliverables).find((key) =>
      deliverables[key].some((item) => item.id === id)
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

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;
    const container = findContainer(id);

    if (container) {
      const index = deliverables[container].findIndex((item) => item.id === id);
      if (index !== -1) {
        setActiveId(id);
        setActiveDeliverable(deliverables[container][index]);
      }
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setActiveDeliverable(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the source container
    const activeContainer = findContainer(activeId);
    if (!activeContainer) {
      setActiveId(null);
      setActiveDeliverable(null);
      return;
    }

    // Find the deliverable being moved
    const activeIndex = deliverables[activeContainer].findIndex(
      (item) => item.id === activeId
    );
    if (activeIndex === -1) {
      setActiveId(null);
      setActiveDeliverable(null);
      return;
    }

    const deliverableToMove = deliverables[activeContainer][activeIndex];

    // Determine target container
    let targetContainer = overId;
    if (overId !== "todo" && overId !== "inProgress" && overId !== "done") {
      // Dropping over another deliverable, find its container
      targetContainer = findContainer(overId) || activeContainer;
    }

    // If moving to the same container, just reorder
    if (activeContainer === targetContainer) {
      if (overId !== "todo" && overId !== "inProgress" && overId !== "done") {
        // Reordering within same container
        const overIndex = deliverables[activeContainer].findIndex(
          (item) => item.id === overId
        );
        if (overIndex !== -1 && activeIndex !== overIndex) {
          const reorderedItems = arrayMove(
            deliverables[activeContainer],
            activeIndex,
            overIndex
          );

          setDeliverables((prev) => ({
            ...prev,
            [activeContainer]: reorderedItems,
          }));
        }
      }
      setActiveId(null);
      setActiveDeliverable(null);
      return;
    }

    // Moving to different container - update status
    const newStatus = mapColumnIdToStatus(targetContainer);
    const updatedDeliverable = { ...deliverableToMove, status: newStatus };

    // Optimistically update the UI first
    const newDeliverables = {
      ...deliverables,
      [activeContainer]: deliverables[activeContainer].filter(
        (item) => item.id !== activeId
      ),
      [targetContainer]: [...deliverables[targetContainer], updatedDeliverable],
    };

    setDeliverables(newDeliverables);

    // Also update filtered deliverables to ensure UI consistency
    setFilteredDeliverables((prev) => {
      const newFiltered = { ...prev };

      // Remove from source
      newFiltered[activeContainer] =
        prev[activeContainer]?.filter((item) => item.id !== activeId) || [];

      // Add to target (only if it passes current filters)
      const passesFilters = checkDeliverablePassesFilters(updatedDeliverable);
      if (passesFilters) {
        newFiltered[targetContainer] = [
          ...(prev[targetContainer] || []),
          updatedDeliverable,
        ];
      }

      return newFiltered;
    });

    // Update the allDeliverables array as well
    setAllDeliverables((prev) =>
      prev.map((d) => (d.id === deliverableToMove.id ? updatedDeliverable : d))
    );

    // Now make the API call
    try {
      const response = await updateDeliverableStatus(
        deliverableToMove.id,
        newStatus
      );

      if (!response.success) {
        console.error("Failed to update deliverable status:", response.message);
        // Revert the optimistic update
        setDeliverables(deliverables);
        setFilteredDeliverables(filteredDeliverables);
        setAllDeliverables((prev) =>
          prev.map((d) =>
            d.id === deliverableToMove.id ? deliverableToMove : d
          )
        );
      }
    } catch (error) {
      console.error("Error updating deliverable status:", error);
      // Revert the optimistic update
      setDeliverables(deliverables);
      setFilteredDeliverables(filteredDeliverables);
      setAllDeliverables((prev) =>
        prev.map((d) => (d.id === deliverableToMove.id ? deliverableToMove : d))
      );
    }

    setActiveId(null);
    setActiveDeliverable(null);
  };

  // Helper function to check if deliverable passes current filters
  const checkDeliverablePassesFilters = (deliverable: Deliverable): boolean => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const titleMatch = deliverable.title.toLowerCase().includes(searchLower);
      const descMatch = deliverable.description
        ? deliverable.description.toLowerCase().includes(searchLower)
        : false;

      if (!titleMatch && !descMatch) return false;
    }

    // Filter by assignees (multi-select)
    if (filters.assignees && filters.assignees.length > 0) {
      const hasMatchingAssignee = filters.assignees.some((a) =>
        deliverable.assignee.includes(a)
      );
      if (!hasMatchingAssignee) return false;
    }

    // Filter by project
    if (filters.project && deliverable.projectId !== filters.project) {
      return false;
    }

    // Filter by deliverable phase
    if (
      filters.deliverablePhase &&
      deliverable.deliverablePhaseId !== filters.deliverablePhase
    ) {
      return false;
    }

    // Filter by priority
    if (filters.priority && deliverable.priority !== filters.priority) {
      return false;
    }

    // Filter by priority number
    if (
      filters.priorityNumber &&
      deliverable.priorityNumber !== filters.priorityNumber
    ) {
      return false;
    }

    // Filter by date
    if (filters.date) {
      const deliverableDate = new Date(deliverable.date);
      const filterDate = new Date(filters.date);

      if (
        deliverableDate.getFullYear() !== filterDate.getFullYear() ||
        deliverableDate.getMonth() !== filterDate.getMonth() ||
        deliverableDate.getDate() !== filterDate.getDate()
      ) {
        return false;
      }
    }

    return true;
  };

  // Handle drag over - for dropping into empty containers
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // We'll handle all the logic in handleDragEnd for consistency
    return;
  };

  const handleDeliverableDelete = (deliverableId: string) => {
    // Update main deliverables state
    setDeliverables((prevDeliverables) => {
      const updatedDeliverables = { ...prevDeliverables };
      Object.keys(updatedDeliverables).forEach((status) => {
        updatedDeliverables[status] = updatedDeliverables[status].filter(
          (deliverable) => deliverable.id !== deliverableId
        );
      });
      return updatedDeliverables;
    });

    // Update filtered deliverables state
    setFilteredDeliverables((prevFiltered) => {
      const updatedFiltered = { ...prevFiltered };
      Object.keys(updatedFiltered).forEach((status) => {
        updatedFiltered[status] = updatedFiltered[status].filter(
          (deliverable) => deliverable.id !== deliverableId
        );
      });
      return updatedFiltered;
    });

    // Update all deliverables array
    setAllDeliverables((prev) => prev.filter((d) => d.id !== deliverableId));
  };

  const totalDeliverables = Object.values(filteredDeliverables).reduce(
    (acc, column) => acc + column.length,
    0
  );

  return (
    <div className="h-full">
      {/* Header with title and actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#444444]">Deliverables</h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search input */}
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm placeholder-gray-400 shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]"
            />
          </div>

          {/* Add deliverable button */}
          {role !== "TeamMember" && (
            <button
              onClick={() => router.push("/deliverables/add")}
              className="flex items-center gap-1.5 rounded-lg border border-[#ffe500] bg-[#ffe500] px-3 py-2 text-sm font-medium text-[#444444] shadow-sm hover:bg-[#f5dc00] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Deliverable</span>
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
                    {project.name} ({project.deliverableCount})
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
                Priority Number
              </label>
              <input
                type="number"
                min="1"
                placeholder="Priority #"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]"
                value={filters.priorityNumber || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    priorityNumber: e.target.value
                      ? Number.parseInt(e.target.value)
                      : null,
                  })
                }
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              onClick={() =>
                setFilters({
                  assignees: null,
                  project: null,
                  deliverablePhase: null,
                  priority: null,
                  priorityNumber: null,
                  date: null,
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
              <span className="text-xs">({project.deliverableCount})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Deliverables count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {totalDeliverables} deliverable
        {totalDeliverables !== 1 ? "s" : ""}
        {searchQuery && <span> matching "{searchQuery}"</span>}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#ffe500] border-t-transparent"></div>
            <p className="mt-4 text-gray-500">Loading deliverables...</p>
          </div>
        </div>
      ) : (
        /* Deliverables Dashboard */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <DeliverableColumn
              title="To Do"
              count={filteredDeliverables.todo?.length || 0}
              total={deliverables.todo?.length || 0}
              deliverables={filteredDeliverables.todo || []}
              id="todo"
              onDeliverableDelete={handleDeliverableDelete}
            />
            <DeliverableColumn
              title="In Progress"
              count={filteredDeliverables.inProgress?.length || 0}
              total={deliverables.inProgress?.length || 0}
              deliverables={filteredDeliverables.inProgress || []}
              id="inProgress"
              onDeliverableDelete={handleDeliverableDelete}
            />
            <DeliverableColumn
              title="Done"
              count={filteredDeliverables.done?.length || 0}
              total={deliverables.done?.length || 0}
              deliverables={filteredDeliverables.done || []}
              id="done"
              onDeliverableDelete={handleDeliverableDelete}
            />
          </div>
          <DragOverlay>
            {activeId && activeDeliverable ? (
              <DeliverableCard deliverable={activeDeliverable} index={0} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
