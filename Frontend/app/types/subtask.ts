export interface SubTask {
  id: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  isCompleted: boolean;
  assignee: string;
  taskId: string;
}
