import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

const BASE_URL = "http://localhost:5185/api";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Reusable request function
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

    // Check if response has content
    const isNoContent = response.status === 204;
    const data = isNoContent ? {} : await response.json(); // Avoid parsing JSON for empty responses

    if (!response.ok) {
      return { success: false, message: data.message || "An error occurred" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("API request error:", error);
    return { success: false, message: "Network error" };
  }
}

// Project-related API functions

export const getProjects = async () => {
  try {
    return await request("/Project", "GET");
  } catch (error) {
    console.error("Error fetching projects:", error);
    return { success: false, message: "Failed to fetch projects" };
  }
};

export const getProjectById = async (id: string) => {
  try {
    return await request(`/Project/${id}`, "GET");
  } catch (error) {
    console.error("Error fetching project:", error);
    return { success: false, message: "Failed to fetch project" };
  }
};

export const createProject = async (projectData: any) => {
  try {
    return await request("/Project", "POST", projectData);
  } catch (error) {
    console.error("Error creating project:", error);
    return { success: false, message: "Failed to create project" };
  }
};

export const updateProject = async (id: string, projectData: any) => {
  try {
    return await request(`/Project/${id}`, "PUT", projectData);
  } catch (error) {
    console.error("Error updating project:", error);
    return { success: false, message: "Failed to update project" };
  }
};

export const deleteProject = async (id: string) => {
  try {
    const response = await request(`/Project/${id}`, "DELETE");
    return response; // Return the response to handle state updates in the frontend
  } catch (error) {
    console.error("Error deleting project:", error);
    return { success: false, message: "Failed to delete project" };
  }
};

export const getProjectsByUserId = async (userId: string) => {
  try {
    return await request(`/Project/user/${userId}`, "GET");
  } catch (error) {
    console.error("Error fetching projects by user ID:", error);
    return { success: false, message: "Failed to fetch projects by user ID" };
  }
};

export const suggestPhase = async (projectId: string) => {
  try {
    return await request("/Project/suggest-phase", "POST", { projectId });
  } catch (error) {
    console.error("Error suggesting phase:", error);
    return { success: false, message: "Failed to suggest phase" };
  }
};

export const importProjectExcel = async (file: File) => {
  if (!file) {
    return { success: false, message: "No file provided" };
  }

  try {
    const token = Cookies.get("token");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${BASE_URL}/Project/import-excel`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Don't set Content-Type here — the browser handles it for FormData
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || "Import failed" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Import project Excel error:", error);
    return { success: false, message: "Network error" };
  }
};

export const exportProjectToExcel = async (projectId: string) => {
  try {
    const token = Cookies.get("token");

    const response = await fetch(
      `${BASE_URL}/Project/export-excel/${projectId}`,
      {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.message || "Export failed" };
    }

    // Get the file blob
    const blob = await response.blob();

    // Return the blob for caller to handle (download, preview, etc.)
    return { success: true, data: blob };
  } catch (error) {
    console.error("Export project Excel error:", error);
    return { success: false, message: "Network error" };
  }
};

export const projectApi = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectsByUserId,
  suggestPhase,
  importProjectExcel,
  exportProjectToExcel
};
