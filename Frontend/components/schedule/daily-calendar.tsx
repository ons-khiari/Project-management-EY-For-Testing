"use client";

import { useState, useEffect } from "react";
import type { DeliverablePhase } from "@/app/types/deliverable-phase";
import { Clock, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { months } from "@/app/utils/months";

interface DailyCalendarProps {
  year: number;
  month: number;
  day: number;
  deliverablePhases: DeliverablePhase[];
}

export default function DailyCalendar({
  year,
  month,
  day,
  deliverablePhases,
}: DailyCalendarProps) {
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

  // Create the date object for the selected day
  const selectedDate = new Date(year, month, day);

  // Get day of week
  const dayOfWeek = selectedDate.getDay();
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Check if the date is today
  const isToday = () => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  // Check if the selected day is a weekend
  const isWeekend = () => {
    const dayOfWeek = selectedDate.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };

  // Get phases active on this day
  const getActivePhasesForDay = () => {
    // If it's a weekend, return an empty array
    if (isWeekend()) {
      return [];
    }

    return deliverablePhases.filter((phase) => {
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      const phaseStart = new Date(phase.startDate);
      phaseStart.setHours(0, 0, 0, 0);

      const phaseEnd = new Date(phase.endDate);
      phaseEnd.setHours(23, 59, 59, 999);

      return phaseStart <= dayEnd && phaseEnd >= dayStart;
    });
  };

  // Check if a phase starts on this day
  const isPhaseStart = (phase: DeliverablePhase) => {
    const phaseStart = new Date(phase.startDate);
    phaseStart.setHours(0, 0, 0, 0);

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);

    return phaseStart.getTime() === dayStart.getTime();
  };

  // Check if a phase ends on this day
  const isPhaseEnd = (phase: DeliverablePhase) => {
    const phaseEnd = new Date(phase.endDate);
    phaseEnd.setHours(0, 0, 0, 0);

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);

    return phaseEnd.getTime() === dayStart.getTime();
  };

  // Generate time slots for the day (hourly)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i % 12 === 0 ? 12 : i % 12;
    const amPm = i < 12 ? "AM" : "PM";
    return {
      hour: i,
      displayTime: `${hour}:00 ${amPm}`,
      isCurrentHour: isToday() && currentTime.getHours() === i,
    };
  });

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

  // Toggle phase details
  const togglePhaseDetails = (phaseId: string) => {
    if (expandedPhase === phaseId) {
      setExpandedPhase(null);
    } else {
      setExpandedPhase(phaseId);
    }
  };

  const activePhases = getActivePhasesForDay();

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Day header */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-base font-medium text-gray-800 flex items-center justify-center">
          <Calendar className="mr-2 h-4 w-4 text-[#F5DC00]" />
          {daysOfWeek[dayOfWeek]}, {months[month]} {day}, {year}
        </h3>
      </div>

      <div className="flex">
        {/* Time column */}
        <div className="w-16 border-r border-gray-200">
          {timeSlots.map((slot) => (
            <div
              key={`time-${slot.hour}`}
              className={`flex items-center justify-end h-12 pr-2 text-xs ${
                slot.isCurrentHour
                  ? "text-red-500 font-medium"
                  : "text-gray-500"
              } border-b border-gray-100`}
            >
              {slot.displayTime}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 relative">
          {/* Time grid lines */}
          {timeSlots.map((slot) => (
            <div
              key={`grid-${slot.hour}`}
              className={`h-12 border-b border-gray-100 ${
                slot.isCurrentHour ? "bg-red-50/30" : ""
              }`}
            ></div>
          ))}

          {/* Current time indicator */}
          {isToday() && (
            <div
              className="absolute left-0 right-0 border-t border-red-500 z-10 flex items-center"
              style={{
                top: `${
                  ((currentTime.getHours() * 60 + currentTime.getMinutes()) /
                    (24 * 60)) *
                  100
                }%`,
              }}
            >
              <div className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-sm ml-2 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {currentTime.getHours().toString().padStart(2, "0")}:
                {currentTime.getMinutes().toString().padStart(2, "0")}
              </div>
            </div>
          )}

          {/* Phases */}
          <div className="absolute inset-0 p-2">
            {activePhases.map((phase) => {
              const colorSet =
                phaseColors[phase.color as keyof typeof phaseColors];
              const isStart = isPhaseStart(phase);
              const isEnd = isPhaseEnd(phase);
              const isExpanded = expandedPhase === phase.id;

              // Calculate position based on start time
              const phaseStartHour = new Date(phase.startDate).getHours();
              const phaseStartMinutes = new Date(phase.startDate).getMinutes();
              const topPosition =
                ((phaseStartHour * 60 + phaseStartMinutes) / (24 * 60)) * 100;

              // Calculate height based on duration (simplified)
              const heightPercentage = 8; // Fixed height for simplicity

              return (
                <div
                  key={`phase-${phase.id}`}
                  className={`absolute left-2 right-2 rounded-md border ${
                    hoveredPhase === phase.id
                      ? `${colorSet.bg} ${colorSet.text} ${colorSet.border} shadow-md`
                      : `${colorSet.bg} ${colorSet.text} ${colorSet.border}`
                  } transition-all duration-150 shadow-sm z-10`}
                  style={{
                    top: `${topPosition}%`,
                    height: `${heightPercentage > 5 ? heightPercentage : 20}%`,
                  }}
                  onMouseEnter={() => setHoveredPhase(phase.id)}
                  onMouseLeave={() => setHoveredPhase(null)}
                >
                  <div className="flex items-center justify-between h-full px-3">
                    <div className="flex items-center">
                      <div
                        className={`mr-2 h-2 w-2 rounded-full ${colorSet.border}`}
                      ></div>
                      <h4 className="text-xs font-medium">{phase.title}</h4>
                    </div>
                    <button
                      onClick={() => togglePhaseDetails(phase.id)}
                      className="rounded-full p-1 hover:bg-gray-200 hover:bg-opacity-30 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div
                      className={`absolute top-full left-0 right-0 z-10 mt-1 rounded-md border ${colorSet.lightBorder} bg-white p-2 shadow-md text-xs ${colorSet.lightText}`}
                    >
                      <div className="mb-1">
                        <span className="font-medium">Start:</span>{" "}
                        {new Date(phase.startDate).toLocaleTimeString()}
                      </div>
                      <div className="mb-1">
                        <span className="font-medium">End:</span>{" "}
                        {new Date(phase.endDate).toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
