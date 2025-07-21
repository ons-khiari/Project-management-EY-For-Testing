"use client";

import { useState, useEffect } from "react";
import type { DeliverablePhase } from "@/app/types/deliverable-phase";
import { ChevronDown, ChevronUp, Clock, Calendar } from "lucide-react";
import { months } from "@/app/utils/months";

interface WeeklyCalendarProps {
  year: number;
  month: number;
  week: number; // 0-indexed week of the month
  deliverablePhases: DeliverablePhase[];
}

export default function WeeklyCalendar({
  year,
  month,
  week,
  deliverablePhases,
}: WeeklyCalendarProps) {
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Get the first day of the month
  const firstDayOfMonth = new Date(year, month, 1);

  // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = firstDayOfMonth.getDay();

  // Adjust for Monday as first day of week (0 = Monday, 6 = Sunday)
  const firstDayAdjusted = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Calculate the first day of the requested week
  // Week 0 starts with the Monday of the week containing the 1st of the month
  // If the 1st is not a Monday, we may need to go back to the previous month
  const startOffset = week * 7 - firstDayAdjusted;
  const weekStart = new Date(year, month, 1 + startOffset);

  // Generate the 7 days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Update the isPhaseActiveOnDay function to exclude weekends
  const isPhaseActiveOnDay = (phase: DeliverablePhase, date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const phaseStart = new Date(phase.startDate);
    phaseStart.setHours(0, 0, 0, 0);

    const phaseEnd = new Date(phase.endDate);
    phaseEnd.setHours(23, 59, 59, 999);

    // Check if it's a weekend (Saturday = 6, Sunday = 0)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false; // No deliverables on weekends
    }

    return phaseStart <= dayEnd && phaseEnd >= dayStart;
  };

  // Check if a day is the start of a phase
  const isPhaseStart = (phase: DeliverablePhase, date: Date) => {
    const phaseStart = new Date(phase.startDate);
    phaseStart.setHours(0, 0, 0, 0);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    return phaseStart.getTime() === dayStart.getTime();
  };

  // Check if a day is the end of a phase
  const isPhaseEnd = (phase: DeliverablePhase, date: Date) => {
    const phaseEnd = new Date(phase.endDate);
    phaseEnd.setHours(0, 0, 0, 0);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    return phaseEnd.getTime() === dayStart.getTime();
  };

  // Get phases for a specific day
  const getPhasesForDay = (date: Date) => {
    return deliverablePhases.filter((phase) => isPhaseActiveOnDay(phase, date));
  };

  // Format date as "Mon, 15"
  const formatDayHeader = (date: Date) => {
    const days = ["M", "T", "W", "T", "F", "S", "S"];
    const dayOfWeek = date.getDay();
    // Convert from Sunday=0 to Monday=0
    const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    return `${days[adjustedDayOfWeek]}`;
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
  const getPhaseCardStyle = (phase: DeliverablePhase, date: Date) => {
    const isStart = isPhaseStart(phase, date);
    const isEnd = isPhaseEnd(phase, date);

    if (isStart && isEnd) return "rounded-md";
    if (isStart) return "rounded-l-md rounded-r-none border-r-0";
    if (isEnd) return "rounded-r-md rounded-l-none border-l-0";
    return "rounded-none border-l-0 border-r-0";
  };

  // Toggle phase details
  const togglePhaseDetails = (phaseId: string) => {
    if (expandedPhase === phaseId) {
      setExpandedPhase(null);
    } else {
      setExpandedPhase(phaseId);
    }
  };

  // Get week date range for header
  const getWeekDateRange = () => {
    const startDate = weekDays[0];
    const endDate = weekDays[6];

    // If the week spans two months
    if (startDate.getMonth() !== endDate.getMonth()) {
      return `${startDate.getDate()} ${
        months[startDate.getMonth()]
      } - ${endDate.getDate()} ${
        months[endDate.getMonth()]
      } ${endDate.getFullYear()}`;
    }

    return `${startDate.getDate()} - ${endDate.getDate()} ${
      months[startDate.getMonth()]
    } ${startDate.getFullYear()}`;
  };

  // Calculate if a time marker should be shown for the current time
  const getCurrentTimePosition = (date: Date) => {
    if (!isToday(date)) return null;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Calculate position as percentage of day (0-100%)
    const percentage = ((hours * 60 + minutes) / (24 * 60)) * 100;

    return percentage;
  };

  // Generate time slots for the day (hourly)
  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    return {
      hour: i * 2,
      displayTime: `${i * 2}:00`,
    };
  });

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-base font-medium text-gray-800 flex items-center justify-center">
          <Calendar className="mr-2 h-4 w-4 text-[#F5DC00]" />
          {getWeekDateRange()}
        </h3>
      </div>

      <div className="flex">
        {/* Time column */}
        <div className="w-12 border-r border-gray-200 pt-8">
          {timeSlots.map((slot) => (
            <div
              key={slot.hour}
              className="h-12 text-[10px] text-gray-500 text-right pr-1"
            >
              {slot.displayTime}
            </div>
          ))}
        </div>

        {/* Days columns */}
        <div className="flex-1 grid grid-cols-7">
          {/* Day headers */}
          <div className="col-span-7 grid grid-cols-7 border-b border-gray-200">
            {weekDays.map((date, index) => {
              const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday

              return (
                <div
                  key={`day-header-${index}`}
                  className={`p-2 text-center ${
                    index < 6 ? "border-r border-gray-200" : ""
                  } ${
                    isToday(date)
                      ? "bg-[#F5DC00]/10"
                      : isWeekend
                      ? "bg-gray-50"
                      : date.getMonth() !== month
                      ? "bg-gray-50"
                      : "bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500">
                      {formatDayHeader(date)}
                    </span>
                    <span
                      className={`text-sm ${
                        isToday(date)
                          ? "font-medium text-[#F5DC00]"
                          : isWeekend
                          ? "text-gray-400"
                          : "text-gray-700"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day content */}
          {weekDays.map((date, dayIndex) => {
            const dayPhases = getPhasesForDay(date);
            const isCurrentMonth = date.getMonth() === month;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday
            const currentTimePosition = getCurrentTimePosition(date);

            return (
              <div
                key={`day-${dayIndex}`}
                className={`relative min-h-[300px] ${
                  dayIndex < 6 ? "border-r border-gray-200" : ""
                } ${
                  isToday(date)
                    ? "bg-[#F5DC00]/5"
                    : isWeekend
                    ? "bg-gray-50"
                    : !isCurrentMonth
                    ? "bg-gray-50"
                    : "bg-white"
                }`}
              >
                {/* Horizontal time grid lines */}
                {timeSlots.map((slot) => (
                  <div
                    key={`grid-${dayIndex}-${slot.hour}`}
                    className="h-12 border-b border-gray-100"
                  ></div>
                ))}

                {/* Phases for this day */}
                <div className="absolute inset-0 p-1 space-y-1 overflow-hidden">
                  {dayPhases.map((phase) => {
                    const colorSet =
                      phaseColors[phase.color as keyof typeof phaseColors];
                    const cardStyle = getPhaseCardStyle(phase, date);
                    const isStart = isPhaseStart(phase, date);
                    const isExpanded = expandedPhase === phase.id;

                    // Calculate position based on start time
                    const phaseStartHour = new Date(phase.startDate).getHours();
                    const phaseStartMinutes = new Date(
                      phase.startDate
                    ).getMinutes();
                    const topPosition =
                      ((phaseStartHour * 60 + phaseStartMinutes) / (24 * 60)) *
                      100;

                    // Calculate height based on duration (simplified)
                    const heightPercentage = 10; // Fixed height for simplicity

                    return (
                      <div
                        key={`day-phase-${phase.id}`}
                        className={`absolute left-1 right-1 border ${cardStyle} ${
                          hoveredPhase === phase.id
                            ? `${colorSet.bg} ${colorSet.text} ${colorSet.border} shadow-md`
                            : `${colorSet.bg} ${colorSet.text} ${colorSet.border}`
                        } transition-all duration-150 cursor-pointer z-10 rounded-md`}
                        style={{
                          top: `${topPosition}%`,
                          height: `${
                            heightPercentage > 5 ? heightPercentage : 15
                          }%`,
                        }}
                        onMouseEnter={() => setHoveredPhase(phase.id)}
                        onMouseLeave={() => setHoveredPhase(null)}
                        onClick={() => togglePhaseDetails(phase.id)}
                      >
                        <div className="flex items-center h-full px-2">
                          <div className="flex-1 truncate text-xs font-medium">
                            {isStart ? phase.title : ""}
                          </div>
                          {isStart && (
                            <button className="ml-1 flex h-4 w-4 items-center justify-center rounded-full hover:bg-black hover:bg-opacity-10 transition-colors">
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {isExpanded && isStart && (
                          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-md shadow-sm p-2 text-[10px]">
                            <div className="mb-1">
                              <span className="font-medium">Start:</span>{" "}
                              {new Date(phase.startDate).toLocaleDateString()}
                            </div>
                            <div className="mb-1">
                              <span className="font-medium">End:</span>{" "}
                              {new Date(phase.endDate).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Current time indicator */}
                  {currentTimePosition !== null && (
                    <div
                      className="absolute left-0 right-0 border-t border-red-500 z-10 flex items-center"
                      style={{ top: `${currentTimePosition}%` }}
                    >
                      <div className="bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-sm ml-1 flex items-center">
                        <Clock className="h-2 w-2 mr-0.5" />
                        {currentTime.getHours().toString().padStart(2, "0")}:
                        {currentTime.getMinutes().toString().padStart(2, "0")}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
