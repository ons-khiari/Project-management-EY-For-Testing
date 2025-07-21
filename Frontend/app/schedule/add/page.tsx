"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Plus,
  Calendar,
  ArrowLeft,
  ChevronRight,
  Briefcase,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import type { DeliverablePhase } from "@/app/types/deliverable-phase";
import Link from "next/link";
import withAuthAdminPM from "@/HOC/withAuthAdminPM";

const AddPhasePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const projectTitle = searchParams.get("projectTitle");

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [color, setColor] = useState("blue");
  const [formattedStartDate, setFormattedStartDate] = useState("");
  const [formattedEndDate, setFormattedEndDate] = useState("");
  const [duration, setDuration] = useState<number | null>(null);

  // Format dates and calculate duration whenever dates change
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

    // Calculate duration in days
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Create phase object
    const newPhase: Partial<DeliverablePhase> = {
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      color,
    };
    if (projectId) {
      router.push(`/projects/${projectId}`);
    } else {
      router.push("/projects");
    }
  };

  // Get color classes
  const getColorClasses = (colorName: string) => {
    switch (colorName) {
      case "blue":
        return "border-blue-500 bg-blue-50";
      case "orange":
        return "border-orange-500 bg-orange-50";
      case "yellow":
        return "border-yellow-500 bg-yellow-50";
      case "green":
        return "border-green-500 bg-green-50";
      case "purple":
        return "border-purple-500 bg-purple-50";
      default:
        return "border-gray-500 bg-gray-50";
    }
  };

  // Get color for the ring
  const getRingColor = (colorName: string) => {
    switch (colorName) {
      case "blue":
        return "ring-blue-500";
      case "orange":
        return "ring-orange-500";
      case "yellow":
        return "ring-[#ffe500]";
      case "green":
        return "ring-green-500";
      case "purple":
        return "ring-purple-500";
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
          <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center text-sm text-gray-500">
              <Link
                href="/projects"
                className="hover:text-gray-700 transition-colors"
              >
                Projects
              </Link>
              <ChevronRight className="h-4 w-4 mx-2" />
              <span className="font-medium text-gray-900">Add New Phase</span>
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
                  Add New Deliverable Phase
                </h1>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div
                className={`h-1.5 w-full bg-${
                  color === "yellow" ? "[#ffe500]" : color
                }-500`}
              ></div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                {projectTitle && (
                  <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">
                      Phase Context
                    </h3>
                    <div className="flex items-center">
                      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-100 text-blue-600 mr-3">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Project</span>
                        <p className="font-medium text-gray-800">
                          {projectTitle}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                  <div>
                    <label
                      htmlFor="title"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Phase Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffe500] focus:border-transparent transition-all duration-200"
                      required
                      placeholder="e.g., Research & Planning"
                    />
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
                          required
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>
                      {formattedStartDate && (
                        <div className="mt-2 text-sm text-gray-500">
                          {formattedStartDate}
                        </div>
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
                          required
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>
                      {formattedEndDate && (
                        <div className="mt-2 text-sm text-gray-500">
                          {formattedEndDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {duration !== null && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Phase Duration
                          </span>
                          <p className="text-2xl font-bold text-gray-900">
                            {duration} {duration === 1 ? "day" : "days"}
                          </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                          <Calendar className="h-6 w-6 text-gray-500" />
                        </div>
                      </div>
                      <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-${
                            color === "yellow" ? "[#ffe500]" : color
                          }-500`}
                          style={{ width: "100%" }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phase Color
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setColor("blue")}
                        className={`w-10 h-10 rounded-full bg-blue-500 transition-all duration-200 ${
                          color === "blue"
                            ? `ring-2 ring-offset-2 ${getRingColor("blue")}`
                            : ""
                        }`}
                      ></button>
                      <button
                        type="button"
                        onClick={() => setColor("orange")}
                        className={`w-10 h-10 rounded-full bg-orange-500 transition-all duration-200 ${
                          color === "orange"
                            ? `ring-2 ring-offset-2 ${getRingColor("orange")}`
                            : ""
                        }`}
                      ></button>
                      <button
                        type="button"
                        onClick={() => setColor("yellow")}
                        className={`w-10 h-10 rounded-full bg-[#ffe500] transition-all duration-200 ${
                          color === "yellow"
                            ? `ring-2 ring-offset-2 ${getRingColor("yellow")}`
                            : ""
                        }`}
                      ></button>
                      <button
                        type="button"
                        onClick={() => setColor("green")}
                        className={`w-10 h-10 rounded-full bg-green-500 transition-all duration-200 ${
                          color === "green"
                            ? `ring-2 ring-offset-2 ${getRingColor("green")}`
                            : ""
                        }`}
                      ></button>
                      <button
                        type="button"
                        onClick={() => setColor("purple")}
                        className={`w-10 h-10 rounded-full bg-purple-500 transition-all duration-200 ${
                          color === "purple"
                            ? `ring-2 ring-offset-2 ${getRingColor("purple")}`
                            : ""
                        }`}
                      ></button>
                    </div>

                    <div className="mt-4">
                      <div
                        className={`p-4 rounded-lg border-l-4 ${getColorClasses(
                          color
                        )} transition-all duration-200 shadow-sm`}
                      >
                        <div className="flex items-center">
                          <div
                            className={`h-3 w-3 rounded-full bg-${
                              color === "yellow" ? "[#ffe500]" : color
                            }-500 mr-2`}
                          ></div>
                          <span className="font-medium">
                            {title || "Phase Title"}
                          </span>
                        </div>
                        {startDate && endDate && (
                          <div className="mt-2 text-sm text-gray-500">
                            {new Date(startDate).toLocaleDateString()} -{" "}
                            {new Date(endDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
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
                    Create Phase
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default withAuthAdminPM(AddPhasePage); // Protect the page with the HOC