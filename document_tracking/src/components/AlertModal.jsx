import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function AlertModal({ isOpen, onClose, title, message }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 text-red-500 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h2 className="text-lg font-semibold">{title || "Alert"}</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-800 dark:text-gray-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
