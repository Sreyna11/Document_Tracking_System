"use client";
import { useState, useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import { MapPin, Search, Check, Clock, AlertTriangle, FileText, Package, Navigation, Map as MapIcon, Play, User, Briefcase, RotateCcw } from "lucide-react";
export default function TrackingPage() {
  const router = useRouter();
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [now, setNow] = useState(new Date());
  const t = (k) => {
    const map = {
      'checking_credentials': 'Checking Credentials...',
      'live_tracking': 'Live Tracking',
      'search_tracking': 'Search tracking number...',
      'no_tracking_orders': 'No tracking orders found.',
      'tracking_id': 'Tracking ID:',
      'delivery_status': 'Delivery Status',
      'no_path': 'No routing path available.',
      'select_request': 'Select a tracking request',
      'select_instruction': 'Select an item from the left panel to view detailed tracking information.'
    };
    return map[k] || k;
  };
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const formatDuration = (startStr, endStr) => {
    if (!startStr) return null;
    const start = new Date(startStr);
    let fallbackEnd = now;
    if (selectedRequest && (selectedRequest.status === "Failed" || selectedRequest.status === "Completed" || selectedRequest.status === "Assigned to Improve")) {
      let maxDateStr = selectedRequest.completedDate;
      if (!maxDateStr && selectedRequest.path) {
        let maxTime = start.getTime();
        selectedRequest.path.forEach(p => {
          if (p.approvedAt) {
            const t = new Date(p.approvedAt).getTime();
            if (!isNaN(t) && t > maxTime) maxTime = t;
          }
        });
        if (maxTime > start.getTime()) {
          maxDateStr = new Date(maxTime).toISOString();
        }
      }
      fallbackEnd = maxDateStr ? new Date(maxDateStr) : start;
    }
    const end = endStr ? new Date(endStr) : fallbackEnd;
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    const diffMs = Math.max(0, end - start);
    const diffSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(diffSecs / 86400);
    const hours = Math.floor((diffSecs % 86400) / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const secs = diffSecs % 60;

    if (days > 0) return `${days}d ${hours}h ${mins}m ${secs}s`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };
  const getRoleString = (step) => {
    if (!step) return "Unknown";
    return typeof step === 'string' ? step : step.department || step.mainRole || "Unknown";
  };
  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/");
    } else {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      setIsMounted(true);

      const loadRequests = (dataStr) => {
        try {
          if (dataStr) {
            const parsed = JSON.parse(dataStr);
            if (Array.isArray(parsed)) {
              // System Admin sees all, others see only their department's requests
              const userDept = (user.mainRole || user.department || "").toLowerCase().trim();
              const isGlobalSuperAdmin = user?.email === "admin@rupp.edu.kh";

              const myRequests = isGlobalSuperAdmin ? parsed : parsed.filter(req => {
                const sDept = (req.senderDepartment || "").toLowerCase().trim();
                return userDept && sDept === userDept;
              });
              setRequests(myRequests);

              // Select from URL id or fallback to first
              setSelectedRequest(prev => {
                if (!prev) {
                  const urlParams = new URLSearchParams(window.location.search);
                  const idFromUrl = urlParams.get("id");
                  if (idFromUrl) {
                    const found = myRequests.find(r => String(r.id) === idFromUrl);
                    if (found) return found;
                  }
                  if (myRequests.length > 0) return myRequests[0];
                }
                return prev;
              });
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
      loadRequests(localStorage.getItem("doc_tracking_requests"));
      try {
        const usersStr = localStorage.getItem("doc_tracking_users");
        if (usersStr) setUsersList(JSON.parse(usersStr));
      } catch (e) {
        console.error("Error loading users", e);
      }
      const handleStorageChange = (e) => {
        if (e.key === "doc_tracking_requests") {
          loadRequests(e.newValue);
        }
      };
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, []);
  useEffect(() => {
    if (selectedRequest) {
      const updated = requests.find(r => r.id === selectedRequest.id);
      if (updated) setSelectedRequest(updated);
    }
  }, [requests]);
  const filteredRequests = requests.filter(req =>
    (req.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.trackingNumber || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const getGroupedRequests = (reqs) => {
    const groups = {
      "Today": [],
      "Yesterday": [],
      "2 Days ago": [],
      "Older": []
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reqs.forEach(req => {
      if (!req.date) {
        groups["Older"].push(req);
        return;
      }

      const reqDate = new Date(req.date);
      reqDate.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(today - reqDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) groups["Today"].push(req);
      else if (diffDays === 1) groups["Yesterday"].push(req);
      else if (diffDays === 2) groups["2 Days ago"].push(req);
      else groups["Older"].push(req);
    });
    return groups;
  };
  const groupedRequests = getGroupedRequests(filteredRequests);
  const getFallbackSigner = (req) => {
    if (req.completedBy) return req.completedBy;
    if (req.path && req.path.length > 0) {
      const lastStep = req.path[req.path.length - 1];
      const role = (typeof lastStep === 'string' ? lastStep : lastStep.department || lastStep.mainRole || "").toLowerCase().trim();
      const user = usersList.find(u => (u.department || u.mainRole || "").toLowerCase().trim() === role);
      if (user) return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return "Final Receiver";
  };
  const getFallbackSignerRole = (req) => {
    if (req.completedByRole) return req.completedByRole;
    if (req.path && req.path.length > 0) {
      const lastStep = req.path[req.path.length - 1];
      return typeof lastStep === 'string' ? lastStep : lastStep.department || lastStep.mainRole || "Unknown";
    }
    return "Unknown";
  };
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#161616] flex items-center justify-center select-none">
        <div className="text-gray-400 font-semibold animate-pulse">{t('checking_credentials')}</div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen bg-[#fafafb] dark:bg-[#0F1117] text-black">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} currentUser={currentUser} />
        <div className="p-6 md:p-8 flex-1 w-full mx-auto">
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full h-[calc(100vh-120px)] animate-fadeIn gap-6">
            {/* LEFT: Requests List */}
            <div className="w-full lg:w-[380px] bg-white dark:bg-[#161B22] rounded-xl shadow-sm border border-gray-200 dark:border-[#2A2F3A] flex flex-col flex-shrink-0 overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-[#2A2F3A] bg-white dark:bg-[#161B22]">
                <h1 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <MapPin className="text-blue-600" size={22} />
                  {t('live_tracking')}
                </h1>
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('search_tracking')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#0B0D12] border border-gray-200 dark:border-[#2A2F3A] rounded-xl text-sm outline-none focus:border-blue-500 transition-colors font-medium text-gray-700 dark:text-gray-300"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-[#0B0D12]">
                {filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Package size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">{t('no_tracking_orders')}</p>
                  </div>
                ) : (
                  Object.entries(groupedRequests).map(([groupName, items]) => {
                    if (items.length === 0) return null;
                    return (
                      <div key={groupName} className="flex flex-col mb-4">
                        <h3 className="text-[13px] font-medium text-gray-800 dark:text-gray-200 mb-3 ml-2">{groupName}</h3>
                        <div className="space-y-2">
                          {items.map(req => {
                            const isActive = selectedRequest?.id === req.id;
                            const isCompleted = req.status === "Completed";
                            const isImprove = req.status === "Assigned to Improve";
                            const isFailed = req.status === "Failed";
                            const userDept = (currentUser?.department || currentUser?.mainRole || "global").toLowerCase().trim();
                            const isSender = (req.senderDepartment || "").toLowerCase().trim() === userDept || (req.senderEmail || "").toLowerCase().trim() === (currentUser?.email || "").toLowerCase().trim();

                            let dateObj = new Date(req.date || new Date());
                            let formattedDateString = `${dateObj.getDate()}, ${dateObj.toLocaleString('default', { month: 'long' })} , ${dateObj.getFullYear()}`;
                            let finalTime = req.time || `${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
                            return (
                              <div
                                key={req.id}
                                onClick={() => setSelectedRequest(req)}
                                className={`p-5 rounded-2xl cursor-pointer transition-all border ${isActive
                                    ? "bg-white dark:bg-[#242B36] border-blue-500 shadow-md ring-1 ring-blue-50 dark:ring-blue-500/20"
                                    : "bg-white dark:bg-[#161B22] border-transparent hover:border-gray-200 dark:hover:border-[#2A2F3A] hover:shadow-sm"
                                  }`}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">ID #{req.trackingNumber || req.id}</h3>

                                  <div className={`px-2.5 py-1 border rounded-md font-bold text-[10px] ${isCompleted ? "bg-green-50 border-green-200 text-green-700" :
                                      isFailed ? "bg-red-50 border-red-200 text-red-700" :
                                        isImprove ? "bg-purple-50 border-purple-200 text-purple-700" :
                                          "bg-yellow-50 border-yellow-200 text-yellow-700"
                                    }`}>
                                    {isCompleted ? `Completed` :
                                      isFailed ? `Rejected` :
                                        isImprove ? (isSender ? `Returned from ${req.path && req.path[req.currentStepIndex || 0] ? (typeof req.path[req.currentStepIndex || 0] === 'string' ? req.path[req.currentStepIndex || 0] : req.path[req.currentStepIndex || 0].department || req.path[req.currentStepIndex || 0].mainRole) : "Unknown"}` : `Returned to ${req.senderDepartment || "Sender"}`) :
                                          `Pending ${req.path && req.path[req.currentStepIndex || 0] ? (typeof req.path[req.currentStepIndex || 0] === 'string' ? req.path[req.currentStepIndex || 0] : req.path[req.currentStepIndex || 0].department || req.path[req.currentStepIndex || 0].mainRole) : "Unknown"}`}
                                  </div>
                                </div>

                                <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                                  <p><span className="font-semibold text-gray-900 dark:text-white">Document Type:</span> {req.type}</p>
                                  <p><span className="font-semibold text-gray-900 dark:text-white">Title:</span> {req.title || req.subject}</p>
                                  <p><span className="font-semibold text-gray-900 dark:text-white">Date:</span> {formattedDateString} at {finalTime}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            {/* RIGHT: Tracker Map View */}
            <div className="flex-1 bg-white dark:bg-[#161B22] rounded-xl shadow-sm border border-gray-200 dark:border-[#2A2F3A] flex flex-col overflow-hidden relative">
              {selectedRequest ? (
                <>
                  {/* Header of Tracker */}
                  <div className="p-6 md:p-8 border-b border-gray-100 dark:border-[#2A2F3A] bg-gradient-to-r from-blue-50/50 to-white dark:from-[#242B36] dark:to-[#161B22] flex-shrink-0">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{selectedRequest.title || selectedRequest.subject}</h2>
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">{t('tracking_id')} <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedRequest.trackingNumber || selectedRequest.id}</span></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-inner">
                          <FileText size={24} />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-[#0B0D12] p-4 rounded-2xl border border-gray-100 dark:border-[#2A2F3A] shadow-2xs flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#161B22] flex items-center justify-center flex-shrink-0">
                        <Package size={20} className="text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{t('delivery_status')}</p>
                        <p className={`text-sm font-bold truncate ${selectedRequest.status === "Failed" ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-gray-200"}`}>
                          {selectedRequest.status === "Completed" ? "Completed" :
                            selectedRequest.status === "Assigned to Improve" ? (((currentUser?.department || currentUser?.mainRole || "global").toLowerCase().trim() === (selectedRequest.senderDepartment || "").toLowerCase().trim() || (currentUser?.email || "").toLowerCase().trim() === (selectedRequest.senderEmail || "").toLowerCase().trim()) ? `Returned from ${selectedRequest.path && selectedRequest.path[selectedRequest.currentStepIndex || 0] ? (typeof selectedRequest.path[selectedRequest.currentStepIndex || 0] === 'string' ? selectedRequest.path[selectedRequest.currentStepIndex || 0] : selectedRequest.path[selectedRequest.currentStepIndex || 0].department || selectedRequest.path[selectedRequest.currentStepIndex || 0].mainRole) : "Unknown"}` : `Returned to ${selectedRequest.senderDepartment || "Sender"}`) :
                              selectedRequest.status === "Failed" ? "Rejected" :
                                `Pending ${selectedRequest.path && selectedRequest.path[selectedRequest.currentStepIndex || 0] ? (typeof selectedRequest.path[selectedRequest.currentStepIndex || 0] === 'string' ? selectedRequest.path[selectedRequest.currentStepIndex || 0] : selectedRequest.path[selectedRequest.currentStepIndex || 0].department || selectedRequest.path[selectedRequest.currentStepIndex || 0].mainRole) : "Unknown"}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* The Timeline Map */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-[#f8fafc] dark:bg-[#0F1117] flex justify-center items-start">

                    {!selectedRequest.path || selectedRequest.path.length === 0 ? (
                      <div className="text-center text-gray-400 italic mt-10">{t('no_path')}</div>
                    ) : (
                      <div className="w-full max-w-2xl py-8">

                        {/* Let's calculate progress percentage */}
                        {(() => {
                          const pathLen = selectedRequest.path.length;
                          let currentStep = selectedRequest.currentStepIndex || 0;

                          // Override for completed or improvement
                          if (selectedRequest.status === "Completed") {
                            currentStep = pathLen - 1;
                          } else if (selectedRequest.status === "Assigned to Improve" && selectedRequest.improveAssignedTo) {
                            const impIdx = selectedRequest.path.findIndex(p => {
                              const roleStr = getRoleString(p);
                              return roleStr.toLowerCase().trim() === selectedRequest.improveAssignedTo.toLowerCase().trim();
                            });
                            if (impIdx !== -1) currentStep = impIdx;
                          }

                          // Ensure bounds
                          currentStep = Math.max(0, Math.min(currentStep, pathLen - 1));
                          const isImprovement = selectedRequest.status === "Assigned to Improve";
                          const isCompleted = selectedRequest.status === "Completed";
                          const isFailed = selectedRequest.status === "Failed";
                          const formatRelativeDate = (dateStr) => {
                            if (!dateStr) return "";
                            try {
                              const d = new Date(dateStr);
                              if (isNaN(d.getTime())) return dateStr;

                              const today = new Date();
                              const yesterday = new Date(today);
                              yesterday.setDate(yesterday.getDate() - 1);

                              const timeOptions = { hour: 'numeric', minute: '2-digit' };
                              const timeStr = d.toLocaleTimeString('en-US', timeOptions);
                              if (d.toDateString() === today.toDateString()) return `Today, ${timeStr}`;
                              if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeStr}`;

                              const dateOptions = { month: 'short', day: 'numeric' };
                              return `${d.toLocaleDateString('en-US', dateOptions)}, ${timeStr}`;
                            } catch (e) {
                              return dateStr;
                            }
                          };
                          return (
                            <div className="relative w-full py-4 flex flex-col items-stretch">
                              {selectedRequest.path.map((dept, idx) => {
                                const isPast = idx < currentStep || isCompleted;
                                const isActive = idx === currentStep;
                                const isLast = idx === selectedRequest.path.length - 1;

                                let dateStr = dept.approvedAt;
                                if (!dateStr) {
                                  if (idx === 0) dateStr = `${selectedRequest.date} ${selectedRequest.time || ''}`.trim();
                                  else if (isLast && isCompleted && selectedRequest.completedAt) dateStr = selectedRequest.completedAt;
                                  else if (isPast) dateStr = `${selectedRequest.date} ${selectedRequest.time || ''}`.trim();
                                }

                                const formatSketchDate = (dStr) => {
                                  if (!dStr) return "";
                                  try {
                                    const d = new Date(dStr);
                                    if (isNaN(d.getTime())) return dStr;
                                    const dateOpts = { month: 'short', day: 'numeric' };
                                    const timeOpts = { hour: 'numeric', minute: '2-digit' };
                                    return `${d.toLocaleDateString('en-US', dateOpts)}, ${d.toLocaleTimeString('en-US', timeOpts)}`;
                                  } catch (e) {
                                    return dStr;
                                  }
                                };
                                const dateText = formatSketchDate(dateStr);
                                const getEnglishName = (name) => {
                                  if (!name) return "Unknown User";
                                  const englishOnly = name.replace(/[\u1780-\u17FF\u19E0-\u19FF]+/g, '').trim();
                                  return englishOnly || name;
                                };
                                const userName = (() => {
                                  let name = "Unknown User";
                                  if (idx === 0 && selectedRequest.createdBy) name = selectedRequest.createdBy;
                                  else if (isLast && isCompleted && selectedRequest.completedBy) name = selectedRequest.completedBy;
                                  else if (dept.assignedTo) {
                                    name = dept.assignedTo.name;
                                  }
                                  else {
                                    const roleStr = typeof dept === 'string' ? dept : (dept.department || dept.mainRole || "");
                                    const matchedUser = usersList.find(u => (u.department || u.mainRole || "").toLowerCase().trim() === roleStr.toLowerCase().trim());
                                    if (matchedUser) name = `${matchedUser.firstName || ''} ${matchedUser.lastName || ''}`.trim();
                                  }
                                  return getEnglishName(name);
                                })();

                                // Determine Step Title / Type
                                let stepTitle = "Approved & Processed";
                                if (idx === 0) {
                                  stepTitle = "Request Initiated";
                                } else if (isActive) {
                                  if (isCompleted) {
                                    stepTitle = "Document Completed";
                                  } else if (isFailed) {
                                    stepTitle = "Document Rejected";
                                  } else if (isImprovement) {
                                    stepTitle = "Returned for Improvement";
                                  } else {
                                    stepTitle = "Awaiting Approval";
                                  }
                                } else if (idx > currentStep) {
                                  stepTitle = "Upcoming Stepper Path";
                                }

                                return (
                                  <div key={idx} className="relative flex gap-6 pb-10 last:pb-0 w-full">
                                    {/* Connector Line */}
                                    {!isLast && (
                                      <div
                                        className={`absolute left-[21px] top-11 bottom-0 w-[3px] rounded-full transition-all duration-500 ${
                                          isPast || (isActive && isCompleted)
                                            ? "bg-green-500 dark:bg-green-600"
                                            : isActive && (isImprovement || isFailed)
                                            ? "bg-red-500 dark:bg-red-600"
                                            : "bg-gray-200 dark:bg-[#2A2F3A]"
                                        }`}
                                      />
                                    )}

                                    {/* Step Badge Node */}
                                    <div className="relative z-10 flex-shrink-0 flex items-start pt-1 justify-center w-11">
                                      {isPast ? (
                                        <div className="w-11 h-11 rounded-full bg-green-500 dark:bg-green-600 border-4 border-green-100 dark:border-green-950 text-white flex items-center justify-center shadow-md">
                                          <Check size={18} strokeWidth={3} />
                                        </div>
                                      ) : isActive ? (
                                        <div className="relative">
                                          {(!isCompleted && !isFailed) && (
                                            <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping border border-blue-500" />
                                          )}
                                          <div className={`w-11 h-11 rounded-full border-4 flex items-center justify-center shadow-md z-10 relative ${
                                            isCompleted
                                              ? "bg-green-500 border-green-100 dark:border-green-950 text-white"
                                              : isFailed
                                              ? "bg-red-500 border-red-100 dark:border-red-950 text-white animate-pulse"
                                              : isImprovement
                                              ? "bg-purple-500 border-purple-100 dark:border-purple-950 text-white animate-pulse"
                                              : "bg-blue-600 dark:bg-blue-500 border-blue-100 dark:border-blue-950 text-white"
                                          }`}>
                                            {isCompleted ? (
                                              <Check size={18} strokeWidth={3} />
                                            ) : isFailed ? (
                                              <AlertTriangle size={18} />
                                            ) : isImprovement ? (
                                              <RotateCcw size={16} />
                                            ) : (
                                              <Clock size={18} style={{ animation: 'spin 8s linear infinite' }} />
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-[#242B36] border-4 border-gray-50 dark:border-[#161B22] text-gray-400 dark:text-gray-500 flex items-center justify-center font-bold text-sm">
                                          {idx + 1}
                                        </div>
                                      )}
                                    </div>

                                    {/* Step Details Card */}
                                    <div
                                      className={`flex-1 bg-white dark:bg-[#161B22] p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${
                                        isActive
                                          ? isCompleted
                                            ? "border-l-4 border-l-green-500 border-t-green-100/50 dark:border-t-green-900/10 border-r-green-100/50 dark:border-r-green-900/10 border-b-green-100/50 dark:border-b-green-900/10 shadow-green-500/5"
                                            : isFailed
                                            ? "border-l-4 border-l-red-500 border-t-red-100/50 dark:border-t-red-900/10 border-r-red-100/50 dark:border-r-red-900/10 border-b-red-100/50 dark:border-b-red-900/10 shadow-red-500/5"
                                            : isImprovement
                                            ? "border-l-4 border-l-purple-500 border-t-purple-100/50 dark:border-t-purple-900/10 border-r-purple-100/50 dark:border-r-purple-900/10 border-b-purple-100/50 dark:border-b-purple-900/10 shadow-purple-500/5"
                                            : "border-l-4 border-l-blue-500 border-t-blue-100/50 dark:border-t-blue-900/10 border-r-blue-100/50 dark:border-r-blue-900/10 border-b-blue-100/50 dark:border-b-blue-900/10 shadow-blue-500/10"
                                          : isPast
                                          ? "border-l-4 border-l-green-500 border-t-slate-100 dark:border-t-[#2A2F3A] border-r-slate-100 dark:border-r-[#2A2F3A] border-b-slate-100 dark:border-b-[#2A2F3A]"
                                          : "border-l-4 border-l-slate-300 dark:border-l-[#2A2F3A] border-t-slate-100 dark:border-t-[#2A2F3A] border-r-slate-100 dark:border-r-[#2A2F3A] border-b-slate-100 dark:border-b-[#2A2F3A]"
                                      }`}
                                    >
                                      {/* Header details: title and status badge */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-[#2A2F3A] pb-3 mb-3">
                                        <h4 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                                          {idx === 0 ? "Step 1: Request Created" : `Step ${idx + 1}: ${stepTitle}`}
                                        </h4>
                                        <div>
                                          {isPast ? (
                                            <span className="text-[10px] font-bold text-green-700 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 px-2.5 py-1 rounded-md uppercase">
                                              {idx === 0 ? "Sent" : "Approved"}
                                            </span>
                                          ) : isActive ? (
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase ${
                                              isCompleted
                                                ? "text-green-700 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/30"
                                                : isFailed
                                                ? "text-red-700 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/30"
                                                : isImprovement
                                                ? "text-purple-700 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/30"
                                                : "text-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900/30"
                                            }`}>
                                              {isCompleted ? "Completed" : isFailed ? "Rejected" : isImprovement ? "Returned" : "Pending Action"}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] px-2.5 py-1 rounded-md uppercase">
                                              Pending
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Body: meta info details */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center gap-2">
                                          <User size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                          <span className="truncate">
                                            <strong className="text-gray-900 dark:text-white font-semibold">Assignee:</strong> {userName}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Briefcase size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                          <span className="truncate">
                                            <strong className="text-gray-900 dark:text-white font-semibold">Department:</strong> {typeof dept === 'string' ? dept : (dept.department || dept.mainRole || "Unknown")}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Footer: Date and optional processing durations */}
                                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#2A2F3A] flex flex-wrap items-center justify-between gap-2">
                                        <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                          <Clock size={12} />
                                          {dateText || "Pending timestamp"}
                                        </div>
                                        {dept.viewedAt && idx !== 0 && (
                                          <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-150 dark:border-blue-900/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1" title="Time taken to approve after viewing">
                                            <Clock size={11} className="animate-pulse" />
                                            Approved in {formatDuration(dept.viewedAt, dept.approvedAt)}
                                          </span>
                                        )}
                                      </div>

                                      {/* Decline/Improve remark details */}
                                      {isActive && selectedRequest.declineReason && (
                                        <div className="mt-4 p-4 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl flex gap-3 items-start animate-fadeIn">
                                          <AlertTriangle className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" size={18} />
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider">Remark / Feedback</span>
                                            <p className="text-xs text-red-700 dark:text-red-300 font-medium italic">
                                              "{selectedRequest.declineReason}"
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-[#161616]/50 p-8">
                  <MapPin size={48} className="mb-4 text-gray-300" strokeWidth={1.5} />
                  <p className="text-lg font-medium">{t('select_request')}</p>
                  <p className="text-sm max-w-sm">{t('select_instruction')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
