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
  History
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useLanguage } from "../app/context/LanguageContext";
import { hasPermission } from "../utils/permissions";
export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);
  const { t } = useLanguage();
  const [openMenus, setOpenMenus] = useState({
    documentFlow: true,
    settings: true,
    rolePermission: true
  });
  const [receiveCount, setReceiveCount] = useState(0);
  const toggleMenu = (menu) => {
    setOpenMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };
  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    const calculateUnreadReceive = (storageData) => {
      try {
        let requests = storageData ? JSON.parse(storageData) : [];
        if (!Array.isArray(requests)) return;
        
        const userDept = (currentUser.mainRole || currentUser.department || "").toLowerCase().trim();
        const isGlobalSuperAdmin = currentUser?.email === "itcsuperadmin@rupp.edu.kh";
        
        let list = requests.filter((req) => {
            const isAssignedToMeForImprovement = req.status?.toLowerCase().trim() === "assigned to improve" && (req.improveAssignedTo || "").toLowerCase().trim() === userDept;
            if (isAssignedToMeForImprovement) return true;
            const isDeclinedToMe = req.status?.toLowerCase().trim() === "failed" && (req.senderDepartment || "").toLowerCase().trim() === userDept;
            if (isDeclinedToMe) return true;
            const isCompletedToMe = req.status?.toLowerCase().trim() === "completed" && (req.senderDepartment || "").toLowerCase().trim() === userDept;
            if (isCompletedToMe) return true;
            
            if ((req.senderDepartment || "").toLowerCase().trim() === userDept) return false;
            if (isGlobalSuperAdmin) return true;
            if (!req.path) return false;
            
            const myIndex = req.path.findIndex(p => {
                const role = typeof p === 'string' ? p : p.department || p.mainRole;
                return role && role.toLowerCase().trim() === userDept;
            });
            if (myIndex === -1) return false;
            const currentIndex = req.currentStepIndex !== undefined ? req.currentStepIndex : 0;
            return currentIndex >= myIndex;
        });
        
        const userId = currentUser?.email || currentUser?.username || userDept;
        const unreadList = list.filter(req => !(req.readBy || []).includes(userId));
        
        setReceiveCount(unreadList.length);
      } catch (e) {
        console.error("Error calculating unread receive", e);
      }
    };

    calculateUnreadReceive(localStorage.getItem("doc_tracking_requests"));

    const handleStorageChange = (e) => {
      if (e.key === "doc_tracking_requests") {
        calculateUnreadReceive(e.newValue);
      }
    };
    
    const interval = setInterval(() => {
      calculateUnreadReceive(localStorage.getItem("doc_tracking_requests"));
    }, 1000);

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [currentUser]);

  const isGlobalSuperAdmin = currentUser?.email === "admin@rupp.edu.kh";
  const adminCheckStr = (currentUser?.type || currentUser?.role || "").toLowerCase();
  const isDepartmentAdmin = adminCheckStr.includes("super admin") || adminCheckStr === "admin";
  const isSuperAdmin = currentUser && (isGlobalSuperAdmin || isDepartmentAdmin);
  return (
    <aside
      className={`${isSidebarOpen ? "w-full md:w-[260px] opacity-100 border-r border-gray-200 dark:border-[#2A2F3A]" : "hidden w-0 opacity-0 border-r-0 pointer-events-none"
        } bg-[#fdfdfd] dark:bg-[#0B0D12] flex flex-col justify-between h-screen fixed md:sticky top-0 z-50 flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden shadow-sm`}
    >
      <div className="w-full md:w-[260px] flex-shrink-0 flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="pt-6 pb-4 px-6 flex flex-col relative select-none">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute right-4 top-4 text-gray-500 dark:text-[#a1a1aa] hover:text-gray-800 dark:hover:text-gray-200 md:hidden cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-6">
            <img
              src="/rupp-logo-transparent.png?v=2"
              alt="Royal University of Phnom Penh Logo"
              className="w-10 h-10 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-[#f1b32d] font-moul text-[11px] leading-tight font-bold">សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ</span>
              <span className="text-[#f1b32d] text-[10px] leading-tight font-bold">Royal University of Phnom Penh</span>
            </div>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-[13px] text-gray-800 dark:text-white outline-none focus:border-gray-300 transition-colors"
            />
          </div>
        </div>
        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 pb-6 select-none space-y-2">
          
          {/* Dashboard */}
          <button
            onClick={() => router.push("/content/dashboard")}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg font-medium text-[15px] transition-all duration-200 cursor-pointer ${
              pathname === "/content/dashboard"
                ? "bg-[#0c3f0d] text-white font-bold"
                : "text-gray-600 hover:bg-gray-100/50 hover:text-gray-900"
            }`}
          >
            <LayoutDashboard size={18} className={`${pathname === "/content/dashboard" ? "text-white" : "text-gray-400"}`} />
            <span>{t("dashboard")}</span>
          </button>
          {/* Document Flow */}
          <div className="pt-2">
            <button
              onClick={() => toggleMenu("documentFlow")}
              className="w-full flex items-center justify-between px-3 py-2 text-[15px] font-medium text-gray-800 dark:text-white hover:bg-gray-100/50 dark:hover:bg-[#242B36] rounded-lg cursor-pointer"
            >
              <span>Document Flow</span>
              {openMenus.documentFlow ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            
            {openMenus.documentFlow && (
              <div className="mt-1 space-y-0.5">
                {[
                  { name: "Request", path: "/content/request", icon: FileText },
                  { name: "Receive", path: "/content/receive", icon: Inbox },
                  { name: "History Request", path: "/content/history-request", icon: History },
                  { name: "Tracking Document", path: "/content/tracking-document", icon: MapPin },
                  { name: "Document Type", path: "/content/document-type", icon: FolderCog }
                ].filter(item => hasPermission(currentUser, item.name, "View")).map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <button
                      key={item.name}
                      onClick={() => router.push(item.path)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium text-[15px] transition-all duration-200 cursor-pointer relative ${
                        isActive
                          ? "bg-[#0c3f0d] text-white font-bold"
                          : "text-gray-600 dark:text-[#a1a1aa] hover:bg-gray-100/50 dark:hover:bg-[#242B36] hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Icon size={18} className={`${isActive ? "text-white" : "text-gray-400"}`} />
                        <span>{t(item.name === "Request" ? "request" : item.name === "Receive" ? "receive" : item.name === "History Request" ? "history_requests" : item.name === "Tracking Document" ? "tracking-document" : "type_document") || item.name}</span>
                      </div>
                      {item.name === "Receive" && receiveCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center min-w-[20px]">
                          {receiveCount > 99 ? '99+' : receiveCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {/* Settings (Visible to everyone, but contents restricted) */}
          <div className="pt-2">
              <button
                onClick={() => toggleMenu("settings")}
                className="w-full flex items-center justify-between px-3 py-2 text-[15px] font-medium text-gray-800 dark:text-white hover:bg-gray-100/50 dark:hover:bg-[#242B36] rounded-lg cursor-pointer"
              >
                <span>Settings</span>
                {openMenus.settings ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              
              {openMenus.settings && (
                <div className="mt-1 relative space-y-0.5">
                  {hasPermission(currentUser, "Account", "View") && (
                    <button
                      onClick={() => router.push("/content/account")}
                      className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg font-medium text-[15px] transition-all duration-200 cursor-pointer relative z-10 ${
                        pathname === "/content/account"
                          ? "bg-[#0c3f0d] text-white font-bold"
                          : "text-gray-600 hover:bg-gray-100/50 hover:text-gray-900"
                      }`}
                    >
                      <Users size={18} className={pathname === "/content/account" ? "text-white" : "text-gray-400"} />
                      <span>{t("account")}</span>
                    </button>
                  )}
                  {/* Role & Permission Collapsible */}
                  {(() => {
                    const roleItems = [
                      { name: "Job Department", path: "/content/job-department" },
                      { name: "Set Role Permission", path: "/content/set-role-permission" }
                    ].filter(item => hasPermission(currentUser, item.name, "View"));
                    
                    if (roleItems.length === 0) return null;
                    
                    return (
                      <div className="relative">
                      <button
                        onClick={() => toggleMenu("rolePermission")}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium text-[15px] transition-all duration-200 cursor-pointer relative z-10 text-gray-600 hover:bg-gray-100/50 hover:text-gray-900`}
                      >
                        <div className="flex items-center gap-3.5">
                          <ShieldCheck size={18} className="text-gray-400" />
                          <span>Role & Permission</span>
                        </div>
                        {openMenus.rolePermission ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </button>
                      
                      {openMenus.rolePermission && (
                        <div className="mt-1 relative">
                          <div className="absolute left-[19px] top-[20px] bottom-[20px] w-[1px] bg-gray-200 dark:bg-[#242B36] z-0"></div>
                            {roleItems.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                              <button
                                key={item.name}
                                onClick={() => router.push(item.path)}
                                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg font-medium text-[14px] transition-all duration-200 cursor-pointer relative z-10 ${
                                  isActive
                                    ? "bg-[#0c3f0d] text-white font-bold"
                                    : "text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100/50 dark:hover:bg-[#242B36] hover:text-gray-900 dark:hover:text-white"
                                }`}
                              >
                                <div className="w-5 flex justify-center items-center">
                                  <div className={`w-1.5 h-1.5 rounded-full border-[1.5px] ${isActive ? "border-white bg-[#0c3f0d]" : "border-gray-300 bg-white"}`}></div>
                                </div>
                                <span>{t(item.name === "Job Department" ? "job_department" : "set_role_permission")}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    );
                  })()}
                </div>
              )}
            </div>
        </div>
      </div>
    </aside>
  );
}
