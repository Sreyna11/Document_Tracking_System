import React, { useState } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';
import { useLanguage } from '../app/context/LanguageContext';

export default function BulkActionBar({ selectedCount, totalCount, onSelectAll, onDeselectAll, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useLanguage();

  if (selectedCount === 0) return null;

  return (
    <div className="w-full flex items-center justify-start gap-6 px-4 py-3 bg-[#e8f5e9] dark:bg-[#112315] border border-[#a5d6a7] dark:border-[#1a4422] rounded-lg mb-4 animate-fade-in shadow-sm transition-colors">
      <div className="relative">
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-[#2A2F3A] rounded-md bg-white dark:bg-[#242B36] hover:bg-gray-50 dark:hover:bg-[#2A2F3A] text-[15px] font-bold text-gray-800 dark:text-white shadow-sm transition-colors"
        >
          <MoreVertical size={16} className="text-gray-400 dark:text-[#a1a1aa]" />
          {t("bulk_actions") || "Bulk actions"}
        </button>
        
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#161B22] border border-gray-100 dark:border-[#2A2F3A] rounded-lg shadow-xl z-50 py-1 flex flex-col">
              <button
                onClick={() => { setMenuOpen(false); onDelete(); }}
                className="flex items-center gap-2 px-4 py-2 text-[15px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors w-full text-left"
              >
                <Trash2 size={16} />
                {t("delete") || "Delete"} {t("selected") || "selected"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 text-[15px] font-bold">
        <button onClick={onSelectAll} className="text-[#1a5b28] dark:text-[#6ccb7d] hover:text-[#0c3f0d] dark:hover:text-[#4da35d] transition-colors">
          {t("select_all")} {totalCount}
        </button>
        <button onClick={onDeselectAll} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors">
          {t("deselect_all")}
        </button>
      </div>
    </div>
  );
}
