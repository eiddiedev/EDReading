import React from 'react'; 
 
 interface ConfirmModalProps { 
   isOpen: boolean; 
   onClose: () => void; 
   onConfirm: () => void; 
   title: string; 
   message: string; 
 } 
 
 export function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: ConfirmModalProps) { 
   if (!isOpen) return null; 
 
   return ( 
     // 遮罩层：全屏，黑色半透明，模糊背景 
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity"> 
       {/* 弹窗主体：白色圆角卡片 */} 
       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100 border border-slate-100 dark:bg-slate-800 dark:border-slate-700"> 
         <h3 className="text-xl font-bold text-slate-800 mb-2 dark:text-slate-100">{title}</h3> 
         <p className="text-slate-600 mb-6 dark:text-slate-300">{message}</p> 
         
         <div className="flex justify-end gap-3"> 
           <button 
             onClick={onClose} 
             className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-slate-700" 
           > 
             取消 
           </button> 
           <button 
             onClick={() => { onConfirm(); onClose(); }} 
             className="px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 shadow-md transition-all hover:shadow-lg" 
           > 
             确认删除 
           </button> 
         </div> 
       </div> 
     </div> 
   ); 
 }