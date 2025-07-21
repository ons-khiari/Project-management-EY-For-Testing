"use client";

import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import ImprovedMonthlyCalendar from "./monthly-calendar";
import WeeklyCalendar from "./weekly-calendar";
import DailyCalendar from "./daily-calendar";
import { months } from "@/app/utils/months";
import type { ScheduleFilterState } from "./schedule-filter";
import { useRouter } from "next/navigation";
import type { DeliverablePhase } from "@/app/types/deliverable-phase";
import { getDeliverablePhases } from "@/services/deliverablePhase-api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { getProjectById } from "@/services/project-api";

export default function ImprovedScheduleDashboard() {
  const router = useRouter();
  // Replace the initial state values with today's date
  const today = new Date();
  const [viewMode, setViewMode] = useState("monthly");
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentDay, setCurrentDay] = useState(today.getDate());

  // Calculate the current week based on today's date
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;
  const todayDate = today.getDate();
  const currentWeekIndex = Math.floor((todayDate + firstDayAdjusted - 1) / 7);
  const [currentWeek, setCurrentWeek] = useState(currentWeekIndex);
  const [deliverablePhases, setDeliverablePhases] = useState<
    DeliverablePhase[]
  >([]);
  const [filteredDeliverablePhases, setFilteredDeliverablePhases] = useState<
    DeliverablePhase[]
  >([]);
  const [filters] = useState<ScheduleFilterState>({
    startDate: null,
    endDate: null,
  });

  useEffect(() => {
    const fetchPhases = async () => {
      const token = Cookies.get("token");
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const userId =
        decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      const role =
        decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

      const res = await getDeliverablePhases();

      if (res.success && Array.isArray(res.data)) {
        const userPhases: any[] = [];

        for (const phase of res.data) {
          if (!phase.projectId) continue;

          const projectRes = await getProjectById(phase.projectId);
          if (!projectRes.success || !projectRes.data) continue;

          const project = projectRes.data as {
            members: string[];
            projectManager: string;
          };

          const isManager = project.projectManager === userId;
          const isMember =
            Array.isArray(project.members) && project.members.includes(userId);

          if (isManager || isMember || role === "Admin") {
            userPhases.push(phase);
          }
        }

        setDeliverablePhases(userPhases);
        setFilteredDeliverablePhases(userPhases);
      } else {
        console.error(res.message || "Failed to load phases");
      }
    };

    fetchPhases();
  }, []);

  // Apply filters to deliverable phases
  useEffect(() => {
    const newFilteredPhases = deliverablePhases.filter((phase) => {
      if (filters.startDate) {
        const filterStartDate = new Date(filters.startDate);
        filterStartDate.setHours(0, 0, 0, 0);

        const phaseStartDate = new Date(phase.startDate);
        phaseStartDate.setHours(0, 0, 0, 0);

        if (phaseStartDate < filterStartDate) return false;
      }

      if (filters.endDate) {
        const filterEndDate = new Date(filters.endDate);
        filterEndDate.setHours(23, 59, 59, 999);

        const phaseEndDate = new Date(phase.endDate);
        phaseEndDate.setHours(23, 59, 59, 999);

        if (phaseEndDate > filterEndDate) return false;
      }

      return true;
    });

    setFilteredDeliverablePhases(newFilteredPhases);
  }, [deliverablePhases, filters]);

  // Calculate the number of weeks in the current month
  const getWeeksInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1; // Adjust for Monday as first day

    return Math.ceil((daysInMonth + firstDayAdjusted) / 7);
  };

  // Function to navigate to previous month/week/day
  const goToPrevious = () => {
    if (viewMode === "monthly") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
      setCurrentWeek(0); // Reset to first week when changing months
      setCurrentDay(1); // Reset to first day when changing months
    } else if (viewMode === "weekly") {
      if (currentWeek === 0) {
        // Go to previous month, last week
        if (currentMonth === 0) {
          setCurrentMonth(11);
          setCurrentYear(currentYear - 1);
        } else {
          setCurrentMonth(currentMonth - 1);
        }
        // Set to last week of the new month
        setTimeout(() => {
          setCurrentWeek(getWeeksInMonth() - 1);
        }, 0);
      } else {
        setCurrentWeek(currentWeek - 1);
      }
    } else if (viewMode === "daily") {
      if (currentDay === 1) {
        // Go to previous month, last day
        if (currentMonth === 0) {
          setCurrentMonth(11);
          setCurrentYear(currentYear - 1);
        } else {
          setCurrentMonth(currentMonth - 1);
        }
        // Set to last day of the new month
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
        setCurrentDay(lastDayOfMonth);
      } else {
        setCurrentDay(currentDay - 1);
      }
    }
  };

  // Function to navigate to next month/week/day
  const goToNext = () => {
    if (viewMode === "monthly") {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
      setCurrentWeek(0); // Reset to first week when changing months
      setCurrentDay(1); // Reset to first day when changing months
    } else if (viewMode === "weekly") {
      const weeksInMonth = getWeeksInMonth();

      if (currentWeek >= weeksInMonth - 1) {
        // Go to next month, first week
        if (currentMonth === 11) {
          setCurrentMonth(0);
          setCurrentYear(currentYear + 1);
        } else {
          setCurrentMonth(currentMonth + 1);
        }
        setCurrentWeek(0);
      } else {
        setCurrentWeek(currentWeek + 1);
      }
    } else if (viewMode === "daily") {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      if (currentDay >= daysInMonth) {
        // Go to next month, first day
        if (currentMonth === 11) {
          setCurrentMonth(0);
          setCurrentYear(currentYear + 1);
        } else {
          setCurrentMonth(currentMonth + 1);
        }
        setCurrentDay(1);
      } else {
        setCurrentDay(currentDay + 1);
      }
    }
  };

  // Function to go to today
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setCurrentDay(today.getDate());

    // Calculate the current week
    const firstDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    ).getDay();
    const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;
    const todayDate = today.getDate();
    const currentWeekIndex = Math.floor((todayDate + firstDayAdjusted - 1) / 7);

    setCurrentWeek(currentWeekIndex);
  };

  // Get the current view title
  const getCurrentViewTitle = () => {
    if (viewMode === "monthly") {
      return `${months[currentMonth]} ${currentYear}`;
    } else if (viewMode === "weekly") {
      // Calculate the first day of the week
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const firstDayOfWeek = firstDayOfMonth.getDay();
      const firstDayAdjusted = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

      const startOffset = currentWeek * 7 - firstDayAdjusted;
      const weekStart = new Date(currentYear, currentMonth, 1 + startOffset);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Format: "Mar 5 - Mar 11, 2023" or "Mar 26 - Apr 1, 2023"
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${months[weekStart.getMonth()].substring(
          0,
          3
        )} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      } else {
        return `${months[weekStart.getMonth()].substring(
          0,
          3
        )} ${weekStart.getDate()} - ${months[weekEnd.getMonth()].substring(
          0,
          3
        )} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      }
    } else if (viewMode === "daily") {
      const date = new Date(currentYear, currentMonth, currentDay);
      const dayOfWeek = date.getDay();
      const daysOfWeek = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      return `${daysOfWeek[dayOfWeek]}, ${months[currentMonth]} ${currentDay}, ${currentYear}`;
    }

    return "";
  };

  // Add a useEffect to update the date when view mode changes
  useEffect(() => {
    // Reset to today's date when view mode changes
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setCurrentDay(today.getDate());

    // Calculate the current week
    const firstDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    ).getDay();
    const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;
    const todayDate = today.getDate();
    const currentWeekIndex = Math.floor((todayDate + firstDayAdjusted - 1) / 7);
    setCurrentWeek(currentWeekIndex);
  }, [viewMode]);

  return (
    <div className="h-full">
      {/* View mode tabs */}
      {/* <div className="mb-2 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            className={`border-b-2 px-3 py-1.5 text-sm font-medium ${
              viewMode === "daily"
                ? "border-[#F5DC00] text-[#444444]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setViewMode("daily")}
          >
            Day
          </button>
          <button
            className={`border-b-2 px-3 py-1.5 text-sm font-medium ${
              viewMode === "weekly"
                ? "border-[#F5DC00] text-[#444444]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setViewMode("weekly")}
          >
            Week
          </button>
          <button
            className={`border-b-2 px-3 py-1.5 text-sm font-medium ${
              viewMode === "monthly"
                ? "border-[#F5DC00] text-[#444444]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setViewMode("monthly")}
          >
            Month
          </button>
        </div>
      </div> */}

      {/* Navigation */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <h2 className="text-base font-medium text-[#444444]">
            {getCurrentViewTitle()}
          </h2>
          <button
            onClick={goToNext}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <CalendarIcon className="h-3 w-3" />
            <span>Today</span>
          </button>
          {/* <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="h-7 rounded-md border border-gray-300 pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#F5DC00]"
            />
          </div> */}
        </div>
      </div>

      {/* Calendar */}
      <div className="overflow-auto">
        {viewMode === "monthly" && (
          <ImprovedMonthlyCalendar
            year={currentYear}
            month={currentMonth}
            deliverablePhases={filteredDeliverablePhases}
          />
        )}
        {/* {viewMode === "weekly" && (
          <WeeklyCalendar
            year={currentYear}
            month={currentMonth}
            week={currentWeek}
            deliverablePhases={filteredDeliverablePhases}
          />
        )}
        {viewMode === "daily" && (
          <DailyCalendar
            year={currentYear}
            month={currentMonth}
            day={currentDay}
            deliverablePhases={filteredDeliverablePhases}
          />
        )} */}
      </div>
    </div>
  );
}
