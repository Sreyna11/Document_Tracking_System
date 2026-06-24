import React from 'react';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '../app/context/LanguageContext';
export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName, itemCount, itemType = 'items' }) {
  const { t } = useLanguage();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden p-6 text-center">
        <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <Trash2 size={28} className="text-red-500" strokeWidth={2} />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Confirmation</h3>
        
        <p className="text-gray-500 text-[15px] mb-8 px-2 font-medium">
          Are you sure you want to delete {itemName && String(itemName).trim() !== '' ? <span className="font-bold text-gray-700">{itemName}</span> : `${itemCount} ${itemCount === 1 ? itemType.replace(/s$/, '') : `selected ${itemType}`}`}?
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors text-[15px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 bg-[#e50000] hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-[15px]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
