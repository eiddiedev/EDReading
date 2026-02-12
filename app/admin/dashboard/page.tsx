"use client";

import { motion } from "framer-motion";

export default function AdminDashboardPage() {
  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
          Admin Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-medium text-slate-500 dark:text-slate-400 mb-2">System Status</h3>
            <p className="text-2xl font-bold text-emerald-600">Operational</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-medium text-slate-500 dark:text-slate-400 mb-2">Environment</h3>
            <p className="text-2xl font-bold text-blue-600">Public Beta</p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-center py-12">
                🚧 Dashboard features are under development.
            </p>
        </div>
      </motion.div>
    </div>
  );
}
