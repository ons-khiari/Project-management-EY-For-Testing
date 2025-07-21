"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronDown,
  ChevronRightIcon,
  Circle,
} from "lucide-react";
import type { DeliverablePhase } from "@/app/types/deliverable-phase";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ProjectGanttChartProps {
  phases: DeliverablePhase[];
  projectStartDate?: string;
  projectEndDate?: string;
}

// Sample deliverable interface
interface Deliverable {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  description?: string;
  status?: "todo" | "in-progress" | "done";
}

// Generate detailed deliverables for a phase
function generateDetailedDeliverables(
  phaseId: string,
  phaseStart: Date,
  phaseEnd: Date,
  color: string
): Deliverable[] {
  const phaseDuration =
    (phaseEnd.getTime() - phaseStart.getTime()) / (1000 * 60 * 60 * 24);
  const deliverableCount = Math.min(
    Math.max(Math.floor(phaseDuration / 7), 3),
    6
  );
  const deliverables: Deliverable[] = [];

  // Deliverable names based on phase ID
  const deliverableNames: Record<string, string[]> = {
    "phase-1": [
      "Project Charter",
      "Stakeholder Analysis",
      "Initial Risk Assessment",
      "Project Kickoff Meeting",
      "Preliminary Budget Approval",
    ],
    "phase-2": [
      "User Interviews",
      "Business Process Analysis",
      "Functional Requirements",
      "Technical Requirements",
      "Requirements Sign-off",
    ],
    "phase-3": [
      "System Architecture",
      "Database Design",
      "UI/UX Mockups",
      "Technical Specifications",
      "Design Review",
    ],
    "phase-4": [
      "Frontend Development",
      "Backend Development",
      "Database Implementation",
      "API Integration",
      "Code Review",
    ],
    "phase-5": [
      "Unit Testing",
      "Integration Testing",
      "User Acceptance Testing",
      "Performance Testing",
      "Deployment",
    ],
  };

  const names = deliverableNames[phaseId] || [
    "Deliverable 1",
    "Deliverable 2",
    "Deliverable 3",
    "Deliverable 4",
    "Deliverable 5",
  ];

  // Create overlapping deliverables that span the phase
  for (let i = 0; i < deliverableCount; i++) {
    // Calculate start and end dates with some overlap
    const startOffset = Math.floor(
      phaseDuration * (i / (deliverableCount + 1))
    );
    const endOffset = Math.floor(
      phaseDuration * ((i + 2) / (deliverableCount + 1))
    );

    const deliverableStart = new Date(phaseStart);
    deliverableStart.setDate(phaseStart.getDate() + startOffset);

    const deliverableEnd = new Date(phaseStart);
    deliverableEnd.setDate(phaseStart.getDate() + endOffset);

    // Ensure end date doesn't exceed phase end date
    if (deliverableEnd > phaseEnd) {
      deliverableEnd.setTime(phaseEnd.getTime());
    }

    // Randomly set status for demo purposes
    const randomStatus = Math.random();
    let status: "todo" | "in-progress" | "done";
    if (randomStatus < 0.3) {
      status = "todo";
    } else if (randomStatus < 0.6) {
      status = "in-progress";
    } else {
      status = "done";
    }

    deliverables.push({
      id: `${phaseId}-deliverable-${i + 1}`,
      title: names[i] || `Deliverable ${i + 1}`,
      startDate: deliverableStart,
      endDate: deliverableEnd,
      color: color,
      description: `Deliverable ${i + 1} for ${phaseId}`,
      status: status,
    });
  }

  return deliverables;
}

// Create sample data
function createSampleData(startDate: Date, endDate: Date) {
  const projectDuration =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const phaseCount = 5;
  const phaseDuration = Math.floor(projectDuration / phaseCount);

  const phases: DeliverablePhase[] = [];
  const deliverables: Record<string, Deliverable[]> = {};

  const phaseColors = ["blue", "green", "purple", "orange", "teal"];
  const phaseNames = [
    "Project Initiation",
    "Requirements Gathering",
    "Design & Planning",
    "Implementation",
    "Testing & Deployment",
  ];

  for (let i = 0; i < phaseCount; i++) {
    const phaseStart = new Date(startDate);
    phaseStart.setDate(startDate.getDate() + i * phaseDuration);

    const phaseEnd = new Date(phaseStart);
    phaseEnd.setDate(phaseStart.getDate() + phaseDuration - 1);

    const phaseId = `phase-${i + 1}`;

    // First two phases are completed for demo purposes
    const status = i < 2 ? "done" : i < 3 ? "in-progress" : "todo";

    phases.push({
      id: phaseId,
      title: phaseNames[i],
      startDate: phaseStart,
      endDate: phaseEnd,
      color: phaseColors[i % phaseColors.length],
      status: status,
    });

    // Generate deliverables for this phase
    deliverables[phaseId] = generateDetailedDeliverables(
      phaseId,
      phaseStart,
      phaseEnd,
      phaseColors[i % phaseColors.length]
    );
  }

  return { phases, deliverables };
}

