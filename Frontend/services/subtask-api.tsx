import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { SubTask } from "@/app/types/subtask";

const BASE_URL = "http://localhost:5185/api";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

async function request<T>(
  endpoint: string,
  method: string = "GET",
  body?: any,
  headers: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  try {
    const token = Cookies.get("token");

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const isNoContent = response.status === 204;
    const data = isNoContent ? {} : await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || "An error occurred" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("API request error:", error);
    return { success: false, message: "Network error" };
  }
}

// === SubTask API ===

export const getAllSubTasks = async (): Promise<ApiResponse<SubTask[]>> => {
  return request("/SubTasks", "GET");
};

export const getSubTaskById = async (
  id: string
): Promise<ApiResponse<SubTask>> => {
  return request(`/SubTasks/${id}`, "GET");
};

export const getSubTasksByTaskId = async (
  taskId: string
): Promise<ApiResponse<SubTask[]>> => {
  return request(`/SubTasks/by-task/${taskId}`, "GET");
};

export const createSubTask = async (
  subTask: Omit<SubTask, "id" | "createdAt" | "updatedAt">
): Promise<ApiResponse<SubTask>> => {
  return request("/SubTasks", "POST", subTask);
};

export const updateSubTask = async (
  id: string,
  updatedSubTask: Partial<SubTask>
): Promise<ApiResponse<null>> => {
  return request(`/SubTasks/${id}`, "PUT", updatedSubTask);
};

export const deleteSubTask = async (id: string): Promise<ApiResponse<null>> => {
  return request(`/SubTasks/${id}`, "DELETE");
};

export const subTaskApi = {
  getAllSubTasks,
  getSubTaskById,
  getSubTasksByTaskId,
  createSubTask,
  updateSubTask,
  deleteSubTask,
};
