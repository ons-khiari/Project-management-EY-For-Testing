"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import LoadingScreen from "@/components/loading-screen";

// HOC to redirect if user is already authenticated
const withAuthRedirect = (Component: React.ComponentType) => {
  const AuthRedirectHOC = (props: any) => {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
      const token = Cookies.get("token");

      if (token) {
        // Redirect to the homepage or dashboard if the user is already logged in
        router.push("/dashboard");
      } else {
        setLoading(false); // Allow rendering the login page if no token exists
      }
    }, [router]);

    if (loading) {
      return <LoadingScreen message="Loading..." />;
    }

    return <Component {...props} />;
  };

  return AuthRedirectHOC;
};

export default withAuthRedirect;
