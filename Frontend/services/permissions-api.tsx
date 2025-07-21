import Cookies from "js-cookie";

const BASE_URL = "http://localhost:5185/api/Permissions";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface AssignPermissionsRequest {
  projectId: string;
  userId: string;
  permissions: string[];
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

// Assign or update permissions for a user on a project
export const assignPermissions = async (
  requestBody: AssignPermissionsRequest
) => {
  return request("/assign", "POST", requestBody);
};

// Get permissions by projectId and userId (query params)
export const getPermissionsByProjectAndUser = async (
  projectId: string,
  userId: string
) => {
  const query = `?projectId=${encodeURIComponent(
    projectId
  )}&userId=${encodeURIComponent(userId)}`;
  return request(`/by-project-and-user${query}`, "GET");
};

// Get permissions by projectId
export const getPermissionsByProject = async (projectId: string) => {
  return request(`/by-project/${encodeURIComponent(projectId)}`, "GET");
};

// Get permissions by userId
export const getPermissionsByUser = async (userId: string) => {
  return request(`/by-user/${encodeURIComponent(userId)}`, "GET");
};

export const permissionApi = {
  assignPermissions,
  getPermissionsByProjectAndUser,
  getPermissionsByProject,
  getPermissionsByUser,
};
