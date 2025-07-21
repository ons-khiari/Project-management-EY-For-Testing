import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

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

    let data: any = null;

    const contentType = response.headers.get("Content-Type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      return { success: false, message: data?.message || "An error occurred" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("API request error:", error);
    return { success: false, message: "Network error" };
  }
}

export const getUser = async () => {
  try {
    const token = Cookies.get("token");
    if (!token) return { success: false, message: "No token found" };

    // Decode token to get user ID
    const decodedToken: any = jwtDecode(token);
    const userId =
      decodedToken[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
      ];

    if (!userId)
      return { success: false, message: "User ID not found in token" };

    // Fetch user by ID from API
    return request(`/User/${userId}`, "GET");
  } catch (error) {
    console.error("Error decoding token or fetching user:", error);
    return { success: false, message: "Failed to fetch user" };
  }
};

export const getUserById = async (id: string) => {
  try {
    const response = await request(`/User/${id}`, "GET");

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Failed to fetch user",
      };
    }

    return response;
  } catch (error) {
    console.error("Error fetching user:", error);
    return { success: false, message: "Failed to fetch user" };
  }
}

export const getUsers = async () => {
  try {
    const response = await request("/User", "GET");

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Failed to fetch users",
      };
    }

    return response;
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, message: "Failed to fetch users" };
  }
};

export const updateUserRole = async (id: string, newRole: string) => {
  try {
    const response = await request(`/User/update/${id}`, "PATCH", {
      role: newRole,
    });
    return response;
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, message: "Network error" };
  }
};

export const deleteUser = async (id: string) => {
  try {
    const response = await request(`/User/delete/${id}`, "DELETE");

    // Check if the response was successful based on the API's expected format
    if (response?.success) {
      return { success: true, message: "User deleted successfully" };
    } else {
      // If response is not successful but not a network error, return message
      return { success: false, message: response?.message || "Unknown error" };
    }
  } catch (error) {
    // Catch network errors and log the appropriate message
    console.error("API request error:", error);
    return { success: false, message: "Network error" };
  }
};

export const getTeamMembers = async () => {
  try {
    const response = await request("/User/team-members", "GET");

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Failed to fetch team members",
      };
    }

    return response;
  } catch (error) {
    console.error("Error fetching team members:", error);
    return { success: false, message: "Failed to fetch team members" };
  }
};

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string }>("/Auth/login", "POST", { email, password }),
  getUser,
  getUsers,
  updateUserRole,
  deleteUser,
  getUserById,
  getTeamMembers,
};
