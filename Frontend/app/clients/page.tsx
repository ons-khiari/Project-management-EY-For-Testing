"use client";

import ClientsDashboard from "@/components/client/client-dashboard";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import withAuthAdmin from "@/HOC/withAuthAdmin";

const ClientsPage = () => {
  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4">
          <ClientsDashboard />
        </main>
      </div>
    </div>
  );
};

export default withAuthAdmin(ClientsPage); // Protect the page with the HOC
