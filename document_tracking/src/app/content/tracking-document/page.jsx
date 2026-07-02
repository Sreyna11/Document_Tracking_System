"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../context/LanguageContext";
import { hasPermission } from "../../../utils/permissions";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import { MapPin, Search, Check, Clock, AlertTriangle, FileText, Package, Navigation, Map as MapIcon, Play, Send, CheckCircle, DownloadCloud } from "lucide-react";
import { useDocuments } from '../../../hooks/useDocuments';
import { useAccounts } from '../../../hooks/useAccounts';

const DeliveryTruckAnimation = ({ currentStep, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);
  const i = currentStep;
  const isOdd = i % 2 !== 0;
  const baseY = 120 + (i - 1) * 128;
  const kfName = isOdd ? `driveOdd_${i}` : `driveEven_${i}`;
  const keyframes = isOdd ? `
    @keyframes ${kfName} {
      0% { transform: translate(183px, ${baseY}px) translate(-50%, -50%) rotate(-90deg); opacity: 0; }
      10% { transform: translate(152px, ${baseY}px) translate(-50%, -50%) rotate(-90deg); opacity: 1; }
      11% { transform: translate(152px, ${baseY}px) translate(-50%, -50%) rotate(180deg); }
      30% { transform: translate(152px, ${baseY + 64}px) translate(-50%, -50%) rotate(180deg); }
      31% { transform: translate(152px, ${baseY + 64}px) translate(-50%, -50%) rotate(-90deg); }
      70% { transform: translate(8px, ${baseY + 64}px) translate(-50%, -50%) rotate(-90deg); }
      71% { transform: translate(8px, ${baseY + 64}px) translate(-50%, -50%) rotate(180deg); }
      89% { transform: translate(8px, ${baseY + 128}px) translate(-50%, -50%) rotate(180deg); }
      90% { transform: translate(8px, ${baseY + 128}px) translate(-50%, -50%) rotate(-90deg); }
      100% { transform: translate(-23px, ${baseY + 128}px) translate(-50%, -50%) rotate(-90deg); opacity: 1; }
    }
  ` : `
    @keyframes ${kfName} {
      0% { transform: translate(-23px, ${baseY}px) translate(-50%, -50%) rotate(90deg); opacity: 0; }
      10% { transform: translate(8px, ${baseY}px) translate(-50%, -50%) rotate(90deg); opacity: 1; }
      11% { transform: translate(8px, ${baseY}px) translate(-50%, -50%) rotate(180deg); }
      30% { transform: translate(8px, ${baseY + 64}px) translate(-50%, -50%) rotate(180deg); }
      31% { transform: translate(8px, ${baseY + 64}px) translate(-50%, -50%) rotate(90deg); }
      70% { transform: translate(152px, ${baseY + 64}px) translate(-50%, -50%) rotate(90deg); }
      71% { transform: translate(152px, ${baseY + 64}px) translate(-50%, -50%) rotate(180deg); }
      89% { transform: translate(152px, ${baseY + 128}px) translate(-50%, -50%) rotate(180deg); }
      90% { transform: translate(152px, ${baseY + 128}px) translate(-50%, -50%) rotate(90deg); }
      100% { transform: translate(183px, ${baseY + 128}px) translate(-50%, -50%) rotate(90deg); opacity: 1; }
    }
  `;
  return (
    <>
      <style>{keyframes}</style>
      <div
        className="absolute top-0 left-0 w-8 h-8 z-50 text-blue-600 bg-white rounded-full shadow-[0_0_15px_rgba(37,99,235,0.8)] flex items-center justify-center border-2 border-blue-600"
        style={{ animation: `${kfName} 2.5s linear forwards` }}
      >
        <Navigation size={14} />
      </div>
    </>
  );
};
const CurrentLocationMarker = ({ currentStep, requestId }) => {
  const [isAnimating, setIsAnimating] = useState(currentStep > 0);
  useEffect(() => {
    setIsAnimating(currentStep > 0);
  }, [currentStep, requestId]);
  if (isAnimating) {
    return <DeliveryTruckAnimation currentStep={currentStep} onComplete={() => setIsAnimating(false)} />;
  }
  const i = currentStep;
  const isOdd = i % 2 !== 0;
  const y = 120 + i * 128;
  const x = isOdd ? -23 : 183;
  return (
    <div
      className="absolute w-12 h-12 z-50 rounded-full flex items-center justify-center animate-pulse"
      style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`, top: 0, left: 0 }}
    >
      <div className="absolute inset-0 bg-blue-500 opacity-30 rounded-full animate-ping"></div>
      <div className="relative w-8 h-8 bg-blue-600 text-white rounded-full shadow-[0_0_15px_rgba(37,99,235,0.8)] flex items-center justify-center border-2 border-white">
        <Package size={16} />
      </div>
    </div>
  );
};
export default function TrackingPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const { data: requestsData = [] } = useDocuments();
  const rawRequests = Array.isArray(requestsData) ? requestsData : [];
  
  const requests = useMemo(() => {
    if (!currentUser) return [];
    // System Admin sees all, others see only their department's requests unless they have View Any permission
    const isGlobalSuperAdmin = currentUser?.email === "admin@rupp.edu.kh";

    const myRequests = rawRequests.filter(req => {
      if (isGlobalSuperAdmin) return true;
      const sEmail = (req.senderEmail || "").toLowerCase().trim();
      const uEmail = (currentUser?.email || "").toLowerCase().trim();
      if (sEmail && uEmail && sEmail === uEmail) return true;

      const sName = (req.senderName || "").toLowerCase().trim();
      const uName = (currentUser?.username || currentUser?.name || "").toLowerCase().trim();
      if (sName && uName && sName === uName) return true;

      return false;
    });
    return myRequests;
  }, [rawRequests, currentUser]);

  const { data: usersList = [] } = useAccounts();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [now, setNow] = useState(new Date());
  const { t, language } = useLanguage();

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
            const timeVal = new Date(p.approvedAt).getTime();
            if (!isNaN(timeVal) && timeVal > maxTime) maxTime = timeVal;
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
      

    }
  }, [router]);

  useEffect(() => {
    if (!selectedRequest && requests.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const idFromUrl = urlParams.get("id");
      if (idFromUrl) {
        const found = requests.find(r => String(r.id) === idFromUrl);
        if (found) setSelectedRequest(found);
      } else {
        setSelectedRequest(requests[0]);
      }
    }
  }, [requests, selectedRequest]);
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
      if (user) return language === 'kh' ? (user.fullname_kh || user.fullname_en || user.username) : (user.fullname_en || user.fullname_kh || user.username);
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
                          {items.map((req, idx) => {
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
                                key={req.id ? `track-req-${req.id}-${idx}` : `track-idx-${idx}`}
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
                                    {isCompleted ? (t("completed_stat") || "Completed") :
                                      isFailed ? (t("rejected") || "Rejected") :
                                        isImprove ? (isSender ? `${t("returned") || "Returned"} ${t("from")?.toLowerCase() || "from"} ${req.path && req.path[req.currentStepIndex || 0] ? (typeof req.path[req.currentStepIndex || 0] === 'string' ? req.path[req.currentStepIndex || 0] : req.path[req.currentStepIndex || 0].department || req.path[req.currentStepIndex || 0].mainRole) : "Unknown"}` : `${t("returned") || "Returned"} ${t("to")?.toLowerCase() || "to"} ${req.senderDepartment || "Sender"}`) :
                                          `${t("pending") || "Pending"} ${req.path && req.path[req.currentStepIndex || 0] ? (typeof req.path[req.currentStepIndex || 0] === 'string' ? req.path[req.currentStepIndex || 0] : req.path[req.currentStepIndex || 0].department || req.path[req.currentStepIndex || 0].mainRole) : "Unknown"}`}
                                  </div>
                                </div>

                                <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                                  <p><span className="font-semibold text-gray-900 dark:text-white">{t("title") || "Title"}:</span> {req.title || req.subject}</p>
                                  <p><span className="font-semibold text-gray-900 dark:text-white">To Dept:</span> {req.toDepartment || req.to || req.receiverDepartment || "—"}</p>
                                  <p>
                                    <span className="font-semibold text-gray-900 dark:text-white">File:</span>{' '}
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {Array.isArray(req.files) ? req.files.map(f => f.name).join(', ') : (req.files || "No File")}
                                    </span>
                                  </p>
                                  <p><span className="font-semibold text-gray-900 dark:text-white">{t("date") || "Date"}:</span> {formattedDateString} at {finalTime}</p>
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
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">
                          {t('tracking_id')} <span className="text-blue-600 dark:text-blue-400 font-bold mr-4">{selectedRequest.trackingNumber || selectedRequest.id}</span>
                          {(() => {
                            if (!selectedRequest.dueDate || selectedRequest.status === "Completed" || selectedRequest.status === "Failed") return null;
                            const now = new Date();
                            const due = new Date(selectedRequest.dueDate);
                            const diffTime = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                            if (diffTime < 0) return <span className="px-2 py-1 rounded bg-red-100 text-red-600 text-xs font-bold dark:bg-red-900/40 dark:text-red-400">Overdue by {Math.abs(diffTime)}d</span>;
                            if (diffTime <= 1) return <span className="px-2 py-1 rounded bg-orange-100 text-orange-600 text-xs font-bold dark:bg-orange-900/40 dark:text-orange-400">Due in {diffTime}d</span>;
                            return <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs font-bold dark:bg-gray-800 dark:text-gray-400">Due in {diffTime}d</span>;
                          })()}
                        </p>
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
                          {selectedRequest.status === "Completed" ? (t("completed_stat") || "Completed") :
                            selectedRequest.status === "Assigned to Improve" ? (((currentUser?.department || currentUser?.mainRole || "global").toLowerCase().trim() === (selectedRequest.senderDepartment || "").toLowerCase().trim() || (currentUser?.email || "").toLowerCase().trim() === (selectedRequest.senderEmail || "").toLowerCase().trim()) ? `${t("returned") || "Returned"} ${t("from")?.toLowerCase() || "from"} ${selectedRequest.path && selectedRequest.path[selectedRequest.currentStepIndex || 0] ? (typeof selectedRequest.path[selectedRequest.currentStepIndex || 0] === 'string' ? selectedRequest.path[selectedRequest.currentStepIndex || 0] : selectedRequest.path[selectedRequest.currentStepIndex || 0].department || selectedRequest.path[selectedRequest.currentStepIndex || 0].mainRole) : "Unknown"}` : `${t("returned") || "Returned"} ${t("to")?.toLowerCase() || "to"} ${selectedRequest.senderDepartment || "Sender"}`) :
                              selectedRequest.status === "Failed" ? (t("rejected") || "Rejected") :
                                `${t("pending") || "Pending"} ${selectedRequest.path && selectedRequest.path[selectedRequest.currentStepIndex || 0] ? (typeof selectedRequest.path[selectedRequest.currentStepIndex || 0] === 'string' ? selectedRequest.path[selectedRequest.currentStepIndex || 0] : selectedRequest.path[selectedRequest.currentStepIndex || 0].department || selectedRequest.path[selectedRequest.currentStepIndex || 0].mainRole) : "Unknown"}`}
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
                          const getEnglishName = (name) => {
                            if (!name) return "Unknown User";
                            const englishOnly = name.replace(/[\u1780-\u17FF\u19E0-\u19FF]+/g, '').trim();
                            return englishOnly || name;
                          };

                          const visualCurrentStep = (selectedRequest.currentStepIndex || 0) + 1;
                          const targetName = getEnglishName(selectedRequest?.senderName || "").toLowerCase().trim();
                          const senderNodeUser = targetName ? usersList.find(u => {
                            const fEn = getEnglishName(u.fullname_en || "").toLowerCase().trim();
                            const fKh = getEnglishName(u.fullname_kh || "").toLowerCase().trim();
                            const uName = getEnglishName(u.username || u.name || "").toLowerCase().trim();
                            if (fEn === targetName || fKh === targetName || uName === targetName) return true;
                            const fEnParts = fEn.split(' ');
                            const fKhParts = fKh.split(' ');
                            return fEnParts.includes(targetName) || fKhParts.includes(targetName);
                          }) : null;
                          const displaySenderPhoto = (senderNodeUser && (senderNodeUser.profilePhoto || senderNodeUser.photo)) ? (senderNodeUser.profilePhoto || senderNodeUser.photo) : (selectedRequest?.senderPhoto || null);

                          const visualPath = selectedRequest.path ? [
                            {
                              isSenderNode: true,
                              userSign: selectedRequest?.senderName || 'Unknown',
                              department: selectedRequest?.senderDepartment || 'Unknown',
                              mainRole: selectedRequest?.senderRole || 'Staff',
                              photo: displaySenderPhoto,
                              approvedAt: `${selectedRequest.date} ${selectedRequest.time || ''}`.trim()
                            },
                            ...selectedRequest.path
                          ] : [];

                          return (
                            <div className="relative w-full max-w-[160px] mx-auto py-12 mt-8 mb-24 overflow-visible">
                              {(!isCompleted && !isFailed) && (
                                <CurrentLocationMarker currentStep={visualCurrentStep} requestId={selectedRequest.id} />
                              )}

                              {visualPath.map((dept, idx) => {
                                const isPast = idx < visualCurrentStep || isCompleted;
                                const isActive = idx === visualCurrentStep;
                                const isLast = idx === visualPath.length - 1;
                                const isRightCurve = idx % 2 === 0;

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
                                const matchedUser = (() => {
                                  if (dept.isSenderNode) return senderNodeUser;
                                  if (dept.assignedTo) {
                                    const aName = getEnglishName(dept.assignedTo.name).toLowerCase().trim();
                                    return usersList.find(u => {
                                      const fEn = getEnglishName(u.fullname_en || "").toLowerCase().trim();
                                      const fKh = getEnglishName(u.fullname_kh || "").toLowerCase().trim();
                                      const uName = getEnglishName(u.username || u.name || "").toLowerCase().trim();
                                      return fEn === aName || fKh === aName || uName === aName;
                                    });
                                  }
                                  let targetName = "";
                                  if (idx === 1 && selectedRequest.createdBy && !selectedRequest.path[0]?.assignedTo) {
                                    targetName = getEnglishName(selectedRequest.createdBy).toLowerCase().trim();
                                  } else if (isLast && isCompleted && selectedRequest.completedBy) {
                                    targetName = getEnglishName(selectedRequest.completedBy).toLowerCase().trim();
                                  }
                                  if (targetName) {
                                    const found = usersList.find(u => {
                                      const fEn = getEnglishName(u.fullname_en || "").toLowerCase().trim();
                                      const fKh = getEnglishName(u.fullname_kh || "").toLowerCase().trim();
                                      const uName = getEnglishName(u.username || u.name || "").toLowerCase().trim();
                                      return fEn === targetName || fKh === targetName || uName === targetName;
                                    });
                                    if (found) return found;
                                  }
                                  const roleStr = typeof dept === 'string' ? dept : (dept.department || dept.mainRole || "");
                                  if (roleStr) {
                                    const target = roleStr.toLowerCase().trim();
                                    return usersList.find(u => {
                                      const deptName = typeof u.department === 'object' && u.department ? u.department.name : (u.department || u.mainRole || "");
                                      if (deptName.toLowerCase().trim() === target) return true;
                                      if (u.roles && u.roles.length > 0) {
                                        return u.roles.some(r => r.name.toLowerCase().includes(target) || (r.department && r.department.name && r.department.name.toLowerCase().trim() === target));
                                      }
                                      return false;
                                    });
                                  }
                                  return null;
                                })();

                                const userName = (() => {
                                  if (dept.isSenderNode) return getEnglishName(dept.userSign || selectedRequest.senderName);
                                  if (dept.assignedTo) return getEnglishName(dept.assignedTo.name);
                                  if (idx === 1 && selectedRequest.createdBy && !selectedRequest.path[0]?.assignedTo) return getEnglishName(selectedRequest.createdBy);
                                  if (isLast && isCompleted && selectedRequest.completedBy) return getEnglishName(selectedRequest.completedBy);
                                  if (matchedUser) {
                                    return getEnglishName(language === 'kh' ? (matchedUser.fullname_kh || matchedUser.fullname_en) : (matchedUser.fullname_en || matchedUser.fullname_kh || matchedUser.username));
                                  }
                                  return "Unknown User";
                                })();

                                const userPhoto = dept.isSenderNode ? dept.photo : (matchedUser?.profilePhoto || matchedUser?.photo || dept.photo || null);

                                const pinColors = ['bg-[#E84B7D]', 'bg-[#F28F1D]', 'bg-[#9D8DF1]', 'bg-[#40A9FF]', 'bg-[#36CFC9]'];
                                const pinColorClass = dept.isSenderNode ? 'bg-[#008000]' : pinColors[(idx - 1 + pinColors.length) % pinColors.length];
                                const lineColorClass = isPast || (isActive && isCompleted) ? "border-gray-900 dark:border-gray-400" : isActive && (isImprovement || isFailed) ? "border-red-600 dark:border-red-500" : isActive ? "border-gray-900 dark:border-gray-400" : "border-gray-300 dark:border-[#2A2F3A]";
                                const CardUI = () => (
                                  <div className={`w-[200px] bg-white dark:bg-[#161B22] p-3.5 rounded-xl border-t border-r border-b transition-all shadow-sm hover:shadow-md ${dept.isSenderNode ? "border-l-4 border-l-green-500 border-t-green-100 dark:border-t-green-500/20 border-r-green-100 dark:border-r-green-500/20 border-b-green-100 dark:border-b-green-500/20" :
                                      isActive ? "border-l-4 border-l-blue-500 border-t-blue-100 dark:border-t-blue-500/20 border-r-blue-100 dark:border-r-blue-500/20 border-b-blue-100 dark:border-b-blue-500/20 shadow-blue-500/10" :
                                        isPast ? "border-l-4 border-l-gray-800 dark:border-l-gray-400 border-t-gray-100 dark:border-t-[#2A2F3A] border-r-gray-100 dark:border-r-[#2A2F3A] border-b-gray-100 dark:border-b-[#2A2F3A]" :
                                          "border-l-4 border-l-gray-300 dark:border-l-[#2A2F3A] border-t-gray-100 dark:border-t-[#2A2F3A] border-r-gray-100 dark:border-r-[#2A2F3A] border-b-gray-100 dark:border-b-[#2A2F3A]"
                                    }`}>
                                    <div className="flex flex-col gap-1.5 mb-2 text-left">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0 shadow-sm">
                                          {userPhoto ? (
                                            <img src={userPhoto} alt="User Avatar" className="w-full h-full object-cover" />
                                          ) : (
                                            <svg className="w-full h-full text-gray-400 p-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                                        {dept.isSenderNode ? (t("request_by") || "Request by") + " :" : isPast ? (t("approved_by") || "Approved by") + " :" : isActive ? (dept.assignedTo ? (t("assigned_to") || "Assigned to") + " :" : (t("pending_at") || "Pending at") + " :") : (t("next_approver") || "Next approver") + " :"} <span className="font-semibold text-gray-500 dark:text-gray-400 ml-1">{userName}</span>
                                      </p>
                                      <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                                        {(t("from") || "From")} : <span className="font-semibold text-gray-500 dark:text-gray-400 ml-1">{typeof dept === 'string' ? dept : (dept.department || dept.mainRole || "Unknown")}</span>
                                      </p>
                                      <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 mt-0.5 truncate w-full">
                                        Role: <span className="font-semibold text-gray-500 dark:text-gray-400 ml-1">{(() => {
                                          if (matchedUser) {
                                            const actualRole = (matchedUser.roles && matchedUser.roles.length > 0) ? matchedUser.roles[0].name : matchedUser.role;
                                            if (actualRole) return actualRole;
                                          }
                                          if (typeof dept !== 'string' && dept.role) return dept.role;
                                          return "Staff";
                                        })()}</span>
                                      </p>
                                    </div>

                                    <div className="flex justify-between items-end mt-3 pt-2 border-t border-gray-100 dark:border-[#2A2F3A]/50">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-gray-500">
                                          {dateText}
                                        </span>
                                        {dept.viewedAt && !dept.isSenderNode && (
                                          <span className="text-[9px] text-blue-500 font-bold flex items-center gap-1" title="Time taken after viewing">
                                            <Clock size={10} />
                                            {formatDuration(dept.viewedAt, dept.approvedAt)}
                                          </span>
                                        )}
                                      </div>
                                      {dept.isSenderNode ? (
                                        <span className="text-[9px] font-bold text-green-700 border border-green-700 px-1.5 py-0.5 rounded uppercase flex items-center gap-1 bg-green-50 dark:bg-green-900/20 shrink-0">
                                          <Check size={10} /> {(t("sent") || "Sent")}
                                        </span>
                                      ) : isPast ? (
                                        <span className="text-[9px] font-bold text-green-700 border border-green-700 px-1.5 py-0.5 rounded uppercase flex items-center gap-1 shrink-0">
                                          <Check size={10} /> {idx === 0 ? (t("sent") || "Sent") : (t("approved") || "Approved")}
                                        </span>
                                      ) : isActive ? (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase flex items-center gap-1 shrink-0 ${isCompleted ? "text-green-700 border-green-700" :
                                            isFailed ? "text-red-700 border-red-700" :
                                              isImprovement ? "text-purple-700 border-purple-700" : "text-yellow-700 border-yellow-700"
                                          }`}>
                                          {isCompleted ? <><Check size={10} /> {idx === 0 ? (t("sent") || "Sent") : (t("approved") || "Approved")}</> : isFailed ? (t("rejected") || "Rejected") : isImprovement ? (t("returned") || "Returned") : (t("pending") || "Pending")}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-bold text-gray-400 border border-gray-300 px-1.5 py-0.5 rounded uppercase shrink-0">
                                          {t("pending") || "Pending"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                                return (
                                  <div key={idx} className="w-full relative flex flex-col items-center">
                                    {isRightCurve ? (
                                      <div className={`w-[calc(50%+1px)] ml-[calc(50%-1px)] border-t-[16px] border-r-[16px] ${lineColorClass} rounded-tr-[40px] rounded-br-[40px] ${isLast ? 'border-b-0 h-24 rounded-br-none' : 'border-b-[16px] h-36'
                                        } relative ${idx !== 0 ? '-mt-[16px]' : ''}`}>

                                        {/* Dashed Center Line */}
                                        <div className={`absolute top-[-9px] bottom-[-9px] left-0 right-[-9px] border-t-[2px] border-r-[2px] border-dashed border-white rounded-tr-[40px] rounded-br-[40px] pointer-events-none ${isLast ? 'border-b-0 rounded-br-none' : 'border-b-[2px]'
                                          }`} />
                                        {/* Pin on the Right (pointing left) */}
                                        <div className={`absolute right-[0px] translate-x-[45px] top-1/2 -translate-y-1/2 z-20`}>
                                          <div className={`w-[44px] h-[44px] rounded-tl-full rounded-tr-full rounded-br-full rounded-bl-none rotate-45 flex items-center justify-center shadow-md transition-colors duration-500 ${pinColorClass}`}>
                                            <div className="w-[28px] h-[28px] bg-white dark:bg-[#0F1117] rounded-full -rotate-45 flex items-center justify-center shadow-inner">
                                              <span className="text-lg font-black text-gray-900 dark:text-white">
                                                {dept.isSenderNode ? <Send size={14} className="text-[#008000] ml-0.5 mt-0.5" /> : idx}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Card on the Right */}
                                        <div className="absolute left-full ml-[50px] top-1/2 -translate-y-1/2 z-30">
                                          <CardUI />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={`w-[calc(50%+1px)] mr-[calc(50%-1px)] border-t-[16px] border-l-[16px] ${lineColorClass} rounded-tl-[40px] rounded-bl-[40px] ${isLast ? 'border-b-0 h-24 rounded-bl-none' : 'border-b-[16px] h-36'
                                        } relative -mt-[16px]`}>

                                        {/* Dashed Center Line */}
                                        <div className={`absolute top-[-9px] bottom-[-9px] right-0 left-[-9px] border-t-[2px] border-l-[2px] border-dashed border-white rounded-tl-[40px] rounded-bl-[40px] pointer-events-none ${isLast ? 'border-b-0 rounded-bl-none' : 'border-b-[2px]'
                                          }`} />
                                        {/* Pin on the Left (pointing right) */}
                                        <div className={`absolute left-[0px] -translate-x-[45px] top-1/2 -translate-y-1/2 z-20`}>
                                          <div className={`w-[44px] h-[44px] rounded-tl-full rounded-tr-full rounded-bl-full rounded-br-none -rotate-45 flex items-center justify-center shadow-md transition-colors duration-500 ${pinColorClass}`}>
                                            <div className="w-[28px] h-[28px] bg-white dark:bg-[#0F1117] rounded-full rotate-45 flex items-center justify-center shadow-inner">
                                              <span className="text-lg font-black text-gray-900 dark:text-white">
                                                {dept.isSenderNode ? <Send size={14} className="text-[#008000] ml-0.5 mt-0.5" /> : idx}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Card on the Left */}
                                        <div className="absolute right-full mr-[50px] top-1/2 -translate-y-1/2 z-30">
                                          <CardUI />
                                        </div>
                                      </div>
                                    )}
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