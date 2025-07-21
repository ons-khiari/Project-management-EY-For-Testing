"use client";

import type React from "react";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import eylogo from "../public/images/EY-logo.png";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading your dashboard...",
}) => {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center justify-center p-8 max-w-md text-center">
        {/* Logo placeholder - replace with your actual logo */}
        <div className="mb-6 flex items-center">
          <Image src={eylogo} alt="EY Logo" width={100} height={60} />
        </div>

        <div className="flex items-center justify-center mb-6">
          <Loader2 className="h-12 w-12 text-yellow-500 animate-spin" />
        </div>

        <h2 className="text-2xl font-semibold text-gray-800 mb-2">{message}</h2>

        <p className="text-gray-500">
          Please wait while we prepare your information
        </p>

        <div className="mt-8 w-64 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 animate-pulse rounded-full"
            style={{ width: "70%" }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
