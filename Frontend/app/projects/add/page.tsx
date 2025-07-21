"use client";

import type React from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

import { useState, useEffect } from "react";
import {
  Plus,
  Calendar,
  Building2,
  ArrowLeft,
  ChevronRight,
  Users,
  User,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import type { Project } from "@/app/types/project";
import type { Client } from "@/app/types/client";
import Link from "next/link";
import withAuthAdminPM from "@/HOC/withAuthAdminPM";
import { User as UserType } from "@/app/types/user";
import { api } from "@/services/api";
import { clientApi } from "@/services/client-api";
import { projectApi } from "@/services/project-api";

const validateForm = (
  title: string,
  description: string,
  startDate: string,
  endDate: string,
  selectedClient: Client | null,
  projectManager: string,
  selectedMembers: string[]
) => {
  const errors: any = {};

  if (!title.trim()) {
    errors.title = "Title is required.";
  }

  if (!description.trim()) {
    errors.description = "Description is required.";
  }

  if (!startDate) {
    errors.startDate = "Start date is required.";
  }

  if (!endDate) {
    errors.endDate = "End date is required.";
  }

  if (!selectedClient) {
    errors.client = "Please select a client.";
  }

  if (!projectManager) {
    errors.projectManager = "Please select a project manager.";
  }

  if (selectedMembers.length === 0) {
    errors.teamMembers = "Please select at least one team member.";
  }

  return errors;
};

const AddProjectPage = () => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressColor, setProgressColor] = useState("blue");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [searchClient, setSearchClient] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [projectManager, setProjectManager] = useState("");
  const [formattedStartDate, setFormattedStartDate] = useState("");
  const [formattedEndDate, setFormattedEndDate] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [projectManagers, setProjectManagers] = useState<UserType[]>([]);
  const [loadingPMs, setLoadingPMs] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    const fetchTeamMembers = async () => {
      setLoadingUsers(true);
      try {
        const response = await api.getUsers();

        if (response.success) {
          const users = (response.data as UserType[]) || [];
          const teamMembersOnly = users.filter(
            (user: UserType) => Number(user.role) === 2
          );
          setTeamMembers(teamMembersOnly);
        } else {
          console.error(response.message);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    const fetchProjectManagers = async () => {
      setLoadingPMs(true);
      try {
        const response = await api.getUsers();

        if (response.success) {
          const users = (response.data as UserType[]) || [];
          const projectManagersOnly = users.filter(
            (user: UserType) => Number(user.role) === 1
          );
          setProjectManagers(projectManagersOnly);
        } else {
          console.error(response.message);
        }
      } catch (err) {
        console.error("Failed to load project managers:", err);
      } finally {
        setLoadingPMs(false);
      }
    };

    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const response = await clientApi.getClients();
        if (response.success) {
          const clientList = (response.data as Client[]) || [];
          setClients(clientList);
        } else {
          console.error(response.message);
        }
      } catch (err) {
        console.error("Failed to load clients:", err);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
    fetchProjectManagers();
    fetchTeamMembers();
  }, []);

  const getInitials = (firstName: string, lastName: string) => {
    const firstInitial = firstName?.trim()[0] || "";
    const lastInitial = lastName?.trim()[0] || "";
    return (firstInitial + lastInitial).toUpperCase();
  };

  useEffect(() => {
    if (startDate) {
      const date = new Date(startDate);
      setFormattedStartDate(
        date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    } else {
      setFormattedStartDate("");
    }

    if (endDate) {
      const date = new Date(endDate);
      setFormattedEndDate(
        date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    } else {
      setFormattedEndDate("");
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
      setDuration(diffDays);
    } else {
      setDuration(null);
    }
  }, [startDate, endDate]);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchClient.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(
      title,
      description,
      startDate,
      endDate,
      selectedClient,
      projectManager,
      selectedMembers
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const token = Cookies.get("token");
    if (!token) {
      throw new Error("Token is undefined");
    }
    const decodedToken: any = jwtDecode(token);

    const userid =
      decodedToken[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
      ];

    const newProject = {
      title,
      description,
      progress,
      progressColor,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      createdBy: userid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectManager,
      members: selectedMembers,
      clientId: selectedClient ? selectedClient.id : null,
    };

    const response = await projectApi.createProject(newProject);

    if (response.success) {
      router.push("/projects");
    } else {
      console.error("Failed to create project:", response.message);
    }
  };

  const toggleMember = (memberId: string) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  // Get progress color class
  const getProgressColorClass = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-500";
      case "orange":
        return "bg-orange-500";
      case "yellow":
        return "bg-[#ffe500]";
      case "green":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  // Get ring color class
  const getRingColorClass = (color: string) => {
    switch (color) {
      case "blue":
        return "ring-blue-500";
      case "orange":
        return "ring-orange-500";
      case "yellow":
        return "ring-[#ffe500]";
      case "green":
        return "ring-green-500";
      default:
        return "ring-gray-500";
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
                href="/projects"
                className="hover:text-gray-700 transition-colors"
              >
                Projects
              </Link>
              <ChevronRight className="h-4 w-4 mx-2" />
              <span className="font-medium text-gray-900">Add New Project</span>
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
                  Add New Project
                </h1>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div
                className={`h-1.5 w-full ${getProgressColorClass(
                  progressColor
                )}`}
              ></div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                <div className="space-y-8">
                  <div className="space-y-4 md:col-span-2">
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Project Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200"
                        placeholder="Enter project title..."
                      />
                      {errors.title && (
                        <span className="text-red-500">{errors.title}</span>
                      )}
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
                        placeholder="Provide a detailed description of this project..."
                      ></textarea>
                      {errors.description && (
                        <span className="text-red-500">
                          {errors.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="startDate"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200"
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>
                      {formattedStartDate && (
                        <div className="mt-2 text-sm text-gray-500">
                          {formattedStartDate}
                        </div>
                      )}
                      {errors.startDate && (
                        <span className="text-red-500">{errors.startDate}</span>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="endDate"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        End Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="endDate"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200"
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>
                      {formattedEndDate && (
                        <div className="mt-2 text-sm text-gray-500">
                          {formattedEndDate}
                        </div>
                      )}
                      {errors.endDate && (
                        <span className="text-red-500">{errors.endDate}</span>
                      )}
                    </div>
                  </div>

                  {duration !== null && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Project Duration
                          </span>
                          <p className="text-2xl font-bold text-gray-900">
                            {duration} {duration === 1 ? "day" : "days"}
                          </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                          <Calendar className="h-6 w-6 text-gray-500" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* <div>
                      <label
                        htmlFor="progress"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Progress (%)
                      </label>
                      <div className="flex items-center">
                        <input
                          id="progress"
                          type="range"
                          min="0"
                          max="100"
                          value={progress}
                          onChange={(e) => setProgress(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="ml-3 w-12 text-center font-medium">
                          {progress}%
                        </span>
                      </div>
                      <div className="mt-3 h-3 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full ${getProgressColorClass(
                            progressColor
                          )} transition-all duration-300 ease-in-out`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div> */}

                    <div>
                      <label
                        htmlFor="progressColor"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Progress Color
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setProgressColor("blue")}
                          className={`w-10 h-10 rounded-full bg-blue-500 transition-all duration-200 ${
                            progressColor === "blue"
                              ? `ring-2 ring-offset-2 ${getRingColorClass(
                                  "blue"
                                )}`
                              : ""
                          }`}
                        ></button>
                        <button
                          type="button"
                          onClick={() => setProgressColor("orange")}
                          className={`w-10 h-10 rounded-full bg-orange-500 transition-all duration-200 ${
                            progressColor === "orange"
                              ? `ring-2 ring-offset-2 ${getRingColorClass(
                                  "orange"
                                )}`
                              : ""
                          }`}
                        ></button>
                        <button
                          type="button"
                          onClick={() => setProgressColor("yellow")}
                          className={`w-10 h-10 rounded-full bg-[#ffe500] transition-all duration-200 ${
                            progressColor === "yellow"
                              ? `ring-2 ring-offset-2 ${getRingColorClass(
                                  "yellow"
                                )}`
                              : ""
                          }`}
                        ></button>
                        <button
                          type="button"
                          onClick={() => setProgressColor("green")}
                          className={`w-10 h-10 rounded-full bg-green-500 transition-all duration-200 ${
                            progressColor === "green"
                              ? `ring-2 ring-offset-2 ${getRingColorClass(
                                  "green"
                                )}`
                              : ""
                          }`}
                        ></button>
                      </div>
                      <div className="mt-2 flex items-center">
                        <BarChart3 className="h-5 w-5 text-gray-500 mr-2" />
                        <span className="text-sm text-gray-500">
                          Selected color will be used for progress indicators
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <label
                      htmlFor="client"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Client
                    </label>

                    <div
                      className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-all duration-200"
                      onClick={() => setShowClientDropdown(!showClientDropdown)}
                    >
                      {selectedClient ? (
                        <div className="flex items-center">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100 mr-3 border border-gray-200"></div>
                          <div>
                            <div className="font-medium">
                              {selectedClient.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {selectedClient.type}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-500">
                          <Building2 className="h-5 w-5 mr-2" />
                          <span>Select a client</span>
                        </div>
                      )}
                    </div>
                    <br />
                    {errors.client && (
                      <span className="text-red-500">{errors.client}</span>
                    )}

                    {showClientDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        <div className="p-3 border-b sticky top-0 bg-white">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search clients..."
                              value={searchClient}
                              onChange={(e) => setSearchClient(e.target.value)}
                              className="w-full p-2 pl-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Building2 className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        {filteredClients.length > 0 ? (
                          <div className="py-2">
                            {filteredClients.map((client) => (
                              <div
                                key={client.id}
                                className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setShowClientDropdown(false);
                                }}
                              >
                                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100 mr-3 border border-gray-200"></div>
                                <div>
                                  <div className="font-medium">
                                    {client.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {client.type}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            No clients found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="projectManager"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Project Manager <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="projectManager"
                        value={projectManager}
                        onChange={(e) => setProjectManager(e.target.value)}
                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200 appearance-none"
                      >
                        <option value="">Select a project manager</option>
                        {projectManagers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} {manager.lastname}
                          </option>
                        ))}
                      </select>
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <br />
                    {errors.projectManager && (
                      <span className="text-red-500">
                        {errors.projectManager}
                      </span>
                    )}

                    {projectManager && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-white mr-3 shadow-sm"
                          style={{
                            backgroundColor: "#6366f1",
                          }}
                        >
                          {getInitials(
                            projectManagers.find((m) => m.id === projectManager)
                              ?.name || "",
                            projectManagers.find((m) => m.id === projectManager)
                              ?.lastname || ""
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {projectManagers.find(
                              (m) => m.id === projectManager
                            )?.name +
                              " " +
                              projectManagers.find(
                                (m) => m.id === projectManager
                              )?.lastname}
                          </div>
                          <div className="text-xs text-gray-500">
                            Project Manager
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Team Members
                      </label>
                      <span className="text-sm text-gray-500">
                        {selectedMembers.length} selected
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedMembers.includes(member.id)
                              ? "border-[#ffe500] bg-yellow-50 shadow-sm"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                          onClick={() => toggleMember(member.id)}
                        >
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-r from-[#27acaa] to-[#32c5c2] text-white mr-3 shadow-sm"
                            style={{ backgroundColor: "-moz-initial" }}
                          >
                            {getInitials(
                              member?.name ?? "",
                              member?.lastname ?? ""
                            )}
                          </div>
                          <span className="font-medium">
                            {member.name} {member.lastname}
                          </span>
                          {selectedMembers.includes(member.id) && (
                            <CheckCircle2 className="h-5 w-5 ml-auto text-[#ffe500]" />
                          )}
                        </div>
                      ))}
                    </div>
                    <br />
                    {errors.teamMembers && (
                      <span className="text-red-500">{errors.teamMembers}</span>
                    )}

                    {selectedMembers.length > 0 && (
                      <div className="mt-4 flex items-center">
                        <div className="flex -space-x-2 mr-3">
                          {selectedMembers.slice(0, 3).map((id) => {
                            const member = teamMembers.find((m) => m.id === id);
                            return (
                              <div
                                key={id}
                                className="h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-r from-[#27acaa] to-[#32c5c2] text-white border-2 border-white shadow-sm"
                                style={{ backgroundColor: "-moz-initial" }}
                              >
                                {getInitials(
                                  member?.name ?? "",
                                  member?.lastname ?? ""
                                )}
                              </div>
                            );
                          })}
                          {selectedMembers.length > 3 && (
                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-gray-700 bg-gray-100 border-2 border-white shadow-sm text-xs font-medium">
                              +{selectedMembers.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="h-4 w-4 mr-1" />
                          <span>
                            Team members will be notified when the project is
                            created
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
                    Create Project
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

export default withAuthAdminPM(AddProjectPage);
