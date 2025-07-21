"use client"; // This makes the file client-side only

import MainDashboard from "@/components/main-dashboard";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import withAuth from "@/HOC/withAuth"; // Make sure the path is correct

const DashboardPage = () => {
  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          <MainDashboard />
        </main>
      </div>
    </div>
  );
};

export default withAuth(DashboardPage); // Protect the page with the HOC