// Status colors (Jira-like)
const statusColors = {
  todo: "bg-gray-300",
  "in-progress": "bg-blue-400",
  done: "bg-green-500",
  default: "bg-gray-300",
};

// Status text colors
// const statusTextColors = {
//   todo: "text-gray-600",
//   "in-progress": "text-blue-700",
//   done: "text-green-700",
//   default: "text-gray-600",
// };

export default function ProjectGanttChart({
  phases: providedPhases = [],
  projectStartDate,
  projectEndDate,
}: ProjectGanttChartProps) {
  // Convert string dates to Date objects with fallbacks
  const startDate = projectStartDate ? new Date(projectStartDate) : new Date();
  const endDate = projectEndDate
    ? new Date(projectEndDate)
    : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Create sample data only once
  const sampleData = useMemo(
    () => createSampleData(startDate, endDate),
    [startDate, endDate]
  );

  // Initialize phases and deliverables
  const [phases, setPhases] = useState<DeliverablePhase[]>([]);
  const [phaseDeliverables, setPhaseDeliverables] = useState<
    Record<string, Deliverable[]>
  >({});
  const [initialized, setInitialized] = useState(false);

  // Initialize with sample data if needed (only once)
  useEffect(() => {
    if (!initialized) {
      if (providedPhases.length > 0) {
        setPhases(providedPhases);

        // Generate sample deliverables for provided phases
        const deliverables: Record<string, Deliverable[]> = {};
        providedPhases.forEach((phase) => {
          if (phase.id && phase.startDate && phase.endDate) {
            const phaseStart =
              phase.startDate instanceof Date
                ? phase.startDate
                : new Date(phase.startDate);
            const phaseEnd =
              phase.endDate instanceof Date
                ? phase.endDate
                : new Date(phase.endDate);
            deliverables[phase.id] = generateDetailedDeliverables(
              phase.id,
              phaseStart,
              phaseEnd,
              phase.color || "default"
            );
          }
        });
        setPhaseDeliverables(deliverables);
      } else {
        // Use sample data
        setPhases(sampleData.phases);
        setPhaseDeliverables(sampleData.deliverables);
      }
      setInitialized(true);
    }
  }, [initialized, providedPhases, sampleData]);

  const [visibleMonths, setVisibleMonths] = useState<Date[]>([]);
  const [startMonth, setStartMonth] = useState<Date>(
    new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  );
  const [monthsToShow, setMonthsToShow] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>(
    {}
  );

  // Initialize expanded phases once phases are set
  useEffect(() => {
    if (phases.length > 0 && Object.keys(expandedPhases).length === 0) {
      const initialExpanded: Record<string, boolean> = {};
      phases.forEach((phase) => {
        if (phase.id) {
          initialExpanded[phase.id] = true;
        }
      });
      setExpandedPhases(initialExpanded);
    }
  }, [phases, expandedPhases]);

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
  const getAllWeeks = () => {
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
  };

  // Memoize weeks calculation to prevent recalculation on every render
  const weeks = useMemo(() => getAllWeeks(), [visibleMonths]);

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
  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString("en-US", {
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

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };
  // Calculate position and width of phase bar based on weeks
  const calculatePhasePosition = (item: DeliverablePhase | Deliverable) => {
    if (!item.startDate || !item.endDate || !weeks.length) {
      return { display: "none" };
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

  // Check if a phase is visible in the current view
  const isPhaseVisible = useCallback(
    (phase: DeliverablePhase) => {
      if (!phase.startDate || !phase.endDate || !weeks.length) {
        return false;
      }

      try {
        const rangeStart = weeks[0].start;
        const rangeEnd = weeks[weeks.length - 1].end;

        const phaseStartDate =
          phase.startDate instanceof Date
            ? phase.startDate
            : new Date(phase.startDate);
        const phaseEndDate =
          phase.endDate instanceof Date
            ? phase.endDate
            : new Date(phase.endDate);

        return !(phaseEndDate < rangeStart || phaseStartDate > rangeEnd);
      } catch {
        return false;
      }
    },
    [weeks]
  );

  // Count visible phases
  const visiblePhasesCount = useMemo(
    () => phases.filter(isPhaseVisible).length,
    [phases, weeks, isPhaseVisible]
  );

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex h-40 items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500"></div>
            <p className="mt-2 text-sm text-gray-500">Loading timeline...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
        <h2 className="text-base font-medium text-gray-700">
          Project Timeline
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="rounded p-1 text-gray-500 hover:bg-gray-200 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-gray-600">
            {visibleMonths.length > 0 && formatMonth(visibleMonths[0])}
            {visibleMonths.length > 1 &&
              ` - ${formatMonth(visibleMonths[visibleMonths.length - 1])}`}
          </span>
          <button
            onClick={goToNextMonth}
            className="rounded p-1 text-gray-500 hover:bg-gray-200 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="overflow-hidden">
        <div className="flex">
          {/* Task labels column */}
          <div className="w-1/4 min-w-[200px] border-r border-gray-200 bg-gray-50">
            {visiblePhasesCount === 0 ? (
              <div className="p-3 text-xs text-gray-500">
                No phases in this timeframe
              </div>
            ) : (
              <div>
                {phases.map((phase, phaseIndex) => {
                  if (!isPhaseVisible(phase) || !phase.id) return null;

                  const phaseId = phase.id;
                  const isExpanded = expandedPhases[phaseId];
                  const deliverables = phaseDeliverables[phaseId] || [];
                  const status = phase.status || "todo";
                  // const statusColor =
                  //   statusTextColors[status as keyof typeof statusTextColors] ||
                  //   statusTextColors.default;

                  return (
                    <div key={phaseId}>
                      <div
                        className="flex cursor-pointer items-center border-b border-gray-200 px-3 hover:bg-gray-100 transition-colors h-8"
                        onClick={() => togglePhase(phaseId)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                        )}
                        <div className="flex items-center">
                          <div
                            className={`mr-2 h-2.5 w-2.5 rounded-full ${
                              statusColors[status as keyof typeof statusColors]
                            }`}
                          ></div>
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {phase.title || `Phase ${phaseIndex + 1}`}
                          </span>
                          <span
                            className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                              status === "done"
                                ? "bg-green-100 text-green-800"
                                : status === "in-progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {status === "in-progress"
                              ? "IN PROGRESS"
                              : status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {isExpanded &&
                        deliverables.map((deliverable) => {
                          const delivStatus = deliverable.status || "todo";
                          // const delivStatusColor =
                          //   statusTextColors[delivStatus] ||
                          //   statusTextColors.default;

                          return (
                            <div
                              key={deliverable.id}
                              className="border-b border-gray-200 pl-8 pr-3 py-1.5 h-8 flex items-center"
                            >
                              <div className="flex items-center">
                                <div
                                  className={`mr-2 h-2 w-2 rounded-full ${
                                    statusColors[
                                      delivStatus as keyof typeof statusColors
                                    ]
                                  }`}
                                ></div>
                                <span className="text-xs text-gray-600 truncate">
                                  {deliverable.title}
                                </span>
                                <span
                                  className={`ml-2 text-xs px-1 py-0.5 rounded-full text-[10px] ${
                                    delivStatus === "done"
                                      ? "bg-green-100 text-green-800"
                                      : delivStatus === "in-progress"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                  }}`}
                                >
                                  {delivStatus === "in-progress"
                                    ? "IN PROGRESS"
                                    : delivStatus.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline column */}
          <div className="flex-1 overflow-x-auto">
            {/* Month headers */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {visibleMonths.map((month, index) => (
                <div
                  key={index}
                  className="flex-1 px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase"
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

            {/* Week grid */}
            <div className="relative">
              {/* Week columns */}
              <div className="flex h-8 border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                {weeks.map((week, index) => {
                  const isCurrentWeek = weekContainsToday(week.start, week.end);

                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex-1 border-r border-gray-200 text-center py-1.5",
                        isCurrentWeek && "bg-blue-50"
                      )}
                    >
                      {formatWeek(week.start, week.end)}
                    </div>
                  );
                })}
              </div>

              {/* Today marker */}
              {weeks.some((week) =>
                weekContainsToday(week.start, week.end)
              ) && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                  style={{
                    left: (() => {
                      const today = new Date();
                      const rangeStart = weeks[0].start;
                      const rangeEnd = weeks[weeks.length - 1].end;
                      const totalDays =
                        (rangeEnd.getTime() - rangeStart.getTime()) /
                        (1000 * 60 * 60 * 24);
                      const daysBeforeToday =
                        (today.getTime() - rangeStart.getTime()) /
                        (1000 * 60 * 60 * 24);
                      return `${(daysBeforeToday / totalDays) * 100}%`;
                    })(),
                  }}
                />
              )}

              {/* Phase and deliverable bars */}
              {visiblePhasesCount === 0 ? (
                <div className="flex h-32 items-center justify-center p-6 text-xs text-gray-500">
                  No phases visible in this date range
                </div>
              ) : (
                <div className="bg-white bg-opacity-50 bg-[linear-gradient(#e5e7eb_1px,transparent_1px),linear-gradient(to_right,#e5e7eb_1px,transparent_1px)] bg-[size:7.14%_100%,7.14%_24px] bg-[position:0_0]">
                  {phases.map((phase, phaseIndex) => {
                    if (!isPhaseVisible(phase) || !phase.id) return null;

                    const phaseId = phase.id;
                    const isExpanded = expandedPhases[phaseId];
                    const position = calculatePhasePosition(phase);
                    const status = phase.status || "todo";
                    const statusColor =
                      statusColors[status as keyof typeof statusColors] ||
                      statusColors.default;
                    const deliverables = phaseDeliverables[phaseId] || [];

                    return (
                      <div key={phaseId}>
                        {/* Phase bar */}
                        <div className="relative h-8 border-b border-gray-200">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`absolute top-1.5 h-5 ${statusColor} rounded-sm shadow-sm hover:opacity-90 transition-opacity`}
                                  style={position}
                                >
                                  {status === "done" && (
                                    <div className="absolute right-1 top-0.5 h-4 w-4 rounded-full bg-white flex items-center justify-center">
                                      <Circle className="h-3 w-3 text-green-500 fill-current" />
                                    </div>
                                  )}
                                  {status === "in-progress" && (
                                    <div className="absolute right-1 top-0.5 h-4 w-4 rounded-full bg-white flex items-center justify-center">
                                      <div className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="bg-white border border-gray-200 shadow-md p-2 rounded text-xs"
                              >
                                <div className="space-y-1">
                                  <h3 className="font-medium text-gray-800">
                                    {phase.title || `Phase ${phaseIndex + 1}`}
                                  </h3>
                                  <div className="flex items-center text-gray-600">
                                    <Calendar className="mr-1 h-3 w-3" />
                                    <span>
                                      {phase.startDate instanceof Date
                                        ? formatDate(phase.startDate)
                                        : formatDate(
                                            new Date(phase.startDate)
                                          )}{" "}
                                      -
                                      {phase.endDate instanceof Date
                                        ? formatDate(phase.endDate)
                                        : formatDate(new Date(phase.endDate))}
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <span
                                      className={`inline-block px-1.5 py-0.5 rounded-full text-xs ${
                                        status === "done"
                                          ? "bg-green-100 text-green-800"
                                          : status === "in-progress"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {status === "in-progress"
                                        ? "IN PROGRESS"
                                        : status.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {/* Deliverable bars */}
                        {isExpanded &&
                          deliverables.map((deliverable) => {
                            const delivPosition =
                              calculatePhasePosition(deliverable);
                            const delivStatus = deliverable.status || "todo";
                            const delivStatusColor =
                              statusColors[delivStatus] || statusColors.default;

                            return (
                              <div
                                key={deliverable.id}
                                className="relative h-8 border-b border-gray-200"
                              >
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`absolute top-1.5 h-5 ${delivStatusColor} rounded-sm shadow-sm hover:opacity-90 transition-opacity`}
                                        style={delivPosition}
                                      >
                                        {delivStatus === "done" && (
                                          <div className="absolute right-1 top-0.5 h-4 w-4 rounded-full bg-white flex items-center justify-center">
                                            <Circle className="h-3 w-3 text-green-500 fill-current" />
                                          </div>
                                        )}
                                        {delivStatus === "in-progress" && (
                                          <div className="absolute right-1 top-0.5 h-4 w-4 rounded-full bg-white flex items-center justify-center">
                                            <div className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                                          </div>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-white border border-gray-200 shadow-md p-2 rounded text-xs"
                                    >
                                      <div className="space-y-1">
                                        <h3 className="font-medium text-gray-800">
                                          {deliverable.title}
                                        </h3>
                                        <div className="flex items-center text-gray-600">
                                          <Calendar className="mr-1 h-3 w-3" />
                                          <span>
                                            {formatDate(deliverable.startDate)}{" "}
                                            - {formatDate(deliverable.endDate)}
                                          </span>
                                        </div>
                                        <div className="flex items-center">
                                          <span
                                            className={`inline-block px-1.5 py-0.5 rounded-full text-xs ${
                                              delivStatus === "done"
                                                ? "bg-green-100 text-green-800"
                                                : delivStatus === "in-progress"
                                                ? "bg-blue-100 text-blue-800"
                                                : "bg-gray-100 text-gray-800"
                                            }`}
                                          >
                                            {delivStatus === "in-progress"
                                              ? "IN PROGRESS"
                                              : delivStatus.toUpperCase()}
                                          </span>
                                        </div>
                                        {deliverable.description && (
                                          <p className="text-gray-600">
                                            {deliverable.description}
                                          </p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
