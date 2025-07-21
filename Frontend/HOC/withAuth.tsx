"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import LoadingScreen from "@/components/loading-screen";

// HOC to protect routes
const withAuth = (Component: React.ComponentType) => {
  const AuthHOC = (props: any) => {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
      const token = Cookies.get("token");

      if (!token) {
        // Redirect to login if no token exists
        router.push("/");
      } else {
        setLoading(false); // Allow rendering the page if the token exists
      }
    }, [router]);

    if (loading) {
      return <LoadingScreen message="Loading..." />;
    }

    return <Component {...props} />;
  };

  return AuthHOC;
};

export default withAuth;
