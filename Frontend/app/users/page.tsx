"use client";

import UsersDashboard from "@/components/users/users-dashboard";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import withAuthAdmin from "@/HOC/withAuthAdmin";

const UsersPage = () => {
  return (
    <div className="flex h-screen w-full flex-col bg-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <UsersDashboard />
        </main>
      </div>
    </div>
  );
}

export default withAuthAdmin(UsersPage); // Protect the page with the HOC
