"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import BulkActionBar from "../../components/BulkActionBar";
import Pagination from "../../components/Pagination";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import { Inbox, MoreVertical, Search, FileText, Calendar, Paperclip, ImageIcon } from "lucide-react";
export default function SentPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  // Data states
  const [requests, setRequests] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  // Selection state
  const [selectedRows, setSelectedRows] = useState([]);
  // Custom Delete Confirmation State
  const [deleteModalConfig, setDeleteModalConfig] = useState({
    isOpen: false,
    isBulk: false,
    id: null,
  });
  // Preview overlay modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeFileDataUrl, setActiveFileDataUrl] = useState(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const smallDocxContainerRef = useRef(null);
  const modalDocxContainerRef = useRef(null);
  const dataURLtoBlob = (dataurl) => {
    try {
      const arr = dataurl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) return null;
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.error(e);
      return null;
    }
  };
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/");
    } else {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      setIsMounted(true);
      // Load requests from localStorage
      try {
        const stored = localStorage.getItem("doc_tracking_requests");
        if (stored) {
          const parsed = JSON.parse(stored);
          setRequests(Array.isArray(parsed) ? parsed : []);
        }
      } catch (e) {
        console.error("Error loading requests from localStorage", e);
      }
      // Load users from localStorage for profile photos
      try {
        const storedUsers = localStorage.getItem("doc_tracking_users");
        if (storedUsers) {
          const parsed = JSON.parse(storedUsers);
          setUsersList(Array.isArray(parsed) ? parsed : []);
        }
      } catch (e) {
        console.error("Error loading users from localStorage", e);
      }
    }
    // Real-time tracking without refresh
    const handleStorageChange = (e) => {
      if (e.key === "doc_tracking_requests") {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            setRequests(Array.isArray(parsed) ? parsed : []);
          } else {
            setRequests([]);
          }
        } catch (error) {
          console.error("Error parsing real-time requests update:", error);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [router]);
  const getSenderPhoto = (req) => {
    if (!req) return null;
    // 1. Try to find the user in doc_tracking_users by matching email or username
    if (usersList.length > 0) {
      const matched = usersList.find(
        (u) =>
          (req.senderEmail && u.email?.toLowerCase().trim() === req.senderEmail.toLowerCase().trim()) ||
          (`${u.firstName} ${u.lastName}`.toLowerCase().trim() === req.senderName?.toLowerCase().trim())
      );
      if (matched && matched.profilePhoto) {
        return matched.profilePhoto;
      }
    }
    // 2. Try the request's inlined senderPhoto
    if (req.senderPhoto) {
      return req.senderPhoto;
    }
    // 3. Fallback to currentUser's photo if this request is from currentUser
    if (currentUser && (req.senderEmail === currentUser.email || req.senderName === currentUser.username)) {
      if (currentUser.profilePhoto) return currentUser.profilePhoto;
    }
    return null;
  };
  const getRoleString = (step) => {
    if (!step) return "Unknown";
    return typeof step === 'string' ? step : step.mainRole || "Unknown";
  };
  const getReceiverName = (req) => {
    if (!req || !req.path || req.path.length === 0) return "Unknown";
    // Show the final destination as the receiver
    return getRoleString(req.path[req.path.length - 1]);
  };
  const getCurrentLocation = (req) => {
    if (!req) return "Unknown";
    if (req.status === "Completed") return "Completed";
    if (req.status === "Assigned to Improve") return req.improveAssignedTo || "Sender";
    if (req.status === "Failed") return "Declined";
    if (req.path && req.path.length > 0) {
      return getRoleString(req.path[Math.min(req.currentStepIndex || 0, req.path.length - 1)]);
    }
    return "Unknown";
  };
  // Filter requests based on logged in user and search term
  useEffect(() => {
    if (!currentUser) return;
    // 1. Filter: show ONLY if user is the original creator
    let list = requests.filter((req) => {
      return req.senderName === currentUser.username || req.senderEmail === currentUser.email;
    });
    // Ensure we do not fallback to 'requests' if list is empty. An empty list is a valid state for receivers.
    // 2. Filter by search term
    if (searchTerm.trim() !== "") {
      const lower = searchTerm.toLowerCase();
      list = list.filter(
        (req) =>
          (req.subject || "").toLowerCase().includes(lower) ||
          (req.trackingNumber || "").toLowerCase().includes(lower) ||
          (req.description || "").toLowerCase().includes(lower) ||
          (req.senderName || "").toLowerCase().includes(lower)
      );
    }
    setFilteredRequests(list);
    setCurrentPage(1);
  }, [requests, currentUser, searchTerm]);
  useEffect(() => {
    if (selectedRequest) {
      setActiveFileIndex(0);
    }
  }, [selectedRequest]);
  // Load actual file dataUrl from IndexedDB when a request is selected
  useEffect(() => {
    if (selectedRequest) {
      const files = selectedRequest.files || [];
      const inlined = files[activeFileIndex]?.dataUrl;
      if (inlined) {
        setActiveFileDataUrl(inlined);
      } else if (activeFileIndex === (files.length > 0 ? files.length - 1 : 0)) {
        getFileFromIndexedDB(selectedRequest.id).then((url) => {
          setActiveFileDataUrl(url || null);
        });
      } else {
        setActiveFileDataUrl(null);
      }
    } else {
      setActiveFileDataUrl(null);
    }
  }, [selectedRequest, activeFileIndex]);
  useEffect(() => {
    if (selectedRequest && activeFileDataUrl) {
      const files = selectedRequest.files || [];
      const activeFile = files[activeFileIndex] || files[0];
      const ext = getFileExtension(activeFile?.name);
      if (ext === "docx") {
        const blob = dataURLtoBlob(activeFileDataUrl);
        if (blob) {
          import("docx-preview").then((docx) => {
            const options = { inWrapper: false, ignoreWidth: false, ignoreHeight: false };
            if (smallDocxContainerRef.current) {
              docx.renderAsync(blob, smallDocxContainerRef.current, null, options).then(() => {
                const sections = smallDocxContainerRef.current.querySelectorAll('section');
                const parentWidth = smallDocxContainerRef.current.clientWidth - 16;
                const zoomLevel = Math.min(1, parentWidth / 816).toFixed(2);
                sections.forEach(section => {
                  section.style.zoom = zoomLevel;
                });
              }).catch(console.error);
            }
            if (isPreviewOpen && modalDocxContainerRef.current) {
              docx.renderAsync(blob, modalDocxContainerRef.current, null, options).then(() => {
                const sections = modalDocxContainerRef.current.querySelectorAll('section');
                const parentWidth = modalDocxContainerRef.current.clientWidth - 32;
                const zoomLevel = Math.min(1, parentWidth / 816).toFixed(2);
                sections.forEach(section => {
                  section.style.zoom = zoomLevel;
                });
              }).catch(console.error);
            }
          });
        }
      }
    }
  }, [activeFileDataUrl, isPreviewOpen, selectedRequest, activeFileIndex]);
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "124.5 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
  const getFileExtension = (name) => {
    if (!name) return "pdf";
    const parts = name.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  };
  const getFileFromIndexedDB = (id) => {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open("DocTrackingDB", 1);
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains("files")) {
            db.createObjectStore("files");
          }
        };
        request.onsuccess = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains("files")) {
            resolve(null);
            return;
          }
          const transaction = db.transaction("files", "readonly");
          const store = transaction.objectStore("files");
          const getReq = store.get(id);
          getReq.onsuccess = () => resolve(getReq.result);
          getReq.onerror = () => resolve(null);
        };
        request.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  };
  const handleDownload = (e) => {
    if (e) e.stopPropagation();
    if (!selectedRequest) return;
    const file = selectedRequest.files && selectedRequest.files[0];
    if (activeFileDataUrl) {
      const a = document.createElement("a");
      a.href = activeFileDataUrl;
      a.download = file ? file.name : activeFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const fileContent = `Document Tracking Request Details\n` +
        `=================================\n\n` +
        `Tracking Number: ${selectedRequest.trackingNumber}\n` +
        `Type Document  : ${selectedRequest.subject}\n` +
        `Department     : ${selectedRequest.senderDepartment}\n` +
        `Sender Name    : ${selectedRequest.senderName} (${selectedRequest.senderRole || "User"})\n` +
        `Submitted Date : ${selectedRequest.date} ${selectedRequest.time || ""}\n` +
        `Current Status : ${selectedRequest.status}\n\n` +
        `Description:\n` +
        `------------\n` +
        `${selectedRequest.description || "No description provided."}\n\n` +
        `Workflow Path Sequence:\n` +
        `-----------------------\n` +
        `${selectedRequest.path ? selectedRequest.path.map(p => typeof p === 'string' ? p : p.mainRole).join(" -> ") : "N/A"}\n\n` +
        `Generated by RUPP Doc Tracking System.`;
      const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = activeFileName.toLowerCase().endsWith(".txt") ? activeFileName : `${activeFileName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  const handleSelectAll = () => {
    setSelectedRows(currentItems.map(req => req.id));
  };
  const handleDeselectAll = () => {
    setSelectedRows([]);
  };
  const handleDeleteSelected = () => {
    if (selectedRows.length > 0) {
      setDeleteModalConfig({ isOpen: true, isBulk: true, id: null });
    }
  };
  const confirmDelete = () => {
    if (deleteModalConfig.isBulk) {
      const newRequests = requests.filter(req => !selectedRows.includes(req.id));
      setRequests(newRequests);
      localStorage.setItem("doc_tracking_requests", JSON.stringify(newRequests));
      setSelectedRows([]);
    }
    setDeleteModalConfig({ isOpen: false, isBulk: false, id: null });
  };
  const toggleRowSelection = (id) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#242B36] flex items-center justify-center select-none">
        <div className="text-gray-400 dark:text-[#a1a1aa] font-semibold animate-pulse">Checking credentials...</div>
      </div>
    );
  }
  // Calculate pagination indices
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  // Details file parsing
  const files = selectedRequest?.files || [];
  const activeFileName = files.length > 0
    ? files[activeFileIndex]?.name || "unknown_file.pdf"
    : "student_registration_form_v1.pdf";
  const activeFileSize = files.length > 0
    ? files[activeFileIndex]?.size || formatFileSize(0)
    : "177.72 KB";
  const ext = getFileExtension(activeFileName);
  const isImage = ["png", "jpg", "jpeg", "gif"].includes(ext);
  const isPdf = ext === "pdf";
  const isDocx = ext === "docx";
  return (
    <div className="flex min-h-screen bg-[#fafafb] dark:bg-[#0F1117] text-black dark:text-white">
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
        <div className="p-8 md:p-10 flex-1 w-full mx-auto overflow-y-auto max-h-[calc(100vh-100px)]">
          {selectedRequest ? (
            /* DETAIL VIEW */
            <div className="bg-white dark:bg-[#161B22] border border-gray-100 dark:border-[#2A2F3A] rounded-2xl p-6.5 md:p-8 shadow-sm flex flex-col gap-6 animate-fade-in select-none">
              {/* Back Button and Tracking ID */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#2A2F3A]">
                <span className="text-xs font-bold bg-green-50/50 text-[#0c3f0d] px-3 py-1 rounded-lg border border-green-100">
                  ID: {selectedRequest.trackingNumber}
                </span>
              </div>
              {/* Two-Column Grid: Left details, Right file preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column (Details Form) */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                  {/* Name Header and Subtitle role indicators grouped tightly */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full border border-gray-200 dark:border-[#2A2F3A] shadow-2xs flex-shrink-0 flex items-center justify-center bg-green-50 overflow-hidden text-green-700 font-bold text-xl uppercase">
                      {getReceiverName(selectedRequest).charAt(0)}
                    </div>
                    <div>
                      <h1 className="text-[28px] font-bold text-[#0c3f0d] tracking-tight leading-none mb-1.5">
                        {getReceiverName(selectedRequest)}
                      </h1>
                      <p className="text-[12px] text-gray-400 dark:text-[#a1a1aa] font-semibold">
                        Role: {selectedRequest.path && selectedRequest.path.length > 0 ? "Reviewer" : "Receiver"}
                      </p>
                    </div>
                  </div>
                  {/* Attributes table/key-value list */}
                  <div className="space-y-2.5 text-[14px]">
                    <div className="grid grid-cols-4 gap-2 py-0.5 border-b border-gray-50 pb-1.5">
                      <span className="font-extrabold text-gray-800 col-span-1">Type Document:</span>
                      <span className="text-gray-700 dark:text-white font-semibold col-span-3">{selectedRequest.subject}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 py-0.5 border-b border-gray-50 pb-1.5">
                      <span className="font-extrabold text-gray-800 col-span-1">To:</span>
                      <span className="text-gray-700 dark:text-white font-semibold col-span-3">{selectedRequest.path && selectedRequest.path.length > 0 ? getRoleString(selectedRequest.path[selectedRequest.path.length - 1]) : "Unknown"}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 py-0.5 border-b border-gray-50 pb-1.5">
                      <span className="font-extrabold text-gray-800 col-span-1">Date:</span>
                      <span className="text-gray-700 dark:text-white font-semibold col-span-3">
                        {selectedRequest.date} {selectedRequest.time && `• ${selectedRequest.time}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 py-0.5 border-b border-gray-50 pb-1.5">
                      <span className="font-extrabold text-gray-800 col-span-1">File:</span>
                      <span
                        className="text-gray-755 font-semibold italic col-span-3 truncate cursor-default"
                        title={activeFileName}
                      >
                        {activeFileName}
                      </span>
                    </div>
                    {/* Description Block */}
                    <div className="flex flex-col pt-2">
                      <span className="font-extrabold text-gray-800 mb-1.5">Description :</span>
                      <div className="bg-[#fafafb] dark:bg-[#0F1117] border-l-4 border-l-[#16a34a] border border-gray-100 dark:border-[#2A2F3A] rounded-r-2xl rounded-l-md p-5 text-gray-655 font-medium leading-relaxed min-h-[110px]">
                        {selectedRequest.description || "I would like to request the creation of official RUPP email accounts for the following new staff members. These email addresses will be used for internal and external communication in accordance with university policies. Kindly set up the accounts with standard configurations, including access to RUPP email services and necessary system permissions."}
                      </div>
                    </div>
                  </div>
                  {/* Close Details Button at bottom */}
                  <div className="pt-2">
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:text-[#a1a1aa] rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-98 border-1 border-gray-500"
                    >
                      Close Details
                    </button>
                  </div>
                </div>
                {/* Right Column (Dynamic file-specific preview box) */}
                <div className="lg:col-span-5 flex flex-col">
                  <div className="w-full aspect-[4/5] bg-[#fafafb] dark:bg-[#0F1117] border border-gray-200 dark:border-[#2A2F3A] rounded-2xl relative shadow-inner overflow-hidden flex flex-col p-5">
                    {/* Header bar of Reader */}
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200 dark:border-[#2A2F3A]/60 select-none">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-[#a1a1aa] font-bold tracking-wider uppercase truncate max-w-[160px]" title={activeFileName}>
                        {activeFileName}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 dark:text-[#a1a1aa] px-1.5 py-0.5 bg-gray-200/50 rounded">{ext.toUpperCase()}</span>
                    </div>
                    {/* Centered Document Preview Area */}
                    <div className="bg-white dark:bg-[#161B22] border border-gray-150 rounded-lg p-5 flex-1 shadow-xs flex flex-col justify-center items-center overflow-hidden">
                      {activeFileDataUrl ? (
                        isImage ? (
                          <img
                            src={activeFileDataUrl}
                            alt={activeFileName}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                          />
                        ) : isPdf ? (
                          <iframe
                            src={activeFileDataUrl}
                            className="w-full h-full border-none rounded-lg"
                            title={activeFileName}
                          />
                        ) : isDocx ? (
                          <div className="w-full h-full overflow-auto bg-white dark:bg-[#161B22] rounded-lg p-2" ref={smallDocxContainerRef} />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-center gap-3 w-full h-full">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100 shadow-2xs">
                              <FileText size={32} className="stroke-[1.8]" />
                            </div>
                            <div className="space-y-1 max-w-[90%]">
                              <p className="text-[13px] font-bold text-gray-800 truncate" title={activeFileName}>
                                {activeFileName}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-[#a1a1aa] font-semibold">{activeFileSize} • Document</p>
                            </div>
                            <div className="mt-3 px-4 py-2 border border-blue-150 text-blue-650 bg-blue-50/20 rounded-xl text-[10px] font-bold select-none cursor-default">
                              PREVIEW NOT AVAILABLE
                            </div>
                          </div>
                        )
                      ) : isImage ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center gap-3 w-full h-full">
                          <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100 shadow-2xs">
                            <ImageIcon size={32} className="stroke-[1.8]" />
                          </div>
                          <div className="space-y-1 max-w-[90%]">
                            <p className="text-[13px] font-bold text-gray-800 truncate" title={activeFileName}>
                              {activeFileName}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-[#a1a1aa] font-semibold">{activeFileSize} • Image File</p>
                          </div>
                          <div className="mt-3 px-4 py-2 border border-green-200 text-[#16a34a] bg-green-50/20 rounded-xl text-[10px] font-bold select-none cursor-default">
                            IMAGE VIEWER MODE
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center gap-3 w-full h-full">
                          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center border border-red-100 shadow-2xs">
                            <FileText size={32} className="stroke-[1.8]" />
                          </div>
                          <div className="space-y-1 max-w-[90%]">
                            <p className="text-[13px] font-bold text-gray-800 truncate" title={activeFileName}>
                              {activeFileName}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-[#a1a1aa] font-semibold">{activeFileSize} • PDF Document</p>
                          </div>
                          <div className="mt-3 px-4 py-2 border border-red-150 text-red-650 bg-red-50/20 rounded-xl text-[10px] font-bold select-none cursor-default">
                            PDF READER MODE
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Float Action Panel inside bottom right of the preview box */}
                    <div className="absolute bottom-9 right-9 bg-white dark:bg-[#161B22] border border-gray-150 py-2 px-4 rounded-xl shadow-md flex items-center gap-3.5">
                      <button
                        onClick={() => setIsPreviewOpen(true)}
                        className="text-[11px] font-bold text-gray-700 dark:text-white hover:text-green-600 transition-colors cursor-pointer"
                      >
                        Preview
                      </button>
                      <span className="w-[1.5px] h-3.5 bg-gray-200" />
                      <button
                        onClick={handleDownload}
                        className="text-[11px] font-bold text-gray-700 dark:text-white hover:text-green-600 transition-colors cursor-pointer"
                      >
                        Download
                      </button>
                      <span className="w-[1.5px] h-3.5 bg-gray-200" />
                      <button className="text-gray-400 dark:text-[#a1a1aa] hover:text-gray-750 cursor-pointer">
                        <MoreVertical size={14} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Bottom Flowchart Section */}
              <div className="border-t border-gray-100 dark:border-[#2A2F3A] pt-8 mt-4">
                <div className="mb-4">
                  <h3 className="text-[14px] font-bold text-[#0c3f0d]">Workflow Routing Path ({selectedRequest.stepsCount || selectedRequest.path?.length || 0} steps)</h3>
                  <p className="text-[11px] text-gray-400 dark:text-[#a1a1aa]">Sequence of verification departments for this document.</p>
                </div>
                <div className="bg-[#fafafb] dark:bg-[#0F1117]/50 border border-gray-100 dark:border-[#2A2F3A] rounded-2xl p-6 min-h-[160px] flex items-center justify-center shadow-xs overflow-x-auto relative">
                  {(!selectedRequest.path || selectedRequest.path.length === 0) ? (
                    <div className="text-gray-400 dark:text-[#a1a1aa] italic text-xs">No routing path configured for this request.</div>
                  ) : (
                    <div className="relative min-w-[600px] w-full flex items-center justify-between py-12 px-10">
                      {/* Continuous Horizontal Line */}
                      <div className="absolute left-[56px] right-[56px] top-1/2 h-[1.5px] bg-gray-300 -translate-y-1/2 z-0" />
                      {/* Step Nodes */}
                      {selectedRequest.path.map((stepData, idx) => {
                        const roleName = getRoleString(stepData);
                        const labelAbove = idx % 2 !== 0;
                        return (
                          <div key={idx} className="relative flex flex-col items-center z-10">
                            {/* Label above */}
                            {labelAbove ? (
                              <div className="absolute bottom-8 flex flex-col items-center gap-1">
                                <span className="whitespace-nowrap text-[12px] font-bold text-gray-700 dark:text-white">
                                  {roleName}
                                </span>
                                {stepData.signature && (
                                  <img src={stepData.signature} alt="Signature" className="h-8 object-contain mix-blend-multiply dark:mix-blend-screen opacity-90" />
                                )}
                              </div>
                            ) : null}
                            {/* Green Checked Node Circle with index number */}
                            <div className="w-8 h-8 rounded-full bg-[#97f297] border border-emerald-600 text-emerald-800 font-extrabold text-sm flex items-center justify-center shadow-xs">
                              {idx + 1}
                            </div>
                            {/* Label below */}
                            {!labelAbove ? (
                              <div className="absolute top-8 flex flex-col items-center gap-1">
                                <span className="whitespace-nowrap text-[12px] font-bold text-gray-700 dark:text-white">
                                  {roleName}
                                </span>
                                {stepData.signature && (
                                  <img src={stepData.signature} alt="Signature" className="h-8 object-contain mix-blend-multiply dark:mix-blend-screen opacity-90" />
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* LIST VIEW (GREEN THEME WITH SEARCH AND INTUITIVE CARD ACTIONS) */
            <div className="bg-white dark:bg-[#161B22] border border-gray-100 dark:border-[#2A2F3A] rounded-2xl min-h-[calc(100vh-160px)] p-6 md:p-8 shadow-sm flex flex-col justify-between select-none animate-fade-in">
              {/* Header Title & Filter Bar */}
              <div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-100 dark:border-[#2A2F3A] mb-6 gap-4">
                  <div>
                    <h1 className="text-[28px] font-bold text-[#0c3f0d] tracking-tight">Sent</h1>
                    <p className="text-xs text-gray-400 dark:text-[#a1a1aa] mt-1">Review all your submitted document requests and their statuses.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative w-full md:w-64">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#a1a1aa]" />
                      <input
                        type="text"
                        placeholder="Search requests..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-[#2A2F3A] rounded-xl text-sm outline-none focus:border-green-600 transition-colors bg-white dark:bg-[#161B22] font-semibold text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-3xs"
                      />
                    </div>
                    <span className="text-xs font-bold bg-[#16a34a]/10 text-[#15803d] px-3.5 py-2 rounded-xl border border-green-200/50 shadow-2xs whitespace-nowrap">
                      {filteredRequests.length} Total
                    </span>
                  </div>
                </div>
                {/* Bulk Actions Bar */}
                {filteredRequests.length > 0 && (
                  <div className="mb-4">
                    <BulkActionBar
                      selectedCount={selectedRows.length}
                      totalCount={currentItems.length}
                      onSelectAll={handleSelectAll}
                      onDeselectAll={handleDeselectAll}
                      onDelete={handleDeleteSelected}
                    />
                  </div>
                )}
                {/* Cards List */}
                {filteredRequests.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-[#242B36] border border-gray-100 dark:border-[#2A2F3A] text-gray-400 dark:text-[#a1a1aa] rounded-full flex items-center justify-center mb-4">
                      <Inbox size={26} className="stroke-[1.5]" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-white">No Sent Requests Found</h3>
                    <p className="text-xs text-gray-400 dark:text-[#a1a1aa] mt-1 max-w-[280px] leading-normal">
                      {searchTerm ? "No requests match your current search query." : "You haven't submitted any requests yet. Go to Create Request to get started."}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => router.push("/content/create-request")}
                        className="mt-4 px-5 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Create Request
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentItems.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className={`bg-white dark:bg-[#161B22] border hover:border-green-600/30 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:scale-[1.005] active:scale-[0.998] cursor-pointer transition-all duration-300 gap-4 ${selectedRows.includes(req.id) ? "border-l-4 border-l-[#1a5b28] bg-green-50/30 border-gray-200 dark:border-[#2A2F3A]" : "border-gray-100 dark:border-[#2A2F3A]"
                          }`}
                        title="Click to view details"
                      >
                        <div className="flex items-center gap-5 flex-1 min-w-0">
                          {/* Checkbox */}
                          <div
                            className="cursor-pointer p-2 flex-shrink-0"
                            onClick={(e) => { e.stopPropagation(); toggleRowSelection(req.id); }}
                          >
                            <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${selectedRows.includes(req.id) ? 'bg-[#1a5b28] border-[#1a5b28]' : 'bg-white dark:bg-[#161B22] border-gray-400'}`}>
                              {selectedRows.includes(req.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                            </div>
                          </div>

                          {/* Premium Vector Avatar Silhouette */}
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 rounded-full border border-gray-200 dark:border-[#2A2F3A] shadow-2xs flex items-center justify-center bg-green-50 overflow-hidden text-green-700 font-bold text-xl uppercase">
                              {getReceiverName(req).charAt(0)}
                            </div>
                          </div>
                          {/* Request Text Snippets */}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[17px] font-bold text-gray-800 truncate">
                              {getReceiverName(req)}
                            </h3>
                            <p className="text-[12px] text-gray-400 dark:text-[#a1a1aa] font-semibold mt-1">Currently at: {getCurrentLocation(req)}</p>
                            <p className="text-[12px] text-gray-455 mt-1 truncate flex items-center gap-1.5">
                              <span className="font-semibold text-gray-500 dark:text-[#a1a1aa] flex items-center gap-1.5 flex-shrink-0">
                                <FileText size={13} className="text-green-600" />
                                Subject:
                              </span>
                              <span className="truncate">{req.subject || "Academic Request"}</span>
                            </p>
                            <p className="text-[12px] text-gray-455 mt-0.5 truncate flex items-center gap-1.5">
                              <span className="font-semibold text-gray-500 dark:text-[#a1a1aa] flex items-center gap-1.5 flex-shrink-0">
                                <Paperclip size={13} className="text-green-600" />
                                Attached file:
                              </span>
                              <span className="truncate italic font-medium">
                                {req.files && req.files.length > 0 ? req.files[0].name : "student_registration_form_v1.pdf"}
                              </span>
                            </p>
                          </div>
                        </div>
                        {/* Right side: Timestamp, Status, View Action */}
                        <div className="flex flex-col items-end justify-between self-stretch py-0.5 flex-shrink-0">
                          {/* Displaying both Date and Time */}
                          <div className="text-[11px] font-bold text-gray-500 dark:text-[#a1a1aa] flex items-center gap-1.5">
                            <Calendar size={12} className="text-green-650" />
                            {req.date} {req.time && `• ${req.time}`}
                          </div>
                          <div className="flex items-center gap-3 mt-4">
                            {/* Status Badge */}
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-white shadow-2xs ${req.status === "Completed" ? "bg-[#15803d]" :
                              req.status === "Failed" ? "bg-[#7f1d1d]" :
                                "bg-[#ca8a04]"
                              }`}>
                              {req.status}
                            </span>
                            {/* Brand green View Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent duplicate calls
                                setSelectedRequest(req);
                              }}
                              className="px-3.5 py-1 bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all shadow-sm"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {filteredRequests.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredRequests.length}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                />
              )}
            </div>
          )}
        </div>
      </main>
      {/* DYNAMIC HIGH-FIDELITY PREVIEW SHEET OVERLAY MODAL */}
      {isPreviewOpen && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md select-none animate-fade-in">
          <div className="w-full max-w-3xl bg-white dark:bg-[#161B22] rounded-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl border border-gray-100 dark:border-[#2A2F3A] animate-fade-in">
            {/* Modal Header bar representing document window tab */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36] flex items-center justify-between flex-shrink-0">
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase ${isImage ? 'bg-green-650' : 'bg-red-500'}`}>
                    {ext}
                  </span>
                  <h2 className="text-sm font-bold text-gray-800 truncate max-w-[360px]" title={activeFileName}>
                    {activeFileName}
                  </h2>
                </div>
                {files.length > 1 && (
                  <div className="flex items-center gap-2 mt-1 overflow-x-auto pb-1">
                    {files.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveFileIndex(i)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap ${activeFileIndex === i
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : "bg-gray-100 text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-200 border border-transparent"
                          }`}
                      >
                        {i === 0 ? "Latest Edit" : i === files.length - 1 ? "Original Upload" : `Version ${files.length - i}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-350 text-gray-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>
            {/* Modal Content - High Fidelity Document Sheet or Real File Preview */}
            <div className="p-8 overflow-y-auto flex-1 bg-gray-100/50 flex justify-center items-start">
              {activeFileDataUrl ? (
                /* RENDER THE ACTUAL FILE CONTENTS! */
                <div className="bg-white dark:bg-[#161B22] w-full max-w-2xl border border-gray-200 dark:border-[#2A2F3A] rounded-xl shadow-sm p-4 flex flex-col justify-center items-center min-h-[500px]">
                  {isImage ? (
                    <img
                      src={activeFileDataUrl}
                      alt={activeFileName}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-xs"
                    />
                  ) : isPdf ? (
                    <iframe
                      src={activeFileDataUrl}
                      className="w-full h-[70vh] border-none rounded-lg"
                      title={activeFileName}
                    />
                  ) : isDocx ? (
                    <div className="w-full h-[70vh] overflow-auto bg-white dark:bg-[#161B22] rounded-lg p-4" ref={modalDocxContainerRef} />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center gap-4 w-full h-full">
                      <div className="w-20 h-20 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100 shadow-2xs">
                        <FileText size={40} className="stroke-[1.8]" />
                      </div>
                      <div className="space-y-1 max-w-[90%]">
                        <p className="text-base font-bold text-gray-800 truncate" title={activeFileName}>
                          {activeFileName}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-[#a1a1aa] font-semibold">{activeFileSize} • Document</p>
                      </div>
                      <p className="text-gray-500 dark:text-[#a1a1aa] text-sm mt-4">Preview is not available for this file type.</p>
                      <button onClick={handleDownload} className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer">
                        Download File
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#161B22] w-full max-w-2xl border border-gray-200 dark:border-[#2A2F3A] rounded-xl shadow-sm p-4 flex flex-col justify-center items-center min-h-[500px]">
                  <div className="flex flex-col items-center justify-center p-4 text-center gap-4 w-full h-full">
                    <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-[#242B36] text-gray-400 dark:text-[#a1a1aa] flex items-center justify-center border border-gray-100 dark:border-[#2A2F3A] shadow-2xs">
                      <FileText size={40} className="stroke-[1.8]" />
                    </div>
                    <div className="space-y-1 max-w-[90%]">
                      <p className="text-base font-bold text-gray-800 truncate" title={activeFileName}>
                        {activeFileName}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-[#a1a1aa] font-semibold">{activeFileSize} • Document</p>
                    </div>
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-[#242B36] rounded-xl border border-gray-100 dark:border-[#2A2F3A] max-w-md">
                      <p className="text-gray-500 dark:text-[#a1a1aa] text-sm font-medium">Preview is not available for this file.</p>
                      <p className="text-gray-400 dark:text-[#a1a1aa] text-xs mt-1">This file might have been moved or removed from your local database cache.</p>
                    </div>
                    <button onClick={handleDownload} className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer">
                      Download File
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalConfig.isOpen}
        onClose={() => setDeleteModalConfig({ isOpen: false, isBulk: false, id: null })}
        onConfirm={confirmDelete}
        itemCount={deleteModalConfig.isBulk ? selectedRows.length : 1}
        itemName={""}
        itemType="requests"
      />
    </div>
  );
}
