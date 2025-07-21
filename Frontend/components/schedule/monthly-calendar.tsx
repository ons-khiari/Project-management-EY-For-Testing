"use client";

import type React from "react";
import { useState, useEffect } from "react";
import type { DeliverablePhase } from "@/app/types/deliverable-phase";
import { X, Calendar } from "lucide-react";

interface MonthlyCalendarProps {
  year: number;
  month: number;
  deliverablePhases: DeliverablePhase[];
}

export default function ImprovedMonthlyCalendar({
  year,
  month,
  deliverablePhases,
}: MonthlyCalendarProps) {
  const [expandedDay, setExpandedDay] = useState<{
    day: number;
    weekIndex: number;
    dayIndex: number;
  } | null>(null);
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Update current date every hour
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 3600000);
    return () => clearInterval(timer);
  }, []);

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Adjust for Monday as first day of week (0 = Monday, 6 = Sunday)
  const firstDayAdjusted = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Get days from previous month to fill the first week
  const daysFromPrevMonth = firstDayAdjusted;
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

  // Create calendar grid
  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    currentMonth: true,
  }));

  // Add days from previous month
  const prevMonthDays = Array.from({ length: daysFromPrevMonth }, (_, i) => ({
    day: daysInPrevMonth - daysFromPrevMonth + i + 1,
    currentMonth: false,
  }));

  // Add days from next month to complete the grid (6 rows x 7 days = 42 cells)
  const totalCells = 42;
  const daysFromNextMonth = totalCells - days.length - prevMonthDays.length;
  const nextMonthDays = Array.from({ length: daysFromNextMonth }, (_, i) => ({
    day: i + 1,
    currentMonth: false,
  }));

  // Combine all days
  const allDays = [...prevMonthDays, ...days, ...nextMonthDays];

  // Create week rows
  const weeks: (typeof allDays)[] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  // Check if a date is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Check if a deliverable phase is active on a specific day
  const isPhaseActiveOnDay = (
    phase: DeliverablePhase,
    day: number,
    isCurrentMonth: boolean
  ) => {
    if (!isCurrentMonth) return false;

    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    const phaseStart = new Date(phase.startDate);
    phaseStart.setHours(0, 0, 0, 0);

    const phaseEnd = new Date(phase.endDate);
    phaseEnd.setHours(23, 59, 59, 999);

    // Check if it's a weekend (Saturday = 6, Sunday = 0)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false; // No deliverables on weekends
    }

    return date >= phaseStart && date <= phaseEnd;
  };

  // Check if a day is the start of a phase
  const isPhaseStart = (
    phase: DeliverablePhase,
    day: number,
    isCurrentMonth: boolean
  ) => {
    if (!isCurrentMonth) return false;

    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    const phaseStart = new Date(phase.startDate);
    phaseStart.setHours(0, 0, 0, 0);

    return date.getTime() === phaseStart.getTime();
  };

  // Check if a day is the end of a phase
  const isPhaseEnd = (
    phase: DeliverablePhase,
    day: number,
    isCurrentMonth: boolean
  ) => {
    if (!isCurrentMonth) return false;

    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    const phaseEnd = new Date(phase.endDate);
    phaseEnd.setHours(0, 0, 0, 0);

    return date.getTime() === phaseEnd.getTime();
  };

  // Get phases for a specific day
  const getPhasesForDay = (day: number, isCurrentMonth: boolean) => {
    return deliverablePhases.filter((phase) =>
      isPhaseActiveOnDay(phase, day, isCurrentMonth)
    );
  };

  // Phase colors with better contrast
  const phaseColors = {
    blue: {
      bg: "bg-blue-200",
      text: "text-blue-800",
      hover: "hover:bg-blue-300",
      border: "border-blue-300",
      light: "bg-blue-50",
      lightText: "text-blue-800",
      lightBorder: "border-blue-200",
    },
    orange: {
      bg: "bg-orange-200",
      text: "text-orange-800",
      hover: "hover:bg-orange-300",
      border: "border-orange-300",
      light: "bg-orange-50",
      lightText: "text-orange-800",
      lightBorder: "border-orange-200",
    },
    yellow: {
      bg: "bg-yellow-200",
      text: "text-yellow-800",
      hover: "hover:bg-yellow-300",
      border: "border-yellow-300",
      light: "bg-yellow-50",
      lightText: "text-yellow-800",
      lightBorder: "border-yellow-200",
    },
    green: {
      bg: "bg-green-200",
      text: "text-green-800",
      hover: "hover:bg-green-300",
      border: "border-green-300",
      light: "bg-green-50",
      lightText: "text-green-800",
      lightBorder: "border-green-200",
    },
    purple: {
      bg: "bg-purple-200",
      text: "text-purple-800",
      hover: "hover:bg-purple-300",
      border: "border-purple-300",
      light: "bg-purple-50",
      lightText: "text-purple-800",
      lightBorder: "border-purple-200",
    },
  };

  // Get the border radius class based on phase position
  const getPhaseCardStyle = (
    phase: DeliverablePhase,
    day: number,
    isCurrentMonth: boolean
  ) => {
    if (!isCurrentMonth) return "";

    const isStart = isPhaseStart(phase, day, isCurrentMonth);
    const isEnd = isPhaseEnd(phase, day, isCurrentMonth);

    if (isStart && isEnd) return "rounded-md";
    if (isStart) return "rounded-l-md rounded-r-none border-r-0";
    if (isEnd) return "rounded-r-md rounded-l-none border-l-0";
    return "rounded-none border-l-0 border-r-0";
  };

  // Handle clicking on "more" indicator
  const handleMoreClick = (
    day: number,
    weekIndex: number,
    dayIndex: number,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent event bubbling

    if (
      expandedDay &&
      expandedDay.day === day &&
      expandedDay.weekIndex === weekIndex &&
      expandedDay.dayIndex === dayIndex
    ) {
      setExpandedDay(null); // Toggle off if already expanded
    } else {
      setExpandedDay({ day, weekIndex, dayIndex });
    }
  };

  // Close expanded day view
  const closeExpandedDay = (event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedDay(null);
  };

  // Get month name
  const getMonthName = (monthIndex: number) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[monthIndex];
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-3 border-b border-gray-200 bg-white">
        <h3 className="text-base font-medium text-gray-800 flex items-center justify-center">
          <Calendar className="mr-2 h-4 w-4 text-[#F5DC00]" />
          {getMonthName(month)} {year}
        </h3>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        <div className="text-center text-xs font-medium text-gray-500 py-2 border-r border-gray-200">
          M
        </div>
        <div className="text-center text-xs font-medium text-gray-500 py-2 border-r border-gray-200">
          T
        </div>
        <div className="text-center text-xs font-medium text-gray-500 py-2 border-r border-gray-200">
          W
        </div>
        <div className="text-center text-xs font-medium text-gray-500 py-2 border-r border-gray-200">
          T
        </div>
        <div className="text-center text-xs font-medium text-gray-500 py-2 border-r border-gray-200">
          F
        </div>
        <div className="text-center text-xs font-medium text-gray-500 py-2 border-r border-gray-200">
          S
        </div>
        <div className="text-center text-xs font-medium text-gray-500 py-2">
          S
        </div>
      </div>

      {/* Calendar grid */}
      <div>
        {weeks.map((week, weekIndex) => (
          <div
            key={`week-${weekIndex}`}
            className="grid grid-cols-7 border-b border-gray-200 last:border-b-0"
          >
            {week.map((dayObj, dayIndex) => {
              const dayPhases = getPhasesForDay(
                dayObj.day,
                dayObj.currentMonth
              );
              const visibleLimit = 2;
              const hasMore = dayPhases.length > visibleLimit;
              const isWeekend = dayIndex === 5 || dayIndex === 6; // Saturday or Sunday (5 = Sat, 6 = Sun in our grid)

              return (
                <div
                  key={`day-${weekIndex}-${dayIndex}`}
                  className={`relative min-h-[80px] p-1 ${
                    dayIndex < 6 ? "border-r border-gray-200" : ""
                  } transition-all duration-200 ${
                    !dayObj.currentMonth
                      ? "bg-gray-50 text-gray-400"
                      : isWeekend
                      ? "bg-gray-50"
                      : "bg-white"
                  }`}
                  onClick={(e) =>
                    handleMoreClick(dayObj.day, weekIndex, dayIndex, e)
                  }
                >
                  <div className="flex justify-between items-center mb-1">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday(dayObj.day) && dayObj.currentMonth
                          ? "bg-[#F5DC00] text-gray-900 font-medium"
                          : !dayObj.currentMonth
                          ? "text-gray-400"
                          : "text-gray-700"
                      }`}
                    >
                      {dayObj.day}
                    </div>
                    {dayObj.currentMonth && dayPhases.length > 0 && (
                      <div className="text-[10px] text-gray-400">
                        {dayPhases.length}
                      </div>
                    )}
                  </div>

                  {/* Show phases for this day with connected cards */}
                  {dayPhases.length > 0 && dayObj.currentMonth && (
                    <div className="mt-1 space-y-1">
                      {dayPhases.slice(0, visibleLimit).map((phase) => {
                        const colorSet =
                          phaseColors[phase.color as keyof typeof phaseColors];
                        const cardStyle = getPhaseCardStyle(
                          phase,
                          dayObj.day,
                          dayObj.currentMonth
                        );
                        const isStart = isPhaseStart(
                          phase,
                          dayObj.day,
                          dayObj.currentMonth
                        );

                        return (
                          <div
                            key={`day-phase-${phase.id}`}
                            className={`flex h-7 items-center border ${cardStyle} ${
                              hoveredPhase === phase.id
                                ? `${colorSet.bg} ${colorSet.text} ${colorSet.border} shadow-sm`
                                : `${colorSet.bg} ${colorSet.text} ${colorSet.border}`
                            } transition-all duration-150 cursor-pointer rounded-md`}
                            onMouseEnter={() => setHoveredPhase(phase.id)}
                            onMouseLeave={() => setHoveredPhase(null)}
                          >
                            <div className="w-full truncate px-1.5 text-xs font-medium">
                              {isStart ? phase.title : ""}
                            </div>
                          </div>
                        );
                      })}
                      {hasMore && (
                        <div className="text-[10px] text-gray-500 text-center">
                          +{dayPhases.length - visibleLimit}
                        </div>
                      )}
                    </div>
                  )}
                  {expandedDay &&
                    expandedDay.day === dayObj.day &&
                    expandedDay.weekIndex === weekIndex &&
                    expandedDay.dayIndex === dayIndex && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md bg-white p-3 shadow-lg border border-gray-200 max-w-[250px]">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">
                            {dayObj.day} {getMonthName(month).substring(0, 3)}
                          </h4>
                          <button
                            onClick={closeExpandedDay}
                            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto space-y-1.5">
                          {getPhasesForDay(dayObj.day, true).length > 0 ? (
                            getPhasesForDay(dayObj.day, true).map((phase) => {
                              const colorSet =
                                phaseColors[
                                  phase.color as keyof typeof phaseColors
                                ];

                              return (
                                <div
                                  key={`expanded-phase-${phase.id}`}
                                  className={`flex items-center rounded-md border p-2 ${colorSet.light} ${colorSet.lightBorder}`}
                                >
                                  <div
                                    className={`mr-2 h-2 w-2 rounded-full ${colorSet.bg}`}
                                  ></div>
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className={`font-medium ${colorSet.lightText} text-xs whitespace-normal`}
                                      title={phase.title}
                                    >
                                      {phase.title}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center text-xs text-gray-500 py-2">
                              No deliverables
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
