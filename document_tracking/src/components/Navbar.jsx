"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Menu, Globe, User, Bell, Moon, Sun, Monitor, LogOut, X, FileText, Calendar, Inbox } from "lucide-react";
import { useLanguage } from "../app/context/LanguageContext";
import { useTheme } from "../app/context/ThemeContext";
import { useAccounts, useUpdateAccount } from "../hooks/useAccounts";
import { useNotifications, useUpdateNotification } from '../hooks/useNotifications';
import { useDocuments } from '../hooks/useDocuments';

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
const EMPTY_ARRAY = [];

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
  const { data: notificationsDataRaw } = useNotifications();
  const notificationsData = notificationsDataRaw || EMPTY_ARRAY;
  const updateNotifMutation = useUpdateNotification();
  const { data: usersRaw } = useAccounts();
  const users = usersRaw || EMPTY_ARRAY;
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const updateAccountMutation = useUpdateAccount();
  const { data: documentsRaw } = useDocuments();
  const documents = documentsRaw || EMPTY_ARRAY;

  // Delegation States
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [delegateToEmail, setDelegateToEmail] = useState("");
  const [delegateStartDate, setDelegateStartDate] = useState("");
  const [delegateEndDate, setDelegateEndDate] = useState("");

  const handleOpenDelegation = () => {
    setIsProfileOpen(false);
    const currentUserRecord = users.find(u => 
      (u.email || "").toLowerCase().trim() === (currentUser?.email || "").toLowerCase().trim() ||
      (u.username || "").toLowerCase().trim() === (currentUser?.username || "").toLowerCase().trim()
    );
    if (currentUserRecord?.delegation) {
      setDelegateToEmail(currentUserRecord.delegation.delegateToEmail || "");
      setDelegateStartDate(currentUserRecord.delegation.startDate || "");
      setDelegateEndDate(currentUserRecord.delegation.endDate || "");
    }
    setIsDelegationModalOpen(true);
  };

  const handleSaveDelegation = async () => {
    const currentUserRecord = users.find(u => 
      (u.email || "").toLowerCase().trim() === (currentUser?.email || "").toLowerCase().trim() ||
      (u.username || "").toLowerCase().trim() === (currentUser?.username || "").toLowerCase().trim()
    );
    if (!currentUserRecord) return;

    let delegateToName = "";
    if (delegateToEmail) {
        const delegateUser = users.find(u => u.email === delegateToEmail);
        delegateToName = delegateUser ? (delegateUser.fullname_en || delegateUser.fullname_kh || delegateUser.username) : "";
    }

    const updatedUser = {
      ...currentUserRecord,
      delegation: delegateToEmail ? {
        delegateToEmail,
        delegateToName,
        startDate: delegateStartDate,
        endDate: delegateEndDate,
        isActive: true
      } : null
    };

    try {
      await updateAccountMutation.mutateAsync({ id: currentUserRecord.id, data: updatedUser });
      setIsDelegationModalOpen(false);
      // Optional: show a success toast
    } catch (error) {
      console.error("Failed to update delegation", error);
    }
  };

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
      if (users.length > 0) {
        const matched = users.find(
          (u) =>
            (currentUser.email && u.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
            ((u.fullname_en || "").toLowerCase().trim() === currentUser.username?.toLowerCase().trim() ||
             (u.fullname_kh || "").toLowerCase().trim() === currentUser.username?.toLowerCase().trim())
        );
        if (matched && matched.profilePhoto) {
          setProfilePhoto(matched.profilePhoto);
          return;
        }
      }
      if (currentUser.profilePhoto) {
        setProfilePhoto(currentUser.profilePhoto);
      } else {
        setProfilePhoto(null);
      }
    } else {
      setProfilePhoto(null);
    }
  }, [currentUser, users]);

  useEffect(() => {
    if (!currentUser) return;
    try {
      const allNotifs = Array.isArray(notificationsData) ? notificationsData.map(n => {
        let dateStr = "";
        let timeStr = "";
        if (n.created_at || n.date) {
          const d = new Date(n.created_at || n.date);
          if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          }
        }
        return {
          ...n,
          id: n.notification_id || n.id,
          targetDepartment: n.target_department || n.targetDepartment,
          senderName: n.sender_name || n.senderName,
          senderDepartment: n.sender_department || n.senderDepartment,
          requestId: n.document_id || n.requestId,
          read: n.is_read || n.read,
          date: dateStr || n.date,
          time: timeStr || n.time,
        };
      }) : [];
      const userDept = (currentUser.mainRole || currentUser.department || "").toLowerCase().trim();
      let myNotifs = allNotifs.filter(n => {
        if (userDept === "global") return true;
        
        const target = (n.targetDepartment || "").toLowerCase().trim();
        
        const now = new Date();
        now.setHours(0,0,0,0);
        const hasDelegation = users.some(u => {
            const uDept = (u.mainRole || u.department || "").toLowerCase().trim();
            if (uDept !== target || !u.delegation || !u.delegation.isActive) return false;
            if (u.delegation.delegateToEmail !== currentUser?.email) return false;
            const start = new Date(u.delegation.startDate);
            const end = new Date(u.delegation.endDate);
            end.setHours(23,59,59,999);
            return start <= new Date() && end >= now;
        });

        const targetMatch = target === userDept ||
          (userDept === "itc" && target.includes("information technology")) ||
          (userDept === "acc" && target.includes("accounting")) ||
          (userDept === "inventory" && target.includes("inventory")) ||
          hasDelegation;
          
        if (!targetMatch) return false;

        // Individual checking
        const req = documents.find(d => d.id === n.requestId);
        if (req) {
            // For completed, failed, or returned documents, only the original sender should see it
            if (req.status === "Completed" || req.status === "Failed" || req.status === "Assigned to Improve") {
                const isExactSender = (req.senderEmail && currentUser?.email && req.senderEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) || 
                                      (req.senderName && currentUser?.username && req.senderName.toLowerCase().trim() === currentUser.username.toLowerCase().trim());
                if (!isExactSender && (req.senderDepartment || "").toLowerCase().trim() === userDept) {
                    return false; // User is in sender dept but is NOT the sender
                }
            } else {
                // For pending documents, if it is assigned to a specific person, only that person should see it
                const currentStepIndex = req.currentStepIndex || 0;
                const currentStep = req.path ? req.path[currentStepIndex] : null;
                if (currentStep && currentStep.assignedTo && currentStep.assignedTo.email) {
                    if (currentStep.assignedTo.email.toLowerCase().trim() !== currentUser?.email?.toLowerCase().trim()) {
                        return false;
                    }
                }
            }
        }
        return true;
      });

      const sortedNotifs = [...myNotifs];
      setNotifications(sortedNotifs);

      const oldNotifs = previousNotifsRef.current;
      const newUnreadNotifs = myNotifs.filter(n => (!n.read && !n.is_read) && !oldNotifs.some(old => old.id === n.id));

      if (oldNotifs.length > 0 && newUnreadNotifs.length > 0) {
        setToastNotif(newUnreadNotifs[0]);
        setTimeout(() => setToastNotif(null), 5000);
      }
      previousNotifsRef.current = myNotifs;
      const unread = myNotifs.filter(n => (!n.read && !n.is_read)).length;
      setUnreadCount(unread);
    } catch (e) {
      console.error("Error calculating unread notifications", e);
    }
  }, [currentUser, notificationsData, users, documents]);

  const getSenderPhoto = (senderName) => {
    if (!senderName || users.length === 0) return null;
    const sName = getEnglishName(senderName).toLowerCase().trim();
    const match = users.find(
      (u) => {
        const fEn = getEnglishName(u.fullname_en || "").toLowerCase().trim();
        const fKh = getEnglishName(u.fullname_kh || "").toLowerCase().trim();
        const uUser = getEnglishName(u.username || "").toLowerCase().trim();
        return fEn === sName || fKh === sName || uUser === sName || 
               (u.fullname_en || "").toLowerCase().trim() === senderName.toLowerCase().trim() ||
               (u.fullname_kh || "").toLowerCase().trim() === senderName.toLowerCase().trim() ||
               (u.username || "").toLowerCase().trim() === senderName.toLowerCase().trim();
      }
    );
    return match ? match.profilePhoto : null;
  };

  const markAsRead = (id) => {
    updateNotifMutation.mutate({ id, data: { is_read: true, read: true } });
  };

  const markAllAsRead = () => {
    try {
      notifications.forEach(n => {
        if (!n.read && !n.is_read) {
          updateNotifMutation.mutate({ id: n.id, data: { is_read: true, read: true } });
        }
      });
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
                            <p className="text-[10.5px] text-gray-500 dark:text-gray-450 mt-0.5 line-clamp-2 leading-relaxed whitespace-pre-line">
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
                      {getEnglishName(language === 'kh' ? (currentUser.fullname_kh || currentUser.fullname_en || currentUser.username) : (currentUser.fullname_en || currentUser.fullname_kh || currentUser.username))}
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
              {/* Delegation Settings */}
              <button
                onClick={handleOpenDelegation}
                className="flex items-center justify-center gap-2.5 w-full py-2.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-colors mb-2"
              >
                <User size={16} strokeWidth={2.5} />
                <span className="text-[12px] font-bold tracking-wider uppercase">Out of Office / Delegate</span>
              </button>
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
      
      {/* Delegation Modal */}
      {isDelegationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsDelegationModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-[#2A2F3A] pb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <User size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Delegation Settings</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Temporarily transfer your approval rights</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Delegate To (User Email)</label>
                <select
                  value={delegateToEmail}
                  onChange={(e) => setDelegateToEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- No Delegation (Cancel) --</option>
                  {users
                    .filter(u => u.department === currentUser?.department && u.email !== currentUser?.email)
                    .map(u => (
                      <option key={u.id} value={u.email}>
                        {u.fullname_en || u.username} ({u.role})
                      </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={delegateStartDate}
                    onChange={(e) => setDelegateStartDate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={delegateEndDate}
                    onChange={(e) => setDelegateEndDate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8">
              <button
                onClick={() => setIsDelegationModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDelegation}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
