"use client";

import ScheduleDashboard from "@/components/schedule/schedule-dashboard";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import withAuth from "@/HOC/withAuth";

const SchedulePage = () => {
  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <ScheduleDashboard />
        </main>
      </div>
    </div>
  );
}

export default withAuth(SchedulePage); // Protect the page with the HOC