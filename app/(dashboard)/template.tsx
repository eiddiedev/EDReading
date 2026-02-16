/**
 * 仪表盘页面的动画模板，为页面切换提供淡入上浮的过渡效果。
 */
'use client';

import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: 'easeInOut', duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
