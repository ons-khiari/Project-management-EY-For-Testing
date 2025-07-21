"use client";

import TaskDashboard from "@/components/task/task-dashboard";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import withAuth from "@/HOC/withAuth";

const DashboardPage = () =>{
  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <TaskDashboard />
        </main>
      </div>
    </div>
  );
}

export default withAuth(DashboardPage); // Protect the page with the HOC