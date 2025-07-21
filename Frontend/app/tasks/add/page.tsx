"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Plus,
  Calendar,
  Briefcase,
  FileText,
  Layers,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  User,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import type { Task } from "@/app/types/task";
import Link from "next/link";
import withAuthAdminPM from "@/HOC/withAuthAdminPM";
import { Project } from "@/app/types/project";
import { projectApi } from "@/services/project-api";
import { deliverablePhaseApi } from "@/services/deliverablePhase-api";
import { DeliverablePhase } from "@/app/types/deliverable-phase";
import { deliverableApi } from "@/services/deliverable-api";
import { Deliverable } from "@/app/types/deliverable";
import { User as Usertype } from "@/app/types/user";
import { api } from "@/services/api";
import { taskApi } from "@/services/task-api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

const AddTaskPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const phaseId = searchParams.get("phaseId");
  const deliverableId = searchParams.get("deliverableId");

  const [text, setText] = useState("");
  const [priority, setPriority] = useState<"low" | "med" | "high">("low");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");
  const [formattedDate, setFormattedDate] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [phases, setPhases] = useState<DeliverablePhase[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [filteredDeliverables, setFilteredDeliverables] = useState<
    Deliverable[]
  >([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<
    string | null
  >(null);
  const [assignees, setAssignees] = useState<Usertype[]>([]);
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});

  const validateTaskForm = (task: Partial<Task>) => {
    const errors: Record<string, string> = {};

    if (!task.text || !task.text.trim()) {
      errors.text = "Task description is required";
    }

    if (!task.priority || !task.priority.trim()) {
      errors.priority = "Priority is required";
    }

    if (!task.date || isNaN(new Date(task.date).getTime())) {
      errors.date = "A valid due date is required";
    }

    if (!task.assignee || !task.assignee.trim()) {
      errors.assignee = "Assignee is required";
    }

    if (!task.projectId || !task.projectId.trim()) {
      errors.projectId = "Project is required";
    }

    if (!task.deliverableId || !task.deliverableId.trim()) {
      errors.deliverableId = "Deliverable is required";
    }

    if (!task.deliverablePhaseId || !task.deliverablePhaseId.trim()) {
      errors.deliverablePhaseId = "Deliverable phase is required";
    }

    return errors;
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tempTask: Partial<Task> = {
      text,
      priority,
      date: dueDate, // use raw string here
      assignee,
      projectId: selectedProjectId ?? undefined,
      deliverableId: selectedDeliverableId ?? undefined,
      deliverablePhaseId: selectedPhaseId ?? undefined,
      status: "todo",
    };

    const errors = validateTaskForm(tempTask);
    if (Object.keys(errors).length > 0) {
      setTaskErrors(errors);
      return;
    }

    const newTask: Partial<Task> = {
      ...tempTask,
      date: new Date(dueDate).toISOString(),
    };

    setTaskErrors({});

    const response = await taskApi.createTask(newTask as Task);

    if (projectId && phaseId && deliverableId) {
      router.push(
        `/projects/${projectId}/phases/${phaseId}/deliverables/${deliverableId}`
      );
    } else if (projectId && phaseId) {
      router.push(`/projects/${projectId}/phases/${phaseId}`);
    } else if (projectId) {
      router.push(`/projects/${projectId}`);
    } else {
      router.push("/tasks");
    }
  };

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

      const phasesRes = await deliverablePhaseApi.getDeliverablePhases();
      const deliverablesRes = await deliverableApi.getDeliverables();

      if (projectsRes.success) {
        let filteredProjects = projectsRes.data;

        // Filter projects if the user is a Project Manager
        if (role === "ProjectManager") {
          filteredProjects = filteredProjects.filter(
            (project) => project.projectManager === userId
          );
        }

        setProjects(filteredProjects);
      }

      if (phasesRes.success) {
        setPhases(phasesRes.data as DeliverablePhase[]);
      }

      if (deliverablesRes.success) {
        setDeliverables(deliverablesRes.data as Deliverable[]);
        setFilteredDeliverables(deliverablesRes.data as Deliverable[]);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedPhaseId) {
      const filtered = deliverables.filter(
        (deliverable) => deliverable.deliverablePhaseId === selectedPhaseId
      );
      setFilteredDeliverables(filtered);
    } else {
      setFilteredDeliverables(deliverables);
    }
  }, [selectedPhaseId, deliverables]);

  useEffect(() => {
    const fetchDeliverableAndAssignees = async () => {
      if (selectedDeliverableId) {
        const res = await deliverableApi.getDeliverableById(
          selectedDeliverableId
        );
        if (res.success && res.data) {
          const assigneeIds = (res.data as Deliverable).assignee || [];

          const users: (Usertype | null)[] = await Promise.all(
            assigneeIds.map(async (id: string) => {
              const userRes = await api.getUserById(id);
              return userRes.success ? (userRes.data as Usertype) : null;
            })
          );

          const validUsers = users.filter(
            (user): user is Usertype => user !== null
          );

          setAssignees(validUsers);
        }
      } else {
        setAssignees([]);
      }
    };

    fetchDeliverableAndAssignees();
  }, [selectedDeliverableId]);

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

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "text-blue-800 bg-blue-100 border-blue-300";
      case "med":
        return "text-orange-800 bg-orange-100 border-orange-300";
      case "high":
        return "text-red-800 bg-red-100 border-red-300";
      default:
        return "text-gray-800 bg-gray-100 border-gray-300";
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center text-sm text-gray-500">
              <Link
                href="/tasks"
                className="hover:text-gray-700 transition-colors"
              >
                Tasks
              </Link>
              <ChevronRight className="h-4 w-4 mx-2" />
              <span className="font-medium text-gray-900">Add New Task</span>
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
                  Add New Task
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
                            setSelectedDeliverableId(null);
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

                    {/* Phase Select */}
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
                            onChange={(e) => {
                              setSelectedPhaseId(e.target.value);
                              setSelectedDeliverableId(null);
                            }}
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

                    {/* Deliverable Select */}
                    {selectedPhaseId && (
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-yellow-100 text-yellow-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Deliverable
                          </label>
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                            value={selectedDeliverableId || ""}
                            onChange={(e) =>
                              setSelectedDeliverableId(e.target.value)
                            }
                          >
                            <option value="">Select a deliverable</option>
                            {filteredDeliverables
                              .filter(
                                (d) => d.deliverablePhaseId === selectedPhaseId
                              )
                              .map((deliverable) => (
                                <option
                                  key={deliverable.id}
                                  value={deliverable.id}
                                >
                                  {deliverable.title}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <label
                      htmlFor="text"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Task Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200"
                      placeholder="Describe the task in detail..."
                    ></textarea>
                    {taskErrors.text && (
                      <p className="text-sm text-red-500 mt-1">
                        {taskErrors.text}
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
                          className="w-full p-3 pl-10 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200"
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>
                      {taskErrors.date && (
                        <p className="text-sm text-red-500 mt-1">
                          {taskErrors.date}
                        </p>
                      )}
                      {formattedDate && (
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{formattedDate}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="assignee"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Assignee <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="assignee"
                          value={assignee}
                          onChange={(e) => setAssignee(e.target.value)}
                          className="w-full p-3 pl-10 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200 appearance-none"
                        >
                          <option value="">Select an assignee</option>
                          {assignees.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name} {member.lastname}
                            </option>
                          ))}
                        </select>
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      {taskErrors.assignee && (
                        <p className="text-sm text-red-500 mt-1">
                          {taskErrors.assignee}
                        </p>
                      )}

                      {assignee && (
                        <div className="mt-3 flex items-center">
                          <div className="h-8 w-8 rounded-full flex items-center bg-blue-500 justify-center  mr-2 shadow-sm">
                            {assignees
                              .filter((user) => user.id === assignee)
                              .map((user) => {
                                const initials = `${user.name?.[0] || ""}${
                                  user.lastname?.[0] || ""
                                }`.toUpperCase();
                                return (
                                  <div
                                    key={user.id}
                                    className="text-white flex items-center justify-center h-8 w-8 rounded-full bg-[#27acaa]"
                                  >
                                    {initials}
                                  </div>
                                );
                              })}
                          </div>
                          <span className="font-medium text-gray-700">
                            {assignees.find((m) => m.id === assignee)
                              ? `${
                                  assignees.find((m) => m.id === assignee)?.name
                                } ${
                                  assignees.find((m) => m.id === assignee)
                                    ?.lastname
                                }`
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setPriority("low")}
                        className={`flex items-center justify-center py-3 px-4 rounded-lg border transition-all duration-200 ${
                          priority === "low"
                            ? "bg-blue-100 text-blue-800 border-blue-300 shadow-sm"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <CheckCircle2
                          className={`h-5 w-5 mr-2 ${
                            priority === "low"
                              ? "text-blue-500"
                              : "text-gray-400"
                          }`}
                        />
                        <span>Low</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriority("med")}
                        className={`flex items-center justify-center py-3 px-4 rounded-lg border transition-all duration-200 ${
                          priority === "med"
                            ? "bg-orange-100 text-orange-800 border-orange-300 shadow-sm"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <Clock
                          className={`h-5 w-5 mr-2 ${
                            priority === "med"
                              ? "text-orange-500"
                              : "text-gray-400"
                          }`}
                        />
                        <span>Medium</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriority("high")}
                        className={`flex items-center justify-center py-3 px-4 rounded-lg border transition-all duration-200 ${
                          priority === "high"
                            ? "bg-red-100 text-red-800 border-red-300 shadow-sm"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <AlertCircle
                          className={`h-5 w-5 mr-2 ${
                            priority === "high"
                              ? "text-red-500"
                              : "text-gray-400"
                          }`}
                        />
                        <span>High</span>
                      </button>
                    </div>

                    <div className="mt-3 p-3 rounded-lg flex items-center space-x-3">
                      <div
                        className={`h-3 w-3 rounded-full ${getPriorityColor(
                          priority
                        )}`}
                      ></div>
                      <span
                        className={`text-sm font-medium px-2 py-1 rounded-md ${getPriorityTextColor(
                          priority
                        )}`}
                      >
                        {priority === "low"
                          ? "Low Priority"
                          : priority === "med"
                          ? "Medium Priority"
                          : "High Priority"}
                      </span>
                      <span className="text-sm text-gray-500">
                        {priority === "low"
                          ? "Can be completed when time allows"
                          : priority === "med"
                          ? "Should be completed soon"
                          : "Requires immediate attention"}
                      </span>
                    </div>
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
                    Create Task
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

export default withAuthAdminPM(AddTaskPage); // Protect the page with the HOC
