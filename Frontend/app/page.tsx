"use client";

import Image from "next/image";
import LoginForm from "@/components/login-form";
import eybuilding from "../public/images/EYBuilding.jpg";
import withAuthRedirect from "@/HOC/withAuthRedirect";

const Home = () => {
  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={eybuilding}
          alt="EY Office Building"
          fill
          className="object-cover opacity-[]"
          priority
        />
      </div>

      {/* Login Card Container */}
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <LoginForm />
      </div>
    </main>
  );
}

export default withAuthRedirect(Home);