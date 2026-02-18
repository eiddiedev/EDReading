"use client";

import { useState, useEffect } from "react";
import { Plus, X, Globe, ExternalLink, Trash2, Layout, Maximize2, AlertTriangle, Loader2 } from "lucide-react";
import { PortalLink } from "@/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface PortalClientProps {
  initialLinks: PortalLink[];
  user: any;
}

export default function PortalClient({ initialLinks, user: initialUser }: PortalClientProps) {
  const [links, setLinks] = useState<PortalLink[]>(initialLinks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLink, setActiveLink] = useState<PortalLink | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [user, setUser] = useState<any>(initialUser);

  // Form State
  const [formData, setFormData] = useState<Partial<PortalLink>>({
    title: "",
    url: "",
    description: "",
    openMode: "iframe",
  });

  useEffect(() => {
    // 监听 Auth 变化，确保客户端状态与会话同步
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
       setUser(session?.user || null);
       // 如果用户变化，可能需要重新获取链接 (虽然服务端已传初始数据，但防止登出/登入切换)
       if (session?.user && session.user.id !== initialUser?.id) {
         fetchLinks(session.user.id);
       } else if (!session?.user) {
         setLinks([]);
       }
    });

    return () => subscription.unsubscribe();
  }, [initialUser?.id]);

  const fetchLinks = async (userId: string) => {
     const { data, error } = await supabase
      .from('portal_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

     if (data && !error) {
       const mapped: PortalLink[] = data.map((d: any) => ({
         id: d.id,
         title: d.title,
         url: d.url,
         description: d.description,
         icon: d.icon,
         openMode: d.open_mode as "iframe" | "new_tab",
       }));
       setLinks(mapped);
     }
  };

  const saveLinks = (newLinks: PortalLink[]) => {
    setLinks(newLinks);
  };

  const handleAdd = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    if (!formData.title || !formData.url) {
      toast.error("请填写标题和链接");
      return;
    }

    if (!user) {
      const errorMsg = "Supabase User Missing: Cannot save link without user session.";
      console.error(errorMsg);
      toast.error("请先登录以保存链接");
      return;
    }

    let url = formData.url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const newLink = {
      id: crypto.randomUUID(), // Use UUID instead of timestamp
      user_id: user.id,
      title: formData.title,
      url: url,
      description: formData.description,
      open_mode: formData.openMode,
      icon: `https://www.google.com/s2/favicons?sz=64&domain_url=${url}`,
      created_at: new Date().toISOString()
    };

    // Optimistic Update
    const uiLink: PortalLink = {
      id: newLink.id,
      title: newLink.title,
      url: newLink.url,
      description: newLink.description,
      openMode: newLink.open_mode as "iframe" | "new_tab",
      icon: newLink.icon
    };
    
    setLinks(prev => [uiLink, ...prev]);
    setIsModalOpen(false);
    setFormData({ title: "", url: "", description: "", openMode: "iframe" });
    toast.success("链接已添加！");

    // Supabase Insert
    const { data: insertedData, error } = await supabase.from('portal_links').insert(newLink).select().single();
    
    if (error) {
       console.error("Supabase Insert Error:", error);
       toast.error(`保存失败: ${error.message}`);
       // Rollback
       setLinks(prev => prev.filter(l => l.id !== uiLink.id));
    } else if (insertedData) {
      // Replace optimistic item with real one (with correct ID)
      const realLink: PortalLink = {
        id: insertedData.id,
        title: insertedData.title,
        url: insertedData.url,
        description: insertedData.description,
        openMode: insertedData.open_mode as "iframe" | "new_tab",
        icon: insertedData.icon
      };
      setLinks(prev => prev.map(l => l.id === uiLink.id ? realLink : l));
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("确定要删除这个链接吗？")) {
      const oldLinks = [...links];
      setLinks(links.filter((l) => l.id !== id));
      toast.success("链接已删除");

      if (user) {
        const { error } = await supabase.from('portal_links').delete().match({ id, user_id: user.id });
        if (error) {
           console.error(error);
           setLinks(oldLinks); // Rollback
        }
      }
    }
  };

  const handleOpen = (link: PortalLink) => {
    if (link.openMode === "new_tab") {
      window.open(link.url, "_blank");
    } else {
      setIframeLoading(true);
      setActiveLink(link);
    }
  };

  return (
    <div className="h-full relative">
        <div className="p-8 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                <Globe className="w-8 h-8 text-primary-600" />
                导航站
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                管理您的外部资源和书签
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              添加链接
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {links.map((link) => (
              <div
                key={link.id}
                onClick={() => handleOpen(link)}
                className="group relative bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 p-2 flex items-center justify-center overflow-hidden">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={link.icon || `https://www.google.com/s2/favicons?sz=64&domain_url=${link.url}`} 
                      alt="icon" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/1006/1006771.png"; // Fallback globe
                      }}
                    />
                  </div>
                  <button
                    onClick={(e) => handleDelete(link.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1 truncate">
                  {link.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5em]">
                  {link.description || link.url}
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  {link.openMode === "iframe" ? (
                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                      <Layout className="w-3 h-3" /> 应用内
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                      <ExternalLink className="w-3 h-3" /> 新标签页
                    </span>
                  )}
                </div>
              </div>
            ))}

            {links.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <Globe className="w-12 h-12 mb-4 opacity-20" />
                <p>暂无链接，请添加第一个！</p>
              </div>
            )}
          </div>
        </div>


      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">添加新链接</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">标题</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="例如：Google 翻译"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">链接 (URL)</label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">描述 (可选)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="备注用途..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">打开方式</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.openMode === 'iframe' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                      <input
                        type="radio"
                        name="openMode"
                        value="iframe"
                        checked={formData.openMode === 'iframe'}
                        onChange={() => setFormData({ ...formData, openMode: 'iframe' })}
                        className="hidden"
                      />
                      <Layout className={`w-6 h-6 ${formData.openMode === 'iframe' ? 'text-primary-600' : 'text-slate-400'}`} />
                      <span className={`text-xs font-medium ${formData.openMode === 'iframe' ? 'text-primary-700' : 'text-slate-500'}`}>应用内覆盖</span>
                    </label>

                    <label className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.openMode === 'new_tab' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                      <input
                        type="radio"
                        name="openMode"
                        value="new_tab"
                        checked={formData.openMode === 'new_tab'}
                        onChange={() => setFormData({ ...formData, openMode: 'new_tab' })}
                        className="hidden"
                      />
                      <ExternalLink className={`w-6 h-6 ${formData.openMode === 'new_tab' ? 'text-primary-600' : 'text-slate-400'}`} />
                      <span className={`text-xs font-medium ${formData.openMode === 'new_tab' ? 'text-primary-700' : 'text-slate-500'}`}>新标签页</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-colors mt-2"
                >
                  创建链接
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Iframe Overlay */}
      <AnimatePresence>
        {activeLink && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col"
          >
            {/* Overlay Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-3">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={activeLink.icon} 
                  alt="" 
                  className="w-6 h-6 rounded bg-white p-0.5"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/1006/1006771.png";
                  }}
                />
                <div>
                   <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                     正在浏览: {activeLink.title}
                   </h3>
                   <p className="text-xs text-slate-500 truncate max-w-[200px] md:max-w-md">
                     {activeLink.url}
                   </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(activeLink.url, "_blank")}
                  className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="在浏览器中打开"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveLink(null)}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="关闭"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Iframe Content */}
            <div className="flex-1 relative bg-slate-100 dark:bg-slate-950">
              {iframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    <span className="text-sm text-slate-500 font-medium">正在加载 {activeLink.title}...</span>
                  </div>
                </div>
              )}
              <iframe
                src={activeLink.url}
                onLoad={() => setIframeLoading(false)}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                title={activeLink.title}
              />
              
              {/* Overlay Hint/Error Fallback */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
                 <div className="bg-black/70 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full flex items-center gap-2 pointer-events-auto shadow-xl">
                   <AlertTriangle className="w-3 h-3 text-yellow-400" />
                   <span>如果不加载 (Blank Screen)?</span>
                   <button 
                     onClick={() => window.open(activeLink.url, "_blank")}
                     className="underline hover:text-yellow-300 font-bold"
                   >
                     点击跳转 (Open externally)
                   </button>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
