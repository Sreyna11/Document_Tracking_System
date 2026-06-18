import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../app/context/LanguageContext";
export default function Pagination({
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}) {
  const { t } = useLanguage();

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);
  const isAllSelected = itemsPerPage >= 100;

  return (

    <div className="flex flex-col md:flex-row items-center justify-between w-full px-6 py-4 bg-white dark:bg-[#161B22] border-t border-gray-100 dark:border-[#2A2F3A] rounded-b-2xl select-none">
      <div className="flex-1 text-[13px] text-[#4b5563] dark:text-gray-300 font-medium text-left w-full md:w-auto">
        Showing {totalItems === 0 ? 0 : indexOfFirstItem + 1} to {indexOfLastItem} of {totalItems} results
      </div>
      {/* Center: Items Per Page Selector */}
      <div className="flex-1 flex justify-center w-full md:w-auto my-4 md:my-0">
        <div className="flex items-center border border-[#e5e7eb] dark:border-[#2A2F3A] rounded-lg overflow-hidden bg-white dark:bg-[#0B0D12] shadow-xs">
          <span className="px-3 py-1.5 text-[13px] text-[#6b7280] dark:text-gray-400 font-medium border-r border-[#e5e7eb] dark:border-[#2A2F3A] bg-white dark:bg-[#0B0D12]">
            Per page
          </span>
          <select
            value={isAllSelected ? "All" : itemsPerPage}
            onChange={(e) => {
              const val = e.target.value;
              onItemsPerPageChange(val === "All" ? Math.max(totalItems, 100) : Number(val));
            }}
            className="pl-3 pr-8 py-1.5 text-[13px] font-bold text-[#374151] dark:text-gray-200 outline-none cursor-pointer appearance-none bg-white dark:bg-[#0B0D12] relative transition-colors focus:text-[#1a5b28] dark:focus:text-[#34d399]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundPosition: "right 0.5rem center",
              backgroundSize: "1em",
              backgroundRepeat: "no-repeat"
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value="All">All</option>
          </select>
        </div>
      </div>
      {/* Right: Page Navigation */}
      <div className="flex-1 flex justify-end w-full md:w-auto">
        <div className="flex items-center border border-[#e5e7eb] dark:border-[#2A2F3A] rounded-lg overflow-hidden bg-white dark:bg-[#0B0D12] shadow-xs">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 flex items-center justify-center border-r border-[#e5e7eb] dark:border-[#2A2F3A] text-[13px] transition-colors ${currentPage === 1
                ? "text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-[#161B22] cursor-not-allowed"
                : "text-[#6b7280] dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#242B36] hover:text-gray-900 dark:hover:text-white"
              }`}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          {/* Page Numbers */}
          {Array.from({ length: totalPages }).map((_, index) => {
            const pageNumber = index + 1;
            const isActive = currentPage === pageNumber;

            if (
              totalPages > 5 &&
              pageNumber !== 1 &&
              pageNumber !== totalPages &&
              Math.abs(currentPage - pageNumber) > 1
            ) {
              if (pageNumber === 2 || pageNumber === totalPages - 1) {
                return (
                  <span key={pageNumber} className="px-3 py-1.5 border-r border-[#e5e7eb] dark:border-[#2A2F3A] text-[#9ca3af] dark:text-gray-500 text-[13px] font-medium bg-white dark:bg-[#0B0D12]">
                    ...
                  </span>
                );
              }
              return null;
            }
            return (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={`px-3.5 py-1.5 border-r border-[#e5e7eb] dark:border-[#2A2F3A] text-[13px] font-bold transition-colors ${isActive
                    ? "text-[#1a5b28] dark:text-[#34d399] bg-[#f0fdf4] dark:bg-[#0c3f0d]" // Main Green Text with very light green background
                    : "text-[#4b5563] dark:text-gray-300 bg-white dark:bg-[#0B0D12] hover:bg-gray-50 dark:hover:bg-[#242B36] hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                {pageNumber}
              </button>
            );
          })}
          {/* Next Button */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1.5 flex items-center justify-center text-[13px] transition-colors ${currentPage === totalPages || totalPages === 0
                ? "text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-[#161B22] cursor-not-allowed"
                : "text-[#6b7280] dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#242B36] hover:text-gray-900 dark:hover:text-white"
              }`}
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
