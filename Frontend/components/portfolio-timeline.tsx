"use client";

import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronDown,
  ChevronRightIcon,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  ListFilter,
  Search,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpDown,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import type { Project } from "@/app/types/project";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { getProjectById } from "@/services/project-api";
import CompactExcelImportModal from "@/components/excel-import-modal";

// Extend the Project type to include an optional status property
interface ExtendedProject extends Project {
  status?: "todo" | "in-progress" | "done";
}

import type { DeliverablePhase } from "@/app/types/deliverable-phase";
import type { Deliverable } from "@/app/types/deliverable";

// Add these props to the PortfolioTimelineProps interface
interface PortfolioTimelineProps {
  projects?: Project[];
  phases?: DeliverablePhase[];
  deliverables?: Record<string, Deliverable[]>; // key = deliverablePhaseId
  startDate?: string;
  endDate?: string;
  selectedProjectId?: string;
  autoExpandProject?: boolean;
}

const statusColors = {
  todo: "bg-gray-400",
  "in-progress": "bg-blue-400",
  done: "bg-green-500",
  default: "bg-gray-400",
};

const statusBadgeColors = {
  todo: "text-gray-500 bg-gray-100 border-gray-200",
  "in-progress": "text-blue-800 bg-blue-100 border-blue-200",
  done: "text-green-500 bg-green-100 border-green-200",
};

