"use client";

import { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import ProjectCard from "./project-card";
import ProjectListItem from "./project-list-items";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import type { Project } from "@/app/types/project";
import { projectApi } from "@/services/project-api";
import ExcelImportModal from "@/components/excel-import-modal";

export default function ProjectsDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("myProjects");
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    projectManager: null,
    members: null,
    startDate: null,
    endDate: null,
    progress: null,
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [projectsByTab, setProjectsByTab] = useState<{
    myProjects: Project[];
    others: Project[];
  }>({
    myProjects: [],
    others: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const token = Cookies.get("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      const decoded: any = jwtDecode(token);
      const userId =
        decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      const role =
        decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

      setRole(role);
      setCurrentUserId(userId);
      setCurrentUserRole(role);

      try {
        const response = await projectApi.getProjects();
        const allProjects: Project[] = response.data as Project[];

        const getManagerId = (manager: any) => {
          if (!manager) return null;
          if (typeof manager === "string") return manager;
          return manager.id;
        };

        const isUserInMembers = (members: any[]) => {
          if (!Array.isArray(members)) return false;
          return members.some((member) =>
            typeof member === "string"
              ? member === userId
              : member?.id === userId
          );
        };

        let myProjects: Project[] = [];
        let otherProjects: Project[] = [];

        // If the user is a Project Manager
        if (role === "ProjectManager") {
          myProjects = allProjects.filter(
            (project) => getManagerId(project.projectManager) === userId
          );
          otherProjects = allProjects.filter(
            (project) => getManagerId(project.projectManager) !== userId
          );
        }
        // If the user is an Admin
        else if (role === "Admin") {
          myProjects = allProjects; // Admin sees all projects
          otherProjects = []; // Admin sees nothing in 'Others'
        }
        // If the user is a Team Member
        else if (role === "TeamMember") {
          myProjects = allProjects.filter((project) =>
            isUserInMembers(project.members)
          );
          otherProjects = []; // Team Member sees nothing in 'Others'
        }

        setProjectsByTab({
          myProjects,
          others: otherProjects,
        });
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const navigateToAddProject = () => {
    router.push("/projects/add");
  };

  const handleDeleteProject = (deletedProjectId: string) => {
    setProjectsByTab((prev) => ({
      myProjects: prev.myProjects.filter(
        (project) => project.id !== deletedProjectId
      ),
      others: prev.others.filter((project) => project.id !== deletedProjectId),
    }));
  };

  const handleImportSuccess = () => {
    // Refresh the projects list after successful import
    window.location.reload(); // Simple refresh, or you can refetch data
  };

  const tabs = [
    { key: "myProjects", label: "My Projects" },
    ...(role === "ProjectManager" ? [{ key: "others", label: "Others" }] : []),
  ];

  // Filter projects based on search query
  const searchFilteredProjects = (
    activeTab === "myProjects" ? projectsByTab.myProjects : projectsByTab.others
  ).filter((project) => {
    if (!searchQuery) return true;
    return (
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description &&
        project.description.toLowerCase().includes(searchQuery.toLowerCase()))
      // (project.clientId &&
      //   project.clientId.name &&
      //   project.clientId.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="h-full">
      {/* Header with title and actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#444444]">Projects</h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search input */}
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm placeholder-gray-400 shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]"
            />
          </div>

          {/* View toggle */}
          {/* <div className="flex rounded-lg border border-gray-300 bg-white shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center justify-center rounded-l-lg px-3 py-2 ${
                viewMode === "grid"
                  ? "bg-[#ffe500] text-[#444444]"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center justify-center rounded-r-lg px-3 py-2 ${
                viewMode === "list"
                  ? "bg-[#ffe500] text-[#444444]"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div> */}

          {/* Filter button */}
          {/* <button
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm ${
              showFilters
                ? "border-[#ffe500] bg-[#ffe500] text-[#444444]"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={toggleFilters}
          >
            <Filter className="h-4 w-4" />
            <span>Filter</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showFilters ? "rotate-180" : ""
              }`}
            />
          </button> */}

          {/* Import and Add project buttons */}
          {role !== "TeamMember" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-green-600 bg-white px-3 py-2 text-sm font-medium text-green-600 shadow-sm hover:bg-green-50 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14,2 14,8 20,8" />
                  <path d="M12 18v-6" />
                  <path d="m9 15 3 3 3-3" />
                </svg>
                <span>Import Excel</span>
              </button>
              <button
                onClick={navigateToAddProject}
                className="flex items-center gap-1.5 rounded-lg border border-[#ffe500] bg-[#ffe500] px-3 py-2 text-sm font-medium text-[#444444] shadow-sm hover:bg-[#f5dc00] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Project</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter panel - Only show when filters are toggled */}
      {showFilters && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Project Manager
              </label>
              <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]">
                <option value="">All Managers</option>
                <option value="1">John Doe</option>
                <option value="2">Jane Smith</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]">
                <option value="">All Statuses</option>
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Progress
              </label>
              <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]">
                <option value="">All Progress</option>
                <option value="0-25">0% - 25%</option>
                <option value="26-50">26% - 50%</option>
                <option value="51-75">51% - 75%</option>
                <option value="76-100">76% - 100%</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              Reset
            </button>
            <button className="rounded-lg border border-[#ffe500] bg-[#ffe500] px-4 py-2 text-sm font-medium text-[#444444] shadow-sm hover:bg-[#f5dc00]">
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`relative pb-3 text-sm font-medium transition-colors duration-150 ${
                activeTab === tab.key
                  ? "text-[#444444]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#ffe500]"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Projects grid/list */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ffe500] border-t-transparent"></div>
            <p className="mt-2 text-sm text-gray-500">Loading projects...</p>
          </div>
        </div>
      ) : searchFilteredProjects.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <div className="mb-2 rounded-full bg-gray-100 p-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </div>
          <p className="mb-1 text-lg font-medium text-gray-700">
            No projects found
          </p>
          <p className="max-w-md text-sm text-gray-500">
            {searchQuery
              ? `No projects match your search for "${searchQuery}". Try adjusting your search terms.`
              : "Try adjusting your filters or create a new project to get started."}
          </p>
          {role !== "TeamMember" && !searchQuery && (
            <button
              onClick={navigateToAddProject}
              className="mt-4 flex items-center gap-1.5 rounded-lg border border-[#ffe500] bg-[#ffe500] px-4 py-2 text-sm font-medium text-[#444444] shadow-sm hover:bg-[#f5dc00] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Project</span>
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-4"
          }
        >
          {searchFilteredProjects.map((project) =>
            viewMode === "grid" ? (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDeleteProject}
              />
            ) : (
              <ProjectListItem key={project.id} project={project} />
            )
          )}
        </div>
      )}
      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
