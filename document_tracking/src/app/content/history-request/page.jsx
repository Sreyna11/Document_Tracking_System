"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "nextjs-toploader/app";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import { hasPermission } from "../../../utils/permissions";
import { Search, ChevronLeft, ChevronRight, Eye, Calendar, FileText, CheckCircle, XCircle, Clock, AlertCircle, History } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";
import Pagination from "../../../components/Pagination";
export default function HistoryPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/");
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);
    setIsMounted(true);

    // Load historical requests
    const loadRequests = () => {
      const reqs = JSON.parse(localStorage.getItem("doc_tracking_requests") || "[]");

      // Filter requests based on user role
      const isGlobalSuperAdmin = user.email === "admin@rupp.edu.kh";
      const canViewAny = hasPermission(user, "History Request", "View Any");
      
      const relevantRequests = reqs.filter(req => {
        if (isGlobalSuperAdmin || canViewAny) return true;
        const sEmail = (req.senderEmail || "").toLowerCase().trim();
        const uEmail = (user.email || "").toLowerCase().trim();
        if (sEmail && uEmail && sEmail === uEmail) return true;
        
        const sName = (req.senderName || "").toLowerCase().trim();
        const uName = (user.username || user.name || "").toLowerCase().trim();
        if (sName && uName && sName === uName) return true;
        
        return false;
      });

      relevantRequests.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setRequests(relevantRequests);
    };

    loadRequests();

    const handleStorageChange = (e) => {
      if (e.key === "doc_tracking_requests") loadRequests();
    };
    const handleRequestsUpdated = () => {
      loadRequests();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("requests_updated", handleRequestsUpdated);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("requests_updated", handleRequestsUpdated);
    };
  }, []);
  const documentTypes = useMemo(() => {
    const types = new Set();
    requests.forEach(r => {
      if (r.documentType) types.add(r.documentType);
    });
    return Array.from(types);
  }, [requests]);
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // 1. Search Query
      if (searchQuery) {
        const query = searchQuery.trim().toLowerCase();
        if (query) {
          const matchesId = req.id && String(req.id).toLowerCase().includes(query);
          const matchesSubject = req.title && req.title.toLowerCase().includes(query);
          const matchesSubject2 = req.subject && req.subject.toLowerCase().includes(query);
          if (!matchesId && !matchesSubject && !matchesSubject2) return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== "all") {
        const status = (req.status || "").toLowerCase().trim();
        const filterVal = statusFilter.toLowerCase();
        if (filterVal === "completed" || filterVal === "approved") {
          if (status !== "completed" && status !== "approved") return false;
        } else if (filterVal === "returned") {
          if (status !== "assigned to improve" && status !== "returned") return false;
        } else if (filterVal === "declined") {
          if (status !== "failed" && status !== "declined" && status !== "rejected") return false;
        } else if (status !== filterVal) {
          return false;
        }
      }

      // 3. Type Filter
      if (typeFilter !== "all") {
        if (req.documentType !== typeFilter) return false;
      }
      // 4. Priority Filter
      if (priorityFilter !== "all") {
        const p = (req.priorityLevel || "Normal").toLowerCase().trim();
        if (p !== priorityFilter.toLowerCase()) return false;
      }
      // 5. Date Filter (Month and Year)
      if (req.date) {
        const reqDate = new Date(req.date);
        if (selectedMonth !== "all" && reqDate.getMonth() + 1 !== parseInt(selectedMonth)) return false;
        if (selectedYear !== "all" && reqDate.getFullYear() !== parseInt(selectedYear)) return false;
      } else if (selectedMonth !== "all" || selectedYear !== "all") {
        return false;
      }
      return true;
    });
  }, [requests, searchQuery, selectedMonth, selectedYear, statusFilter, typeFilter, priorityFilter]);
  const summary = useMemo(() => {
    let total = filteredRequests.length;
    let approved = 0;
    let returned = 0;
    let declined = 0;

    filteredRequests.forEach(req => {
      const status = (req.status || "").toLowerCase().trim();
      if (status === "completed" || status === "approved") approved++;
      else if (status === "assigned to improve" || status === "returned") returned++;
      else if (status === "failed" || status === "declined" || status === "rejected") declined++;
    });

    return { total, approved, returned, declined };
  }, [filteredRequests]);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, priorityFilter, selectedMonth, selectedYear]);
  const availableYears = useMemo(() => {
    const years = new Set();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    requests.forEach(req => {
      if (req.date) {
        years.add(new Date(req.date).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Descending
  }, [requests]);
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0F1117] flex items-center justify-center select-none">
        <div className="text-gray-400 font-semibold animate-pulse">{t('checking_credentials')}</div>
      </div>
    );
  }
  const getStatusBadge = (status) => {
    const s = (status || "Unknown").toLowerCase().trim();
    if (s === "completed" || s === "approved") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-extrabold text-[10px] uppercase tracking-wider border border-green-200 dark:border-green-500/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          {t('approved') || 'Approved'}
        </span>
      );
    }
    if (s === "assigned to improve" || s === "returned") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 font-extrabold text-[10px] uppercase tracking-wider border border-orange-200 dark:border-orange-500/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
          {t('returned') || 'Returned'}
        </span>
      );
    }
    if (s === "failed" || s === "declined" || s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 font-extrabold text-[10px] uppercase tracking-wider border border-red-200 dark:border-red-500/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          {t('declined') || 'Declined'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400 font-extrabold text-[10px] uppercase tracking-wider border border-gray-200 dark:border-gray-500/20 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
        {status || 'Unknown'}
      </span>
    );
  };
  const getPriorityBadge = (priority) => {
    const p = (priority || "Normal").toLowerCase().trim();
    if (p === "urgent") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 font-extrabold text-[10px] uppercase tracking-wider border border-red-200 dark:border-red-500/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          {t('urgent') || 'Urgent'}
        </span>
      );
    }
    if (p === "high") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 font-extrabold text-[10px] uppercase tracking-wider border border-orange-200 dark:border-orange-500/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
          {t('high') || 'High'}
        </span>
      );
    }
    if (p === "medium") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 font-extrabold text-[10px] uppercase tracking-wider border border-yellow-200 dark:border-yellow-500/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
          {t('medium') || 'Medium'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-extrabold text-[10px] uppercase tracking-wider border border-green-200 dark:border-green-500/20 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        {t('normal') || 'Normal'}
      </span>
    );
  };
  const calculateProcessingTime = (req) => {
    let diffMs = 0;

    // Attempt to calculate precise accumulated time across path steps
    if (req.path && req.path.length > 0) {
      req.path.forEach((step, index) => {
        let startStr = index === 0 ? (req.date + (req.time ? ' ' + req.time : '')) : (req.path[index - 1]?.approvedAt || req.date);
        let endStr = step.approvedAt;

        // For the active step, calculate up to now
        if (!endStr && index === (req.currentStepIndex || 0) && req.status !== "Completed" && req.status !== "Failed" && req.status !== "Assigned to Improve") {
          endStr = new Date().toISOString();
        }
        if (startStr && endStr) {
          const start = new Date(startStr);
          const end = new Date(endStr);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            let stepTime = Math.max(0, end - start);
            // Fallback if step has a specific accumulated time (e.g. from return loop)
            if (step.accumulatedTime) {
              stepTime += step.accumulatedTime;
            }
            diffMs += stepTime;
          }
        } else if (step.accumulatedTime) {
          diffMs += step.accumulatedTime;
        }
      });
    }
    // Fallback if no detailed path time is calculated
    if (diffMs === 0) {
      if (!req.date) return "N/A";
      const start = new Date(`${req.date} ${req.time || ''}`.trim());
      const end = req.completedDate ? new Date(req.completedDate) : new Date();
      diffMs = Math.max(0, end - start);
    }

    if (diffMs === 0) return "< 1m";
    const diffSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(diffSecs / 86400);
    const hours = Math.floor((diffSecs % 86400) / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const secs = diffSecs % 60;

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (parts.length === 0 || (days === 0 && hours === 0)) parts.push(`${secs}s`);

    return parts.join(' ');
  };
  const getLastReceiver = (req) => {
    if (req.path && req.path.length > 0) {
      const lastStep = req.path[req.path.length - 1];
      return typeof lastStep === 'string' ? lastStep : (lastStep.department || lastStep.mainRole || lastStep.userSign || "Unknown");
    }
    return req.receiver || req.receiverEmail || 'Unassigned';
  };
  return (
    <div className="flex min-h-screen bg-[#fafafb] dark:bg-[#0F1117] text-black dark:text-white">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} currentUser={currentUser} />

        <div className="p-8 md:p-10 flex-1 w-full mx-auto overflow-x-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                History Requests
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and manage your historical document requests and their final statuses.</p>

            </div>
          </div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-[#161B22] p-5 rounded-xl border border-gray-100 dark:border-[#2A2F3A] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-gray-500 dark:text-gray-400">{t('total_requests') || 'Total Requests'}</span>
                <span className="text-[24px] font-black text-gray-900 dark:text-white leading-tight">{summary.total}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#161B22] p-5 rounded-xl border border-gray-100 dark:border-[#2A2F3A] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-gray-500 dark:text-gray-400">{t('approved') || 'Approved'}</span>
                <span className="text-[24px] font-black text-gray-900 dark:text-white leading-tight">{summary.approved}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-[#161B22] p-5 rounded-xl border border-gray-100 dark:border-[#2A2F3A] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-gray-500 dark:text-gray-400">{t('returned') || 'Returned'}</span>
                <span className="text-[24px] font-black text-gray-900 dark:text-white leading-tight">{summary.returned}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-[#161B22] p-5 rounded-xl border border-gray-100 dark:border-[#2A2F3A] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                <XCircle size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-gray-500 dark:text-gray-400">{t('declined') || 'Declined'}</span>
                <span className="text-[24px] font-black text-gray-900 dark:text-white leading-tight">{summary.declined}</span>
              </div>
            </div>
          </div>
          {/* Filters & Table Container */}
          <div className="bg-white dark:bg-[#161B22] border border-gray-100 dark:border-[#2A2F3A] rounded-xl shadow-sm flex flex-col">

            {/* Search Section */}
            <div className="p-4 border-b border-gray-100 dark:border-[#2A2F3A] flex justify-end">
              <div className="relative w-full md:w-1/3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search_history') || "Search Request ID or Title..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-[13px] text-gray-800 dark:text-white outline-none focus:border-green-500 transition-colors"
                />
              </div>
            </div>
            {/* Filter Dropdowns */}
            <div className="p-4 border-b border-gray-100 dark:border-[#2A2F3A] grid grid-cols-1 md:grid-cols-3 gap-4">
              <CustomSelect
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                placeholder={t('select_month') || 'Select month...'}
                options={[
                  { label: t('select_month') || 'Select month...', value: "all" },
                  ...Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                    const engMonth = new Date(0, month - 1).toLocaleString('en-US', { month: 'long' });
                    return { label: t(engMonth.toLowerCase()) || engMonth, value: month.toString() };
                  })
                ]}
              />
              <CustomSelect
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                placeholder={t('select_year') || 'Select year...'}
                options={[
                  { label: t('select_year') || 'Select year...', value: "all" },
                  ...availableYears.map(year => ({ label: year.toString(), value: year.toString() }))
                ]}
              />
              <CustomSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder={t('select_status') || 'Select status...'}
                options={[
                  { label: t('select_status') || 'Select status...', value: "all" },
                  { label: t('approved') || 'Approved', value: "completed" },
                  { label: t('returned') || 'Returned', value: "returned" },
{ label: t('declined') || 'Declined', value: "declined" }
                ]}
              />
            </div>
            {/* Table */}
            <div className="flex flex-col gap-4 p-4 md:p-6 bg-white dark:bg-[#161B22]">
              {paginatedRequests.map((req) => {
                const senderNameRaw = req.senderName || req.senderEmail || 'Unknown';
                const englishSender = senderNameRaw.replace(/[ក-៯]+/g, '').replace(/\//g, '').trim() || senderNameRaw;
                const d = new Date(req.date || 0);
                const timeString = req.time || (!isNaN(d.getTime()) && req.date ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "");
                
                return (
                  <div
                    key={req.id}
                    onClick={() => router.push(`/content/tracking-document?id=${req.id}`)}
                    className="group bg-white dark:bg-[#161B22] p-5 rounded-xl border border-gray-100 dark:border-[#2A2F3A] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer hover:border-gray-300 dark:hover:border-gray-500 transition-all gap-4"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden border border-blue-200 dark:border-blue-800">
                        <img 
                          src={req.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(englishSender)}&background=bfdbfe&color=1e3a8a&size=128&bold=true`} 
                          alt={englishSender} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1 tracking-tight">{englishSender}</h3>
                        <p className="text-[13px] text-gray-400 dark:text-gray-500 mb-0.5">From: {req.department || 'N/A'}</p>
                        <p className="text-[13px] text-gray-400 dark:text-gray-500 mb-0.5">Subject: {req.title || req.subject || 'No Subject'}</p>
                        <p className="text-[13px] text-gray-400 dark:text-gray-500">Attached file : {req.attachment || 'No attachment'}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end justify-between h-full self-stretch md:self-auto min-h-[60px]">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{timeString}</span>
                      <div className="mt-4 md:mt-0">
                        {getStatusBadge(req.status)}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {paginatedRequests.length === 0 && (
                <div className="py-16 text-center flex flex-col items-center justify-center bg-gray-50 dark:bg-[#161B22] rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                  <History size={48} className="text-gray-300 dark:text-gray-600 mb-3 stroke-[1.5]" />
                  <h3 className="text-[16px] font-bold text-gray-800 dark:text-gray-200 mb-1">{t('no_history') || 'No history requests found.'}</h3>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">{t('no_history_desc') || 'You do not have any historical requests matching your criteria.'}</p>
                </div>
              )}
            </div>

              {/* Pagination */}
              {paginatedRequests.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredRequests.length}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }
