"use client";
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export default function CustomSelect({
  options = [], // Can be array of strings or array of { label, value }
  value = "",
  onChange,
  name,
  disabled = false,
  placeholder = "Select...",
  className = "",
  error = false,
  searchable = false,
  searchPlaceholder = "Search..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 50);
    }
  }, [isOpen, searchable]);

  const handleSelect = (optionValue) => {
    if (onChange) {
      // Simulate event structure for standard select change handlers
      onChange({ target: { name, value: optionValue } });
    }
    setIsOpen(false);
    setSearchTerm("");
  };

  const selectedOption = options.find(opt => {
    if (typeof opt === 'object') return opt.value === value;
    return opt === value;
  });

  const displayValue = selectedOption 
    ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
    : placeholder;

  const filteredOptions = options.filter(opt => {
    if (!searchable || !searchTerm) return true;
    const label = typeof opt === 'object' ? opt.label : opt;
    return String(label).toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left text-[15px] outline-none transition-all duration-200 shadow-sm ${
          disabled
            ? "opacity-60 cursor-not-allowed border-gray-200 dark:border-[#2A2F3A] bg-gray-100 dark:bg-[#161B22] text-gray-400"
            : isOpen
            ? "border-[#1a5b28] ring-4 ring-[#1a5b28]/10 bg-white dark:bg-[#1C212B] text-black dark:text-white cursor-pointer"
            : error 
            ? "border-red-500 bg-red-50/50 dark:bg-red-900/10 text-red-900 dark:text-red-200"
            : "border-gray-300 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36]/50 text-gray-800 dark:text-[#a1a1aa] cursor-pointer hover:border-[#1a5b28]/40 hover:bg-white dark:hover:bg-[#1C212B] hover:shadow-md"
        }`}
      >
        <span className={`truncate ${!value && !selectedOption ? 'text-gray-400 dark:text-[#71717a]' : 'font-medium text-gray-800 dark:text-gray-100'}`}>
          {displayValue}
        </span>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform duration-300 ease-in-out ${
            isOpen ? "rotate-180 text-[#1a5b28] dark:text-[#2da94a]" : "group-hover:text-gray-600"
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <div 
        className={`absolute left-0 mt-2 w-full bg-white dark:bg-[#1C212B] border border-gray-200 dark:border-[#2A2F3A] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-[99] overflow-hidden flex flex-col transform transition-all duration-200 origin-top ${
          isOpen ? "opacity-100 scale-y-100 translate-y-0" : "opacity-0 scale-y-95 -translate-y-2 pointer-events-none"
        }`}
      >
        {searchable && (
          <div className="p-2 border-b border-gray-100 dark:border-[#2A2F3A] relative flex items-center bg-white dark:bg-[#1C212B]">
            <Search size={14} className="absolute left-4 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-[#0B0D12] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-[13px] text-black dark:text-white outline-none focus:border-[#1a5b28] focus:ring-1 focus:ring-[#1a5b28] transition-colors"
            />
          </div>
        )}

        <ul className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
          {filteredOptions.length === 0 ? (
            <li className="px-4 py-3 text-center text-[13px] text-gray-400 italic">
              No options found
            </li>
          ) : (
            filteredOptions.map((option, idx) => {
              const optValue = typeof option === 'object' ? option.value : option;
              const optLabel = typeof option === 'object' ? option.label : option;
              const isSelected = optValue === value;
              
              return (
                <li
                  key={idx}
                  onClick={() => handleSelect(optValue)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-[14px] ${
                    isSelected
                      ? "bg-[#1a5b28]/10 text-[#1a5b28] dark:text-[#4ade80] font-bold"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2A2F3A] font-medium"
                  }`}
                >
                  <span className="truncate">{optLabel}</span>
                  {isSelected && (
                    <Check
                      size={16}
                      className="text-[#1a5b28] dark:text-[#4ade80] flex-shrink-0 ml-2 animate-in zoom-in duration-200"
                    />
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
