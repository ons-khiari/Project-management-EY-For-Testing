"use client";

import type React from "react";

import { useEffect, useState } from "react";
import {
  Search,
  Edit,
  Settings,
  Pencil,
  Trash2,
  Mail,
  Phone,
  CreditCard,
  ShieldCheck,
  UserIcon,
  Users,
  Filter,
  Briefcase,
  Copy,
} from "lucide-react";
import type { User } from "@/app/types/user";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { api } from "@/services/api";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

export default function UsersDashboard() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState(selectedUser?.role || "");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openEditModal = (user: User) => {
    // Prevent editing self
    if (user.id === currentUserId) {
      alert("You cannot edit your own account");
      return;
    }

    setSelectedUser(user);
    setNewRole(user.role);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  // Handle role change
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNewRole(e.target.value);
  };

  const getRoleLabel = (role: string) => {
    if (Number(role) === 0) {
      return "Admin";
    } else if (Number(role) === 1) {
      return "Project Manager";
    } else if (Number(role) === 2) {
      return "Team Member";
    } else {
      return "Unknown Role";
    }
  };

  // Handle copying user ID
  const handleCopyId = async (userId: string) => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopiedId(userId);
      setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error("Failed to copy ID:", error);
    }
  };

  // Filter users based on active tab and search query
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getRoleLabel(user.role).toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "admin") return Number(user.role) === 0 && matchesSearch;
    if (activeTab === "projectManager")
      return Number(user.role) === 1 && matchesSearch;
    if (activeTab === "teamMember")
      return Number(user.role) === 2 && matchesSearch;

    return false;
  });

  const handleUpdateUserRole = async () => {
    if (!selectedUser) return;

    // Double-check to prevent updating self
    if (selectedUser.id === currentUserId) {
      alert("You cannot update your own role");
      closeModal();
      return;
    }

    try {
      const response = await api.updateUserRole(selectedUser.id, newRole);

      if (response.success) {
        // Update the user in the local state with the new role
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === selectedUser.id ? { ...user, role: newRole } : user
          )
        );
        closeModal();
      } else {
        console.error("Failed to update user role:", response.message);
      }
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    // Double-check to prevent deleting self
    if (userId === currentUserId) {
      alert("You cannot delete your own account");
      setIsDeleteModalOpen(false);
      return;
    }

    try {
      const response = await deleteUser(userId);

      if (response.success) {
        setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
      } else {
        console.error("Failed to delete user:", response.message);
      }
    } catch (error) {
      console.error("Error occurred while deleting user:", error);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await api.deleteUser(userId);
      return response;
    } catch (error) {
      console.error("Error deleting user:", error);
      return { success: false, message: "Error deleting user" };
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Updated role badge styling
  const getRoleBadge = (role: string) => {
    // Expects a string
    const numericRole = Number(role);
    switch (numericRole) {
      case 0: // Admin
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: <ShieldCheck className="mr-1 h-4 w-4" />,
          label: "Admin",
        };
      case 1: // Project Manager
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: <Briefcase className="mr-1 h-4 w-4" />,
          label: "Project Manager",
        };
      case 2: // Team Member
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: <Users className="mr-1 h-4 w-4" />,
          label: "Team Member",
        };
      default: // Unknown Role
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: <UserIcon className="mr-1 h-4 w-4" />,
          label: "Unknown Role",
        };
    }
  };

  async function fetchUsers() {
    try {
      const response = await api.getUsers();
      setUsers(response.data as User[]);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []); // Only fetch once on mount

  useEffect(() => {
    // Get current user ID from token
    const token = Cookies.get("token");
    if (!token) return;

    try {
      const decoded: any = jwtDecode(token);
      const userId =
        decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      setCurrentUserId(userId);
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  }, []);

  const getInitials = (name: string, lastname: string) => {
    const firstLetter = name.charAt(0).toUpperCase();
    const lastLetter = lastname.charAt(0).toUpperCase();
    return firstLetter + lastLetter;
  };

  const openDeleteModal = (user: User) => {
    // Prevent deleting self
    if (user.id === currentUserId) {
      alert("You cannot delete your own account");
      return;
    }

    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="h-full">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#444444]">Users</h1>
        <div></div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 rounded-md border border-gray-300 pl-7 pr-3 text-sm focus:border-[#ffe500] focus:outline-none focus:ring-1 focus:ring-[#ffe500]/30 transition-all"
            />
          </div>
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
          </button>
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            <Edit className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            <Settings className="h-3.5 w-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mb-3 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            className={`border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "border-[#27acaa] text-[#444444]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("all")}
          >
            All Users
          </button>
          <button
            className={`border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "admin"
                ? "border-[#27acaa] text-[#444444]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("admin")}
          >
            Admin
          </button>
          <button
            className={`border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "projectManager"
                ? "border-[#27acaa] text-[#444444]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("projectManager")}
          >
            Manager
          </button>
          <button
            className={`border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "teamMember"
                ? "border-[#27acaa] text-[#444444]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("teamMember")}
          >
            Member
          </button>
        </div>
      </div>

      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white w-full max-w-md p-6 md:p-8 rounded-2xl shadow-2xl animate-fadeIn space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">
                Delete User
              </h2>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete{" "}
                <strong>{userToDelete.name}</strong>? <br />
                This action cannot be undone.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  handleDeleteUser(userToDelete.id);
                  setIsDeleteModalOpen(false);
                }}
                className="w-full py-2 rounded-full bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                className="w-full py-2 rounded-full bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-5 animate-fadeIn">
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl font-semibold text-gray-800">
                Edit User Role
              </h2>
              <p className="text-sm text-gray-500">
                Assign a role to this user.
              </p>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                value={newRole}
                onChange={handleRoleChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#27acaa] focus:ring-2 focus:ring-[#27acaa]/40"
              >
                <option disabled>Select a role</option>
                <option value="0">Admin</option>
                <option value="1">Project Manager</option>
                <option value="2">Team Member</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUserRole}
                className="rounded-lg bg-[#27acaa] px-4 py-2 text-sm font-medium text-white hover:bg-[#1b8c89] transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                ID
              </th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                User
              </th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Contact
              </th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                CIN
              </th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Role
              </th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedUsers.map((user) => {
              const { color, icon } = getRoleBadge(user.role.toString());
              return (
                <tr
                  key={user.id}
                  className="group transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleCopyId(user.id)}
                            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span className="font-mono text-xs">
                              {copiedId === user.id ? "Copied!" : "Copy ID"}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {copiedId === user.id
                            ? "ID copied to clipboard!"
                            : "Click to copy user ID"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium bg-gradient-to-r from-[#27acaa] to-[#32c5c2] text-white shadow-sm ring-2 ring-white`}
                      >
                        {getInitials(user.name, user.lastname)}
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">
                          {user.name} {user.lastname}
                        </div>
                        {/* <div className="text-xs text-gray-500">
                          Last active: Today
                        </div> */}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="mr-2 h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate max-w-[180px]">
                          {user.email}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="mr-2 h-3.5 w-3.5 text-gray-400" />
                        +216 {user.phoneNumber}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <CreditCard className="mr-2 h-3.5 w-3.5 text-gray-400" />
                      {user.cin}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`flex items-center border px-2 py-1 rounded-lg ${
                        getRoleBadge(user.role.toString()).color
                      }`}
                    >
                      {getRoleBadge(user.role.toString()).icon}
                      <span>{getRoleBadge(user.role.toString()).label}</span>
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <TooltipProvider>
                      <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={`rounded-full p-1.5 text-gray-500 hover:bg-[#27acaa]/10 hover:text-[#27acaa] transition-colors ${
                                user.id === currentUserId
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              onClick={() => openEditModal(user)}
                              disabled={user.id === currentUserId}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          {/* <TooltipContent side="left">
                            <p>Edit user</p>
                          </TooltipContent> */}
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={`rounded-full p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors ${
                                user.id === currentUserId
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              onClick={() => openDeleteModal(user)}
                              disabled={user.id === currentUserId}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          {/* <TooltipContent side="left">
                            <p>Delete user</p>
                          </TooltipContent> */}
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </td>
                </tr>
              );
            })}
            {paginatedUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-3 rounded-full bg-gray-100 p-3">
                      <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="mb-1 text-sm font-medium text-gray-500">
                      No users found
                    </p>
                    <p className="text-xs text-gray-400">
                      Try adjusting your search or filters
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination controls */}
        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500">
            <div>
              Showing {paginatedUsers.length} of {filteredUsers.length} users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded px-2 py-1 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`rounded px-2 py-1 font-medium shadow-sm border border-gray-200 ${
                      currentPage === page ? "bg-white" : "hover:bg-gray-200"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded px-2 py-1 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
