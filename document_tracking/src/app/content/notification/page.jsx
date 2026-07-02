"use client";
import { useState, useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import { Bell, Inbox, FileText, Calendar, CheckCircle2, X, AlertCircle, ImageIcon, MoreVertical, Paperclip } from "lucide-react";
import AlertModal from "../../../components/AlertModal";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import { useAccounts } from '../../../hooks/useAccounts';
import { useDocuments } from '../../../hooks/useDocuments';
import { useNotifications, useUpdateNotification } from '../../../hooks/useNotifications';

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

export default function NotificationPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
  const showAlert = (message) => setAlertModal({ isOpen: true, message });

  const { data: users = [] } = useAccounts();
  const { data: allRequests = [] } = useDocuments();
  const { data: notificationsData = [] } = useNotifications();
  const updateMutation = useUpdateNotification();

  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/");
    } else {
      setCurrentUser(JSON.parse(userStr));
      setIsMounted(true);
    }
  }, []);
  useEffect(() => {
    if (!currentUser || !notificationsData) return;
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
        const userDept = (currentUser.department || currentUser.mainRole || "").toLowerCase().trim();
        let myNotifs = allNotifs.filter(n => {
          if (userDept === "global") return true;
          
          const target = (n.target_department || n.targetDepartment || "").toLowerCase().trim();
          
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

          return target === userDept ||
            (userDept === "itc" && target.includes("information technology")) ||
            (userDept === "acc" && target.includes("accounting")) ||
            (userDept === "inventory" && target.includes("inventory")) ||
            hasDelegation;
        });
        setNotifications(myNotifs);
    } catch (e) {
        console.error(e);
    }
  }, [currentUser, notificationsData]);
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
    updateMutation.mutate({ id, data: { is_read: true } });
  };
  const markAllAsRead = () => {
    notifications.forEach(n => {
        if (!n.is_read && !n.read) {
            updateMutation.mutate({ id: n.notification_id || n.id, data: { is_read: true } });
        }
    });
  };
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#161616] flex items-center justify-center select-none">
        <div className="text-gray-400 font-semibold animate-pulse">{t('checking_credentials')}</div>
      </div>
    );
  }
  const unreadCount = notifications.filter(n => !n.read && !n.is_read).length;
  // File Helpers
  const getFileExtension = (filename) => {
    if (!filename) return "";
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  };
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
  const handleDownload = () => {
    if (!selectedRequest) return;
    const file = selectedRequest.files && selectedRequest.files.length > 0 ? selectedRequest.files[0] : null;
    if (file && file.dataUrl) {
      const a = document.createElement("a");
      a.href = file.dataUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      showAlert("No actual file attached to this mock request.");
    }
  };
  const activeFileName = selectedRequest?.files && selectedRequest.files.length > 0
    ? selectedRequest.files[0].name
    : "student_registration_form_v1.pdf";
  const activeFileSize = selectedRequest?.files && selectedRequest.files.length > 0
    ? formatFileSize(selectedRequest.files[0].size)
    : "177.72 KB";
  const ext = getFileExtension(activeFileName);
  const isImage = ["png", "jpg", "jpeg", "gif"].includes(ext);
  const activeFileDataUrl = selectedRequest?.files && selectedRequest.files.length > 0
    ? selectedRequest.files[0].dataUrl
    : null;
  return (
    <div className="flex min-h-screen bg-[#fafafb] dark:bg-[#161616] text-black">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Navbar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          currentUser={currentUser}
        />
        <div className="p-8 md:p-10 flex-1 w-full mx-auto">
          <div className="bg-white dark:bg-[#161B22] border border-gray-100 dark:border-[#2A2F3A] rounded-xl min-h-[calc(100vh-140px)] p-6 md:p-8 shadow-sm flex flex-col select-none animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-100 dark:border-[#2A2F3A] mb-6 gap-4">
              <div>
                <h1 className="text-[28px] font-bold text-[#0c3f0d] dark:text-white tracking-tight flex items-center gap-3">
                  <Bell className="text-green-600 dark:text-[#4ade80]" size={28} />
                  {t('notifications')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-[13px] font-medium mt-1">
                  {t('notifications_desc')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#2A2F3A] dark:hover:bg-[#323842] disabled:bg-gray-50 dark:disabled:bg-[#161B22] text-gray-700 dark:text-gray-300 disabled:text-gray-400 dark:disabled:text-gray-600 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-98"
                  >
                    {t('mark_all_as_read')}
                  </button>
                )}
              </div>
            </div>
            {/* Quick Stats */}
            <div className="flex gap-4 mb-6">
              <div className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-500/20 text-xs font-bold shadow-2xs">
                {unreadCount} {t('unread')}
              </div>
            </div>
            {/* List */}
            {notifications.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center flex-1">
                <div className="w-16 h-16 bg-gray-50 dark:bg-[#0B0D12] border border-gray-100 dark:border-[#2A2F3A] text-gray-400 dark:text-[#a1a1aa] rounded-full flex items-center justify-center mb-4">
                  <Inbox size={26} className="stroke-[1.5]" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">{t('no_notifications_yet')}</h3>
                <p className="text-gray-500 dark:text-gray-450 text-sm font-medium text-center max-w-sm">
                  {t('no_notifications_desc')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.read && !notif.is_read) markAsRead(notif.notification_id || notif.id);
                      if (notif.requestId) router.push(`/content/receive?id=${notif.requestId}`);
                    }}
                    className={`bg-white dark:bg-[#0B0D12] border rounded-2xl p-5 flex items-start md:items-center justify-between shadow-xs transition-all duration-300 gap-4 cursor-pointer hover:shadow-md ${!(notif.read || notif.is_read) ? "border-l-4 border-l-green-500 border-gray-200 dark:border-gray-700 dark:border-l-green-500 bg-green-50/30 dark:bg-green-500/5" : "border-gray-100 dark:border-[#2A2F3A] hover:border-green-600/30 dark:hover:border-green-500/30"
                      }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-5 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {getSenderPhoto(notif.senderName) ? (
                          <img
                            src={getSenderPhoto(notif.senderName)}
                            alt={notif.senderName}
                            className="w-14 h-14 rounded-full object-cover object-top border border-gray-200 dark:border-[#2A2F3A] shadow-2xs"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full border border-gray-200 dark:border-[#2A2F3A] shadow-2xs flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-[#161B22] overflow-hidden text-gray-500 dark:text-gray-400 font-bold text-xl uppercase">
                            {notif.senderName ? getLocalizedName(notif.senderName, language).charAt(0) : "U"}
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[17px] font-bold text-gray-800 dark:text-gray-200 truncate">{getLocalizedName(notif.senderName, language)}</h3>
                          {!(notif.read || notif.is_read) && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                          {(notif.priorityLevel || "Normal") && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(notif.priorityLevel || "").toLowerCase() === 'urgent' ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                                (notif.priorityLevel || "").toLowerCase() === 'high' ? 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' :
                                  'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                              }`}>
                              {t((notif.priorityLevel || "Normal").toLowerCase()) || notif.priorityLevel || "Normal"}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-400 dark:text-gray-500 font-semibold mt-1">{t('from') || 'From'}: {notif.senderDepartment}</p>
                        <p className="text-[13px] text-gray-700 dark:text-gray-300 mt-2 flex items-start gap-1.5 font-bold">
                          <FileText size={14} className="text-green-600 dark:text-[#34d399] flex-shrink-0 mt-0.5" />
                          <span className="leading-tight">{notif.subject}</span>
                        </p>
                        <p className="text-[12px] text-gray-500 dark:text-[#a1a1aa] mt-1 pl-5 whitespace-pre-line">
                          {notif.details}
                        </p>
                      </div>
                    </div>
                    {/* Timestamp */}
                    <div className="flex flex-col items-end justify-between self-stretch py-0.5 flex-shrink-0 gap-3">
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                          <Calendar size={12} className="text-green-650 dark:text-[#4ade80]" />
                          {notif.date} • {notif.time}
                        </div>
                        {!(notif.read || notif.is_read) && (
                          <div className="flex-shrink-0 pt-0.5">
                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                              {t('new')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Custom Alert Modal */}
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ isOpen: false, message: "" })}
          message={alertModal.message}
        />
      </main>
    </div>
  );
}
