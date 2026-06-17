"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Menu, Globe, User, Bell, Moon, Sun, Monitor, LogOut, X } from "lucide-react";
import { useLanguage } from "../app/context/LanguageContext";
import { useTheme } from "../app/context/ThemeContext";
const getEnglishName = (name) => {
  if (!name) return "";
  return name.replace(/[\u1780-\u17FF\u19E0-\u19FF]+/g, '').replace(/\s+/g, ' ').trim();
};
export default function Navbar({
  isSidebarOpen,
  setIsSidebarOpen,
  currentUser
}) {
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotif, setToastNotif] = useState(null);
  const previousNotifsRef = useRef([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuthenticated");
    sessionStorage.removeItem("currentUser");
    router.push("/");
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && !event.target.closest('.profile-dropdown-container')) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);
  useEffect(() => {
    if (currentUser) {
      // 1. Try to find the user in doc_tracking_users by matching email or username
      try {
        const storedUsers = localStorage.getItem("doc_tracking_users");
        if (storedUsers) {
          const users = JSON.parse(storedUsers);
          if (Array.isArray(users)) {
            const matched = users.find(
              (u) =>
                (currentUser.email && u.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
                (`${u.firstName} ${u.lastName}`.toLowerCase().trim() === currentUser.username?.toLowerCase().trim())
            );
            if (matched && matched.profilePhoto) {
              setProfilePhoto(matched.profilePhoto);
              return;
            }
          }
        }
      } catch (e) {
        console.error("Error reading users in Navbar", e);
      }
      // 2. Fallback to inlined profilePhoto
      if (currentUser.profilePhoto) {
        setProfilePhoto(currentUser.profilePhoto);
      } else {
        setProfilePhoto(null);
      }
    } else {
      setProfilePhoto(null);
    }
  }, [currentUser]);
  // Load and listen for unread notifications count
  useEffect(() => {
    if (!currentUser) return;
    
    const calculateUnread = (storageData) => {
      try {
        let allNotifs = storageData ? JSON.parse(storageData) : [];
        const userDept = (currentUser.mainRole || currentUser.department || "").toLowerCase().trim();
        let myNotifs = allNotifs.filter(n => {
          if (userDept === "global") return true;
          const target = (n.targetDepartment || "").toLowerCase().trim();
          return target === userDept ||
            (userDept === "itc" && target.includes("information technology")) ||
            (userDept === "acc" && target.includes("accounting")) ||
            (userDept === "inventory" && target.includes("inventory"));
        });
        const oldNotifs = previousNotifsRef.current;
        const newUnreadNotifs = myNotifs.filter(n => !n.read && !oldNotifs.some(old => old.id === n.id));
        
        if (oldNotifs.length > 0 && newUnreadNotifs.length > 0) {
          setToastNotif(newUnreadNotifs[0]);
          setTimeout(() => setToastNotif(null), 5000);
        }
        previousNotifsRef.current = myNotifs;
        const unread = myNotifs.filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch (e) {
        console.error("Error calculating unread notifications", e);
      }
    };
    calculateUnread(localStorage.getItem("doc_tracking_notifications"));
    const handleStorageChange = (e) => {
      if (e.key === "doc_tracking_notifications") {
        calculateUnread(e.newValue);
      }
    };
    const handleLocalUpdate = () => {
      calculateUnread(localStorage.getItem("doc_tracking_notifications"));
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("notifications_updated", handleLocalUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("notifications_updated", handleLocalUpdate);
    };
  }, [currentUser]);
  return (
    <header className="bg-white dark:bg-[#161616] border-b border-gray-200 dark:border-[#1c1c1e] px-7 py-4.5 flex items-center justify-between sticky top-0 z-10 select-none">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen && setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-[#1c1c1e] active:bg-gray-200 dark:active:bg-gray-700 rounded-xl transition-colors text-gray-500 dark:text-[#a1a1aa] hover:text-gray-800 dark:hover:text-gray-200 outline-none cursor-pointer"
          aria-label="Toggle Sidebar"
        >
          <Menu size={22} className="stroke-[1.5]" />
        </button>
        {currentUser && (
          <div className="h-5 w-[1.5px] bg-gray-200 dark:bg-[#2c2c2e] hidden sm:block"></div>
        )}
        {currentUser && (
          <span className="hidden sm:block text-[14px] font-extrabold text-slate-800 tracking-wide uppercase ml-1">
            {currentUser.department || currentUser.mainRole || "N/A"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-gray-600">
        
        {/* Notification Bell */}
        {currentUser && (
          <button 
            onClick={() => {
              const storedNotifs = localStorage.getItem("doc_tracking_notifications");
              if (storedNotifs) {
                const notifs = JSON.parse(storedNotifs);
                // Only mark as read if there are unread notifications
                const hasUnread = notifs.some(n => !n.read);
                if (hasUnread) {
                  const updated = notifs.map(n => ({...n, read: true}));
                  localStorage.setItem("doc_tracking_notifications", JSON.stringify(updated));
                  window.dispatchEvent(new Event("notifications_updated"));
                }
              }
              router.push('/content/notification');
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#1c1c1e] rounded-full transition-colors relative cursor-pointer group"
          >
            <Bell size={20} className="stroke-[2] text-gray-500 dark:text-[#a1a1aa] group-hover:text-gray-800 dark:group-hover:text-gray-200" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 border border-white text-white text-[9px] font-extrabold flex items-center justify-center rounded-full shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}
        {currentUser && (
          <div className="hidden sm:flex flex-col text-right select-none">
            <span className="text-[15px] text-gray-500 font-extrabold mb-0.5 self-end">
              {currentUser.department || currentUser.mainRole || "N/A"}
            </span>
            <span className="text-[12px] font-bold text-gray-800 leading-normal">{getEnglishName(currentUser.username)}</span>
            <span className="text-[9px] text-[#1a5b28] font-extrabold tracking-wider uppercase bg-green-100 px-2 py-0.5 rounded border border-green-200 mt-0.5 self-end">
              {currentUser.role || "N/A"}
            </span>
          </div>
        )}
        {/* User profile dropdown button */}
        <div className="relative profile-dropdown-container">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center justify-center p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#1c1c1e] text-gray-500 dark:text-[#a1a1aa] hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer relative group"
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-[#2c2c2e] shadow-sm"
              />
            ) : (
              <div className="p-1">
                <User size={20} className="stroke-[1.8]" />
              </div>
            )}
            {currentUser && (
              <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
            )}
          </button>
          {/* Profile Dropdown */}
          {isProfileOpen && currentUser && (
            <div className="absolute right-0 mt-3 w-[340px] bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-xl border border-gray-100 dark:border-[#2c2c2e] p-5 select-none z-50 transform transition-all">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-[50px] h-[50px] rounded-full overflow-hidden border-[1.5px] border-gray-300 dark:border-[#3f3f46] shadow-sm flex-shrink-0">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-[#2c2c2e] flex items-center justify-center text-gray-400 dark:text-[#a1a1aa]">
                        <User size={26} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase mb-0.5 truncate">
                      {currentUser.department || currentUser.mainRole || "N/A"}
                    </div>
                    <div className="text-[15px] font-bold text-gray-900 tracking-wide uppercase truncate">
                      {getEnglishName(currentUser.firstName ? `${currentUser.lastName} ${currentUser.firstName}` : currentUser.username)}
                    </div>
                    <div className="text-[10px] font-bold text-[#1a5b28] uppercase mt-0.5 truncate">
                      {currentUser.role || "N/A"}
                    </div>
                  </div>
                </div>
                <div className="bg-[#9ae59e] text-[#1a5b28] text-[11px] font-medium px-2 py-0.5 rounded-sm tracking-wide">
                  Active
                </div>
              </div>
              <div className="w-full h-px bg-gray-100 mb-4" />
              {/* Theme Switcher */}
              <div className="bg-gray-50 dark:bg-[#1f1f1f] p-1.5 rounded-2xl flex gap-1 mb-4 border border-gray-100/80 dark:border-[#2c2c2e] shadow-inner">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all duration-300 ${
                    theme === 'light' ? 'bg-white dark:bg-black text-[#1a5b28] dark:text-[#38a152] shadow-sm ring-1 ring-gray-200 dark:ring-gray-700' : 'text-gray-500 dark:text-[#a1a1aa] hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-[#2a2a2a]'
                  }`}
                >
                  <Sun size={18} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold tracking-wide">Light</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all duration-300 ${
                    theme === 'dark' ? 'bg-white dark:bg-black text-[#1a5b28] dark:text-[#38a152] shadow-sm ring-1 ring-gray-200 dark:ring-gray-700' : 'text-gray-500 dark:text-[#a1a1aa] hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-[#2a2a2a]'
                  }`}
                >
                  <Moon size={18} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold tracking-wide">Dark</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all duration-300 ${
                    theme === 'system' ? 'bg-white dark:bg-black text-[#1a5b28] dark:text-[#38a152] shadow-sm ring-1 ring-gray-200 dark:ring-gray-700' : 'text-gray-500 dark:text-[#a1a1aa] hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-[#2a2a2a]'
                  }`}
                >
                  <Monitor size={18} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold tracking-wide">System</span>
                </button>
              </div>
              <div className="w-full h-px bg-gray-100 mb-4" />
              {/* Sign out */}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2.5 w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors mt-1"
              >
                <LogOut size={16} strokeWidth={2.5} className="transform rotate-180" />
                <span className="text-[12px] font-bold tracking-wider uppercase">Sign Out</span>
              </button>
            </div>
          )}
        </div>
        {/* Vertical divider */}
        <div className="w-[1.5px] h-4 bg-gray-200" />
        {/* Premium Language Switcher (Square-ish Design) */}
        <div
          onClick={toggleLanguage}
          className="relative flex items-center bg-gray-100 border border-gray-200 p-[3px] rounded-lg cursor-pointer w-[84px] h-[34px] shadow-inner select-none"
        >
          {/* Animated Slider Background */}
          <div
            className={`absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] bg-white rounded-md shadow transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              language === 'km' ? 'translate-x-[39px]' : 'translate-x-0'
            }`}
          />
          {/* EN Text */}
          <div className={`relative z-10 flex-1 flex items-center justify-center text-[11px] font-extrabold tracking-widest transition-colors duration-300 ${
            language === 'en' ? 'text-[#1a5b28]' : 'text-gray-400 hover:text-gray-600'
          }`}>
            EN
          </div>
          {/* KM Text */}
          <div className={`relative z-10 flex-1 flex items-center justify-center text-[11px] font-extrabold tracking-widest transition-colors duration-300 ${
            language === 'km' ? 'text-[#1a5b28]' : 'text-gray-400 hover:text-gray-600'
          }`}>
            KM
          </div>
        </div>
      </div>
      {/* Global Toast Notification */}
      {toastNotif && (
        <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-[#1c1c1e] border-l-4 border-l-green-500 border border-gray-200 dark:border-[#2c2c2e] rounded-xl shadow-xl p-4 max-w-sm animate-fade-in flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            <Bell className="text-green-500" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[14px] font-bold text-gray-800 dark:text-white truncate">
              {toastNotif.subject}
            </h4>
            <p className="text-[12px] text-gray-500 dark:text-[#a1a1aa] mt-1 line-clamp-2">
              From: {toastNotif.senderName} ({toastNotif.senderDepartment})
            </p>
          </div>
          <button 
            onClick={() => setToastNotif(null)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
