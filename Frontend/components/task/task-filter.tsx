"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface TaskFilterState {
  assignee: string | null;
  project: string | null;
  deliverable: string | null;
  deliverablePhase: string | null;
  date: Date | null;
  priority: string | null;
}

interface TaskFilterBarProps {
  onFilterChange: (filters: TaskFilterState) => void;
}

export function TaskFilterBar({ onFilterChange }: TaskFilterBarProps) {
  const [filters, setFilters] = useState<TaskFilterState>({
    assignee: null,
    project: null,
    deliverable: null,
    deliverablePhase: null,
    date: null,
    priority: null,
  });

  const handleFilterChange = (key: keyof TaskFilterState, value: TaskFilterState[keyof TaskFilterState]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilterChange(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      assignee: null,
      project: null,
      deliverable: null,
      deliverablePhase: null,
      date: null,
      priority: null,
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  // Sample data for dropdowns
  const assignees = ["OK", "JD", "AS", "MK"];
  const projects = [
    "Project 1",
    "Project 2",
    "Project 3",
    "Project 4",
    "Project 5",
    "Project 6",
  ];
  const deliverables = ["Deliverable 1", "Deliverable 2", "Deliverable 3"];
  const deliverablePhases = ["Phase 1", "Phase 2", "Phase 3"];
  const priorities = ["low", "med", "high"];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 bg-white p-2 rounded-md border border-gray-200">
      {/* Assignee Filter */}
      <div className="flex-1 min-w-[120px]">
        <Select
          value={filters.assignee || ""}
          onValueChange={(value) =>
            handleFilterChange("assignee", value || null)
          }
        >
          <SelectTrigger className="h-9 border-gray-200 text-gray-500 hover:bg-gray-100">
            <SelectValue placeholder="Assignee" className="text-gray-500" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-gray-500">
              All Assignees
            </SelectItem>
            {assignees.map((assignee) => (
              <SelectItem
                key={assignee}
                value={assignee}
                className="text-gray-500"
              >
                {assignee}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project Filter */}
      <div className="flex-1 min-w-[120px]">
        <Select
          value={filters.project || ""}
          onValueChange={(value) =>
            handleFilterChange("project", value || null)
          }
        >
          <SelectTrigger className="h-9 border-gray-200 text-gray-500 hover:bg-gray-100">
            <SelectValue placeholder="Project" className="text-gray-500" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-gray-500">
              All Projects
            </SelectItem>
            {projects.map((project) => (
              <SelectItem
                key={project}
                value={project}
                className="text-gray-500"
              >
                {project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Deliverable Filter */}
      <div className="flex-1 min-w-[120px]">
        <Select
          value={filters.deliverable || ""}
          onValueChange={(value) =>
            handleFilterChange("deliverable", value || null)
          }
        >
          <SelectTrigger className="h-9 border-gray-200 text-gray-500 hover:bg-gray-100">
            <SelectValue placeholder="Deliverable" className="text-gray-500" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-gray-500">
              All Deliverables
            </SelectItem>
            {deliverables.map((deliverable) => (
              <SelectItem
                key={deliverable}
                value={deliverable}
                className="text-gray-500"
              >
                {deliverable}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Deliverable Phase Filter */}
      <div className="flex-1 min-w-[120px]">
        <Select
          value={filters.deliverablePhase || ""}
          onValueChange={(value) =>
            handleFilterChange("deliverablePhase", value || null)
          }
        >
          <SelectTrigger className="h-9 border-gray-200 text-gray-500 hover:bg-gray-100">
            <SelectValue placeholder="Phase" className="text-gray-500" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-gray-500">
              All Phases
            </SelectItem>
            {deliverablePhases.map((phase) => (
              <SelectItem key={phase} value={phase} className="text-gray-500">
                {phase}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority Filter */}
      <div className="flex-1 min-w-[120px]">
        <Select
          value={filters.priority || ""}
          onValueChange={(value) =>
            handleFilterChange("priority", value || null)
          }
        >
          <SelectTrigger className="h-9 border-gray-200 text-gray-500 hover:bg-gray-100">
            <SelectValue placeholder="Priority" className="text-gray-500" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-gray-500">
              All Priorities
            </SelectItem>
            {priorities.map((priority) => (
              <SelectItem
                key={priority}
                value={priority}
                className="text-gray-500"
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Filter */}
      <div className="flex-1 min-w-[120px]">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 w-full justify-start text-left font-normal border-gray-200 text-gray-500 hover:bg-gray-100",
                !filters.date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
              {filters.date ? (
                format(filters.date, "PPP")
              ) : (
                <span className="text-gray-500">Date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.date || undefined}
              onSelect={(date) => handleFilterChange("date", date ?? null)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Filter Actions */}
      <div className="flex gap-2 text-gray-500">
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black"
          onClick={handleApplyFilters}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filter
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black"
          onClick={handleClearFilters}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
