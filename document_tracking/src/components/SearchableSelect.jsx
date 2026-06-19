"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

export default function SearchableSelect({
  options = [],
  value = "",
  onChange,
  disabled = false,
  placeholder = "Search department...",
  selectPlaceholder = "Select department",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clear search query when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const filteredOptions = options.filter(option =>
    (option || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (option) => {
    if (onChange) {
      onChange({ target: { value: option } });
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Selection Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left text-[14px] bg-gray-50 dark:bg-[#242B36] outline-none transition-all ${
          disabled
            ? "opacity-70 cursor-not-allowed border-gray-300 dark:border-[#2A2F3A] text-gray-500"
            : isOpen
            ? "border-[#1a5b28] ring-1 ring-[#1a5b28] text-black dark:text-white cursor-pointer"
            : "border-gray-300 dark:border-[#2A2F3A] text-black dark:text-white cursor-pointer hover:border-gray-400 dark:hover:border-[#475569]"
        }`}
      >
        <span className="truncate">{value || selectPlaceholder}</span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#1a5b28]" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown List Panel */}
      {isOpen && !disabled && (
        <div className="absolute left-0 mt-1.5 w-full bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg shadow-lg z-[999] overflow-hidden flex flex-col animate-fadeIn">
          {/* Inner Search Box */}
          <div className="p-2 border-b border-gray-100 dark:border-[#2A2F3A] relative flex items-center bg-white dark:bg-[#161B22]">
            <Search size={14} className="absolute left-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-[#0B0D12] border border-gray-200 dark:border-[#2A2F3A] rounded-md text-[13px] text-black dark:text-white outline-none focus:border-[#1a5b28] transition-colors"
            />
          </div>

          {/* Scrollable list options */}
          <ul className="max-h-60 overflow-y-auto py-1 text-[13px] text-gray-700 dark:text-gray-200">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-center text-gray-400 italic">
                No matches found
              </li>
            ) : (
              filteredOptions.map((option, idx) => {
                const isSelected = option === value;
                return (
                  <li
                    key={idx}
                    onClick={() => handleSelect(option)}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#1a5b28]/10 text-[#1a5b28] dark:text-green-400 font-bold"
                        : "hover:bg-gray-50 dark:hover:bg-[#242B36] text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    <span className="truncate">{option}</span>
                    {isSelected && (
                      <Check
                        size={14}
                        className="text-[#1a5b28] dark:text-green-400 flex-shrink-0 ml-2"
                      />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
