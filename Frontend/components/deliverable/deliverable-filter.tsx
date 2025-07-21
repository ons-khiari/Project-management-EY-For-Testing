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
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface DeliverableFilterState {
  assignees: string[] | null;
  project: string | null;
  deliverablePhase: string | null;
  priority: string | null;
  priorityNumber: number | null;
  date: Date | null;
}

interface DeliverableFilterBarProps {
  onFilterChange: (filters: DeliverableFilterState) => void;
}

export function DeliverableFilterBar({
  onFilterChange,
}: DeliverableFilterBarProps) {
  const [filters, setFilters] = useState<DeliverableFilterState>({
    assignees: null,
    project: null,
    deliverablePhase: null,
    priority: null,
    priorityNumber: null,
    date: null,
  });

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
  const deliverablePhases = ["Phase 1", "Phase 2", "Phase 3"];
  const priorities = ["low", "med", "high"];
  const priorityNumbers = [1, 2, 3, 4, 5, 6];

  // State for assignee selection
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);

  const handleAssigneeChange = (assignee: string, checked: boolean) => {
    if (checked) {
      const newAssignees = [...(selectedAssignees || []), assignee];
      setSelectedAssignees(newAssignees);
      handleFilterChange(
        "assignees",
        newAssignees.length > 0 ? newAssignees : null
      );
    } else {
      const newAssignees = selectedAssignees.filter((a) => a !== assignee);
      setSelectedAssignees(newAssignees);
      handleFilterChange(
        "assignees",
        newAssignees.length > 0 ? newAssignees : null
      );
    }
  };

  const handleFilterChange = <
    T extends DeliverableFilterState[keyof DeliverableFilterState]
  >(
    key: keyof DeliverableFilterState,
    value: T
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };


  const handleApplyFilters = () => {
    onFilterChange(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      assignees: null,
      project: null,
      deliverablePhase: null,
      priority: null,
      priorityNumber: null,
      date: null,
    };
    setSelectedAssignees([]);
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 bg-white p-2 rounded-md border border-gray-200">
      {/* Assignee Filter (Multi-select) */}
      <div className="flex-1 min-w-[120px]">
        <Popover
          open={assigneeDropdownOpen}
          onOpenChange={setAssigneeDropdownOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 w-full justify-start text-left font-normal border-gray-200 text-gray-500 hover:bg-gray-100"
            >
              {selectedAssignees && selectedAssignees.length > 0 ? (
                <div className="flex flex-wrap gap-1 max-w-[150px] overflow-hidden">
                  {selectedAssignees.map((assignee) => (
                    <span
                      key={assignee}
                      className="bg-gray-100 px-1 rounded text-xs flex items-center"
                    >
                      {assignee}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssigneeChange(assignee, false);
                        }}
                      />
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500">Assignees</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2" align="start">
            <div className="space-y-2">
              {assignees.map((assignee) => (
                <div key={assignee} className="flex items-center space-x-2">
                  <Checkbox
                    id={`assignee-${assignee}`}
                    checked={selectedAssignees.includes(assignee)}
                    onCheckedChange={(checked) =>
                      handleAssigneeChange(assignee, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`assignee-${assignee}`}
                    className="text-sm cursor-pointer"
                  >
                    {assignee}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
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

      {/* Priority Number Filter */}
      <div className="flex-1 min-w-[120px]">
        <Select
          value={
            filters.priorityNumber ? filters.priorityNumber.toString() : ""
          }
          onValueChange={(value) =>
            handleFilterChange(
              "priorityNumber",
              value ? Number.parseInt(value) : null
            )
          }
        >
          <SelectTrigger className="h-9 border-gray-200 text-gray-500 hover:bg-gray-100">
            <SelectValue placeholder="Priority Number" className="text-gray-500" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-gray-500">
              All Numbers
            </SelectItem>
            {priorityNumbers.map((num) => (
              <SelectItem
                key={num}
                value={num.toString()}
                className="text-gray-500"
              >
                D{num}
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