export default function PortfolioTimeline({
  projects: providedProjects = [],
  phases = [],
  deliverables = {},
  startDate: providedStartDate,
  endDate: providedEndDate,
  selectedProjectId,
  autoExpandProject = false,
}: PortfolioTimelineProps & {
  projects: (Project & { status?: string })[];
  phases: DeliverablePhase[];
  deliverables: Record<string, Deliverable[]>;
}) {
  const router = useRouter();
  const startDate = useMemo(
    () => (providedStartDate ? new Date(providedStartDate) : new Date()),
    [providedStartDate]
  );

  const endDate = useMemo(
    () =>
      providedEndDate
        ? new Date(providedEndDate)
        : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000),
    [providedEndDate, startDate]
  );

  const [projects, setProjects] = useState<ExtendedProject[]>(providedProjects);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    setProjects(providedProjects);
  }, [providedProjects]);

  const [initialized, setInitialized] = useState(false);
  const [selectedProjectIdState, setSelectedProjectIdState] = useState<
    string | null
  >(selectedProjectId || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "todo" | "in-progress" | "done"
  >("all");
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [visibleMonths, setVisibleMonths] = useState<Date[]>([]);
  const [startMonth, setStartMonth] = useState<Date>(
    new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  );
  const [monthsToShow, setMonthsToShow] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>(
    {}
  );
  const [role, setRole] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isAllowedToEdit, setIsAllowedToEdit] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const token = Cookies.get("token");
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const userId =
        decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      const role =
        decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      setRole(role);

      // Add this line to store the userId
      setUserId(userId);

      if (selectedProjectId) {
        const projectData = await getProjectById(selectedProjectId);
        if (projectData.success && projectData.data) {
          const isAdmin = role === "Admin";
          const isProjectManager =
            role === "ProjectManager" &&
            (projectData.data as { projectManager: string }).projectManager ===
              userId;
          setIsAllowedToEdit(isAdmin || isProjectManager);
        }
      }
    };

    fetchData();
  }, []);

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  // Update selectedProjectId when the prop changes
  useEffect(() => {
    if (selectedProjectId) {
      setSelectedProjectIdState(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Initialize expanded states once data is set
  useEffect(() => {
    if (phases.length > 0 && Object.keys(expandedPhases).length === 0) {
      const initialExpandedPhases: Record<string, boolean> = {};
      phases.forEach((phase) => {
        if (phase.id) {
          // If autoExpandProject is true, expand all phases by default
          initialExpandedPhases[phase.id] = autoExpandProject ? true : false;
        }
      });
      setExpandedPhases(initialExpandedPhases);
    }
  }, [phases, expandedPhases, autoExpandProject]);

  // Toggle phase expansion
  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  // Adjust months to show based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setMonthsToShow(1);
      } else if (window.innerWidth < 1024) {
        setMonthsToShow(2);
      } else {
        setMonthsToShow(3);
      }
    };

    handleResize(); // Set initial value
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Generate visible months whenever startMonth or monthsToShow changes
  useEffect(() => {
    const months = [];
    for (let i = 0; i < monthsToShow; i++) {
      const month = new Date(startMonth);
      month.setMonth(startMonth.getMonth() + i);
      months.push(month);
    }
    setVisibleMonths(months);
    setIsLoading(false);
  }, [startMonth, monthsToShow]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newStartMonth = new Date(startMonth);
    newStartMonth.setMonth(startMonth.getMonth() - 1);
    setStartMonth(newStartMonth);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newStartMonth = new Date(startMonth);
    newStartMonth.setMonth(startMonth.getMonth() + 1);
    setStartMonth(newStartMonth);
  };

  // Get all weeks in the visible range
  const getAllWeeks = useCallback(() => {
    if (!visibleMonths.length) return [];

    const weeks: { start: Date; end: Date }[] = [];

    // Start from the first day of the first visible month
    const firstDay = new Date(
      visibleMonths[0].getFullYear(),
      visibleMonths[0].getMonth(),
      1
    );

    // Find the Monday of the week containing the first day
    const firstMonday = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    firstMonday.setDate(
      firstDay.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    );

    // Last day of the last visible month
    const lastMonth = visibleMonths[visibleMonths.length - 1];
    const lastDay = new Date(
      lastMonth.getFullYear(),
      lastMonth.getMonth() + 1,
      0
    );

    // Generate weeks until we pass the last day
    const currentWeekStart = new Date(firstMonday);

    while (currentWeekStart <= lastDay) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);

      weeks.push({
        start: new Date(currentWeekStart),
        end: new Date(weekEnd),
      });

      // Move to next Monday
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return weeks;
  }, [visibleMonths]);

  // Memoize weeks calculation to prevent recalculation on every render
  const weeks = useMemo(() => getAllWeeks(), [getAllWeeks]);

  // Format date for display
  const formatMonth = (date: Date) => {
    try {
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  // Format week for display
  const formatWeek = (start: Date, end: Date) => {
    try {
      return `${start.getDate()} - ${end.getDate()}`;
    } catch {
      return "Invalid week";
    }
  };

  // Safe date formatter
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";

    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  // Check if a week contains today
  const weekContainsToday = (start: Date, end: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(23, 59, 59, 999);
    return today >= startDay && today <= endDay;
  };

  // Calculate position and width of item bar based on weeks
  const calculatePosition = (
    item: Project | DeliverablePhase | Deliverable
  ) => {
    // For deliverables that only have a 'date' property instead of startDate/endDate
    if ("date" in item && item.date && !weeks.length) {
      return { display: "none" };
    }

    if ("date" in item && item.date) {
      try {
        // First day of first week
        const rangeStart = weeks[0].start;

        // Last day of last week
        const rangeEnd = weeks[weeks.length - 1].end;

        // Ensure date is a Date object
        const itemDate =
          typeof item.date === "string" ? new Date(item.date) : item.date;

        // If item is completely outside the visible range, don't show it
        if (itemDate < rangeStart || itemDate > rangeEnd) {
          return { display: "none" };
        }

        // Calculate position based on weeks
        const totalDays =
          (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
        const daysBeforeItem =
          (itemDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);

        // For single date items, make them a reasonable width (e.g., 1 day)
        const left = (daysBeforeItem / totalDays) * 100;
        const width = (1 / totalDays) * 100;

        return {
          left: `${left}%`,
          width: `${Math.max(width, 2)}%`, // Ensure minimum width for visibility
        };
      } catch {
        return { display: "none" };
      }
    }

    if (
      !("startDate" in item) ||
      !("endDate" in item) ||
      !item.startDate ||
      !item.endDate ||
      !weeks.length
    ) {
      // For items without proper dates, position them at the start with a default width
      return {
        left: "0%",
        width: "30%",
        opacity: "0.7",
      };
    }

    try {
      // First day of first week
      const rangeStart = weeks[0].start;

      // Last day of last week
      const rangeEnd = weeks[weeks.length - 1].end;

      // Ensure dates are Date objects
      const itemStartDate =
        item.startDate instanceof Date
          ? item.startDate
          : new Date(item.startDate);
      const itemEndDate =
        item.endDate instanceof Date ? item.endDate : new Date(item.endDate);

      // Adjust dates to be within the visible range
      const itemStart = new Date(
        Math.max(itemStartDate.getTime(), rangeStart.getTime())
      );
      const itemEnd = new Date(
        Math.min(itemEndDate.getTime(), rangeEnd.getTime())
      );

      // If item is completely outside the visible range, don't show it
      if (itemEnd < rangeStart || itemStart > rangeEnd) {
        return { display: "none" };
      }

      // Calculate position based on weeks
      const totalDays =
        (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
      const daysBeforeItem =
        (itemStart.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
      const itemDuration =
        (itemEnd.getTime() - itemStart.getTime()) / (1000 * 60 * 60 * 24) + 1;

      const left = (daysBeforeItem / totalDays) * 100;
      const width = (itemDuration / totalDays) * 100;

      return {
        left: `${left}%`,
        width: `${width}%`,
      };
    } catch {
      return { display: "none" };
    }
  };

  // Check if an item is visible in the current view
  const isItemVisible = useCallback(
    (item: Project | DeliverablePhase | Deliverable) => {
      // If there are no weeks defined yet, consider everything visible
      if (!weeks.length) return true;

      // For deliverables that only have a 'date' property
      if ("date" in item && item.date) {
        try {
          const rangeStart = weeks[0].start;
          const rangeEnd = weeks[weeks.length - 1].end;

          const itemDate =
            typeof item.date === "string" ? new Date(item.date) : item.date;

          return !(itemDate < rangeStart || itemDate > rangeEnd);
        } catch {
          // If there's an error parsing the date, still show the item
          return true;
        }
      }

      // For items with startDate and endDate
      if (
        !("startDate" in item) ||
        !("endDate" in item) ||
        !item.startDate ||
        !item.endDate
      ) {
        // If the item doesn't have proper date properties, still show it
        // This ensures phases without dates still appear in the timeline
        return true;
      }

      try {
        const rangeStart = weeks[0].start;
        const rangeEnd = weeks[weeks.length - 1].end;

        const itemStartDate =
          item.startDate instanceof Date
            ? item.startDate
            : new Date(item.startDate);
        const itemEndDate =
          item.endDate instanceof Date ? item.endDate : new Date(item.endDate);

        return !(itemEndDate < rangeStart || itemStartDate > rangeEnd);
      } catch {
        // If there's an error parsing the dates, still show the item
        return true;
      }
    },
    [weeks]
  );

  // Get phases for a project
  const getPhasesForProject = useCallback(
    (projectId: string) => {
      return phases.filter((phase) => phase.projectId === projectId);
    },
    [phases]
  );

  // Update the selectedProject to use selectedProjectIdState
  const selectedProject = useMemo(() => {
    return (
      projects.find((project) => project.id === selectedProjectIdState) || null
    );
  }, [projects, selectedProjectIdState]);

  // Get filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Filter by search query
      const matchesSearch =
        project.title?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        true;

      // Filter by status
      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter || false;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Helper function to safely get a date from a phase
  const getPhaseDate = (phase: DeliverablePhase): Date => {
    try {
      if (phase.startDate) {
        return new Date(phase.startDate);
      }
      return new Date(0); // Default to epoch if no date
    } catch {
      return new Date(0); // Default to epoch if invalid date
    }
  };

  // Get visible phases for the selected project, sorted by date
  const visiblePhases = useMemo(() => {
    if (!selectedProject) return [];

    // Get all phases for the project
    const projectPhases = getPhasesForProject(selectedProject.id);

    // Sort phases by date
    return [...projectPhases].sort((a, b) => {
      const dateA = getPhaseDate(a);
      const dateB = getPhaseDate(b);

      // Apply sort order
      return sortOrder === "asc"
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });
  }, [selectedProject, getPhasesForProject, sortOrder]);

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex h-40 items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-400"></div>
            <p className="mt-3 text-sm font-medium text-gray-500">
              Loading timeline...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const navigateToAddProject = () => {
    router.push("/projects/add");
  };

  const navigateToAddPhase = () => {
    if (selectedProject) {
      router.push(`/projects/${selectedProject.id}/phases/add`);
    }
  };

  const navigateToAddDeliverable = (phaseId: string) => {
    if (selectedProject) {
      router.push(
        `/projects/${selectedProject.id}/phases/${phaseId}/deliverables/add`
      );
    }
  };

  const handleImportSuccess = () => {
    // Refresh the projects list after successful import
    window.location.reload(); // Simple refresh, or you can refetch data
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-md hover:shadow-lg overflow-hidden transition-all duration-200 relative">
      {/* Header with project selector */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50 px-4 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800 flex items-center">
            <Briefcase className="mr-2 h-4 w-4 text-blue-500" />
            Portfolio Timeline
          </h2>

          <div className="flex items-center gap-2">
            {/* Sidebar toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-gray-100"
              onClick={toggleSidebar}
              title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarVisible ? (
                <PanelLeftClose className="h-3.5 w-3.5 text-gray-500" />
              ) : (
                <PanelLeftOpen className="h-3.5 w-3.5 text-gray-500" />
              )}
              <span className="sr-only">
                {sidebarVisible ? "Hide sidebar" : "Show sidebar"}
              </span>
            </Button>

            {/* View mode toggle */}
            <div className="flex items-center rounded-full border border-gray-200 p-0.5 bg-white shadow-sm">
              <Button
                variant={viewMode === "timeline" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 px-2 rounded-full transition-all duration-200 text-xs",
                  viewMode === "timeline" &&
                    "bg-gray-50 text-gray-900 hover:bg-gray-100 shadow-sm"
                )}
                onClick={() => setViewMode("timeline")}
              >
                <Calendar className="h-3 w-3 mr-1" />
                Timeline
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 px-2 rounded-full transition-all duration-200 text-xs",
                  viewMode === "list" &&
                    "bg-gray-50 text-gray-900 hover:bg-gray-100 shadow-sm"
                )}
                onClick={() => setViewMode("list")}
              >
                <ListFilter className="h-3 w-3 mr-1" />
                List
              </Button>
            </div>

            {/* Month navigation (only in timeline view) */}
            {viewMode === "timeline" && (
              <div className="flex items-center gap-1 bg-white rounded-full border border-gray-200 px-2 shadow-sm">
                <Button
                  onClick={goToPreviousMonth}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-gray-100"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap px-1">
                  {visibleMonths.length > 0 && formatMonth(visibleMonths[0])}
                  {visibleMonths.length > 1 &&
                    ` - ${formatMonth(
                      visibleMonths[visibleMonths.length - 1]
                    )}`}
                </span>
                <Button
                  onClick={goToNextMonth}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-gray-100"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Search toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-gray-100"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-3.5 w-3.5 text-gray-500" />
              <span className="sr-only">Search projects</span>
            </Button>
          </div>
        </div>

        {/* Search input (conditionally rendered) */}
        {showSearch && (
          <div className="mt-2 relative">
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-7 text-xs rounded-full bg-white shadow-sm"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full hover:bg-gray-100"
                onClick={() => setSearchQuery("")}
              >
                <span className="sr-only">Clear search</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Project list and filters */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-500 mr-1">
              Status:
            </span>
            <div className="flex items-center rounded-full border border-gray-200 p-0.5 bg-white shadow-sm">
              <Button
                variant={statusFilter === "all" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs rounded-full transition-all duration-200",
                  statusFilter === "all" &&
                    "bg-gray-50 text-gray-900 hover:bg-gray-100 shadow-sm"
                )}
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "todo" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs rounded-full transition-all duration-200",
                  statusFilter === "todo" &&
                    "bg-gray-50 text-gray-900 hover:bg-gray-100 shadow-sm"
                )}
                onClick={() => setStatusFilter("todo")}
              >
                To Do
              </Button>
              <Button
                variant={statusFilter === "in-progress" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs rounded-full transition-all duration-200",
                  statusFilter === "in-progress" &&
                    "bg-gray-50 text-gray-900 hover:bg-gray-100 shadow-sm"
                )}
                onClick={() => setStatusFilter("in-progress")}
              >
                In Progress
              </Button>
              <Button
                variant={statusFilter === "done" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs rounded-full transition-all duration-200",
                  statusFilter === "done" &&
                    "bg-gray-50 text-gray-900 hover:bg-gray-100 shadow-sm"
                )}
                onClick={() => setStatusFilter("done")}
              >
                Done
              </Button>
            </div>
          </div>

          {/* Sort order toggle */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs rounded-full transition-all duration-200 flex items-center gap-1 bg-white border border-gray-200"
              onClick={toggleSortOrder}
              title="Toggle sort order"
            >
              <ArrowUpDown className="h-3 w-3 mr-1" />
              Sort: {sortOrder === "asc" ? "Oldest First" : "Newest First"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-180px)] min-h-[500px]">
        {/* Project list sidebar - conditionally rendered based on sidebarVisible */}
        {sidebarVisible && (
          <div className="w-full md:w-52 border-r border-gray-200 overflow-auto bg-gray-50 transition-all duration-300 ease-in-out">
            <div className="p-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 py-0.5">
                  Projects ({filteredProjects.length})
                </h3>
                {role !== "TeamMember" && (
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => setShowImportModal(true)}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-gray-100"
                      title="Import from Excel"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-green-600"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14,2 14,8 20,8" />
                        <path d="M12 18v-6" />
                        <path d="m9 15 3 3 3-3" />
                      </svg>
                      <span className="sr-only">Import from Excel</span>
                    </Button>
                    <Button
                      onClick={navigateToAddProject}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-gray-100"
                    >
                      <Plus className="h-3 w-3 text-gray-500" />
                      <span className="sr-only">Add project</span>
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-1 mt-1">
                {filteredProjects.length === 0 ? (
                  <div className="text-center p-2 text-xs text-gray-500">
                    No projects match your filters
                  </div>
                ) : (
                  filteredProjects.map((project) => (
                    <Button
                      key={project.id}
                      variant={
                        selectedProjectIdState === project.id
                          ? "default"
                          : "ghost"
                      }
                      className={cn(
                        "w-full justify-start text-left h-auto py-1.5 px-2 rounded-lg transition-all duration-200 transform hover:translate-x-1 transition-transform duration-200",
                        selectedProjectIdState === project.id
                          ? "bg-gray-50 text-gray-900 hover:bg-gray-100 shadow-sm"
                          : "hover:bg-gray-100"
                      )}
                      onClick={() => setSelectedProjectIdState(project.id)}
                    >
                      <div className="flex flex-col items-start w-full">
                        <div className="flex items-center w-full">
                          <div
                            className={`h-2 w-2 rounded-full mr-1.5 ${
                              statusColors[project.status || "todo"]
                            } ring-1 ${
                              project.status === "in-progress"
                                ? "ring-blue-200"
                                : project.status === "done"
                                ? "ring-green-200"
                                : "ring-gray-200"
                            }`}
                          />
                          <span className="font-medium text-xs truncate max-w-[150px] inline-block">
                            {project.title}
                          </span>
                          {role === "ProjectManager" &&
                            project.projectManager === userId && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="ml-1 bg-blue-100 text-blue-800 rounded-full p-0.5">
                                      <Briefcase className="h-2.5 w-2.5" />
                                    </div>
                                  </TooltipTrigger>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mt-1 ml-3.5">
                          <Calendar className="h-2.5 w-2.5 mr-1" />
                          <span className="text-[10px]">
                            {formatDate(project.startDate)} -{" "}
                            {formatDate(project.endDate)}
                          </span>
                        </div>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Project details and timeline */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedProject ? (
            <>
              {/* Project Header */}
              <div className="top-0 bg-white p-2 border-b border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  {/* Left Section: Sidebar Toggle + Title + Status + PM Icon */}
                  <div className="flex items-center">
                    {!sidebarVisible && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 mr-1.5 rounded-full hover:bg-gray-100"
                        onClick={toggleSidebar}
                      >
                        <PanelLeftOpen className="h-3.5 w-3.5 text-gray-500" />
                        <span className="sr-only">Show sidebar</span>
                      </Button>
                    )}

                    {/* Status Dot */}
                    <div
                      className={`h-3 w-3 rounded-full mr-2 ring-1 ${
                        statusColors[selectedProject.status || "todo"]
                      } ${
                        selectedProject.status === "in-progress"
                          ? "ring-blue-200"
                          : selectedProject.status === "done"
                          ? "ring-green-200"
                          : "ring-gray-200"
                      }`}
                    ></div>

                    {/* Project Title */}
                    <h3 className="font-semibold text-sm text-gray-800 max-w-[400px] truncate">
                      {selectedProject.title}
                    </h3>

                    {/* Status Badge */}
                    <Badge
                      variant="outline"
                      className={`ml-2 px-1.5 py-0 text-xs rounded-full ${
                        statusBadgeColors[selectedProject.status || "todo"]
                      }`}
                    >
                      {selectedProject.status?.toUpperCase() || "TODO"}
                    </Badge>

                    {/* Project Manager Icon */}
                    {role === "ProjectManager" &&
                      selectedProject.projectManager === userId && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="ml-1.5 p-0.5 rounded-full bg-blue-100 text-blue-800">
                                <Briefcase className="h-3 w-3" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Project Manager</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                  </div>

                  {/* Right Section: Date + New Phase Button */}
                  <div className="flex items-center gap-2">
                    {/* Date Range */}
                    <div className="flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200 whitespace-nowrap">
                      <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                      <span>
                        {formatDate(selectedProject.startDate)} –{" "}
                        {formatDate(selectedProject.endDate)}
                      </span>
                    </div>

                    {/* New Phase Button */}
                    <TooltipProvider>
                      {role !== "TeamMember" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() =>
                                router.push(
                                  `/projects/${selectedProject.id}/phases/add`
                                )
                              }
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 rounded-full text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                              <Plus className="h-3 w-3 mr-1" /> New Phase
                            </Button>
                          </TooltipTrigger>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                  </div>
                </div>
              </div>

              {/* Project content - Timeline or List view */}
              <Tabs
                value={viewMode}
                className="flex-1 overflow-hidden flex flex-col"
              >
                <TabsContent
                  value="timeline"
                  className="flex-1 overflow-hidden flex flex-col data-[state=active]:flex"
                >
                  {/* Timeline view */}
                  <div className="relative flex-1 overflow-auto">
                    {/* Fixed header container */}
                    <div className=" top-0 z-50 bg-white shadow-sm">
                      <div className="flex">
                        {/* Fixed phase label header */}
                        <div className="w-1/4 min-w-[180px] border-r border-gray-200 bg-gray-50">
                          <div className="h-7 border-b border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                            Phases & Deliverables
                          </div>
                        </div>

                        {/* Fixed month headers */}
                        <div className="flex-1 overflow-x-auto">
                          <div className="flex border-b border-gray-200 bg-gray-50">
                            {visibleMonths.map((month, index) => (
                              <div
                                key={index}
                                className="flex-1 px-2 py-1 text-center text-xs font-semibold text-gray-500 uppercase"
                                style={{
                                  borderRight:
                                    index < visibleMonths.length - 1
                                      ? "1px solid #e5e7eb"
                                      : "none",
                                }}
                              >
                                {formatMonth(month)}
                              </div>
                            ))}
                          </div>

                          {/* Fixed week headers */}
                          <div className="flex h-7 border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                            {weeks.map((week, index) => {
                              const isCurrentWeek = weekContainsToday(
                                week.start,
                                week.end
                              );

                              return (
                                <div
                                  key={index}
                                  className={cn(
                                    "flex-1 border-r border-gray-200 text-center py-1",
                                    isCurrentWeek &&
                                      "bg-blue-50 font-medium text-blue-800 animate-pulse"
                                  )}
                                >
                                  {formatWeek(week.start, week.end)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline content - using table layout for perfect alignment */}
                    <div className="relative">
                      <table className="w-full border-collapse">
                        <tbody>
                          {visiblePhases.map((phase) => {
                            if (!phase.id) return null;

                            const phaseId = phase.id;
                            const isPhaseExpanded =
                              expandedPhases[phaseId] || false;
                            const phaseDeliverables =
                              deliverables[phaseId] || [];
                            const phaseStatus = phase.status || "todo";
                            const phaseStatusColor =
                              statusColors[
                                phaseStatus as keyof typeof statusColors
                              ] || statusColors.default;

                            return (
                              <React.Fragment key={phaseId}>
                                {/* Phase row */}
                                <tr className="group">
                                  {/* Phase label cell */}
                                  <td className="w-1/4 min-w-[180px] border-r border-b border-gray-200 bg-gray-50 p-0">
                                    <div
                                      className="flex cursor-pointer items-center px-3 hover:bg-gray-100 transition-colors h-8"
                                      onClick={() => togglePhase(phaseId)}
                                    >
                                      <div className="mr-1 h-4 w-4 flex items-center justify-center text-gray-400 transition-transform duration-200">
                                        {isPhaseExpanded ? (
                                          <ChevronDown className="h-3 w-3" />
                                        ) : (
                                          <ChevronRightIcon className="h-3 w-3" />
                                        )}
                                      </div>
                                      <div className="flex items-center flex-1 min-w-0">
                                        <div
                                          className={`mr-1.5 h-2 w-2 rounded-full ${
                                            statusColors[
                                              phaseStatus as keyof typeof statusColors
                                            ]
                                          } ring-1 ${
                                            phaseStatus === "in-progress"
                                              ? "ring-blue-200"
                                              : phaseStatus === "done"
                                              ? "ring-green-200"
                                              : "ring-gray-200"
                                          }`}
                                        ></div>
                                        <span className="text-xs font-medium text-gray-700 truncate max-w-[150px] inline-block">
                                          {phase.title}
                                        </span>
                                        <span
                                          className={`ml-1.5 text-xs px-1 py-0 rounded-full text-[10px] font-medium ${
                                            phaseStatus === "done"
                                              ? "bg-green-100 text-green-800"
                                              : phaseStatus === "in-progress"
                                              ? "bg-blue-100 text-blue-800"
                                              : "bg-gray-100 text-gray-800"
                                          }`}
                                        >
                                          {phaseStatus === "in-progress"
                                            ? "IN PROGRESS"
                                            : phaseStatus.toUpperCase()}
                                        </span>
                                        {role !== "TeamMember" && (
                                          <div className="ml-auto flex items-center">
                                            <Button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(
                                                  `/projects/${selectedProject.id}/phases/${phaseId}/deliverables/add`
                                                );
                                              }}
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 p-0 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                            >
                                              <Plus className="h-2.5 w-2.5" />
                                              <span className="sr-only">
                                                Add Deliverable
                                              </span>
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Phase timeline cell */}
                                  <td className="border-b border-gray-200 p-0 relative">
                                    <div className="h-8 relative">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div
                                              className={`absolute h-5 transform hover:scale-y-110 hover:shadow-md transition-all duration-300 ease-in-out ${phaseStatusColor} rounded-md shadow-sm hover:opacity-90 transition-opacity top-1.5 ${
                                                phaseStatus === "in-progress"
                                                  ? "bg-gradient-to-r from-blue-400 to-blue-500 border border-blue-600"
                                                  : ""
                                              }`}
                                              style={calculatePosition(phase)}
                                            >
                                              {phaseStatus === "done" && (
                                                <div className="absolute right-1 top-0.5 h-4 w-4 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                  <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                                                </div>
                                              )}
                                              {phaseStatus ===
                                                "in-progress" && (
                                                <div className="absolute right-1 top-0.5 h-4 w-4 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                  <div className="h-2.5 w-2.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                                                </div>
                                              )}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent
                                            side="top"
                                            className="bg-white border border-gray-200 shadow-md p-2 rounded-lg text-xs max-w-[280px]"
                                          >
                                            <div className="space-y-1.5">
                                              <h3 className="font-semibold text-gray-800 text-xs">
                                                {phase.title}
                                              </h3>
                                              <div className="flex items-center text-gray-600">
                                                <Calendar className="mr-1.5 h-3 w-3 flex-shrink-0" />
                                                <span className="whitespace-nowrap">
                                                  {formatDate(phase.startDate)}{" "}
                                                  - {formatDate(phase.endDate)}
                                                </span>
                                              </div>
                                              <div className="flex items-center">
                                                <span
                                                  className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                                    phaseStatus === "done"
                                                      ? "bg-green-100 text-green-800"
                                                      : phaseStatus ===
                                                        "in-progress"
                                                      ? "bg-blue-100 text-blue-800"
                                                      : "bg-gray-100 text-gray-800"
                                                  }`}
                                                >
                                                  {phaseStatus === "in-progress"
                                                    ? "IN PROGRESS"
                                                    : phaseStatus.toUpperCase()}
                                                </span>
                                              </div>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  </td>
                                </tr>

                                {/* Deliverable rows - only shown when phase is expanded */}
                                {isPhaseExpanded &&
                                  phaseDeliverables.map((deliverable) => {
                                    const delivStatus =
                                      deliverable.status || "todo";
                                    const delivStatusColor =
                                      statusColors[
                                        delivStatus as keyof typeof statusColors
                                      ] || statusColors.default;

                                    return (
                                      <tr key={deliverable.id}>
                                        {/* Deliverable label cell */}
                                        <td className="w-1/4 min-w-[180px] border-r border-b border-gray-200 bg-white p-0">
                                          <div className="pl-8 pr-3 py-1.5 h-7 flex items-center hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center flex-1 min-w-0">
                                              <div
                                                className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                                                  statusColors[
                                                    delivStatus as keyof typeof statusColors
                                                  ]
                                                } ring-1 ${
                                                  delivStatus === "in-progress"
                                                    ? "ring-blue-200"
                                                    : delivStatus === "done"
                                                    ? "ring-green-200"
                                                    : "ring-gray-200"
                                                }`}
                                              ></div>
                                              <span className="text-xs font-medium text-gray-600 truncate max-w-[180px] inline-block">
                                                {deliverable.title}
                                              </span>
                                            </div>
                                          </div>
                                        </td>

                                        {/* Deliverable timeline cell */}
                                        <td className="border-b border-gray-200 p-0 relative bg-gray-50/30">
                                          <div className="h-7 relative">
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <div
                                                    className={`absolute h-4 transform hover:scale-y-105 hover:shadow-md transition-all duration-300 ease-in-out ${delivStatusColor} rounded-md shadow-sm hover:opacity-90 transition-opacity top-1.5 ${
                                                      delivStatus ===
                                                      "in-progress"
                                                        ? "bg-gradient-to-r from-blue-400 to-blue-500 border border-blue-600"
                                                        : ""
                                                    }`}
                                                    style={calculatePosition(
                                                      deliverable
                                                    )}
                                                  >
                                                    {delivStatus === "done" && (
                                                      <div className="absolute right-1 top-0.5 h-3 w-3 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                        <CheckCircle2 className="h-2 w-2 text-green-500" />
                                                      </div>
                                                    )}
                                                    {delivStatus ===
                                                      "in-progress" && (
                                                      <div className="absolute right-1 top-0.5 h-3 w-3 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                        <div className="h-2 w-2 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                                                      </div>
                                                    )}
                                                  </div>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                  side="top"
                                                  className="bg-white border border-gray-200 shadow-md p-2 rounded-lg text-xs max-w-[250px]"
                                                >
                                                  <div className="space-y-1.5">
                                                    <h3 className="font-semibold text-gray-800 text-xs">
                                                      {deliverable.title}
                                                    </h3>
                                                    <div className="flex items-center text-gray-600">
                                                      <Calendar className="mr-1.5 h-3 w-3" />
                                                      {phase.startDate &&
                                                        deliverable.date && (
                                                          <span>
                                                            {formatDate(
                                                              phase.startDate
                                                            )}{" "}
                                                            -{" "}
                                                            {formatDate(
                                                              deliverable.date
                                                            )}
                                                          </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center">
                                                      <span
                                                        className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                                          delivStatus === "done"
                                                            ? "bg-green-100 text-green-800"
                                                            : delivStatus ===
                                                              "in-progress"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : "bg-gray-100 text-gray-800"
                                                        }`}
                                                      >
                                                        {delivStatus ===
                                                        "in-progress"
                                                          ? "IN PROGRESS"
                                                          : delivStatus.toUpperCase()}
                                                      </span>
                                                    </div>
                                                    {deliverable.description && (
                                                      <p className="text-gray-600 text-xs">
                                                        {
                                                          deliverable.description
                                                        }
                                                      </p>
                                                    )}
                                                  </div>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}

                                {/* Empty deliverables message */}
                                {isPhaseExpanded &&
                                  phaseDeliverables.length === 0 && (
                                    <tr>
                                      <td className="w-1/4 min-w-[180px] border-r border-b border-gray-200 bg-white p-0">
                                        <div className="pl-8 pr-3 py-1.5 h-7 flex items-center text-xs text-gray-400 italic">
                                          No deliverables
                                        </div>
                                      </td>
                                      <td className="border-b border-gray-200 p-0 bg-gray-50/30">
                                        <div className="h-7"></div>
                                      </td>
                                    </tr>
                                  )}
                              </React.Fragment>
                            );
                          })}

                          {/* Empty state when no phases */}
                          {visiblePhases.length === 0 && (
                            <tr>
                              <td
                                colSpan={2}
                                className="text-center p-4 text-xs text-gray-500"
                              >
                                <div className="flex flex-col items-center justify-center py-4">
                                  <Calendar className="h-8 w-8 text-gray-300 mb-2" />
                                  <p>No phases found for this project</p>
                                  {role !== "TeamMember" && (
                                    <Button
                                      onClick={navigateToAddPhase}
                                      variant="secondary"
                                      size="sm"
                                      className="mt-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs h-7 px-2"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Phase
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="list"
                  className="flex-1 overflow-auto data-[state=active]:block p-5"
                >
                  {/* List view */}
                  {selectedProject ? (
                    <div className="space-y-6">
                      {visiblePhases.map((phase) => {
                        const phaseId = phase.id;
                        const phaseDeliverables = deliverables[phaseId] || [];
                        const phaseStatus = phase.status || "todo";

                        return (
                          <div
                            key={phaseId}
                            className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                          >
                            <div
                              className={`p-4 flex items-center justify-between ${
                                phaseStatus === "done"
                                  ? "bg-green-50 border-b border-green-100"
                                  : phaseStatus === "in-progress"
                                  ? "bg-blue-50 border-b border-blue-100"
                                  : "bg-gray-50 border-b border-gray-200"
                              }`}
                            >
                              <div className="flex items-center">
                                <div
                                  className={`h-3 w-3 rounded-full mr-2.5 ${
                                    statusColors[phaseStatus]
                                  } ring-1 ${
                                    phaseStatus === "in-progress"
                                      ? "ring-blue-200"
                                      : phaseStatus === "done"
                                      ? "ring-green-200"
                                      : "ring-gray-200"
                                  }`}
                                ></div>
                                <h3 className="font-medium text-gray-800">
                                  {phase.title}
                                </h3>
                                <Badge
                                  className={`ml-2.5 ${statusBadgeColors[phaseStatus]} px-2 py-0.5 rounded-full shadow-sm`}
                                  variant="outline"
                                >
                                  {phaseStatus === "in-progress"
                                    ? "IN PROGRESS"
                                    : phaseStatus.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex items-center text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                                <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                <span>
                                  {formatDate(phase.startDate)} -{" "}
                                  {formatDate(phase.endDate)}
                                </span>
                              </div>
                            </div>

                            {phaseDeliverables.length > 0 ? (
                              <div className="divide-y divide-gray-100">
                                {phaseDeliverables.map(
                                  (deliverable: Deliverable) => {
                                    const delivStatus =
                                      deliverable.status || "todo";

                                    return (
                                      <div
                                        key={deliverable.id}
                                        className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                      >
                                        <div className="flex items-center">
                                          <div
                                            className={`h-2.5 w-2.5 rounded-full mr-2.5 ${
                                              statusColors[
                                                delivStatus as keyof typeof statusColors
                                              ]
                                            } ring-1 ${
                                              delivStatus === "in-progress"
                                                ? "ring-blue-200"
                                                : delivStatus === "done"
                                                ? "ring-green-200"
                                                : "ring-gray-200"
                                            }`}
                                          ></div>
                                          <span className="font-medium text-gray-700">
                                            {deliverable.title}
                                          </span>
                                          <Badge
                                            className={`ml-2.5 ${
                                              statusBadgeColors[
                                                delivStatus as keyof typeof statusBadgeColors
                                              ]
                                            } px-2 py-0.5 rounded-full shadow-sm`}
                                            variant="outline"
                                          >
                                            {delivStatus === "in-progress"
                                              ? "IN PROGRESS"
                                              : delivStatus.toUpperCase()}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                                          <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                          {phase.startDate &&
                                            deliverable.date && (
                                              <span>
                                                {formatDate(phase.startDate)} -{" "}
                                                {formatDate(deliverable.date)}
                                              </span>
                                            )}
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            ) : (
                              role !== "TeamMember" && (
                                <div className="p-6 text-center text-sm text-gray-500 bg-gray-50/50">
                                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                                    <Plus className="h-5 w-5 text-gray-400" />
                                  </div>
                                  <p>No deliverables for this phase</p>
                                  <Button
                                    onClick={() =>
                                      router.push(
                                        `/projects/${selectedProject.id}/phases/${phaseId}/deliverables/add`
                                      )
                                    }
                                    variant="secondary"
                                    size="sm"
                                    className="mt-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                    Add Deliverable
                                  </Button>
                                </div>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center p-6 text-sm text-gray-500">
                      <AlertCircle className="h-5 w-5 mr-2 text-gray-400" />
                      Select a project to view details
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No Project Selected
                </h3>
                <p className="text-gray-500 max-w-md mb-4">
                  Select a project from the list to view its timeline and
                  deliverables.
                </p>
                {role !== "TeamMember" && (
                  <Button
                    onClick={navigateToAddProject}
                    className="bg-gray-50 text-gray-900 hover:bg-gray-100"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create New Project
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Excel Import Modal */}
      <CompactExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
