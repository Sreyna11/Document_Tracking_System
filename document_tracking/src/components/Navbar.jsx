"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Menu, Globe, User, Bell, Moon, Sun, Monitor, LogOut, X, FileText, Calendar, Inbox } from "lucide-react";
import { useLanguage } from "../app/context/LanguageContext";
import { useTheme } from "../app/context/ThemeContext";

const getEnglishName = (name) => {
  if (!name) return "";
  return name.replace(/[\u1780-\u17FF\u19E0-\u19FF]+/g, '').replace(/\s+/g, ' ').trim();
};

const getLocalizedName = (name, language) => {
  if (!name) return "";
  if (language === 'km') {
    const khmerPart = name.match(/[\u1780-\u17FF\u19E0-\u19FF]+/g);
    if (khmerPart && khmerPart.length > 0) {
      return khmerPart.join(' ').trim();
    }
    return name.replace(/[\u1780-\u17FF\u19E0-\u19FF]+/g, '').replace(/\s+/g, ' ').trim() || name;
  } else {
    const enPart = name.replace(/[\u1780-\u17FF\u19E0-\u19FF]+/g, '').replace(/\s+/g, ' ').trim();
    return enPart || name;
  }
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
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
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
      if (isNotifOpen && !event.target.closest('.notif-dropdown-container')) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen, isNotifOpen]);

  useEffect(() => {
    if (currentUser) {
      try {
        const storedUsers = localStorage.getItem("doc_tracking_users");
        if (storedUsers) {
          const parsedUsers = JSON.parse(storedUsers);
          if (Array.isArray(parsedUsers)) {
            setUsers(parsedUsers);
            const matched = parsedUsers.find(
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
      if (currentUser.profilePhoto) {
        setProfilePhoto(currentUser.profilePhoto);
      } else {
        setProfilePhoto(null);
      }
    } else {
      setProfilePhoto(null);
    }
  }, [currentUser]);

  // Load and listen for notifications
  useEffect(() => {
    if (!currentUser) return;

    const calculateUnread = (storageData) => {
      try {
        let allNotifs = storageData ? JSON.parse(storageData) : [];
        if (allNotifs.length === 0) {
          const userDept = (currentUser.mainRole || currentUser.department || "ITC").trim();
          allNotifs = [
            {
              id: "demo-notif-1",
              requestId: "",
              targetDepartment: userDept,
              senderName: "Sokha Chan",
              senderDepartment: "Academic Affairs",
              subject: "Urgent: Academic Curriculum Review 2026",
              details: "Please review and approve the updated curriculum guidelines for the upcoming academic year.",
              date: new Date().toISOString().split('T')[0],
              time: "09:30 AM",
              read: false,
              priorityLevel: "Urgent"
            },
            {
              id: "demo-notif-2",
              requestId: "",
              targetDepartment: userDept,
              senderName: "Sreymao Keo",
              senderDepartment: "Finance Department",
              subject: "High: Budget Proposal Q3 Approval",
              details: "The quarterly budget request has been prepared and forwarded to your department for verification.",
              date: new Date().toISOString().split('T')[0],
              time: "11:15 AM",
              read: false,
              priorityLevel: "High"
            },
            {
              id: "demo-notif-3",
              requestId: "",
              targetDepartment: userDept,
              senderName: "Borith Lim",
              senderDepartment: "Human Resources",
              subject: "Normal: Annual Staff Training Plan",
              details: "The annual training schedule for administrative staff has been submitted for validation.",
              date: new Date().toISOString().split('T')[0],
              time: "02:45 PM",
              read: true,
              priorityLevel: "Normal"
            }
          ];
          localStorage.setItem("doc_tracking_notifications", JSON.stringify(allNotifs));
          window.dispatchEvent(new Event("notifications_updated"));
          return;
        }

        const userDept = (currentUser.mainRole || currentUser.department || "").toLowerCase().trim();
        let myNotifs = allNotifs.filter(n => {
          if (userDept === "global") return true;
          const target = (n.targetDepartment || "").toLowerCase().trim();
          return target === userDept ||
            (userDept === "itc" && target.includes("information technology")) ||
            (userDept === "acc" && target.includes("accounting")) ||
            (userDept === "inventory" && target.includes("inventory"));
        });

        // Set notifications list (newest first as they are unshifted into storage)
        const sortedNotifs = [...myNotifs];
        setNotifications(sortedNotifs);

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

  const getSenderPhoto = (senderName) => {
    if (!senderName || users.length === 0) return null;
    const sName = getEnglishName(senderName).toLowerCase().trim();
    const match = users.find(
      (u) => {
        const uFirstLast = getEnglishName(`${u.firstName || ''} ${u.lastName || ''}`).toLowerCase().trim();
        const uUser = getEnglishName(u.username || "").toLowerCase().trim();
        return uFirstLast === sName || uUser === sName || 
               (`${u.firstName || ''} ${u.lastName || ''}`).toLowerCase().trim() === senderName.toLowerCase().trim() ||
               (u.username || "").toLowerCase().trim() === senderName.toLowerCase().trim();
      }
    );
    return match ? match.profilePhoto : null;
  };

  const markAsRead = (id) => {
    try {
      const storedNotifs = localStorage.getItem("doc_tracking_notifications");
      let allNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];
      const updated = allNotifs.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem("doc_tracking_notifications", JSON.stringify(updated));
      window.dispatchEvent(new Event("notifications_updated"));
    } catch (e) {
      console.error("Error marking notification as read in Navbar", e);
    }
  };

  const markAllAsRead = () => {
    try {
      const storedNotifs = localStorage.getItem("doc_tracking_notifications");
      let allNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];
      const userDept = (currentUser?.mainRole || currentUser?.department || "").toLowerCase().trim();
      const updated = allNotifs.map(n => {
        const target = (n.targetDepartment || "").toLowerCase().trim();
        const matches = target === userDept ||
          (userDept === "itc" && target.includes("information technology")) ||
          (userDept === "acc" && target.includes("accounting")) ||
          (userDept === "inventory" && target.includes("inventory"));
        if (userDept === "global" || matches) {
          return { ...n, read: true };
        }
        return n;
      });
      localStorage.setItem("doc_tracking_notifications", JSON.stringify(updated));
      window.dispatchEvent(new Event("notifications_updated"));
    } catch (e) {
      console.error("Error marking all notifications as read in Navbar", e);
    }
  };
  return (
    <header className="bg-white dark:bg-[#0B0D12] border-b border-gray-200 dark:border-[#2A2F3A] px-7 py-4.5 flex items-center justify-between sticky top-0 z-10 select-none">
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
          <span className="hidden sm:block text-[14px] font-extrabold text-slate-800 dark:text-gray-200 tracking-wide uppercase ml-1">
            {(currentUser.department || currentUser.mainRole || "").toLowerCase() === "global" ? "System Admin" : (currentUser.department || currentUser.mainRole || "N/A")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-gray-600">

        {/* Notification Bell with Dropdown */}
        {currentUser && (
          <div className="relative notif-dropdown-container">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`p-1.5 rounded-full transition-colors relative cursor-pointer group ${
                isNotifOpen
                  ? "bg-gray-105 dark:bg-[#1c1c1e]"
                  : "hover:bg-gray-100 dark:hover:bg-[#1c1c1e]"
              }`}
            >
              <Bell
                size={20}
                className={`stroke-[2] transition-colors ${
                  isNotifOpen
                    ? "text-green-600 dark:text-green-500"
                    : "text-gray-500 dark:text-[#a1a1aa] group-hover:text-gray-800 dark:group-hover:text-gray-200"
                }`}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 border border-white dark:border-[#0B0D12] text-white text-[9px] font-extrabold flex items-center justify-center rounded-full shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-[340px] sm:w-[380px] bg-white dark:bg-[#161B22] rounded-2xl shadow-xl border border-gray-100 dark:border-[#2A2F3A] p-4 select-none z-50 transform transition-all flex flex-col max-h-[480px]">
                {/* Dropdown Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#2A2F3A] mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-200">{t('notifications')}</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-red-50 dark:bg-red-500/10 text-red-655 dark:text-red-400 rounded-full border border-red-100 dark:border-red-500/20">
                        {unreadCount} {t('unread')}
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllAsRead();
                      }}
                      disabled={unreadCount === 0}
                      className="text-[11px] font-bold text-green-600 dark:text-[#34d399] hover:underline disabled:text-gray-400 dark:disabled:text-gray-650 cursor-pointer disabled:no-underline"
                    >
                      {t('mark_all_as_read')}
                    </button>
                  )}
                </div>

                {/* Dropdown Body */}
                <div className="overflow-y-auto flex-1 pr-1 space-y-2 max-h-[340px]">
                  {notifications.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-gray-50 dark:bg-[#0B0D12] border border-gray-100 dark:border-[#2A2F3A] text-gray-400 dark:text-[#a1a1aa] rounded-full flex items-center justify-center mb-3">
                        <Inbox size={20} className="stroke-[1.5]" />
                      </div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-0.5">{t('no_notifications_yet')}</h4>
                      <p className="text-[11px] text-gray-450 dark:text-gray-400 max-w-[240px] leading-relaxed">
                        {t('no_notifications_desc')}
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const hasPhoto = getSenderPhoto(notif.senderName);
                      const priority = (notif.priorityLevel || "").toLowerCase();
                      return (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (!notif.read) markAsRead(notif.id);
                            setIsNotifOpen(false);
                            if (notif.requestId) {
                              router.push(`/content/receive?reqId=${notif.requestId}`);
                            } else {
                              router.push(`/content/receive`);
                            }
                          }}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-xs group/item ${
                            !notif.read
                              ? "bg-green-50/20 dark:bg-green-500/5 border-l-4 border-l-green-500 border-gray-100 dark:border-[#2A2F3A] dark:border-l-green-500"
                              : "bg-white dark:bg-[#161B22] border-gray-100 dark:border-[#2A2F3A] hover:border-green-600/30 dark:hover:border-green-500/30"
                          }`}
                        >
                          {/* Avatar */}
                          <div className="flex-shrink-0 mt-0.5">
                            {hasPhoto ? (
                              <img
                                src={hasPhoto}
                                alt={notif.senderName}
                                className="w-9 h-9 rounded-full object-cover object-top border border-gray-200 dark:border-[#2A2F3A] shadow-2xs"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full border border-gray-200 dark:border-[#2A2F3A] shadow-2xs flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-[#0B0D12] overflow-hidden text-gray-500 dark:text-[#a1a1aa] font-bold text-sm uppercase">
                                {notif.senderName ? getLocalizedName(notif.senderName, language).charAt(0) : "U"}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200 truncate max-w-[120px] sm:max-w-[160px]">
                                {getLocalizedName(notif.senderName, language)}
                              </span>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {notif.priorityLevel && (
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase leading-none ${
                                    priority === 'urgent'
                                      ? 'bg-red-50 dark:bg-red-500/10 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-500/20'
                                      : priority === 'high'
                                      ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-650 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20'
                                      : 'bg-blue-50 dark:bg-blue-500/10 text-blue-650 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20'
                                  }`}>
                                    {t(priority) || notif.priorityLevel}
                                  </span>
                                )}
                                {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
                              </div>
                            </div>
                            <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-semibold truncate">
                              From: {notif.senderDepartment}
                            </span>
                            <p className="text-[11.5px] text-gray-700 dark:text-gray-300 mt-1 font-bold line-clamp-1 leading-normal group-hover/item:text-green-600 dark:group-hover/item:text-[#34d399] transition-colors">
                              {notif.subject}
                            </p>
                            <p className="text-[10.5px] text-gray-500 dark:text-gray-450 mt-0.5 line-clamp-2 leading-relaxed">
                              {notif.details}
                            </p>
                            <span className="block text-[9.5px] text-gray-400 dark:text-gray-500 font-medium mt-1.5">
                              {notif.date} • {notif.time}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Dropdown Footer */}
                {notifications.length > 0 && (
                  <div className="pt-3 border-t border-gray-100 dark:border-[#2A2F3A] mt-2 flex justify-center">
                    <button
                      onClick={() => {
                        setIsNotifOpen(false);
                        router.push('/content/notification');
                      }}
                      className="text-xs font-bold text-gray-505 dark:text-gray-400 hover:text-green-600 dark:hover:text-[#34d399] transition-colors cursor-pointer"
                    >
                      {t('view_document')} / {t('notifications')} &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {currentUser && (
          <div className="hidden sm:flex flex-col text-right select-none">
            <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200 leading-normal">{getEnglishName(currentUser.username)}</span>
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
                className="w-8 h-8 rounded-full object-cover object-top border border-gray-200 dark:border-[#2c2c2e] shadow-sm"
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
            <div className="absolute right-0 mt-3 w-[340px] bg-white dark:bg-[#161B22] rounded-2xl shadow-xl border border-gray-100 dark:border-[#2A2F3A] p-5 select-none z-50 transform transition-all">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-[50px] h-[50px] rounded-full overflow-hidden border-[1.5px] border-gray-300 dark:border-[#2A2F3A] shadow-sm flex-shrink-0">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-[#0B0D12] flex items-center justify-center text-gray-400 dark:text-[#a1a1aa]">
                        <User size={26} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-0.5 truncate">
                      {currentUser.department || currentUser.mainRole || "N/A"}
                    </div>
                    <div className="text-[15px] font-bold text-gray-900 dark:text-gray-200 tracking-wide uppercase truncate">
                      {getEnglishName(currentUser.firstName ? `${currentUser.lastName} ${currentUser.firstName}` : currentUser.username)}
                    </div>
                    <div className="text-[10px] font-bold text-[#1a5b28] dark:text-[#34d399] uppercase mt-0.5 truncate">
                      {currentUser.role || "N/A"}
                    </div>
                  </div>
                </div>
                <div className="bg-[#9ae59e] dark:bg-[#0c3f0d] text-[#1a5b28] dark:text-[#34d399] text-[11px] font-medium px-2 py-0.5 rounded-sm tracking-wide">
                  Active
                </div>
              </div>
              <div className="w-full h-px bg-gray-100 dark:bg-[#2A2F3A] mb-4" />
              {/* Theme Switcher */}
              <div className="bg-gray-50 dark:bg-[#0B0D12] p-1.5 rounded-2xl flex gap-1 mb-4 border border-gray-100/80 dark:border-[#2A2F3A] shadow-inner">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all duration-300 ${theme === 'light' ? 'bg-white dark:bg-[#161B22] text-[#1a5b28] dark:text-[#34d399] shadow-sm ring-1 ring-gray-200 dark:ring-[#2A2F3A]' : 'text-gray-500 dark:text-[#a1a1aa] hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-[#242B36]'
                    }`}
                >
                  <Sun size={18} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold tracking-wide">Light</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all duration-300 ${theme === 'dark' ? 'bg-white dark:bg-[#161B22] text-[#1a5b28] dark:text-[#34d399] shadow-sm ring-1 ring-gray-200 dark:ring-[#2A2F3A]' : 'text-gray-500 dark:text-[#a1a1aa] hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-[#242B36]'
                    }`}
                >
                  <Moon size={18} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold tracking-wide">Dark</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all duration-300 ${theme === 'system' ? 'bg-white dark:bg-[#161B22] text-[#1a5b28] dark:text-[#34d399] shadow-sm ring-1 ring-gray-200 dark:ring-[#2A2F3A]' : 'text-gray-500 dark:text-[#a1a1aa] hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-[#242B36]'
                    }`}
                >
                  <Monitor size={18} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold tracking-wide">System</span>
                </button>
              </div>
              <div className="w-full h-px bg-gray-100 dark:bg-[#2A2F3A] mb-4" />
              {/* Sign out */}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2.5 w-full py-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition-colors mt-1"
              >
                <LogOut size={16} strokeWidth={2.5} className="transform rotate-180" />
                <span className="text-[12px] font-bold tracking-wider uppercase">Sign Out</span>
              </button>
            </div>
          )}
        </div>
        {/* Vertical divider */}
        <div className="w-[1.5px] h-4 bg-gray-200 dark:bg-[#2A2F3A]" />
        {/* Premium Language Switcher (Square-ish Design) */}
        <div
          onClick={toggleLanguage}
          className="relative flex items-center bg-gray-100 dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] p-[3px] rounded-lg cursor-pointer w-[84px] h-[34px] shadow-inner select-none"
        >
          {/* Animated Slider Background */}
          <div
            className={`absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] bg-white dark:bg-[#0B0D12] rounded-md shadow transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${language === 'km' ? 'translate-x-[39px]' : 'translate-x-0'
              }`}
          />
          {/* EN Text */}
          <div className={`relative z-10 flex-1 flex items-center justify-center text-[11px] font-extrabold tracking-widest transition-colors duration-300 ${language === 'en' ? 'text-[#1a5b28]' : 'text-gray-400 hover:text-gray-600'
            }`}>
            EN
          </div>
          {/* KM Text */}
          <div className={`relative z-10 flex-1 flex items-center justify-center text-[11px] font-extrabold tracking-widest transition-colors duration-300 ${language === 'km' ? 'text-[#1a5b28]' : 'text-gray-400 hover:text-gray-600'
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
