"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Folder, FolderOpen } from "lucide-react";

interface Project {
  id: string;
  name: string;
  deliverableCount: number;
}

interface ProjectSelectorProps {
  projects: Project[];
  onProjectSelect: (projectId: string | null) => void;
  selectedProjectId: string | null;
}

export default function ProjectSelector({
  projects,
  onProjectSelect,
  selectedProjectId,
}: ProjectSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  // Check if scroll buttons should be visible
  useEffect(() => {
    const checkScroll = () => {
      if (!scrollContainerRef.current) return;

      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 5); // 5px buffer
    };

    const container = scrollContainerRef.current;
    if (container) {
      checkScroll();
      container.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);

      return () => {
        container.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [projects]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.75;

    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const totalDeliverables = projects.reduce(
    (acc, project) => acc + project.deliverableCount,
    0
  );

  return (
    <div className="relative mb-4">
      <div className="flex items-center">
        {showLeftScroll && (
          <button
            className="absolute left-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:bg-gray-100"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div className="w-full overflow-hidden">
          <div
            ref={scrollContainerRef}
            className="flex space-x-2 py-1 px-1 overflow-x-auto"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>

            <button
              className={`flex min-w-fit items-center gap-1.5 rounded border px-3 py-1.5 text-sm transition-all duration-200 hover:bg-yellow-50 ${
                !selectedProjectId
                  ? "border-yellow-400 bg-yellow-50 shadow-sm"
                  : "border-gray-200 bg-white"
              }`}
              onClick={() => onProjectSelect(null)}
              title="View all projects"
            >
              {!selectedProjectId ? (
                <FolderOpen className="h-3.5 w-3.5 text-yellow-600" />
              ) : (
                <Folder className="h-3.5 w-3.5 text-gray-500" />
              )}
              <span
                className={`font-medium ${
                  !selectedProjectId ? "text-yellow-800" : "text-gray-700"
                }`}
              >
                All Projects
              </span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                  !selectedProjectId
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {totalDeliverables}
              </span>
            </button>

            {projects.map((project) => (
              <button
                key={project.id}
                className={`flex min-w-fit items-center gap-1.5 rounded border px-3 py-1.5 text-sm transition-all duration-200 hover:bg-yellow-50 ${
                  selectedProjectId === project.id
                    ? "border-yellow-400 bg-yellow-50 shadow-sm"
                    : "border-gray-200 bg-white"
                }`}
                onClick={() => onProjectSelect(project.id)}
                title={`View ${project.name}`}
              >
                {selectedProjectId === project.id ? (
                  <FolderOpen className="h-3.5 w-3.5 text-yellow-600" />
                ) : (
                  <Folder className="h-3.5 w-3.5 text-gray-500" />
                )}
                <span
                  className={`font-medium ${
                    selectedProjectId === project.id
                      ? "text-yellow-800"
                      : "text-gray-700"
                  }`}
                >
                  {project.name}
                </span>
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    selectedProjectId === project.id
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {project.deliverableCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        {showRightScroll && (
          <button
            className="absolute right-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:bg-gray-100"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
