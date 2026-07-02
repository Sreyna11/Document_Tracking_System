"use client";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Inbox,
  X,
  ShieldCheck,
  FolderCog,
  MapPin,
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  FileText,
  History,
  Folder as FolderIcon,
  Settings as SettingsIcon
} from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import { usePathname } from "next/navigation";
import { useLanguage } from "../app/context/LanguageContext";
import { hasPermission } from "../utils/permissions";
import { useDocuments } from '../hooks/useDocuments';
import { useAccounts } from '../hooks/useAccounts';
import { useDepartments } from '../hooks/useDepartments';

export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [openMenus, setOpenMenus] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar_open_menus");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error parsing sidebar_open_menus in init", e);
        }
      }
    }
    return {
      documentFlow: true,
      settings: true,
      rolePermission: true
    };
  });
  const [receiveCount, setReceiveCount] = useState(0);
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const { data: requestsData = [] } = useDocuments();
  const requests = Array.isArray(requestsData) ? requestsData : [];
  const { data: users = [] } = useAccounts();
  const { data: departmentsData = [] } = useDepartments();
  const departments = Array.isArray(departmentsData) ? departmentsData : [];

  const toggleMenu = (menu) => {
    setOpenMenus((prev) => {
      const updated = { ...prev, [menu]: !prev[menu] };
      localStorage.setItem("sidebar_open_menus", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    try {
      const userDept = (currentUser.mainRole || currentUser.department || "").toLowerCase().trim();
      const isGlobalSuperAdmin = currentUser?.email === "itcsuperadmin@rupp.edu.kh";

      let list = requests.filter((req) => {
        const status = req.status?.toLowerCase().trim();
        
        // Hide completed/approved documents from Receive badge (they go to History Request)
        if (status === "completed" || status === "approved") {
            return false;
        }

        const isAssignedToMeForImprovement = status === "assigned to improve" && (req.improveAssignedTo || "").toLowerCase().trim() === userDept;
        if (isAssignedToMeForImprovement) return true;

        if ((req.senderDepartment || "").toLowerCase().trim() === userDept) return false;
        if (isGlobalSuperAdmin) return true;
        if (!req.path) return false;

        const myIndex = req.path.findIndex(p => {
          const role = typeof p === 'string' ? p : p.department || p.mainRole;
          if (!role) return false;
          const roleNormalized = role.toLowerCase().trim();
          
          let isTargetUser = true;
          let requiredUserSign = null;

          if (p.userSign && p.userSign.trim() !== "") {
              requiredUserSign = p.userSign;
          } else {
              const targetDeptObj = departments.find(d => (d.name || d.code || "").toLowerCase().trim() === roleNormalized);
              if (targetDeptObj && targetDeptObj.userSignature && targetDeptObj.userSignature.trim() !== "") {
                  requiredUserSign = targetDeptObj.userSignature;
              }
          }

          if (requiredUserSign) {
              const signName = requiredUserSign.replace(/[\u1780-\u17FF\u19E0-\u19FF\u200B]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
              const myNameEn = (currentUser?.fullname_en || "").toLowerCase().trim();
              const myNameKh = (currentUser?.fullname_kh || "").toLowerCase().trim();
              const myUsername = (currentUser?.username || "").toLowerCase().trim();
              
              if (signName !== myNameEn && signName !== myNameKh && signName !== myUsername) {
                  isTargetUser = false;
              }
          }
          
          if (roleNormalized === userDept && isTargetUser) return true;

          // Check if current user is a delegate for this role
          const now = new Date();
          now.setHours(0,0,0,0);
          const hasDelegation = users.some(u => {
              const uDept = (u.mainRole || u.department || "").toLowerCase().trim();
              if (uDept !== roleNormalized || !u.delegation || !u.delegation.isActive) return false;
              if (u.delegation.delegateToEmail !== currentUser.email) return false;
              const start = new Date(u.delegation.startDate);
              const end = new Date(u.delegation.endDate);
              end.setHours(23,59,59,999);
              return start <= new Date() && end >= now;
          });
          return hasDelegation;
        });
        if (myIndex === -1) return false;
        const currentIndex = req.currentStepIndex !== undefined ? req.currentStepIndex : 0;
        return currentIndex === myIndex;
      });

      const userId = currentUser?.email || currentUser?.username || userDept;
      const unreadList = list.filter(req => !(req.readBy || []).includes(userId));

      setReceiveCount(unreadList.length);
    } catch (e) {
      console.error("Error calculating unread receive", e);
    }
  }, [currentUser, requests]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "doc_tracking_permissions") {
        setPermissionsVersion(v => v + 1);
      }
    };
    
    const handlePermissionsUpdate = () => {
      setPermissionsVersion(v => v + 1);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("permissions_updated", handlePermissionsUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("permissions_updated", handlePermissionsUpdate);
    };
  }, []);

  const isGlobalSuperAdmin = currentUser?.email === "admin@rupp.edu.kh";
  const adminCheckStr = (currentUser?.type || currentUser?.role || "").toLowerCase();
  const isDepartmentAdmin = adminCheckStr.includes("super admin") || adminCheckStr === "admin";
  const isSuperAdmin = currentUser && (isGlobalSuperAdmin || isDepartmentAdmin);

  const queryNormalized = searchQuery.toLowerCase().trim();

  // Group Match helpers
  const matchesDocFlowGroup = queryNormalized ? ("document flow".includes(queryNormalized) || (t("document_flow") || "document flow").toLowerCase().includes(queryNormalized)) : false;
  const matchesSettingsGroup = queryNormalized ? ("settings".includes(queryNormalized) || (t("settings") || "settings").toLowerCase().includes(queryNormalized)) : false;
  const matchesRolePermissionGroup = queryNormalized ? ("role & permission".includes(queryNormalized) || "role and permission".includes(queryNormalized) || (t("role_permission") || "role & permission").toLowerCase().includes(queryNormalized)) : false;

  // Filtered lists
  const showDashboard = !queryNormalized || "dashboard".includes(queryNormalized) || (t("dashboard") || "").toLowerCase().includes(queryNormalized);

  const docFlowItems = [
    { name: "Request", path: "/content/request", icon: FileText, tKey: "request" },
    { name: "Receive", path: "/content/receive", icon: Inbox, tKey: "receive" },
    { name: "History Request", path: "/content/history-request", icon: History, tKey: "history_requests" },
    { name: "Tracking Document", path: "/content/tracking-document", icon: MapPin, tKey: "tracking-document" },
    { name: "Document Type", path: "/content/document-type", icon: FolderCog, tKey: "type_document" }
  ].filter(item => hasPermission(currentUser, item.name, "View"));

  const matchedDocFlowItems = docFlowItems.filter(item => {
    if (!queryNormalized) return true;
    if (matchesDocFlowGroup) return true;
    return item.name.toLowerCase().includes(queryNormalized) || (t(item.tKey) || "").toLowerCase().includes(queryNormalized);
  });

  const showAccount = hasPermission(currentUser, "Account", "View") &&
    (!queryNormalized || matchesSettingsGroup || "account".includes(queryNormalized) || (t("account") || "").toLowerCase().includes(queryNormalized));

  const roleItems = [
    { name: "Job Department", path: "/content/job-department", tKey: "job_department" },
    { name: "Set Role Permission", path: "/content/set-role-permission", tKey: "set_role_permission" }
  ].filter(item => hasPermission(currentUser, item.name, "View"));

  const matchedRoleItems = roleItems.filter(item => {
    if (!queryNormalized) return true;
    if (matchesSettingsGroup || matchesRolePermissionGroup) return true;
    return item.name.toLowerCase().includes(queryNormalized) || (t(item.tKey) || "").toLowerCase().includes(queryNormalized);
  });

  const hasAnyVisibleItem = showDashboard || matchedDocFlowItems.length > 0 || showAccount || matchedRoleItems.length > 0;

  // Helper renderers for flat / nested structures
  const renderDocumentFlowItems = () => {
    return matchedDocFlowItems.map((item) => {
      const Icon = item.icon;
      const isActive = pathname === item.path;
      return (
        <button
          key={item.name}
          onClick={() => router.push(item.path)}
          className={`w-full flex items-center rounded-lg font-medium text-[15px] transition-all duration-200 cursor-pointer relative group ${isSidebarOpen ? "justify-start gap-3.5 px-3 py-2.5" : "justify-center px-2 py-2.5"
            } ${isActive
              ? "bg-[#0c3f0d] text-white font-bold"
              : "text-gray-600 dark:text-[#a1a1aa] hover:bg-gray-100/50 dark:hover:bg-[#242B36] hover:text-gray-900 dark:hover:text-white"
            }`}
        >
          <Icon size={18} className={`${isActive ? "text-white" : "text-gray-400"} flex-shrink-0`} />
          {isSidebarOpen ? (
            <span>
              {t(item.tKey) || item.name}
            </span>
          ) : (
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 dark:bg-[#161B22] text-white dark:text-gray-200 text-xs font-bold rounded-md shadow-lg border border-gray-800 dark:border-[#2A2F3A] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-[9999] flex items-center">
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-gray-900 dark:border-r-[#161B22]" />
              {t(item.tKey) || item.name}
            </div>
          )}
          {/* Notification Badges */}
          {item.name === "Receive" && receiveCount > 0 && (
            isSidebarOpen ? (
              <span className="ml-auto bg-red-500 text-white text-[10px] leading-none font-bold min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center">
                {receiveCount > 99 ? '99+' : receiveCount}
              </span>
            ) : (
              <span className="absolute top-2.5 right-5 bg-red-500 w-2 h-2 rounded-full border border-white"></span>
            )
          )}
        </button>
      );
    });
  };

  const renderAccountItem = () => {
    if (!showAccount) return null;
    const isActive = pathname === "/content/account";
    return (
      <button
        onClick={() => router.push("/content/account")}
        className={`w-full flex items-center rounded-lg font-medium text-[15px] transition-all duration-200 cursor-pointer relative z-10 group ${isSidebarOpen ? "gap-3.5 px-3 py-2.5 justify-start" : "px-2 py-2.5 justify-center"
          } ${isActive
            ? "bg-[#0c3f0d] text-white font-bold"
            : "text-gray-600 dark:text-[#a1a1aa] hover:bg-gray-100/50 dark:hover:bg-[#242B36] hover:text-gray-900 dark:hover:text-white"
          }`}
      >
        <Users size={18} className={`${isActive ? "text-white" : "text-gray-400"} flex-shrink-0`} />
        {isSidebarOpen ? (
          <span>{t("account")}</span>
        ) : (
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 dark:bg-[#161B22] text-white dark:text-gray-200 text-xs font-bold rounded-md shadow-lg border border-gray-800 dark:border-[#2A2F3A] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-[9999] flex items-center">
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-gray-900 dark:border-r-[#161B22]" />
            {t("account")}
          </div>
        )}
      </button>
    );
  };

  const renderRolePermissionGroup = () => {
    if (matchedRoleItems.length === 0) return null;
    const isExpanded = searchQuery ? true : openMenus.rolePermission;

    return (
      <div className="relative overflow-visible">
        <button
          onClick={() => toggleMenu("rolePermission")}
          className={`w-full flex items-center justify-between px-3 py-2.5 text-gray-600 dark:text-[#a1a1aa] hover:bg-gray-100/50 dark:hover:bg-[#242B36] hover:text-gray-900 dark:hover:text-white rounded-lg cursor-pointer relative z-10`}
        >
          <div className="flex items-center gap-3.5">
            <ShieldCheck size={18} className="text-gray-400 flex-shrink-0" />
            <span>{t("role & permission")}</span>
          </div>
          <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : "rotate-0"}`} />
        </button>

        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100 mt-1 overflow-visible" : "grid-rows-[0fr] opacity-0 pointer-events-none overflow-hidden"}`}>
          <div className={`${isExpanded ? "overflow-visible" : "overflow-hidden"} relative pl-4`}>
            <div className="absolute left-[21px] top-[10px] bottom-[15px] w-[1px] bg-gray-200 dark:bg-[#242B36] z-0"></div>
            {matchedRoleItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg font-medium text-[14px] transition-all duration-200 cursor-pointer relative z-10 ${isActive
                      ? "bg-[#0c3f0d] text-white font-bold"
                      : "text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100/50 dark:hover:bg-[#242B36] hover:text-gray-900 dark:hover:text-white"
                    }`}
                >
                  <div className="w-5 flex justify-center items-center flex-shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full border-[1.5px] ${isActive ? "border-white bg-[#0c3f0d]" : "border-gray-300 bg-white"}`}></div>
                  </div>
                  <span>
                    {t(item.tKey) || item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderRolePermissionItemsFlat = () => {
    return matchedRoleItems.map((item) => {
      const isActive = pathname === item.path;
      return (
        <button
          key={item.name}
          onClick={() => router.push(item.path)}
          className={`w-full flex items-center rounded-lg font-medium text-[14px] transition-all duration-200 cursor-pointer relative z-10 group justify-center px-2 py-2.5 ${isActive
              ? "bg-[#0c3f0d] text-white font-bold"
              : "text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100/50 dark:hover:bg-[#242B36] hover:text-gray-900 dark:hover:text-white"
            }`}
        >
          <div className="w-5 flex justify-center items-center flex-shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full border-[1.5px] ${isActive ? "border-white bg-[#0c3f0d]" : "border-gray-300 bg-white"}`}></div>
          </div>
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 dark:bg-[#161B22] text-white dark:text-gray-200 text-xs font-bold rounded-md shadow-lg border border-gray-800 dark:border-[#2A2F3A] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-[9999] flex items-center">
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-gray-900 dark:border-r-[#161B22]" />
            {t(item.tKey) || item.name}
          </div>
        </button>
      );
    });
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 md:hidden transition-all duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside
        className={`bg-[#fdfdfd] dark:bg-[#0B0D12] flex flex-col justify-between h-screen fixed md:sticky top-0 z-50 flex-shrink-0 transition-all duration-300 ease-in-out shadow-sm ${isSidebarOpen
            ? "w-[300px] md:w-[280px] opacity-100 border-r border-gray-200 dark:border-[#2A2F3A] translate-x-0 overflow-hidden"
            : "w-[280px] md:w-[76px] border-r border-gray-200 dark:border-[#2A2F3A] -translate-x-full md:translate-x-0 overflow-visible"
          } ${!isMounted ? "no-transition" : ""}`}
      >
        <div className={`flex-shrink-0 flex flex-col h-full transition-all duration-300 ${isSidebarOpen ? "w-[300px] md:w-[280px]" : "w-[280px] md:w-[76px] overflow-visible"}`}>
          {/* Sidebar Header */}
          <div className={`pt-6 pb-4 flex flex-col relative select-none transition-all duration-300 ${isSidebarOpen ? "px-6" : "px-3 items-center"}`}>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-4 top-4 text-gray-500 dark:text-[#a1a1aa] hover:text-gray-800 dark:hover:text-gray-200 md:hidden cursor-pointer"
              aria-label="Close Sidebar"
            >
              <X size={18} />
            </button>
            <div className={`flex items-center gap-3 mb-6 transition-all duration-300 ${isSidebarOpen ? "" : "justify-center"}`}>
              <img
                src="/rupp-logo-transparent.png?v=2"
                alt="Royal University of Phnom Penh Logo"
                className="w-10 h-10 object-contain flex-shrink-0"
              />
              <div className={`flex flex-col transition-all duration-300 ${isSidebarOpen ? "opacity-100 max-w-[200px]" : "opacity-0 w-0 h-0 overflow-hidden"}`}>
                <span className="text-[#f1b32d] font-moul text-[11px] leading-tight font-bold whitespace-nowrap">សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ</span>
                <span className="text-[#f1b32d] text-[10px] leading-tight font-bold whitespace-nowrap">Royal University of Phnom Penh</span>
              </div>
            </div>
            <div className={`relative transition-all duration-300 w-full ${isSidebarOpen ? "opacity-100 h-auto" : "opacity-0 h-0 overflow-hidden pointer-events-none"}`}>
              <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${searchQuery ? "text-[#0c3f0d] dark:text-emerald-500" : "text-gray-400"}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search") || "Search..."}
                className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-[13px] text-gray-800 dark:text-white outline-none focus:border-[#0c3f0d] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0c3f0d]/10 dark:focus:ring-emerald-500/10 transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer transition-colors"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          {/* Navigation Menu */}
          <div className={`flex-1 custom-scrollbar px-4 pb-6 select-none space-y-2 transition-all duration-300 ${isSidebarOpen ? "overflow-y-auto overflow-x-hidden" : "overflow-visible"}`}>

            {/* Dashboard */}
            {showDashboard && (
              <button
                onClick={() => router.push("/content/dashboard")}
                className={`w-full flex items-center rounded-lg font-medium text-[15px] transition-all duration-200 cursor-pointer relative group ${isSidebarOpen ? "gap-3.5 px-3 py-2.5 justify-start" : "px-2 py-2.5 justify-center"
                  } ${pathname === "/content/dashboard"
                    ? "bg-[#0c3f0d] text-white font-bold"
                    : "text-gray-600 dark:text-[#a1a1aa] hover:bg-gray-100/50 dark:hover:bg-[#242B36] hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                <LayoutDashboard size={18} className={`${pathname === "/content/dashboard" ? "text-white" : "text-gray-400"} flex-shrink-0`} />
                {isSidebarOpen ? (
                  <span>{t("dashboard")}</span>
                ) : (
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 dark:bg-[#161B22] text-white dark:text-gray-200 text-xs font-bold rounded-md shadow-lg border border-gray-800 dark:border-[#2A2F3A] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-[9999] flex items-center">
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[5px] border-r-gray-900 dark:border-r-[#161B22]" />
                    {t("dashboard")}
                  </div>
                )}
              </button>
            )}

            {/* Document Flow Items */}
            {matchedDocFlowItems.length > 0 && (
              isSidebarOpen ? (
                <div className="pt-2">
                  <button
                    onClick={() => toggleMenu("documentFlow")}
                    className="w-full flex items-center justify-between px-3 py-2 text-[15px] font-medium text-gray-800 dark:text-white hover:bg-gray-100/50 dark:hover:bg-[#242B36] rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <FolderIcon size={18} className="text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-800 dark:text-white">{t("document_flow") || "Document Flow"}</span>
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${(searchQuery ? true : openMenus.documentFlow) ? "rotate-180" : "rotate-0"}`} />
                  </button>

                  <div className={`grid transition-all duration-300 ease-in-out ${(searchQuery ? true : openMenus.documentFlow) ? "grid-rows-[1fr] opacity-100 mt-1 overflow-visible" : "grid-rows-[0fr] opacity-0 pointer-events-none overflow-hidden"}`}>
                    <div className={`${(searchQuery ? true : openMenus.documentFlow) ? "overflow-visible" : "overflow-hidden"} space-y-0.5 pl-4`}>
                      {renderDocumentFlowItems()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-1 space-y-2 overflow-visible">
                  {renderDocumentFlowItems()}
                </div>
              )
            )}

            {/* Settings & Permissions Items */}
            {(showAccount || matchedRoleItems.length > 0) && (
              isSidebarOpen ? (
                <div className="pt-2">
                  <button
                    onClick={() => toggleMenu("settings")}
                    className="w-full flex-center w-full flex items-center justify-between px-3 py-2 text-[15px] font-medium text-gray-800 dark:text-white hover:bg-gray-100/50 dark:hover:bg-[#242B36] rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <SettingsIcon size={18} className="text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-800 dark:text-white">{t("settings") || "Settings"}</span>
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${(searchQuery ? true : openMenus.settings) ? "rotate-180" : "rotate-0"}`} />
                  </button>

                  <div className={`grid transition-all duration-300 ease-in-out ${(searchQuery ? true : openMenus.settings) ? "grid-rows-[1fr] opacity-100 mt-1 overflow-visible" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}>
                    <div className={`${(searchQuery ? true : openMenus.settings) ? "overflow-visible" : "overflow-hidden"} relative space-y-0.5 pl-4`}>
                      {renderAccountItem()}
                      {renderRolePermissionGroup()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-1 space-y-2 overflow-visible">
                  {renderAccountItem()}
                  {renderRolePermissionItemsFlat()}
                </div>
              )
            )}

            {/* No Results Found Fallback */}
            {!hasAnyVisibleItem && (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center select-none">
                <Search size={22} className="text-gray-300 dark:text-gray-600 mb-2.5 animate-pulse" />
                <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
                  {t("no_results_found") || "No results found"}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
