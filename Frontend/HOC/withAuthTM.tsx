"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import LoadingScreen from "@/components/loading-screen";

// HOC to protect routes for team members
const withAuthTM = (Component: React.ComponentType) => {
  const AuthHOC = (props: any) => {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
      const token = Cookies.get("token");

      if (!token) {
        // Redirect to login if no token exists
        router.push("/");
      } else {
        try {
          const decodedToken: any = jwtDecode(token); // Decode the JWT token

          const role =
            decodedToken[
              "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
            ];

          if (role !== "TeamMember") {
            router.push("/dashboard");
          } else {
            setLoading(false);
          }
        } catch (error) {
          router.push("/dashboard");
        }
      }
    }, [router]);

    if (loading) {
      return <LoadingScreen message="Loading..." />;
    }

    return <Component {...props} />;
  };

  return AuthHOC;
};

export default withAuthTM;
