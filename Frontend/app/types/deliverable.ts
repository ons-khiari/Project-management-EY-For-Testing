import { Task } from "./task";

export interface Deliverable {
  id: string;
  title: string;
  description: string;
  link?: string;
  priority: "low" | "med" | "high";
  priorityNumber: number;
  date: string;
  assignee: string[];
  projectId: string;
  deliverablePhaseId: string;
  status?: "todo" | "in-progress" | "done";
  clientId: string;

  tasks?: Task[];
}
