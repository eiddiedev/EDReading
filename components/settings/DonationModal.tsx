/**
 * 捐赠支付模态框，展示微信支付和支付宝的收款码。
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface DonationTier {
  id: string;
  amount: number;
  title: string;
  desc: string;
  wechat: string;
  alipay: string;
  color: string;
}

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: DonationTier | null;
}

export function DonationModal({ isOpen, onClose, tier }: DonationModalProps) {
  const [method, setMethod] = useState<'wechat' | 'alipay'>('wechat');

  if (!isOpen || !tier) return null;

  const isWechat = method === 'wechat';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 pb-2 text-center">
              <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-1">
                {tier.title}
              </h3>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                ¥{tier.amount.toFixed(2)}
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="px-6 py-2">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl">
                <button
                  onClick={() => setMethod('wechat')}
                  className={`relative flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isWechat
                      ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-700 dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {isWechat && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-sm"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.5,13.5A1.5,1.5 0 0,1 7,15A1.5,1.5 0 0,1 5.5,13.5A1.5,1.5 0 0,1 7,12A1.5,1.5 0 0,1 8.5,13.5M17.5,13.5A1.5,1.5 0 0,1 16,15A1.5,1.5 0 0,1 14.5,13.5A1.5,1.5 0 0,1 16,12A1.5,1.5 0 0,1 17.5,13.5M12,2C17.5,2 22,6 22,11C22,16 17.5,20 12,20C11.5,20 11,19.9 10.5,19.8L7,22L8,18.5C4.5,17 2,14.5 2,11C2,6 6.5,2 12,2Z" />
                    </svg>
                    微信支付
                  </span>
                </button>
                <button
                  onClick={() => setMethod('alipay')}
                  className={`relative flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    !isWechat
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {!isWechat && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-sm"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                     <svg className="w-5 h-5" viewBox="0 0 1024 1024" fill="currentColor">
                      <path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0z m262.2 730.8c-10.4 20.8-29.4 33.6-53.2 33.6H303c-23.8 0-42.8-12.8-53.2-33.6-32.6-65.2-32.6-146.4-32.6-146.4V440.4c0-23.8 19-43.4 42.4-43.4h504.8c23.4 0 42.4 19.6 42.4 43.4v144c0 0 0 81.2-32.6 146.4z" />
                      <path d="M433.8 286h156.4c12.2 0 22-9.8 22-22s-9.8-22-22-22H433.8c-12.2 0-22 9.8-22 22s9.8 22 22 22z" fill="#FFFFFF"/>
                     </svg>
                    支付宝
                  </span>
                </button>
              </div>
            </div>

            {/* QR Code Area */}
            <div className="p-6 pt-2 flex flex-col items-center">
              <div className="relative group">
                <div className={`p-4 rounded-2xl shadow-lg transition-colors duration-300 ${
                  isWechat ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  <div className="relative w-48 h-48 bg-white rounded-xl overflow-hidden">
                    {/* Placeholder or Image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={isWechat ? tier.wechat : tier.alipay} 
                      alt={isWechat ? "WeChat Pay QR" : "Alipay QR"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback if image not found
                        e.currentTarget.src = "https://via.placeholder.com/200?text=QR+Code";
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <p className="mt-6 text-xs text-slate-400 dark:text-slate-500 text-center max-w-[280px] leading-relaxed">
                每一笔支持都会全部用于服务器续费和功能开发。学生党请量力而行，你能坚持使用并考出高分，就是对我最大的回报！
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
