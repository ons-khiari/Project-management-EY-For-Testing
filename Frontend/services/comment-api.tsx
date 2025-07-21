import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Comment } from "@/app/types/comment";

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

// === Comment API ===

export const getAllComments = async (): Promise<ApiResponse<Comment[]>> => {
  return request("/Comment", "GET");
};

export const getCommentById = async (
  id: string
): Promise<ApiResponse<Comment>> => {
  return request(`/Comment/${id}`, "GET");
};

export const getCommentsByTaskId = async (
  taskId: string
): Promise<ApiResponse<Comment[]>> => {
  return request(`/Comment/by-task/${taskId}`, "GET");
};

export const createComment = async (
  comment: Omit<Comment, "id" | "createdAt" | "updatedAt">
): Promise<ApiResponse<Comment>> => {
  return request("/Comment", "POST", comment);
};

export const updateComment = async (
  id: string,
  updatedComment: Partial<Comment>
): Promise<ApiResponse<null>> => {
  return request(`/Comment/${id}`, "PUT", updatedComment);
};

export const deleteComment = async (id: string): Promise<ApiResponse<null>> => {
  return request(`/Comment/${id}`, "DELETE");
};

// Export grouped API
export const commentApi = {
  getAllComments,
  getCommentById,
  getCommentsByTaskId,
  createComment,
  updateComment,
  deleteComment,
};
