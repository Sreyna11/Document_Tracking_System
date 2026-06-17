"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, Check, Clock, AlertTriangle, FileText, Package, Navigation, Map as MapIcon, Play } from "lucide-react";
const DeliveryTruckAnimation = ({ currentStep, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);
  const i = currentStep;
  const isOdd = i % 2 !== 0;
  const baseY = 120 + (i-1)*128;
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
    const end = endStr ? new Date(endStr) : now;
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    
    const diffMs = Math.max(0, end - start);
    const diffSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const secs = diffSecs % 60;
    
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
              
              // Select first if none selected
              setSelectedRequest(prev => {
                if (!prev && myRequests.length > 0) return myRequests[0];
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
  }, [router]);
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
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full h-[calc(100vh-120px)] animate-fadeIn">
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full gap-6">
          
          {/* LEFT: Requests List */}
          <div className="w-full lg:w-[380px] bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200 dark:border-[#2c2c2e] flex flex-col flex-shrink-0 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-[#2c2c2e] bg-white dark:bg-[#1c1c1e]">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#161616] border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors font-medium text-gray-700"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-[#161616]/50">
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
                              className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                                isActive 
                                  ? "bg-white dark:bg-[#2c2c2e] border-blue-500 shadow-md ring-1 ring-blue-50 dark:ring-blue-500/20" 
                                  : "bg-white dark:bg-[#161616] border-transparent hover:border-gray-200 dark:hover:border-[#3f3f46] hover:shadow-sm"
                              }`}
                            >
                               <div className="flex justify-between items-start mb-3">
                                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">ID #{req.trackingNumber || req.id}</h3>
                                  
                                  <div className={`px-2.5 py-1 border rounded-md font-bold text-[10px] ${
                                     isCompleted ? "bg-green-50 border-green-200 text-green-700" :
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
                                  <p><span className="font-semibold text-gray-900 dark:text-white">Document Type:</span> {req.type || "Material Request"}</p>
                                  <p><span className="font-semibold text-gray-900 dark:text-white">Title:</span> {req.title || req.subject || "1 Air Conditioner"}</p>
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
          <div className="flex-1 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-sm border border-gray-200 dark:border-[#2c2c2e] flex flex-col overflow-hidden relative">
            {selectedRequest ? (
              <>
                {/* Header of Tracker */}
                <div className="p-6 md:p-8 border-b border-gray-100 dark:border-[#2c2c2e] bg-gradient-to-r from-blue-50/50 to-white dark:from-[#2c2c2e]/50 dark:to-[#1c1c1e] flex-shrink-0">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{selectedRequest.title || selectedRequest.subject || "1 Air Conditioner"}</h2>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">{t('tracking_id')} <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedRequest.trackingNumber || selectedRequest.id}</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shadow-inner">
                        <FileText size={24} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#2c2c2e] p-4 rounded-2xl border border-gray-100 dark:border-[#3f3f46] shadow-2xs flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#161616] flex items-center justify-center flex-shrink-0">
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
                <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-[#f8fafc] dark:bg-[#161616] flex justify-center items-start">
                  
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
                          <div className="relative w-full max-w-[160px] mx-auto py-12 mt-8 mb-24 overflow-visible">
                            {(!isCompleted) && (
                              <CurrentLocationMarker currentStep={currentStep} requestId={selectedRequest.id} />
                            )}
                            
                            {selectedRequest.path.map((dept, idx) => {
                              const isPast = idx < currentStep || isCompleted;
                              const isActive = idx === currentStep;
                              const isLast = idx === selectedRequest.path.length - 1;
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
                                } catch(e) {
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
                              const pinColors = ['bg-[#E84B7D]', 'bg-[#F28F1D]', 'bg-[#9D8DF1]', 'bg-[#40A9FF]', 'bg-[#36CFC9]'];
                              const pinColorClass = pinColors[idx % pinColors.length];
                              const lineColorClass = isPast || (isActive && isCompleted) ? "border-gray-900" : isActive && (isImprovement || isFailed) ? "border-red-600" : isActive ? "border-gray-900" : "border-gray-300";
                              const CardUI = () => (
                                <div className={`w-[200px] bg-white dark:bg-[#2c2c2e] p-3.5 rounded-xl border-t border-r border-b border-l-4 transition-all shadow-sm hover:shadow-md ${
                                  isActive ? "border-l-blue-500 border-t-blue-100 dark:border-t-blue-500/20 border-r-blue-100 dark:border-r-blue-500/20 border-b-blue-100 dark:border-b-blue-500/20 shadow-blue-500/10" : 
                                  isPast ? "border-l-gray-800 dark:border-l-gray-300 border-t-gray-100 dark:border-t-[#3f3f46] border-r-gray-100 dark:border-r-[#3f3f46] border-b-gray-100 dark:border-b-[#3f3f46]" :
                                  "border-l-gray-300 dark:border-l-[#3f3f46] border-t-gray-100 dark:border-t-[#3f3f46] border-r-gray-100 dark:border-r-[#3f3f46] border-b-gray-100 dark:border-b-[#3f3f46]"
                                }`}>
                                  <div className="flex flex-col gap-1.5 mb-4 text-left">
                                    <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                                      {idx === 0 ? "Request by :" : isPast ? "Approved by :" : (dept.assignedTo ? "Assigned to :" : "Pending at :")} <span className="font-semibold text-gray-500 dark:text-gray-400 ml-1">{userName}</span>
                                    </p>
                                    <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                                      From : <span className="font-semibold text-gray-500 dark:text-gray-400 ml-1">{typeof dept === 'string' ? dept : (dept.department || dept.mainRole || "Unknown")}</span>
                                    </p>
                                  </div>
                                  
                                  <div className="flex justify-between items-end mt-3">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-bold text-gray-500">
                                        {dateText}
                                      </span>
                                      {dept.viewedAt && idx !== 0 && (
                                        <span className="text-[9px] text-blue-500 font-bold mt-0.5 flex items-center gap-1" title="Time taken after viewing">
                                          <Clock size={10} />
                                          {formatDuration(dept.viewedAt, dept.approvedAt)}
                                        </span>
                                      )}
                                    </div>
                                    {isPast ? (
                                      <span className="text-[9px] font-bold text-green-700 border border-green-700 px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                        <Check size={10} /> {idx === 0 ? "Sent" : "Approved"}
                                      </span>
                                    ) : isActive ? (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase flex items-center gap-1 ${
                                        isCompleted ? "text-green-700 border-green-700" : 
                                        isFailed ? "text-red-700 border-red-700" :
                                        isImprovement ? "text-purple-700 border-purple-700" : "text-yellow-700 border-yellow-700"
                                      }`}>
                                        {isCompleted ? <><Check size={10} /> {idx === 0 ? "Sent" : "Approved"}</> : isFailed ? "Rejected" : isImprovement ? "Returned" : "Pending"}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold text-gray-400 border border-gray-300 px-1.5 py-0.5 rounded uppercase">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                              return (
                                <div key={idx} className="w-full relative flex flex-col items-center">
                                  {isRightCurve ? (
                                    <div className={`w-1/2 ml-[50%] border-t-[16px] border-r-[16px] ${lineColorClass} rounded-tr-[40px] rounded-br-[40px] ${
                                      isLast ? 'border-b-0 h-24 rounded-br-none' : 'border-b-[16px] h-36'
                                    } relative ${idx !== 0 ? '-mt-[16px]' : ''}`}>
                                      
                                      {/* Dashed Center Line */}
                                      <div className={`absolute top-[-10px] bottom-[-10px] left-0 right-[-10px] border-t-[2px] border-r-[2px] border-dashed border-white rounded-tr-[40px] rounded-br-[40px] pointer-events-none ${
                                        isLast ? 'border-b-0 rounded-br-none' : 'border-b-[2px]'
                                      }`} />
                                      {/* Pin on the Right (pointing left) */}
                                      <div className={`absolute right-[0px] translate-x-[45px] top-1/2 -translate-y-1/2 z-20`}>
                                        <div className={`w-[44px] h-[44px] rounded-tl-full rounded-tr-full rounded-br-full rounded-bl-none rotate-45 flex items-center justify-center shadow-md transition-colors duration-500 ${pinColorClass}`}>
                                          <div className="w-[28px] h-[28px] bg-white dark:bg-[#1c1c1e] rounded-full -rotate-45 flex items-center justify-center shadow-inner">
                                            <span className="text-lg font-black text-gray-900 dark:text-white">{idx + 1}</span>
                                          </div>
                                        </div>
                                      </div>
                                      {/* Card on the Right */}
                                      <div className="absolute left-full ml-[50px] top-1/2 -translate-y-1/2 z-30">
                                        <CardUI />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={`w-1/2 mr-[50%] border-t-[16px] border-l-[16px] ${lineColorClass} rounded-tl-[40px] rounded-bl-[40px] ${
                                      isLast ? 'border-b-0 h-24 rounded-bl-none' : 'border-b-[16px] h-36'
                                    } relative -mt-[16px]`}>
                                      
                                      {/* Dashed Center Line */}
                                      <div className={`absolute top-[-10px] bottom-[-10px] right-0 left-[-10px] border-t-[2px] border-l-[2px] border-dashed border-white rounded-tl-[40px] rounded-bl-[40px] pointer-events-none ${
                                        isLast ? 'border-b-0 rounded-bl-none' : 'border-b-[2px]'
                                      }`} />
                                      {/* Pin on the Left (pointing right) */}
                                      <div className={`absolute left-[0px] -translate-x-[45px] top-1/2 -translate-y-1/2 z-20`}>
                                        <div className={`w-[44px] h-[44px] rounded-tl-full rounded-tr-full rounded-bl-full rounded-br-none -rotate-45 flex items-center justify-center shadow-md transition-colors duration-500 ${pinColorClass}`}>
                                          <div className="w-[28px] h-[28px] bg-white dark:bg-[#1c1c1e] rounded-full rotate-45 flex items-center justify-center shadow-inner">
                                            <span className="text-lg font-black text-gray-900 dark:text-white">{idx + 1}</span>
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
  );
}
