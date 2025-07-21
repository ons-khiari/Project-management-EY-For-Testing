"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface ProjectFilterState {
  projectManager: string | null;
  members: string[] | null;
  startDate: Date | null;
  endDate: Date | null;
  progress: number | null;
}

interface ProjectFilterBarProps {
  onFilterChange: (filters: ProjectFilterState) => void;
}

export function ProjectFilterBar({ onFilterChange }: ProjectFilterBarProps) {
  const [filters, setFilters] = useState<ProjectFilterState>({
    projectManager: null,
    members: null,
    startDate: null,
    endDate: null,
    progress: null,
  });

  // Sample data for members and project managers dropdown
  const members = ["OK", "JD", "AS", "MK", "RL"];
  const projectManagers = ["OK", "JD", "AS", "MK", "RL"];

  // State for member selection
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);

  const handleMemberChange = (member: string, checked: boolean) => {
    if (checked) {
      const newMembers = [...(selectedMembers || []), member];
      setSelectedMembers(newMembers);
      handleFilterChange("members", newMembers.length > 0 ? newMembers : null);
    } else {
      const newMembers = selectedMembers.filter((m) => m !== member);
      setSelectedMembers(newMembers);
      handleFilterChange("members", newMembers.length > 0 ? newMembers : null);
    }
  };

  const handleFilterChange = (
    key: keyof ProjectFilterState,
    value: ProjectFilterState[keyof ProjectFilterState]
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilterChange(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      projectManager: null,
      members: null,
      startDate: null,
      endDate: null,
      progress: null,
    };
    setSelectedMembers([]);
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 bg-white p-2 rounded-md border border-gray-200">
      {/* Project Manager Filter */}
      <div className="flex-1 min-w-[120px]">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 w-full justify-start text-left font-normal border-gray-200 text-gray-500 hover:bg-gray-100"
            >
              {filters.projectManager ? (
                <span>{getFullName(filters.projectManager)}</span>
              ) : (
                <span className="text-gray-500">Project Manager</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2" align="start">
            <div className="space-y-2">
              {projectManagers.map((pm) => (
                <div key={pm} className="flex items-center space-x-2">
                  <Checkbox
                    id={`pm-${pm}`}
                    checked={filters.projectManager === pm}
                    onCheckedChange={(checked) =>
                      handleFilterChange("projectManager", checked ? pm : null)
                    }
                  />
                  <label
                    htmlFor={`pm-${pm}`}
                    className="text-sm cursor-pointer"
                  >
                    {getFullName(pm)}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Members Filter (Multi-select) */}
      <div className="flex-1 min-w-[120px]">
        <Popover open={memberDropdownOpen} onOpenChange={setMemberDropdownOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 w-full justify-start text-left font-normal border-gray-200 text-gray-500 hover:bg-gray-100"
            >
              {selectedMembers && selectedMembers.length > 0 ? (
                <div className="flex flex-wrap gap-1 max-w-[150px] overflow-hidden">
                  {selectedMembers.map((member) => (
                    <span
                      key={member}
                      className="bg-gray-100 px-1 rounded text-xs flex items-center"
                    >
                      {member}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMemberChange(member, false);
                        }}
                      />
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500">Members</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2" align="start">
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member} className="flex items-center space-x-2">
                  <Checkbox
                    id={`member-${member}`}
                    checked={selectedMembers.includes(member)}
                    onCheckedChange={(checked) =>
                      handleMemberChange(member, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`member-${member}`}
                    className="text-sm cursor-pointer"
                  >
                    {getFullName(member)}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Start Date Filter */}
      <div className="flex-1 min-w-[120px]">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 w-full justify-start text-left font-normal border-gray-200 text-gray-500 hover:bg-gray-100",
                !filters.startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
              {filters.startDate ? (
                format(filters.startDate, "PPP")
              ) : (
                <span className="text-gray-500">Start Date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.startDate || undefined}
              onSelect={(date) => handleFilterChange("startDate", date ?? null)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* End Date Filter */}
      <div className="flex-1 min-w-[120px]">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 w-full justify-start text-left font-normal border-gray-200 text-gray-500 hover:bg-gray-100",
                !filters.endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
              {filters.endDate ? (
                format(filters.endDate, "PPP")
              ) : (
                <span className="text-gray-500">End Date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.endDate || undefined}
              onSelect={(date) => handleFilterChange("endDate", date ?? null)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Progress Filter */}
      <div className="flex-1 min-w-[150px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Progress: {filters.progress || 0}%
            </span>
            {filters.progress !== null && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 p-0 text-gray-500"
                onClick={() => handleFilterChange("progress", null)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Slider
            defaultValue={[0]}
            value={filters.progress !== null ? [filters.progress] : [0]}
            max={100}
            step={5}
            onValueChange={(value) => handleFilterChange("progress", value[0])}
            className="h-2"
          />
        </div>
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

// Helper function to get full name from initials
function getFullName(initials: string): string {
  switch (initials) {
    case "OK":
      return "Ons Khiari";
    case "JD":
      return "John Doe";
    case "AS":
      return "Anna Smith";
    case "MK":
      return "Mike Kim";
    case "RL":
      return "Rachel Lee";
    default:
      return initials;
  }
}
