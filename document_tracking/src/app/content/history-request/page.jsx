"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import { useLanguage } from "../../context/LanguageContext";
import { Search, ChevronLeft, ChevronRight, Eye, Calendar, FileText, CheckCircle, XCircle, Clock, AlertCircle, History } from "lucide-react";
import Pagination from "../../../components/Pagination";
export default function HistoryPage() {
  const router = useRouter();
  const { t } = useLanguage();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    const reqs = JSON.parse(localStorage.getItem("doc_tracking_requests") || "[]");
    
    // Filter requests based on user role
    const isGlobalSuperAdmin = user.email === "admin@rupp.edu.kh";
    const userDept = (user.mainRole || user.department || "").toLowerCase().trim();
    
    const relevantRequests = reqs.filter(req => {
      if (isGlobalSuperAdmin) return true;
      const sDept = (req.senderDepartment || "").toLowerCase().trim();
      return userDept && sDept === userDept;
    });
    
    relevantRequests.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    setRequests(relevantRequests);
  }, [router]);
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
      return <span className="px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold text-[11px] uppercase tracking-wider">{t('approved') || 'Approved'}</span>;
    }
    if (s === "assigned to improve" || s === "returned") {
      return <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-bold text-[11px] uppercase tracking-wider">{t('returned') || 'Returned'}</span>;
    }
    if (s === "failed" || s === "declined" || s === "rejected") {
      return <span className="px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold text-[11px] uppercase tracking-wider">{t('declined') || 'Declined'}</span>;
    }
    return <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-bold text-[11px] uppercase tracking-wider">{status || 'Unknown'}</span>;
  };
  const getPriorityBadge = (priority) => {
    const p = (priority || "Normal").toLowerCase().trim();
    if (p === "urgent") {
      return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold text-[10px]">{t('urgent') || 'Urgent'}</span>;
    }
    if (p === "high") {
      return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800 font-bold text-[10px]">{t('high') || 'High'}</span>;
    }
    return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 font-bold text-[10px]">{t('normal') || 'Normal'}</span>;
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
            <div className="p-4 border-b border-gray-100 dark:border-[#2A2F3A] grid grid-cols-1 md:grid-cols-5 gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-[13px] text-gray-800 dark:text-white outline-none focus:border-green-500 cursor-pointer"
              >
                <option value="all">{t('month') || 'All Months'}</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>{new Date(0, month - 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const engMonth = new Date(0, month - 1).toLocaleString('en-US', { month: 'long' });
                  return <option key={month} value={month}>{t(engMonth.toLowerCase()) || engMonth}</option>;
                })}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-[13px] text-gray-800 dark:text-white outline-none focus:border-green-500 cursor-pointer"
              >
                <option value="all">{t('year') || 'All Years'}</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-[13px] text-gray-800 dark:text-white outline-none focus:border-green-500 cursor-pointer"
              >
                <option value="all">{t('all_types') || 'All Types'}</option>
                {documentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-[13px] text-gray-800 dark:text-white outline-none focus:border-green-500 cursor-pointer"
              >
                <option value="all">{t('all_priority') || 'All Priorities'}</option>
                <option value="normal">{t('normal') || 'Normal'}</option>
                <option value="high">{t('high') || 'High'}</option>
                <option value="urgent">{t('urgent') || 'Urgent'}</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-[13px] text-gray-800 dark:text-white outline-none focus:border-green-500 cursor-pointer"
              >
                <option value="all">{t('all_status') || 'All Status'}</option>
                <option value="completed">{t('approved') || 'Approved'}</option>
                <option value="returned">{t('returned') || 'Returned'}</option>
                <option value="declined">{t('declined') || 'Declined'}</option>
              </select>
            </div>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-gray-50 dark:bg-[#242B36] text-gray-600 dark:text-[#a1a1aa] font-bold text-[13px]">
                  <tr>
                    <th className="py-3 px-4 border-b border-gray-100 dark:border-[#2A2F3A]">ID</th>
                    <th className="py-3 px-4 border-b border-gray-100 dark:border-[#2A2F3A]">{t('type_document')}</th>
                    <th className="py-3 px-4 border-b border-gray-100 dark:border-[#2A2F3A]">{t('title') || 'Title'}</th>
                    <th className="py-3 px-4 border-b border-gray-100 dark:border-[#2A2F3A]">{t('sender')}</th>
                    <th className="py-3 px-4 border-b border-gray-100 dark:border-[#2A2F3A]">{t('receiver')}</th>
                    <th className="py-3 px-4 border-b border-gray-100 dark:border-[#2A2F3A] text-center">{t('status')}</th>
                    <th className="py-3 px-4 border-b border-gray-100 dark:border-[#2A2F3A]">{t('priority')}</th>
                    <th className="py-3 px-4 border-b border-gray-100 dark:border-[#2A2F3A]">{t('date')}</th>
                    <th className="py-3 px-4 border-b border-gray-100 dark:border-[#2A2F3A]">{t('duration') || 'Duration'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2A2F3A]">
                  {paginatedRequests.map((req) => {
                    const senderNameRaw = req.senderName || req.senderEmail || 'Unknown';
                    const englishSender = senderNameRaw.replace(/[ក-៯]+/g, '').replace(/\//g, '').trim() || senderNameRaw;
                    
                    let receiverRaw = getLastReceiver(req);
                    if (req.path && req.path.length > 0) {
                      const lastStep = req.path[req.path.length - 1];
                      receiverRaw = lastStep.userSign || lastStep.reviewerName || lastStep.assignedTo || receiverRaw;
                    }
                    const englishReceiver = receiverRaw.replace(/[ក-៯]+/g, '').replace(/\//g, '').trim() || receiverRaw;
                    const d = new Date(req.date || 0);
                    const formattedDate = !isNaN(d.getTime()) ? `${d.getDate()}, ${d.toLocaleString('default', { month: 'long' })}, ${d.getFullYear()}` : req.date;
                    return (
                    <tr 
                      key={req.id} 
                      onClick={() => router.push(`/content/tracking-document?id=${req.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-[#242B36] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-gray-500">{req.id || 'N/A'}</td>
                      <td className="py-3 px-4 font-bold text-gray-800 dark:text-gray-200">{req.documentType}</td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={req.title || req.subject}>{req.title || req.subject}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{englishSender}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{englishReceiver}</td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(req.status)}</td>
                      <td className="py-3 px-4">{getPriorityBadge(req.priorityLevel)}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formattedDate}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap font-medium flex items-center gap-1.5"><Clock size={13} className="text-blue-500" />{calculateProcessingTime(req)}</td>
                    </tr>
                    );
                  })}
                  {paginatedRequests.length === 0 && (
                    <tr>
                      <td colSpan="11" className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <History size={48} className="text-gray-300 dark:text-gray-600 mb-3 stroke-[1.5]" />
                          <h3 className="text-[16px] font-bold text-gray-800 dark:text-gray-200 mb-1">{t('no_history') || 'No history requests found.'}</h3>
                          <p className="text-[13px] text-gray-500 dark:text-gray-400">{t('no_history_desc') || 'You do not have any historical requests matching your criteria.'}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
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
        </div>
      </main>
    </div>
  );
}
