/**
 * 桌面端侧边导航栏组件，包含 Logo 展示和主要功能页面的导航链接。
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BookMarked, Settings, Sparkles, Library, Compass } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

const MotionLink = motion(Link);

export function Sidebar() {
  const pathname = usePathname();

  const tabs = [
    { href: "/library", icon: Library, label: "文库" },
    { href: "/bookshelf", icon: BookOpen, label: "书架" },
    { href: "/ai-hub", icon: Sparkles, label: "AI Hub" },
    { href: "/notebook", icon: BookMarked, label: "笔记本" },
    { href: "/portal", icon: Compass, label: "导航站" },
    { href: "/settings", icon: Settings, label: "设置" },
  ];

  return (
    <aside className="font-sans hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:bg-[#FDFBF7] dark:md:bg-slate-900 md:border-r md:border-slate-200 dark:md:border-slate-800">
      <div className="flex flex-col flex-1 pt-8 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-2">
          <div className="relative w-full h-32">
            <Image 
              src="/logo.png" 
              alt="EDReading Logo" 
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <MotionLink
                key={tab.href}
                href={tab.href}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center px-4 py-3 text-sm font-bold rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {tab.label}
              </MotionLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
