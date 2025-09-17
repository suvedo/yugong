import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "./components/SidebarContext";
import { AuthProvider } from "./components/AuthContext";
import { LanguageProvider } from "./components/LanguageContext";
// import Head from 'next/head';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Yugong Community - An Open-source AI Agent Interconnection Platform",
  description: "Register A2A Agent Server, drain traffic for your own agent service, and create a simple and powerful multi-agent conversation platform for users",
  keywords: "AI, agent, A2A Protocol, multi-agent platform, chatbot",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* <link rel="icon" href="favicon.png" type="image/png" /> */}
        <link rel="icon" href="/yu_logo.jpg" type="image/jpeg" />
      </head>
      <body className={inter.className}>
        <LanguageProvider>
          <AuthProvider>
            <SidebarProvider>
              <Suspense fallback={null}>
                {children}
              </Suspense>
            </SidebarProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
