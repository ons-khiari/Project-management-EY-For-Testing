"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Edit,
  Settings,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Globe,
  Briefcase,
  Building2,
  User,
  Building,
  Heart,
  Plus,
  Filter,
  Copy,
} from "lucide-react";
import type { ClientType } from "@/app/types/client";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// No dropdown menu needed
import type { Client } from "@/app/types/client";
import LoadingScreen from "../loading-screen";
import { clientApi } from "@/services/client-api";

export default function ClientsDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  // No sort state needed for simple alphabetical sorting
  const [sortBy, setSortBy] = useState<"name" | "type" | "date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isClientDeleteModalOpen, setIsClientDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter clients based on active tab and search query
  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.industry?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      );

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "companies")
      return client.type === "Company" && matchesSearch;
    if (activeTab === "individuals")
      return client.type === "Individual" && matchesSearch;
    if (activeTab === "others")
      return (
        (client.type === "Government" || client.type === "NonProfit") &&
        matchesSearch
      );
    return matchesSearch;
  });

  // Sort clients by creation date in descending order
  const sortedClients = [...filteredClients].sort((a, b) => {
    const aVal =
      sortBy === "date"
        ? new Date(a.createdAt).getTime()
        : a[sortBy].toString().toLowerCase();
    const bVal =
      sortBy === "date"
        ? new Date(b.createdAt).getTime()
        : b[sortBy].toString().toLowerCase();

    return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  // Use sortedClients for pagination
  const paginatedClients = sortedClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  // Handle client deletion
  const handleDeleteClient = async (clientId: string) => {
    try {
      const response = await clientApi.deleteClient(clientId);

      if (response.success) {
        // Refresh or re-fetch the clients list after successful deletion
        const updatedClients = await clientApi.getClients();
        setClients(updatedClients.data || []); // Update state with the new list of clients
      } else {
        alert(response.message || "Failed to delete client");
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("An error occurred while deleting the client");
    }
  };

  // Toggle sort order
  const toggleSort = (column: "name" | "type" | "date") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Handle copying client ID
  const handleCopyId = async (clientId: string) => {
    try {
      await navigator.clipboard.writeText(clientId);
      setCopiedId(clientId);
      setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error("Failed to copy ID:", error);
    }
  };

  // Get client type badge properties
  const getClientTypeBadge = (type: ClientType) => {
    switch (type) {
      case "Individual":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: <User className="mr-1 h-3 w-3" />,
        };
      case "Company":
        return {
          color: "bg-purple-100 text-purple-800 border-purple-200",
          icon: <Building2 className="mr-1 h-3 w-3" />,
        };
      case "Government":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: <Building className="mr-1 h-3 w-3" />,
        };
      case "NonProfit":
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200",
          icon: <Heart className="mr-1 h-3 w-3" />,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: <Building2 className="mr-1 h-3 w-3" />,
        };
    }
  };

  // Get industry icon
  const getIndustryIcon = (industry?: string) => {
    if (!industry) return <Briefcase className="h-3.5 w-3.5 text-gray-400" />;

    // You can add more specific industry icons here
    return <Briefcase className="h-3.5 w-3.5 text-gray-400" />;
  };

  useEffect(() => {
    const fetchClients = async () => {
      const response = await clientApi.getClients();
      if (response.success && response.data) {
        setClients(response.data);
      } else {
        setError(response.message || "Failed to fetch clients");
      }
      setLoading(false);
    };

    fetchClients();
  }, []);

  if (loading) return <LoadingScreen />;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  const handleEditClick = (clientId: string) => {
    router.push(`/clients/edit/${clientId}`);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="h-full">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#444444]">Clients</h1>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
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

        <button
          onClick={() => router.push("/clients/add")}
          className="flex items-center gap-1 rounded-md bg-[#ffe500] px-3 py-1.5 text-sm font-medium text-[#444444] hover:bg-[#f5dc00]"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {isClientDeleteModalOpen && clientToDelete && (
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
                Delete Client
              </h2>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete{" "}
                <strong>{clientToDelete.name}</strong>? <br />
                This action cannot be undone.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  handleDeleteClient(clientToDelete.id);
                  setIsClientDeleteModalOpen(false);
                }}
                className="w-full py-2 rounded-full bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setIsClientDeleteModalOpen(false);
                  setClientToDelete(null);
                }}
                className="w-full py-2 rounded-full bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
            All Clients
          </button>
          <button
            className={`border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "companies"
                ? "border-[#27acaa] text-[#444444]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("companies")}
          >
            Companies
          </button>
          <button
            className={`border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "individuals"
                ? "border-[#27acaa] text-[#444444]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("individuals")}
          >
            Individuals
          </button>
          <button
            className={`border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "others"
                ? "border-[#27acaa] text-[#444444]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("others")}
          >
            Others
          </button>
        </div>
      </div>

      {/* Clients table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                ID
              </th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Contact
              </th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Contact Person
              </th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Industry
              </th>
              <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedClients.map((client) => {
              const { color, icon } = getClientTypeBadge(client.type);
              return (
                <tr
                  key={client.id}
                  className="group transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleCopyId(client.id)}
                            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span className="font-mono text-xs">
                              {copiedId === client.id ? "Copied!" : "Copy ID"}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {copiedId === client.id
                            ? "ID copied to clipboard!"
                            : "Click to copy client ID"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#27acaa] to-[#32c5c2] text-sm font-medium text-white shadow-sm ring-2 ring-white">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">
                          {client.name.length > 23
                            ? client.name.slice(0, 23) + "..."
                            : client.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Added on{" "}
                          {new Date(client.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="mr-2 h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate max-w-[180px]">
                          {client.email}
                        </span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="mr-2 h-3.5 w-3.5 text-gray-400" />
                          {client.phone}
                        </div>
                      )}
                      {client.website && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Globe className="mr-2 h-3.5 w-3.5 text-gray-400" />
                          <a
                            href={
                              client.website.startsWith("http")
                                ? client.website
                                : `https://${client.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate max-w-[180px] hover:underline  cursor-pointer"
                          >
                            {client.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="mr-2 h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate max-w-[180px]">
                          {client.contactPerson}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="mr-2 h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate max-w-[180px]">
                          {client.contactEmail}
                        </span>
                      </div>
                      {client.contactPhone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="mr-2 h-3.5 w-3.5 text-gray-400" />
                          {client.contactPhone}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <Badge
                      className={`flex w-fit items-center border px-2 py-1 ${color}`}
                    >
                      {icon}
                      <span className="capitalize">{client.type}</span>
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {client.industry ? (
                      <div className="flex items-center text-sm text-gray-600">
                        {getIndustryIcon(client.industry)}
                        <span className="ml-2">{client.industry}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TooltipProvider>
                      <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="rounded-full p-1.5 text-gray-500 hover:bg-[#27acaa]/10 hover:text-[#27acaa] transition-colors"
                              onClick={() => handleEditClick(client.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="rounded-full p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                              onClick={() => {
                                setClientToDelete(client);
                                setIsClientDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </td>
                </tr>
              );
            })}
            {paginatedClients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-3 rounded-full bg-gray-100 p-3">
                      <Building2 className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="mb-1 text-sm font-medium text-gray-500">
                      No clients found
                    </p>
                    <p className="text-xs text-gray-400">
                      Try adjusting your search or filters
                    </p>
                    <button
                      onClick={() => router.push("/clients/add")}
                      className="mt-4 flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add a new client</span>
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination controls */}
        {sortedClients.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500">
            <div>
              Showing {paginatedClients.length} of {sortedClients.length}{" "}
              clients
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
