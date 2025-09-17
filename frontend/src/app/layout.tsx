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
  title: "愚公开源社区 - AI Agent注册搜索对话平台",
  description: "企业注册A2A Agent Server，为自身Agent服务引流，为用户打造简单易用且强大的多智能体对话平台",
  keywords: "AI, agent, A2A Protocol, 多智能体平台, chatbot",
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
