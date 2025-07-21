"use client";

import PortfolioTimeline from "@/components/portfolio-timeline";
import withAuth from "@/HOC/withAuth";
import { projectApi } from "@/services/project-api";
import { deliverableApi } from "@/services/deliverable-api";
import { deliverablePhaseApi } from "@/services/deliverablePhase-api";
import { useEffect, useState } from "react";
import { Project } from "../types/project";
import { Deliverable } from "../types/deliverable";
import { DeliverablePhase } from "../types/deliverable-phase";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

interface TimelineProject extends Project {
  status?: string;
  color?: string;
  phases?: DeliverablePhase[];
}

const TimelinePage = () => {
  const [timelineData, setTimelineData] = useState<{
    projects: TimelineProject[];
    phases: DeliverablePhase[];
    deliverables: Record<string, Deliverable[]>;
  }>({
    projects: [],
    phases: [],
    deliverables: {},
  });

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    const decoded: any = jwtDecode(token);
    const userId =
      decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
    const role =
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    setRole(role);

    const fetchTimelineData = async () => {
      try {
        const [projectsRes, phasesRes, deliverablesRes] = await Promise.all([
          projectApi.getProjects(),
          deliverablePhaseApi.getDeliverablePhases(),
          deliverableApi.getDeliverables(),
        ]);

        if (
          projectsRes.success &&
          phasesRes.success &&
          deliverablesRes.success
        ) {
          const allProjects: Project[] = Array.isArray(projectsRes.data)
            ? projectsRes.data
            : [];

          // 🔍 Filter based on role and membership
          const visibleProjects =
            role === "Admin" || role === "ProjectManager"
              ? allProjects
              : allProjects.filter((p) => p.members.includes(userId));

          const phases: DeliverablePhase[] = Array.isArray(phasesRes.data)
            ? phasesRes.data
            : [];

          const deliverables: Deliverable[] = Array.isArray(
            deliverablesRes.data
          )
            ? deliverablesRes.data
            : [];

          const timelineProjects: TimelineProject[] = visibleProjects.map(
            (proj) => ({
              ...proj,
              status:
                proj.progress === 100
                  ? "done"
                  : proj.progress > 0
                  ? "in-progress"
                  : "todo",
              color: proj.progressColor || "blue",
              phases: phases.filter((p) => p.projectId === proj.id),
            })
          );

          const deliverablesMap: Record<string, Deliverable[]> = {};
          for (const deliverable of deliverables) {
            const phaseId = deliverable.deliverablePhaseId;
            if (!phaseId) continue;

            if (!deliverablesMap[phaseId]) {
              deliverablesMap[phaseId] = [];
            }
            deliverablesMap[phaseId].push(deliverable);
          }

          setTimelineData({
            projects: timelineProjects,
            phases,
            deliverables: deliverablesMap,
          });
        }
      } catch (err) {
        console.error("Failed to fetch timeline data", err);
      }
    };

    fetchTimelineData();
  }, []);

  return (
    <div className="mb-6">
      <PortfolioTimeline
        projects={timelineData.projects}
        phases={timelineData.phases}
        deliverables={timelineData.deliverables}
        startDate={startDate}
        endDate={endDate}
        autoExpandProject={true}
      />
    </div>
  );
};

export default withAuth(TimelinePage);
