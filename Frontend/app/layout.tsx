import type React from "react";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import GlobalChatbot from "@/components/chatbot";

const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "EY Boards",
//   description: "Sign in to EY Boards",
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <GlobalChatbot />
      </body>
    </html>
  );
}
