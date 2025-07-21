export interface Task {
  id: string;
  text: string;
  priority: "low" | "med" | "high";
  date: string;
  assignee: string;
  projectId: string;
  deliverableId?: string;
  deliverablePhaseId?: string;
  status: "todo" | "in-progress" | "done";
}
