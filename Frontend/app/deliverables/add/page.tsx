"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Plus,
  Calendar,
  Link2,
  User,
  ArrowLeft,
  ChevronRight,
  Briefcase,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import type { Deliverable } from "@/app/types/deliverable";
import Link from "next/link";
import withAuthAdminPM from "@/HOC/withAuthAdminPM";
import { Project } from "@/app/types/project";
import { DeliverablePhase } from "@/app/types/deliverable-phase";
import { User as UserType } from "@/app/types/user";
import { projectApi } from "@/services/project-api";
import { deliverablePhaseApi } from "@/services/deliverablePhase-api";
import { api } from "@/services/api";
import { deliverableApi } from "@/services/deliverable-api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

const AddDeliverablePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const phaseId = searchParams.get("phaseId");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [priority, setPriority] = useState<"low" | "med" | "high">("low");
  const [priorityNumber, setPriorityNumber] = useState(1);
  const [dueDate, setDueDate] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [formattedDate, setFormattedDate] = useState("");
  const [projectMembers, setProjectMembers] = useState<UserType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<DeliverablePhase[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    dueDate?: string;
    assignees?: string;
  }>({});

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (selectedProjectId) {
        const projectRes = (await projectApi.getProjectById(
          selectedProjectId
        )) as { success: boolean; data: Project | null };
        if (projectRes.success && projectRes.data) {
          const membersData = await Promise.all(
            projectRes.data?.members.map(async (memberId: string) => {
              const memberRes = await api.getUserById(memberId);
              return memberRes.success ? memberRes.data : null;
            })
          );
          setProjectMembers(
            membersData.filter((member): member is UserType => member !== null)
          );
        }
      }
    };

    fetchProjectDetails();
  }, [selectedProjectId]);

  useEffect(() => {
    const fetchData = async () => {
      const token = Cookies.get("token");
      if (!token) return;

      const decoded: any = jwtDecode(token);
      const userId =
        decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      const role =
        decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

      const projectsRes = (await projectApi.getProjects()) as {
        success: boolean;
        data: Project[];
      };

      const phasesRes = (await deliverablePhaseApi.getDeliverablePhases()) as {
        success: boolean;
        data: DeliverablePhase[];
      };

      if (projectsRes.success) {
        let filteredProjects = projectsRes.data;

        // Only keep projects where the user is the project manager
        if (role === "ProjectManager") {
          filteredProjects = filteredProjects.filter(
            (project) => project.projectManager === userId
          );
        }

        setProjects(filteredProjects);
      }

      if (phasesRes.success) setPhases(phasesRes.data);
    };

    fetchData();
  }, []);

  // Format the date whenever it changes
  useEffect(() => {
    if (dueDate) {
      const date = new Date(dueDate);
      setFormattedDate(
        date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    } else {
      setFormattedDate("");
    }
  }, [dueDate]);

  const toggleAssignee = (memberId: string) => {
    if (selectedAssignees.includes(memberId)) {
      setSelectedAssignees(selectedAssignees.filter((id) => id !== memberId));
    } else {
      setSelectedAssignees([...selectedAssignees, memberId]);
    }
  };

  const validateDeliverableForm = (
    title: string,
    description: string,
    dueDate: string,
    selectedAssignees: string[]
  ) => {
    const errors: {
      title?: string;
      description?: string;
      dueDate?: string;
      assignees?: string;
    } = {};

    if (!title.trim()) {
      errors.title = "Title is required.";
    }

    if (!description.trim()) {
      errors.description = "Description is required.";
    }

    if (!dueDate) {
      errors.dueDate = "Due date is required.";
    }

    if (selectedAssignees.length === 0) {
      errors.assignees = "Please select at least one assignee.";
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateDeliverableForm(
      title,
      description,
      dueDate,
      selectedAssignees
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const responseProject = await projectApi.getProjectById(
      selectedProjectId || ""
    );
    if (!responseProject.success) {
      console.error("Failed to fetch project:", responseProject.message);
      return;
    }
    const project = responseProject.data as Project;
    const clientId = project.clientId || null;

    const newDeliverable: Partial<Deliverable> = {
      title,
      description,
      link: link || "",
      priority,
      priorityNumber: priorityNumber,
      date: new Date(dueDate).toISOString(),
      assignee: selectedAssignees.map((assigneeId) => assigneeId),
      projectId: selectedProjectId || "",
      deliverablePhaseId: selectedPhaseId || "",
      status: "todo",
      clientId: clientId || "",
    };

    const response = await deliverableApi.createDeliverable(newDeliverable);

    if (response.success) {
      if (projectId && phaseId) {
        router.push(`/projects/${projectId}/phases/${phaseId}`);
      } else if (projectId) {
        router.push(`/projects/${projectId}`);
      } else {
        router.push("/deliverables");
      }
    } else {
      console.error("Failed to create deliverable:", response.message);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    const firstInitial = firstName?.trim()[0] || "";
    const lastInitial = lastName?.trim()[0] || "";
    return (firstInitial + lastInitial).toUpperCase();
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-blue-500";
      case "med":
        return "bg-orange-500";
      case "high":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center text-sm text-gray-500">
              <Link
                href="/deliverables"
                className="hover:text-gray-700 transition-colors"
              >
                Deliverables
              </Link>
              <ChevronRight className="h-4 w-4 mx-2" />
              <span className="font-medium text-gray-900">
                Add New Deliverable
              </span>
            </nav>

            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.back()}
                  className="mr-4 rounded-full p-2 text-gray-500 hover:bg-white hover:text-gray-700 transition-all duration-200 hover:shadow-sm"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">
                  Add New Deliverable
                </h1>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div
                className={`h-1.5 w-full ${getPriorityColor(priority)}`}
              ></div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 tracking-wide uppercase">
                    Deliverable Context
                  </h3>

                  <div className="space-y-5">
                    {/* Project Select */}
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100 text-blue-600">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Project
                        </label>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={selectedProjectId || ""}
                          onChange={(e) => {
                            setSelectedProjectId(e.target.value);
                            setSelectedPhaseId(null);
                          }}
                        >
                          <option value="">Select a project</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Deliverable Phase Select */}
                    {selectedProjectId && (
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-100 text-purple-600">
                          <Layers className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Phase
                          </label>
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            value={selectedPhaseId || ""}
                            onChange={(e) => setSelectedPhaseId(e.target.value)}
                          >
                            <option value="">Select a phase</option>
                            {phases
                              .filter((p) => p.projectId === selectedProjectId)
                              .map((phase) => (
                                <option key={phase.id} value={phase.id}>
                                  {phase.title}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Deliverable Title{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200"
                        placeholder="e.g., User Research Report"
                      />
                      {errors.title && (
                        <p className="mt-2 text-sm text-red-600">
                          {errors.title}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="priorityNumber"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Deliverable Number{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center">
                        <span className="mr-2 text-gray-500 font-medium">
                          D
                        </span>
                        <input
                          id="priorityNumber"
                          type="number"
                          min="1"
                          value={priorityNumber}
                          onChange={(e) =>
                            setPriorityNumber(Number(e.target.value))
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200"
                        />
                      </div>
                      <div className="mt-3 flex justify-center">
                        <div className="w-16 h-16 bg-[#ffe500] rounded-full flex items-center justify-center font-bold text-xl text-[#444444] border-2 border-white shadow-md">
                          D{priorityNumber}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200"
                      placeholder="Provide a detailed description of this deliverable..."
                    ></textarea>
                    {errors.description && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="dueDate"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Due Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="dueDate"
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200"
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>
                      {formattedDate && (
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{formattedDate}</span>
                        </div>
                      )}
                      {errors.dueDate && (
                        <p className="mt-2 text-sm text-red-600">
                          {errors.dueDate}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="link"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Document Link
                      </label>
                      <div className="relative">
                        <input
                          id="link"
                          type="text"
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200"
                          placeholder="https://..."
                        />
                        <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>
                      {link && (
                        <div className="mt-2 flex items-center text-sm text-blue-600">
                          <Link2 className="h-4 w-4 mr-1" />
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline truncate"
                          >
                            {link}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assignees <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {projectMembers.map((member) => (
                        <div
                          key={member.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedAssignees.includes(member.id)
                              ? "border-[#ffe500] bg-yellow-50 shadow-sm"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                          onClick={() => toggleAssignee(member.id)}
                        >
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center text-white mr-3 shadow-sm"
                            style={{ backgroundColor: "#27acaa" }}
                          >
                            {getInitials(
                              member?.name ?? "",
                              member?.lastname ?? ""
                            )}
                          </div>
                          <span className="font-medium">
                            {member.name} {member.lastname}
                          </span>
                          {selectedAssignees.includes(member.id) && (
                            <CheckCircle2 className="h-5 w-5 ml-auto text-[#ffe500]" />
                          )}
                        </div>
                      ))}
                    </div>

                    {errors.assignees && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.assignees}
                      </p>
                    )}

                    {selectedAssignees.length > 0 && (
                      <div className="mt-4 flex items-center">
                        <div className="flex -space-x-2 mr-3">
                          {selectedAssignees.slice(0, 3).map((id) => {
                            const member = projectMembers.find(
                              (m) => m.id === id
                            );
                            return (
                              <div
                                key={id}
                                className="h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-r from-[#27acaa] to-[#32c5c2] text-white border-2 border-white shadow-sm"
                              >
                                {getInitials(
                                  member?.name ?? "",
                                  member?.lastname ?? ""
                                )}
                              </div>
                            );
                          })}
                          {selectedAssignees.length > 3 && (
                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-gray-700 bg-gray-100 border-2 border-white shadow-sm text-xs font-medium">
                              +{selectedAssignees.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <User className="h-4 w-4 mr-1" />
                          <span>
                            {selectedAssignees.length} assignee(s) selected
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#ffe500] rounded-lg text-[#444444] font-medium hover:bg-[#f5dc00] transition-colors duration-200 flex items-center shadow-sm"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Deliverable
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default withAuthAdminPM(AddDeliverablePage); // Protect the page with the HOC
