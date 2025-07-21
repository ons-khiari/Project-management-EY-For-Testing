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

// Decode JWT to get user ID from token
const getUserIdFromToken = (): string | null => {
  const token = Cookies.get("token");
  if (!token) return null;

  try {
    const decodedToken: any = jwtDecode(token);
    // Adjust the claim key if needed
    const userId =
      decodedToken[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
      ];
    return userId || null;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

// Fetch notifications for the logged-in user
export const getNotifications = async (): Promise<ApiResponse<any[]>> => {
  const userId = getUserIdFromToken();
  if (!userId) {
    return { success: false, message: "User not authenticated" };
  }
  return request(`/Notification/${userId}`, "GET");
};

// Mark a notification as read by notification ID
export const markNotificationAsRead = async (
  id: number
): Promise<ApiResponse<null>> => {
  return request(`/Notification/${id}/read`, "PUT");
};

export const notificationApi = {
  getNotifications,
  markNotificationAsRead,
};
