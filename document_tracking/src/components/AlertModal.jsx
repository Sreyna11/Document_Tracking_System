import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function AlertModal({ isOpen, onClose, title, message, type = "error" }) {
  if (!isOpen) return null;
  
  const isSuccess = type === "success";
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-[#161B22] p-6 rounded-xl shadow-2xl max-w-sm w-full relative transform transition-all scale-100">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className={`flex flex-col items-center gap-3 ${isSuccess ? 'text-green-500' : 'text-red-500'} mb-4 text-center mt-2`}>
          {isSuccess ? <CheckCircle2 className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title || (isSuccess ? "Success" : "Alert")}</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-center text-sm leading-relaxed">{message}</p>
        <div className="flex justify-center w-full">
          <button onClick={onClose} className={`w-full py-2.5 rounded-lg font-semibold text-white transition-all shadow-md hover:shadow-lg ${isSuccess ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
