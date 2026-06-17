import React, { useState } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';
export default function BulkActionBar({ selectedCount, totalCount, onSelectAll, onDeselectAll, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  if (selectedCount === 0) return null;
  return (
    <div className="w-full flex items-center justify-between px-4 py-3 bg-[#e8f5e9] border border-[#a5d6a7] rounded-lg mb-4 animate-fade-in shadow-sm">
      <div className="relative">
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md bg-white hover:bg-gray-50 text-[13px] font-bold text-gray-800 shadow-sm transition-colors"
        >
          <MoreVertical size={14} className="text-gray-400" />
          Bulk actions
        </button>
        
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-100 rounded-lg shadow-xl z-50 py-1 flex flex-col">
              <button
                onClick={() => { setMenuOpen(false); onDelete(); }}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors w-full text-left"
              >
                <Trash2 size={16} />
                Delete selected
              </button>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-4 text-[13px] font-bold">
        <button onClick={onSelectAll} className="text-[#1a5b28] hover:text-[#0c3f0d] transition-colors">
          Select all {totalCount}
        </button>
        <button onClick={onDeselectAll} className="text-red-500 hover:text-red-700 transition-colors">
          Deselect all
        </button>
      </div>
    </div>
  );
}
