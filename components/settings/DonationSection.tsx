/**
 * 捐赠选项展示组件，列出不同的捐赠档位和说明，鼓励用户支持开发者。
 */
import React, { useState } from 'react';
import { DonationModal } from './DonationModal';
import { motion } from 'framer-motion';
import { Heart, Zap } from 'lucide-react';

export const donationTiers = [
  {
    id: 'tier1',
    amount: 6.6,
    title: "六六大顺 🍀",
    desc: "祝你考试顺利一把过！(感谢请我喝杯蜜雪)",
    wechat: "/donate/wechat-6.6.jpg",
    alipay: "/donate/alipay-6.6.jpg",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
  },
  {
    id: 'tier2',
    amount: 9.9,
    title: "续命冰美式 ☕",
    desc: "熬夜修 Bug 必备，给服务器也提提神！",
    wechat: "/donate/wechat-9.9.jpg",
    alipay: "/donate/alipay-9.9.jpg",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
  },
  {
    id: 'tier3',
    amount: 19.9,
    title: "今晚加鸡腿 🍗",
    desc: "开发不易，吃顿好的补充脑力🥺",
    wechat: "/donate/wechat-19.9.jpg",
    alipay: "/donate/alipay-19.9.jpg",
    color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800"
  },
  {
    id: 'tier4',
    amount: 50,
    title: "疯狂星期四（服务器基金 🚀）",
    desc: "V我50 赞助服务器续费，让 App 再战一年！🔥",
    wechat: "/donate/wechat-50.jpg",
    alipay: "/donate/alipay-50.jpg",
    color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
  }
];

export function DonationSection() {
  const [selectedTier, setSelectedTier] = useState<typeof donationTiers[0] | null>(null);

  return (
    <div className="mt-12 mb-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            给开发者加油
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            这是一个纯个人开发的非盈利项目。目前服务器、数据库与 AI 接口的费用均由我自费承担。如果 EDReading 帮到了你，欢迎‘投喂’支持，这将直接用于支付下个月的服务器账单，让应用能持续运行下去！❤️
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {donationTiers.map((tier) => (
          <motion.button
            key={tier.id}
            onClick={() => setSelectedTier(tier)}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`relative p-5 text-left rounded-xl border transition-all duration-300 hover:shadow-md ${tier.color}`}
          >
            {/* Hot Badge for Tier 4 (50 yuan) */}
            {tier.amount === 50 && (
              <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                CRAZY
              </div>
            )}

            <div className="flex justify-between items-start mb-2">
              <span className="text-2xl font-bold">¥{tier.amount}</span>
              {/* Optional Icon/Emoji from title could go here if parsed, but title has it */}
            </div>
            
            <h3 className="font-bold mb-1">{tier.title}</h3>
            <p className="text-xs opacity-80 leading-relaxed">
              {tier.desc}
            </p>
          </motion.button>
        ))}
      </div>

      <DonationModal 
        isOpen={!!selectedTier} 
        onClose={() => setSelectedTier(null)} 
        tier={selectedTier} 
      />
    </div>
  );
}
