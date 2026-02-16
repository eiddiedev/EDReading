/**
 * 定义应用的根布局，包含字体设置、主题提供者、会话监听器和全局 Toast 提示。
 */
import type { Metadata, Viewport } from "next";
import { Inter, Merriweather } from "next/font/google";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionListener } from "@/components/SessionListener";
import { GlobalAnnouncement } from "@/components/GlobalAnnouncement";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-merriweather",
});

export const viewport: Viewport = {
  themeColor: "#0d9488",
};

export const metadata: Metadata = {
  title: "EDReading - IELTS Reading Practice",
  description: "A Shanbay-inspired English learning app for IELTS reading practice",
  manifest: "/manifest.json",
  icons: {
    icon: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${merriweather.variable} bg-slate-50 font-sans`}>
        <ThemeProvider>
          <SessionListener />
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
