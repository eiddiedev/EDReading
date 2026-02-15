"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BookMarked, Settings, Library, Sparkles, Compass } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";

export function BottomTab() {
  const pathname = usePathname();
  const { triggerHaptic } = useHaptic();

  const tabs = [
    { href: "/library", icon: Library, label: "文库" },
    { href: "/bookshelf", icon: BookOpen, label: "书架" },
    { href: "/ai-hub", icon: Sparkles, label: "AI Hub" },
    { href: "/notebook", icon: BookMarked, label: "笔记本" },
    { href: "/portal", icon: Compass, label: "导航站" },
    { href: "/settings", icon: Settings, label: "设置" },
  ];

  return (
    <nav className="font-sans fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 md:hidden">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={triggerHaptic}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
