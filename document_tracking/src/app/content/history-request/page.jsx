"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "nextjs-toploader/app";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import {
    Inbox,
    MoreVertical,
    Search,
    FileText,
    Calendar,
    Paperclip,
    ImageIcon,
    Check,
    CheckCircle,
    CheckCircle2,
    XCircle,
    SquarePen,
    AlertCircle,
    PenTool,
    Upload,
    RefreshCcw,
    X,
    Download,
    DownloadCloud,
    UploadCloud,
    Trash2,
    Plus
} from "lucide-react";
import AlertModal from "../../../components/AlertModal";
import BulkActionBar from "../../../components/BulkActionBar";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import { hasPermission } from "../../../utils/permissions";
import SearchableSelect from "@/components/SearchableSelect";
import CustomSelect from "../../../components/CustomSelect";
import Pagination from "../../../components/Pagination";
import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";
import { useDocuments, useUpdateDocument } from '../../../hooks/useDocuments';
import { useDepartments } from '../../../hooks/useDepartments';
import { useAccounts } from '../../../hooks/useAccounts';
import { useCreateNotification } from '../../../hooks/useNotifications';
import { logDocumentAction } from "../../../utils/api";
import dynamic from 'next/dynamic';
import { getDocumentFileUrl, getStoredFileName } from "../../../utils/fileUrl";

const PdfSigner = dynamic(() => import('../../../components/PdfSigner'), {
    ssr: false,
    loading: () => <div className="p-4 bg-white rounded-lg shadow">Loading PDF Tool...</div>
});

export default function HistoryPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
    const [isMounted, setIsMounted] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const updateMutation = useUpdateDocument();
    const createNotificationMutation = useCreateNotification();
    const { data: apiRequests } = useDocuments();

    // Data states
    const [requests, setRequests] = useState([]);
    const { data: usersList = [] } = useAccounts();
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMonth, setFilterMonth] = useState("");
    const [filterYear, setFilterYear] = useState("");
    const [availableMainRoles, setAvailableMainRoles] = useState(["ITC", "Acc", "Inventory"]);
    const [activeTab, setActiveTab] = useState("all");

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
    const [isSignerOpen, setIsSignerOpen] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [signerSignaturePhoto, setSignerSignaturePhoto] = useState(null);
    const [showConfirmApproveModal, setShowConfirmApproveModal] = useState(false);
    const [pendingSignature, setPendingSignature] = useState(null);
    const [approveComment, setApproveComment] = useState("");
    const [activeFileDataUrl, setActiveFileDataUrl] = useState(null);
    const smallDocxContainerRef = useRef(null);
    const modalDocxContainerRef = useRef(null);
    const improveFileInputRef = useRef(null);

    const handleImproveFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            const uDept = (currentUser?.mainRole || currentUser?.department || "").toLowerCase().trim();
            const newFile = {
                name: file.name,
                size: file.size,
                data: dataUrl,
                addedBy: uDept
            };
            const updatedFiles = [...(selectedRequest.files || []), newFile];
            const updatedRequest = { ...selectedRequest, files: updatedFiles };
            setSelectedRequest(updatedRequest);
            const updatedRequests = requests.map(req =>
                req.id === selectedRequest.id ? updatedRequest : req
            );
            setRequests(updatedRequests);
            updateMutation.mutate({ id: updatedRequest.id, data: updatedRequest });
            if (improveFileInputRef.current) improveFileInputRef.current.value = "";
        };
        reader.readAsDataURL(file);
    };

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

    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    // Decline modal states
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [declineReason, setDeclineReason] = useState("");
    // Return modal states
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState("");
    // Assign modal states
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedAssignee, setSelectedAssignee] = useState("");
    // Edit modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [editSubject, setEditSubject] = useState("");
    const [editDescription, setEditDescription] = useState("");
    // Page-level comment state (replaces modal textareas)
    const [pageComment, setPageComment] = useState("");
    const { data: departmentsData } = useDepartments();
    const departments = departmentsData || [];
    const [forwardToDept, setForwardToDept] = useState("");
    // Alert Modal State
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
    const showAlert = (message) => setAlertModal({ isOpen: true, message });
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [signatureMode, setSignatureMode] = useState("draw"); // "draw" | "upload"
    const [signatureData, setSignatureData] = useState(null);
    const [editedFile, setEditedFile] = useState(null);
    const [activeFileIndex, setActiveFileIndex] = useState(0);
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000";
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            const canvas = canvasRef.current;
            if (canvas) {
                setSignatureData(canvas.toDataURL("image/png"));
            }
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setSignatureData(null);
        }
    };

    const handleSignatureUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setSignatureData(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEditedFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setEditedFile({
                    name: "EDITED_" + file.name,
                    size: (file.size / 1024).toFixed(2) + " KB",
                    dataUrl: event.target.result,
                    type: file.type
                });
            };
            reader.readAsDataURL(file);
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

            const initData = async () => {
                if (user) {
                    try {
                        console.log("currentUser initialized");
                    } catch (e) {
                        console.warn("Error initializing data");
                    }
                }
            };
            initData();
        }
    }, []);

    useEffect(() => {
        if (apiRequests) {
            setRequests(apiRequests);
        }
    }, [apiRequests]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const reqId = params.get('reqId');
            if (reqId) {
                const target = (apiRequests || []).find(r => String(r.id) === reqId || (r.trackingNumber && String(r.trackingNumber) === reqId));
                if (target) {
                    setSelectedRequest(target);
                    setSearchTerm(target.trackingNumber || target.id);
                }
            }
        }
        setIsMounted(true);
    }, [apiRequests, router]);

    // Filter requests based on logged in user's mainRole department and search term
    useEffect(() => {
        if (!currentUser) return;
        const userDept = (currentUser.department || currentUser.mainRole || "").toLowerCase().trim();
        const isGlobalSuperAdmin = currentUser?.email === "itcsuperadmin@rupp.edu.kh";
        const canViewAny = hasPermission(currentUser, "Receive", "View Any");
        let list = requests.filter((req) => {
            if (isGlobalSuperAdmin) return true;
            const currentUserName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim().toLowerCase();
            const senderName = (req.senderName || "").trim().toLowerCase();
            const senderEmail = (req.senderEmail || "").trim().toLowerCase();
            const myEmail = (currentUser?.email || "").trim().toLowerCase();
            const isExactSender = (senderName === currentUserName || senderName === (currentUser?.username || "").trim().toLowerCase()) || (senderEmail && myEmail && senderEmail === myEmail);

            return isExactSender;
        });
        if (searchTerm.trim() !== "") {
            const lower = searchTerm.toLowerCase();
            list = list.filter(
                (req) => (req.subject || "").toLowerCase().includes(lower) || (req.trackingNumber || "").toLowerCase().includes(lower) || (req.description || "").toLowerCase().includes(lower) || (req.senderName || "").toLowerCase().includes(lower)
            );
        }
        if (activeTab === "pending") {
            list = list.filter(req => req.status !== "Completed" && req.status !== "Failed" && req.status !== "Assigned to Improve" && req.status !== "Returned");
        } else if (activeTab === "completed") {
            list = list.filter(req => req.status === "Completed" || req.status === "Approved");
        } else if (activeTab === "returned") {
            list = list.filter(req => req.status === "Assigned to Improve" || req.status === "Returned");
        } else if (activeTab === "declined") {
            list = list.filter(req => req.status === "Failed");
        }
        if (filterMonth) {
            list = list.filter(req => req.date && new Date(req.date).getMonth() + 1 === parseInt(filterMonth));
        }
        if (filterYear) {
            list = list.filter(req => req.date && new Date(req.date).getFullYear() === parseInt(filterYear));
        }
        setFilteredRequests(list);
        setCurrentPage(1);
    }, [requests, currentUser, searchTerm, activeTab, selectedRequest?.id, departments, filterMonth, filterYear]);

    const handleSelectRequest = (req) => {
        setSelectedRequest(req);
    };

    const userDept = (currentUser?.department || currentUser?.mainRole || "").toLowerCase().trim();

    // Safety check definitions to prevent undefined errors in Detail View and Modals
    const currentStepData = selectedRequest?.path?.[selectedRequest?.currentStepIndex || 0];
    const hasAssignee = !!currentStepData?.assignedTo;
    const isAssignedToMe = hasAssignee && currentStepData?.assignedTo?.email === currentUser?.email;
    const isMyTurn = currentStepData && userDept && (
        (currentStepData.department || currentStepData.mainRole || "").toLowerCase().trim() === userDept
    );

    const activeFile = selectedRequest?.files?.[activeFileIndex];
    const activeFileName = activeFile?.name || "document.pdf";
    const formatFileSize = (bytes) => {
        if (!bytes) return "0 KB";
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const activeFileSize = activeFile?.size ? formatFileSize(activeFile.size) : "";
    const isImage = activeFileName.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/) != null;
    const isPdf = activeFileName.toLowerCase().endsWith('.pdf');
    const isDocx = activeFileName.toLowerCase().endsWith('.docx');

    useEffect(() => {
        if (selectedRequest) {
            const files = selectedRequest.files || [];
            const file = files[activeFileIndex];
            const inlined = file?.dataUrl || file?.base64 || file?.data;
            if (inlined) {
                setActiveFileDataUrl(inlined);
            } else if (file?.name || (typeof file === 'string')) {
                const targetUrl = getDocumentFileUrl(file);
                const token = sessionStorage.getItem("auth_token");
                fetch(`/api/proxy-pdf?url=${encodeURIComponent(targetUrl)}`, {
                    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
                })
                    .then(async res => {
                        if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
                        return res.blob();
                    })
                    .then(blob => {
                        const blobUrl = URL.createObjectURL(blob);
                        setActiveFileDataUrl(blobUrl);
                    })
                    .catch(err => {
                        console.warn("Failed to proxy fetch file as blob:", err);
                        setActiveFileDataUrl(targetUrl);
                    });
            } else {
                setActiveFileDataUrl(null);
            }
        } else {
            setActiveFileDataUrl(null);
        }
    }, [selectedRequest, activeFileIndex]);

    const handleDownload = async (e, fileToDownload) => {
        if (e) e.stopPropagation();
        const file = fileToDownload || (selectedRequest?.files && selectedRequest.files[0]);
        if (!file) return;

        try {
            if (selectedRequest?.id) {
                logDocumentAction(selectedRequest.id, 'Downloaded').catch(console.error);
            }
        } catch (err) {
            console.error(err);
        }

        let dataUrl = file.dataUrl || file.base64 || file.data;
        if (!dataUrl && activeFileDataUrl) {
            dataUrl = activeFileDataUrl;
        }

        if (dataUrl) {
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = file.name || "document.pdf";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else if (file.name || typeof file === 'string') {
            const targetUrl = getDocumentFileUrl(file);
            const a = document.createElement("a");
            a.href = targetUrl;
            a.target = "_blank";
            a.download = file.name || "document.pdf";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };
    const confirmDelete = () => {
        // Implement delete confirm logic here
    };
    const executeApprove = (photo, comment, name) => {
        // Implement approval logic here
    };

    const groupedRequests = filteredRequests.reduce((acc, req) => {
        let groupName = "Older";
        if (req.date) {
            const reqDate = new Date(req.date);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (reqDate.toDateString() === today.toDateString()) {
                groupName = "Today";
            } else if (reqDate.toDateString() === yesterday.toDateString()) {
                groupName = "Yesterday";
            } else {
                const diffTime = Math.abs(today - reqDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 7) {
                    groupName = "Previous 7 Days";
                }
            }
        }
        if (!acc[groupName]) acc[groupName] = [];
        acc[groupName].push(req);
        return acc;
    }, { "Today": [], "Yesterday": [], "Previous 7 Days": [], "Older": [] });

    const getDisplaySenderName = (req) => {
        if (!req) return "Unknown";
        return req.senderName || req.senderDepartment || "Unknown";
    };

    const getSenderPhoto = (req) => {
        if (!req) return null;
        const displayName = getEnglishName(getDisplaySenderName(req)).toLowerCase().trim();
        if (usersList && usersList.length > 0) {
            const matched = usersList.find(u => {
                const fEn = (u.fullname_en || "").toLowerCase();
                const fKh = (u.fullname_kh || "").toLowerCase();
                const uName = (u.username || "").toLowerCase();
                return fEn === displayName || fKh === displayName || uName === displayName;
            });
            if (matched && matched.profilePhoto) return matched.profilePhoto;
        }
        return req.senderPhoto || null;
    };

    const getEnglishName = (name) => {
        if (!name) return "";
        return name.replace(/[\u1780-\u17FF\u19E0-\u19FF\u200B]/g, '').replace(/\s+/g, ' ').trim() || name;
    };

    const getNodeUserInfo = (usernameOrDept) => {
        if (!usernameOrDept) return null;
        const normalized = usernameOrDept.toLowerCase().trim();
        return usersList.find(u =>
            (u.email || "").toLowerCase().trim() === normalized ||
            (`${u.firstName || ''} ${u.lastName || ''}`).toLowerCase().trim() === normalized ||
            (u.username || "").toLowerCase().trim() === normalized ||
            (u.department || u.mainRole || "").toLowerCase().trim() === normalized
        );
    };

    const getRoleString = (step) => {
        if (!step) return "Unknown";
        return typeof step === 'string' ? step : step.department || step.mainRole || "Unknown";
    };

    const getSenderEmail = (req) => {
        if (!req) return "";
        return req.senderEmail || "";
    };

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const handleForwardClick = () => {
        if (!forwardToDept) { showAlert("Please select a department to forward to."); return; }
        if (!selectedRequest) return;
        const actorDept = currentUser?.department || currentUser?.mainRole || "Department";
        const updatedRequests = requests.map(req => {
            if (req.id === selectedRequest.id) {
                const currentIndex = req.currentStepIndex !== undefined ? req.currentStepIndex : 0;
                const newPath = req.path ? [...req.path] : [];
                if (newPath[currentIndex]) {
                    newPath[currentIndex] = { ...newPath[currentIndex], approvedAt: new Date().toISOString(), comment: `Forwarded to ${forwardToDept}` };
                }
                newPath.push({ department: forwardToDept, status: "Pending" });
                return { ...req, path: newPath, currentStepIndex: currentIndex + 1, status: "In Progress" };
            }
            return req;
        });
        try {
            const storedNotifs = localStorage.getItem("doc_tracking_notifications");
            const allNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];
            allNotifs.unshift({ id: Date.now().toString(), requestId: selectedRequest.id, targetDepartment: forwardToDept, senderName: currentUser ? `${currentUser.lastName || ''} ${currentUser.firstName || ''}`.trim() || currentUser.username : "Unknown", senderDepartment: actorDept, subject: `Forwarded Request: ${selectedRequest.title || selectedRequest.subject}`, details: `A request has been forwarded to you for review.`, date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false });
            localStorage.setItem("doc_tracking_notifications", JSON.stringify(allNotifs));
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("notifications_updated"));
        } catch (e) { console.error("Error creating notification", e); }
        setRequests(updatedRequests);
        setSelectedRequest(updatedRequests.find(r => r.id === selectedRequest.id) || null);
        setForwardToDept("");
        showAlert("Document forwarded to " + forwardToDept);
    };

    if (!isMounted) return null;

    return (
        <div className="flex h-screen w-full bg-gray-50 dark:bg-[#0D1117]">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} currentUser={currentUser} />
                <div className="flex-1 overflow-auto p-4 md:p-6">
                    <div className="max-w-[1600px] w-full mx-auto flex flex-col gap-6">
                        {/* Page Title */}
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{t("history_requests") || "History Requests"}</h1>
                        {/* Workflow Tracker — shown when a request is selected */}
                        {selectedRequest && selectedRequest.path && selectedRequest.path.length > 0 && (
                            <div className="flex items-center justify-start w-full bg-[#fdfdfd] dark:bg-[#0F1117] border border-gray-100 dark:border-[#2A2F3A] rounded-xl p-4 shadow-sm overflow-x-auto">
                                <div className="flex items-center space-x-1 min-w-max">
                                    {/* Sender Node */}
                                    {(() => {
                                        const senderNodeUser = getNodeUserInfo(selectedRequest?.senderName);
                                        const displaySenderPhoto = getSenderPhoto(selectedRequest);
                                        return (
                                            <div className="flex items-center">
                                                <div className="flex items-center gap-3 bg-[#f8fcf8] dark:bg-[#161B22] border border-[#008000] dark:border-[#008000] rounded-lg p-2.5 shadow-xs min-w-[200px] z-10 relative">
                                                    {displaySenderPhoto ? (
                                                        <div className="w-12 h-12 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-white dark:bg-[#242B36] p-0.5 flex-shrink-0">
                                                            <img src={displaySenderPhoto} className="w-full h-full rounded-md object-cover object-top" alt={selectedRequest?.senderName} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-white dark:bg-[#242B36] flex flex-col items-center justify-end flex-shrink-0 overflow-hidden">
                                                            <div className="w-[18px] h-[18px] bg-gray-300 dark:bg-gray-600 rounded-full mb-1 shrink-0"></div>
                                                            <div className="w-[38px] h-[38px] bg-gray-300 dark:bg-gray-600 rounded-full -mb-[19px] shrink-0"></div>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col leading-[1.35]">
                                                        <div className="text-[12px] text-gray-800 dark:text-gray-200">
                                                            <span className="font-bold">Request By : </span>
                                                            <span className="font-medium text-gray-700 dark:text-gray-300">{getEnglishName(selectedRequest?.senderName || 'Unknown')}</span>
                                                        </div>
                                                        <span className="text-[11.5px] font-medium text-gray-500 mt-0.5">Dept : {selectedRequest?.senderDepartment || 'Unknown'}</span>
                                                        <span className="text-[11.5px] font-medium text-gray-500 mt-0.5">Role : {senderNodeUser ? (senderNodeUser.role || selectedRequest?.senderRole || 'Staff') : (selectedRequest?.senderRole || 'Staff')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    {/* Path Nodes */}
                                    {selectedRequest.path.map((step, idx) => {
                                        const isApproved = (selectedRequest.currentStepIndex || 0) > idx || selectedRequest.status === "Completed";
                                        const isCurrent = (selectedRequest.currentStepIndex || 0) === idx && selectedRequest.status !== "Completed";
                                        const isFailed = selectedRequest.status === "Failed" && idx === (selectedRequest.currentStepIndex || 0);
                                        const isReturned = selectedRequest.status === "Assigned to Improve" && idx === (selectedRequest.currentStepIndex || 0);
                                        const isForwarded = isApproved && step.comment && step.comment.startsWith("Forwarded to");
                                        const roleName = typeof step === 'string' ? step : step.department || step.mainRole || "Unknown";
                                        let stepDept = roleName;
                                        let stepUser = roleName;
                                        let stepRole = "Approver";
                                        let label = isForwarded ? 'Sent By' : isApproved ? 'Approved By' : isFailed ? 'Declined By' : isReturned ? 'Returned By' : isCurrent ? 'Pending At' : 'Next Approver';
                                        if (typeof step === 'object' && step !== null) {
                                            stepDept = step.department || step.mainRole || roleName;
                                            if (step.assignedTo) {
                                                stepUser = step.assignedTo.name;
                                                if (isCurrent && !isFailed && !isReturned) label = 'Assigned To';
                                            } else {
                                                stepUser = step.userSign || stepDept;
                                            }
                                            stepRole = step.roleName || step.role || "Approver";
                                        }
                                        const nodeUser = getNodeUserInfo(stepUser);
                                        if (nodeUser) {
                                            stepRole = (stepUser !== "Pending" && stepUser !== "Unknown" && stepUser !== stepDept)
                                                ? (nodeUser.role || "Staff")
                                                : (nodeUser.role || stepRole);
                                        }
                                        const nodePhoto = nodeUser ? (nodeUser.profilePhoto || nodeUser.photo) : null;
                                        const isLeftApproved = idx === 0 || ((selectedRequest.currentStepIndex || 0) > idx - 1 || selectedRequest.status === "Completed");
                                        const leftColor = isLeftApproved ? 'bg-[#008000]' : 'bg-gray-500';
                                        const lineColor = (idx === 0 || isApproved) ? 'border-[#008000]' : isFailed ? 'border-red-500' : isReturned ? 'border-purple-500' : 'border-gray-400';
                                        const rightColor = isApproved ? 'bg-[#008000]' : isFailed ? 'bg-red-500' : isReturned ? 'bg-purple-500' : isCurrent ? 'bg-[#ffb200]' : 'bg-gray-500';
                                        return (
                                            <div key={idx} className="flex items-center">
                                                <div className="flex items-center w-20 justify-between relative z-20 -ml-1.5">
                                                    <div className={`w-4 h-4 rounded-full relative z-10 shrink-0 ${leftColor}`}></div>
                                                    <div className={`absolute left-0 right-0 border-b-[1.5px] ${lineColor}`}></div>
                                                    <div className={`w-4 h-4 rounded-full relative z-10 shrink-0 ${rightColor}`}></div>
                                                </div>
                                                <div className="flex items-center gap-3 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-2.5 shadow-xs min-w-[200px] z-10 relative">
                                                    {nodePhoto ? (
                                                        <div className="w-12 h-12 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-white dark:bg-[#242B36] p-0.5 flex-shrink-0">
                                                            <img src={nodePhoto} className="w-full h-full rounded-md object-cover object-top" alt={stepUser} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-white dark:bg-[#242B36] flex flex-col items-center justify-end flex-shrink-0 overflow-hidden">
                                                            <div className="w-[18px] h-[18px] bg-gray-300 dark:bg-gray-600 rounded-full mb-1 shrink-0"></div>
                                                            <div className="w-[38px] h-[38px] bg-gray-300 dark:bg-gray-600 rounded-full -mb-[19px] shrink-0"></div>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col leading-[1.35]">
                                                        <div className="text-[12px] text-gray-800 dark:text-gray-200">
                                                            <span className="font-bold">{label} : </span>
                                                            <span className="font-medium text-gray-700 dark:text-gray-300">{getEnglishName(stepUser)}</span>
                                                        </div>
                                                        <span className="text-[11.5px] font-medium text-gray-500 mt-0.5">Dept : {stepDept}</span>
                                                        <span className="text-[11.5px] font-medium text-gray-500">Role : {stepRole}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {/* Split Layout */}
                        <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
                            <div className="w-full lg:w-[380px] flex flex-col gap-4 shrink-0">
                                <div className="bg-white dark:bg-[#161B22] border border-gray-100 dark:border-[#2A2F3A] rounded-xl p-6 shadow-sm flex flex-col">
                                    {/* Search */}
                                    <div className="relative mb-3">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder={t("search")}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-sm bg-gray-50 dark:bg-[#242B36] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-green-500"
                                        />
                                    </div>
                                    {/* Month/Year Filters */}
                                    <div className="flex gap-2 mb-4">
                                        <select
                                            value={filterMonth}
                                            onChange={e => setFilterMonth(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-sm bg-white dark:bg-[#242B36] text-gray-700 dark:text-gray-300 outline-none focus:border-green-500 cursor-pointer"
                                        >
                                            <option value="">All Months</option>
                                            <option value="1">January</option>
                                            <option value="2">February</option>
                                            <option value="3">March</option>
                                            <option value="4">April</option>
                                            <option value="5">May</option>
                                            <option value="6">June</option>
                                            <option value="7">July</option>
                                            <option value="8">August</option>
                                            <option value="9">September</option>
                                            <option value="10">October</option>
                                            <option value="11">November</option>
                                            <option value="12">December</option>
                                        </select>
                                        <select
                                            value={filterYear}
                                            onChange={e => setFilterYear(e.target.value)}
                                            className="w-28 px-3 py-2 border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-sm bg-white dark:bg-[#242B36] text-gray-700 dark:text-gray-300 outline-none focus:border-green-500 cursor-pointer"
                                        >
                                            <option value="">All Years</option>
                                            {[...new Set((apiRequests || []).map(req => req.date ? new Date(req.date).getFullYear() : new Date().getFullYear()))].sort((a, b) => b - a).map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Toggles */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <button onClick={() => setActiveTab("all")} className={`flex-1 basis-[28%] py-1.5 text-xs font-bold rounded-lg border ${activeTab === 'all' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800' : 'bg-white dark:bg-[#161B22] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#2A2F3A] hover:bg-gray-50 dark:hover:bg-[#242B36]'}`}>{t("all") || "All"}</button>
                                        <button onClick={() => setActiveTab("pending")} className={`flex-1 basis-[28%] py-1.5 text-xs font-bold rounded-lg border ${activeTab === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800' : 'bg-white dark:bg-[#161B22] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#2A2F3A] hover:bg-gray-50 dark:hover:bg-[#242B36]'}`}>{t("pending") || "Pending"}</button>
                                        <button onClick={() => setActiveTab("completed")} className={`flex-1 basis-[28%] py-1.5 text-xs font-bold rounded-lg border ${activeTab === 'completed' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800' : 'bg-white dark:bg-[#161B22] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#2A2F3A] hover:bg-gray-50 dark:hover:bg-[#242B36]'}`}>{t("completed") || "Completed"}</button>
                                        <button onClick={() => setActiveTab("returned")} className={`flex-1 basis-[28%] py-1.5 text-xs font-bold rounded-lg border ${activeTab === 'returned' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800' : 'bg-white dark:bg-[#161B22] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#2A2F3A] hover:bg-gray-50 dark:hover:bg-[#242B36]'}`}>{t("returned") || "Returned"}</button>
                                        <button onClick={() => setActiveTab("declined")} className={`flex-1 basis-[28%] py-1.5 text-xs font-bold rounded-lg border ${activeTab === 'declined' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800' : 'bg-white dark:bg-[#161B22] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#2A2F3A] hover:bg-gray-50 dark:hover:bg-[#242B36]'}`}>{t("declined") || "Declined"}</button>
                                    </div>
                                    {/* List Container */}
                                    <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
                                        {/* Empty State */}
                                        {filteredRequests.length === 0 && (
                                            <div className="text-center text-sm font-medium text-gray-400 py-10">No items found</div>
                                        )}
                                        {/* Grouped List */}
                                        {Object.entries(groupedRequests).map(([groupName, items]) => {
                                            if (items.length === 0) return null;
                                            return (
                                                <div key={groupName} className="flex flex-col mb-2">
                                                    <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 ml-2">{groupName}</h3>
                                                    <div className="flex flex-col gap-2">
                                                        {items.map((req, reqIdx) => {
                                                            const isSelected = selectedRequest?.id === req.id;
                                                            const isSender = (req.senderDepartment || "").toLowerCase().trim() === userDept || (req.senderEmail || "").toLowerCase().trim() === (currentUser?.email || "").toLowerCase().trim();
                                                            const isFailed = req.status === "Failed";
                                                            const isReturned = req.status === "Assigned to Improve";
                                                            const pendingDeptObj = req.path && req.path[req.currentStepIndex || 0];
                                                            const pendingDept = pendingDeptObj ? (typeof pendingDeptObj === 'string' ? pendingDeptObj : pendingDeptObj.department || pendingDeptObj.mainRole) : "Unknown";

                                                            let badgeText = req.status;
                                                            let badgeColor = "text-gray-500";
                                                            if (req.status === "In Progress" || req.status === "In Progressing") {
                                                                const hasAssignee = !!pendingDeptObj?.assignedTo;
                                                                if (hasAssignee) {
                                                                    badgeText = `Assigned to ${getEnglishName(pendingDeptObj.assignedTo.name).split(' ')[0]}`;
                                                                    badgeColor = "text-blue-600 dark:text-blue-400";
                                                                } else {
                                                                    badgeText = "Pending";
                                                                    badgeColor = "text-yellow-600 dark:text-yellow-500";
                                                                }
                                                            } else if (req.status === "Assigned to Improve") {
                                                                badgeText = isSender ? `Returned from ${pendingDept}` : `Returned to ${req.senderDepartment || "Sender"}`;
                                                                badgeColor = "text-purple-600 dark:text-purple-400";
                                                            } else if (req.status === "Failed") {
                                                                badgeText = "Rejected";
                                                                badgeColor = "text-red-500";
                                                            } else if (req.status === "Completed") {
                                                                badgeText = isSender ? "Get Approved" : "Approved";
                                                                badgeColor = "text-green-600 dark:text-green-400";
                                                            }
                                                            let displayUserName = getDisplaySenderName(req);
                                                            let displayPhoto = getSenderPhoto(req);

                                                            if (isSender) {
                                                                if (req.status === "Completed" || req.status === "Approved") {
                                                                    const lastStep = req.path && req.path.length > 0 ? req.path[req.path.length - 1] : null;
                                                                    const lastUser = lastStep ? (lastStep.userSign || lastStep.department || lastStep.mainRole) : null;
                                                                    displayUserName = lastUser ? getEnglishName(lastUser) : "Completed";
                                                                    const nodeUser = getNodeUserInfo(lastUser);
                                                                    displayPhoto = nodeUser ? (nodeUser.profilePhoto || nodeUser.photo) : null;
                                                                } else {
                                                                    const pendingDeptObj = req.path && req.path[req.currentStepIndex || 0];
                                                                    if (pendingDeptObj?.assignedTo) {
                                                                        displayUserName = pendingDeptObj.assignedTo.name;
                                                                        const nodeUser = getNodeUserInfo(displayUserName);
                                                                        displayPhoto = nodeUser ? (nodeUser.profilePhoto || nodeUser.photo) : null;
                                                                    } else if (pendingDeptObj) {
                                                                        displayUserName = typeof pendingDeptObj === 'string' ? pendingDeptObj : (pendingDeptObj.department || pendingDeptObj.mainRole || "Unknown");
                                                                        const nodeUser = getNodeUserInfo(displayUserName);
                                                                        displayPhoto = nodeUser ? (nodeUser.profilePhoto || nodeUser.photo) : null;
                                                                    }
                                                                }
                                                                // Strip delegated
                                                                displayUserName = displayUserName.replace(" (Delegated)", "").replace(" (delegated)", "");
                                                            }

                                                            return (
                                                                <div
                                                                    key={req.id ? `${req.id}-${reqIdx}` : `req-${reqIdx}`}
                                                                    onClick={() => handleSelectRequest(req)}
                                                                    className={`flex items-start justify-between cursor-pointer p-2 rounded-lg transition-colors border-l-2 ${isSelected ? 'bg-green-50/50 dark:bg-green-900/20 border-green-500' : 'border-transparent hover:bg-gray-50 dark:hover:bg-[#242B36]'}`}
                                                                >
                                                                    <div className="flex items-center gap-3 w-[75%]">
                                                                        {displayPhoto ? (
                                                                            <img src={displayPhoto} className="w-8 h-8 rounded-full object-cover object-top shrink-0" />
                                                                        ) : (
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isFailed ? 'bg-green-400' : isReturned ? 'bg-purple-400' : isSender ? 'bg-pink-400' : 'bg-yellow-500'}`}>
                                                                                {displayUserName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex flex-col overflow-hidden w-full">
                                                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase truncate">{displayUserName}</span>
                                                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{req.subject || ""}</span>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`text-xs font-medium ${badgeColor} mt-1`}>{badgeText}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            {/* Right Column: Detail View */}
                            {selectedRequest ? (
                                <div className="flex-1 flex flex-col gap-4 bg-white dark:bg-[#161B22] border border-gray-100 dark:border-[#2A2F3A] rounded-xl p-6 shadow-sm min-h-[600px]">
                                    {/* Detail Header */}
                                    <div className="flex items-start justify-between border-b border-gray-100 dark:border-[#2A2F3A] pb-4">
                                        <div className="flex items-center gap-2">
                                            <FileText size={20} className="text-gray-800 dark:text-gray-200" />
                                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">{selectedRequest.title || selectedRequest.subject || "Untitled Request"}</h2>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(() => {
                                                let actionText = "";
                                                let bgClass = "bg-gray-100 dark:bg-[#242B36]";
                                                let textClass = "text-gray-500 dark:text-gray-400";
                                                let borderClass = "border-gray-200 dark:border-[#2A2F3A]";

                                                const myIdx = selectedRequest.path?.findIndex(p => {
                                                    const role = typeof p === 'string' ? p : p.department || p.mainRole;
                                                    return role && role.toLowerCase().trim() === userDept;
                                                });
                                                const sEmail = (selectedRequest.senderEmail || "").toLowerCase().trim();
                                                const uEmail = (currentUser?.email || "").toLowerCase().trim();
                                                const sName = (selectedRequest.senderName || "").toLowerCase().trim();
                                                const uName = (currentUser?.username || currentUser?.name || "").toLowerCase().trim();
                                                const isSenderBadge = (sEmail && uEmail && sEmail === uEmail) || (sName && uName && sName === uName);
                                                if (isSenderBadge) {
                                                    if (selectedRequest.status === "Failed") {
                                                        actionText = t("rejected"); bgClass = "bg-red-50 dark:bg-red-900/20"; textClass = "text-red-700 dark:text-red-400"; borderClass = "border-red-200 dark:border-red-800/30";
                                                    } else if (selectedRequest.status === "Completed") {
                                                        actionText = "Get Approved"; bgClass = "bg-green-50 dark:bg-green-900/20"; textClass = "text-green-700 dark:text-green-400"; borderClass = "border-green-200 dark:border-green-800/30";
                                                    } else if (selectedRequest.status === "Assigned to Improve") {
                                                        const pendingDeptObj = selectedRequest.path && selectedRequest.path[selectedRequest.currentStepIndex || 0];
                                                        const pendingDept = pendingDeptObj ? (typeof pendingDeptObj === 'string' ? pendingDeptObj : pendingDeptObj.department || pendingDeptObj.mainRole) : "Unknown";
                                                        actionText = `Returned from ${pendingDept}`; bgClass = "bg-purple-50 dark:bg-purple-900/20"; textClass = "text-purple-700 dark:text-purple-400"; borderClass = "border-purple-200 dark:border-purple-800/30";
                                                    } else {
                                                        actionText = t("submitted"); bgClass = "bg-blue-50 dark:bg-blue-900/20"; textClass = "text-blue-700 dark:text-blue-400"; borderClass = "border-blue-200 dark:border-blue-800/30";
                                                    }
                                                } else if (myIdx !== -1 && myIdx !== undefined) {
                                                    const currIdx = selectedRequest.currentStepIndex || 0;
                                                    const isForwarded = selectedRequest.path[myIdx]?.comment?.startsWith("Forwarded to");
                                                    const approvedText = isForwarded ? "Sent" : t("approved");
                                                    const approvedBg = isForwarded ? "bg-blue-50 dark:bg-blue-900/20" : "bg-green-50 dark:bg-green-900/20";
                                                    const approvedTextColor = isForwarded ? "text-blue-700 dark:text-blue-400" : "text-green-700 dark:text-green-400";
                                                    const approvedBorder = isForwarded ? "border-blue-200 dark:border-blue-800/30" : "border-green-200 dark:border-green-800/30";

                                                    if (selectedRequest.status === "Failed") {
                                                        if (myIdx === currIdx) { actionText = t("rejected"); bgClass = "bg-red-50 dark:bg-red-900/20"; textClass = "text-red-700 dark:text-red-400"; borderClass = "border-red-200 dark:border-red-800/30"; }
                                                        else if (myIdx < currIdx) { actionText = approvedText; bgClass = approvedBg; textClass = approvedTextColor; borderClass = approvedBorder; }
                                                    } else if (selectedRequest.status === "Assigned to Improve") {
                                                        if (myIdx === currIdx) {
                                                            actionText = `Returned to ${selectedRequest.senderDepartment || "Sender"}`;
                                                            bgClass = "bg-purple-50 dark:bg-purple-900/20"; textClass = "text-purple-700 dark:text-purple-400"; borderClass = "border-purple-200 dark:border-purple-800/30";
                                                        }
                                                        else if (myIdx < currIdx) { actionText = approvedText; bgClass = approvedBg; textClass = approvedTextColor; borderClass = approvedBorder; }
                                                    } else if (selectedRequest.status === "Completed") {
                                                        actionText = approvedText; bgClass = approvedBg; textClass = approvedTextColor; borderClass = approvedBorder;
                                                    } else if (selectedRequest.status === "In Progress" || selectedRequest.status === "In Progressing") {
                                                        if (myIdx < currIdx) { actionText = approvedText; bgClass = approvedBg; textClass = approvedTextColor; borderClass = approvedBorder; }
                                                        else {
                                                            const currentStepData = selectedRequest.path && selectedRequest.path[selectedRequest.currentStepIndex || 0];
                                                            const hasAssignee = !!currentStepData?.assignedTo;
                                                            const myEmailForStep = (currentUser?.email || "").toLowerCase().trim();
                                                            const assignedEmail = (currentStepData?.assignedTo?.email || "").toLowerCase().trim();
                                                            const isAssignedToMe = !assignedEmail || assignedEmail === myEmailForStep;
                                                            if (hasAssignee && !isAssignedToMe) {
                                                                actionText = `Assigned to ${getEnglishName(currentStepData.assignedTo.name)}`;
                                                                bgClass = "bg-blue-50 dark:bg-blue-900/20"; textClass = "text-blue-700 dark:text-blue-400"; borderClass = "border-blue-200 dark:border-blue-800/30";
                                                            } else {
                                                                actionText = "Pending"; bgClass = "bg-yellow-50 dark:bg-yellow-900/20"; textClass = "text-yellow-700 dark:text-yellow-400"; borderClass = "border-yellow-200 dark:border-yellow-800/30";
                                                            }
                                                        }
                                                    }
                                                }

                                                return (
                                                    <div className={`px-4 py-2 ${bgClass} ${textClass} text-sm font-bold rounded-md border ${borderClass} shadow-sm select-none`}>
                                                        {actionText}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    {/* Sender Profile Header */}
                                    <div className="flex flex-col pb-4">
                                        <div className="flex items-center gap-3 mb-4">
                                            {getSenderPhoto(selectedRequest) ? (
                                                <img src={getSenderPhoto(selectedRequest)} className="w-8 h-8 rounded-full object-cover object-top shrink-0" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                    {getDisplaySenderName(selectedRequest).split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase">
                                                    {getDisplaySenderName(selectedRequest)} <span className="text-gray-500 dark:text-gray-400 font-normal lowercase">&lt;{getSenderEmail(selectedRequest)}&gt;</span>
                                                </span>
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mt-1 flex-wrap">
                                                    <span className="bg-gray-100 dark:bg-[#242B36] dark:text-gray-300 text-gray-600 px-2 py-0.5 rounded">{formatDisplayDate(selectedRequest.date)}</span>
                                                    <span className="text-gray-400 dark:text-gray-300 text-sm">at</span>
                                                    <span>{selectedRequest.time || (selectedRequest.date ? new Date(selectedRequest.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "12:00")}</span>

                                                    {(() => {
                                                        if (selectedRequest.status === "Completed" || selectedRequest.status === "Approved" || selectedRequest.status === "Failed" || selectedRequest.status === "Assigned to Improve") {
                                                            let targetStep = null;
                                                            if (selectedRequest.status === "Completed" || selectedRequest.status === "Approved") {
                                                                targetStep = selectedRequest.path && selectedRequest.path.length > 0 ? selectedRequest.path[selectedRequest.path.length - 1] : null;
                                                            } else {
                                                                targetStep = selectedRequest.path ? selectedRequest.path[selectedRequest.currentStepIndex || 0] : null;
                                                            }
                                                            const actionTime = targetStep?.approvedAt || selectedRequest.completedDate || targetStep?.timestamp || targetStep?.date || targetStep?.updatedAt;
                                                            if (actionTime) {
                                                                const actionStr = selectedRequest.status === "Failed" ? "Declined" : selectedRequest.status === "Assigned to Improve" ? "Returned" : "Approved";
                                                                const bgStr = selectedRequest.status === "Failed" ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800" : selectedRequest.status === "Assigned to Improve" ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800" : "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800";
                                                                return (
                                                                    <>
                                                                        <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                                                                        <span className={`px-2 py-0.5 rounded ${bgStr}`}>{actionStr}</span>
                                                                        <span className="text-gray-400 dark:text-gray-300 text-sm">on</span>
                                                                        <span>{formatDisplayDate(actionTime)}</span>
                                                                        <span className="text-gray-400 dark:text-gray-300 text-sm">at</span>
                                                                        <span>{new Date(actionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </>
                                                                );
                                                            }
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Unified Document Content Box */}
                                    <div className="border border-gray-200 dark:border-[#2A2F3A] rounded-lg mb-6 flex flex-col shadow-sm overflow-hidden bg-white dark:bg-[#161B22]">
                                        {/* Metadata Header */}
                                        <div className="bg-[#f4f4f5] dark:bg-[#242B36] p-6 border-b border-gray-200 dark:border-[#2A2F3A] flex flex-col gap-1.5 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-500 dark:text-gray-400 w-15">{t("from")} :</span>
                                                <span className="font-bold text-gray-800 dark:text-white truncate">(Dept {selectedRequest.senderDepartment}) - {getDisplaySenderName(selectedRequest)} &lt;{getSenderEmail(selectedRequest)}&gt;</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-500 dark:text-gray-400 w-15">File :</span>
                                                <span className="text-gray-700 dark:text-gray-300 truncate">
                                                    {selectedRequest.files && selectedRequest.files.length > 0
                                                        ? selectedRequest.files.map(f => f.name).join(", ")
                                                        : "No file attached"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-500 dark:text-gray-400 w-15">{t("title")} :</span>
                                                <span className="text-gray-700 dark:text-gray-300 truncate">{selectedRequest.title || selectedRequest.subject}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-500 dark:text-gray-400 w-15">{t("tag") || "Tag"} :</span>
                                                <div className="flex items-center">
                                                    {(() => {
                                                        const p = (selectedRequest.tag || "Normal").toLowerCase().trim();
                                                        if (p === "urgent") return (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 font-extrabold text-xs uppercase tracking-wider border border-red-200 dark:border-red-500/20 shadow-sm leading-tight">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                                {t('urgent') || 'Urgent'}
                                                            </span>
                                                        );
                                                        if (p === "high") return (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 font-extrabold text-xs uppercase tracking-wider border border-orange-200 dark:border-orange-500/20 shadow-sm leading-tight">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                                                {t('high') || 'High'}
                                                            </span>
                                                        );
                                                        if (p === "medium") return (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 font-extrabold text-xs uppercase tracking-wider border border-yellow-200 dark:border-yellow-500/20 shadow-sm leading-tight">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                                                {t('medium') || 'Medium'}
                                                            </span>
                                                        );
                                                        if (p === "normal") return (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-extrabold text-xs uppercase tracking-wider border border-green-200 dark:border-green-500/20 shadow-sm leading-tight">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                {t('normal') || 'Normal'}
                                                            </span>
                                                        );
                                                        return (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold text-xs uppercase tracking-wider border border-blue-200 dark:border-blue-500/20 shadow-sm leading-tight">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                                {selectedRequest.tag}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            {selectedRequest.dueDate && (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-500 dark:text-gray-400 w-15">Due Date :</span>
                                                    <div className="flex items-center">
                                                        {(() => {
                                                            const due = new Date(selectedRequest.dueDate);
                                                            const now = new Date();
                                                            const isOverdue = due < now;
                                                            const diffHours = (due - now) / (1000 * 60 * 60);
                                                            const isWarning = !isOverdue && diffHours <= 24;

                                                            let colorClass = "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
                                                            let dotClass = "bg-gray-500";

                                                            if (isOverdue) {
                                                                colorClass = "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20";
                                                                dotClass = "bg-red-500 animate-pulse";
                                                            } else if (isWarning) {
                                                                colorClass = "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-500/20";
                                                                dotClass = "bg-orange-500";
                                                            }

                                                            return (
                                                                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full font-extrabold text-xs uppercase tracking-wider border shadow-sm leading-tight ${colorClass}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
                                                                    {due.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                                    {isOverdue && " (OVERDUE)"}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                            {hasAssignee && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="font-bold text-blue-500 w-20 uppercase">{t("assigned")} :</span>
                                                    <span className="text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs truncate">
                                                        {getEnglishName(currentStepData.assignedTo.name)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Message Body */}
                                        <div className="p-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium min-h-[140px]">
                                            {(selectedRequest.status === "Assigned to Improve" || selectedRequest.status === "Failed") && selectedRequest.declineReason
                                                ? selectedRequest.declineReason
                                                : (selectedRequest.details || selectedRequest.description || "No description provided.")}
                                        </div>

                                        {/* Attachments Section */}
                                        {((selectedRequest.files && selectedRequest.files.length > 0) || isMyTurn) && (
                                            <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-[#2A2F3A] mt-2">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{t("attached_file") || "Attached Files"}</span>
                                                </div>
                                                {selectedRequest.files && selectedRequest.files.length > 0 ? (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {selectedRequest.files.map((file, idx) => {
                                                            return (
                                                                <div key={idx} onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveFileIndex(idx);
                                                                    setIsPreviewOpen(true);
                                                                    if (selectedRequest?.id) logDocumentAction(selectedRequest.id, 'Viewed').catch(console.error);
                                                                }}
                                                                    className="flex items-center gap-2 p-2 bg-white dark:bg-[#242B36] border border-gray-200 dark:border-[#2A2F3A] rounded-lg relative cursor-pointer hover:bg-gray-50 dark:hover:bg-[#242B36] transition-colors shadow-xs"
                                                                >
                                                                    <div className="w-8 h-10 border border-red-200 flex flex-col items-center justify-center bg-white rounded shrink-0 relative overflow-hidden">
                                                                        <FileText size={16} className="text-red-500 mb-2" />
                                                                        <div className="absolute bottom-0 left-0 right-0 bg-red-500 flex justify-center py-[1px]">
                                                                            <span className="text-[6px] text-white font-bold leading-none">PDF</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col flex-1 min-w-0 pr-6">
                                                                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{file.name || "document.pdf"}</span>
                                                                        <span className="text-xs text-gray-400 truncate">{formatFileSize(file.size)}</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDownload(e, file); }}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1"
                                                                    >
                                                                        <DownloadCloud size={14} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No files attached.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Forward To Section for Custom Request */}
                                    {isMyTurn && selectedRequest.documentType === "Custom Request" && (
                                        <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm mb-6 flex flex-col gap-4">
                                            <p className="text-[13px] italic text-gray-800 dark:text-gray-400">
                                                This will forward the document to the next person for review and approval.
                                            </p>
                                            <div>
                                                <label className="block text-[15px] font-bold text-gray-900 dark:text-white mb-2">Forward To:</label>
                                                <div className="flex gap-4 items-center w-full">
                                                    <select
                                                        value={forwardToDept}
                                                        onChange={(e) => setForwardToDept(e.target.value)}
                                                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-sm bg-white dark:bg-[#242B36] text-gray-700 dark:text-gray-300 outline-none focus:border-blue-500"
                                                    >
                                                        <option value="">Select destination department</option>
                                                        {departments.map(d => (
                                                            <option key={d.id || d.title} value={d.title}>{d.title}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={handleForwardClick}
                                                        className="px-6 py-[9px] bg-[#1976D2] hover:bg-[#1565C0] text-white text-[14px] font-bold rounded-md shadow-sm transition-colors cursor-pointer"
                                                    >
                                                        Send
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Approval Information (Only when Completed, and only for sender or approver) */}
                                    {/* {selectedRequest.status === "Completed" && (() => {
                                        const myEmail = (currentUser?.email || "").toLowerCase().trim();
                                        const senderEmail = (selectedRequest.senderEmail || "").toLowerCase().trim();
                                        const isSender = myEmail && senderEmail === myEmail;

                                        const currentUserName1 = (currentUser?.username || "").toLowerCase().trim();
                                        const currentUserName2 = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.toLowerCase().trim();
                                        const completedBy = (selectedRequest.completedBy || "").toLowerCase().trim();
                                        const isApprover = (completedBy === currentUserName1 && currentUserName1 !== "") ||
                                            (completedBy === currentUserName2 && currentUserName2 !== "");

                                        return isSender || isApprover;
                                    })() && (
                                            <div className="bg-white dark:bg-[#161B22] border border-green-200 dark:border-green-900/50 rounded-lg p-6 shadow-sm flex flex-col mb-6">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <CheckCircle size={20} className="text-green-600" />
                                                    <h3 className="text-[16px] font-bold text-green-800 dark:text-green-500 uppercase tracking-wide">{t("approval_information")}</h3>
                                                </div>

                                                <div className="flex flex-col gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[14px] text-gray-500 font-medium w-[120px]">{t("approved_by")} :</span>
                                                        <span className="text-[15px] font-bold text-gray-900 dark:text-white">
                                                            {(() => {
                                                                const fullName = selectedRequest.completedBy || "Unknown";
                                                                // Split by common delimiters and take the last part, then strip non-English chars
                                                                const parts = fullName.split(/[\/-]/);
                                                                const lastPart = parts[parts.length - 1];
                                                                const englishPart = lastPart.replace(/[^a-zA-Z\s]/g, '').trim();
                                                                return englishPart || fullName;
                                                            })()}
                                                        </span>
                                                    </div>

                                                    {selectedRequest.completedByRole && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[14px] text-gray-500 font-medium w-[120px]">{t("from")} :</span>
                                                            <span className="text-[15px] font-bold text-gray-900 dark:text-white">
                                                                {selectedRequest.completedByRole.toLowerCase().startsWith("")
                                                                    ? selectedRequest.completedByRole
                                                                    : `Dept ${selectedRequest.completedByRole}`}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[14px] text-gray-500 font-medium w-[120px]">{t("approved_date")} :</span>
                                                        <span className="text-[14px] font-semibold text-gray-700 dark:text-gray-300">
                                                            {(() => {
                                                                const lastStep = selectedRequest.path?.[selectedRequest.path.length - 1];
                                                                if (lastStep?.approvedAt) {
                                                                    return new Date(lastStep.approvedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                                                                }
                                                                return "Unknown Date";
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>

                                            </div>
                                        )} */}
                                    {/* Upload Section (If Returned or Intermediate Receiver) */}
                                    {(
                                        (selectedRequest.status === "Assigned to Improve" && (selectedRequest.improveAssignedTo || "").toLowerCase().trim() === userDept) ||
                                        (isMyTurn && ((selectedRequest.currentStepIndex !== undefined ? selectedRequest.currentStepIndex : 0) < (selectedRequest.path ? selectedRequest.path.length - 1 : 0)))
                                    ) && (
                                            <div
                                                onClick={() => improveFileInputRef.current?.click()}
                                                className="mb-6 border-[1.5px] border-green-600 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-white dark:bg-[#161B22] cursor-pointer hover:bg-gray-50 dark:hover:bg-[#242B36] transition-colors"
                                            >
                                                <input
                                                    type="file"
                                                    ref={improveFileInputRef}
                                                    onChange={handleImproveFileUpload}
                                                    className="hidden"
                                                    accept=".png,.jpg,.jpeg,.pdf,.docx"
                                                />
                                                <div className="w-14 h-14 bg-[#4a7239] rounded-full flex items-center justify-center mb-3 shadow-md">
                                                    <Upload size={24} className="text-white" />
                                                </div>
                                                <button className="px-8 py-1.5 bg-[#4a7239] text-white text-xs font-bold rounded-full mb-2 shadow-sm pointer-events-none">Browse</button>
                                                <span className="text-xs font-bold text-gray-500 mb-1">Drop a file here</span>
                                                <span className="text-xs font-bold text-gray-400">File Supported .png, .jpg, & .jpeg</span>
                                            </div>
                                        )}
                                    {/* Attachments Section moved to Unified Document Content Box */}

                                    {selectedRequest.status === "Failed" && (
                                        <div className="mt-auto pt-4 pb-2">
                                            <div className="p-4 bg-[#fef2f2] border border-[#fecaca] rounded-sm text-[#dc2626] text-[14px] leading-relaxed shadow-sm">
                                                <span className="font-bold text-[#dc2626]">ព្រមាន ៖ </span>
                                                សំណើរខាងលើត្រូវបានច្រានចោលទាំងស្រុង ដោយមិនអនុញ្ញាតក្នុងការ Request សំណើរដែលមាន កំហុសនេះម្ដងទៀតឡើយ។
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#161B22] border border-gray-100 dark:border-[#2A2F3A] rounded-xl p-6 shadow-sm min-h-[600px]">
                                    <Inbox size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
                                    <p className="text-gray-400 dark:text-gray-500 font-medium">Select an item to read</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* Full Screen File Preview Modal */}
                {isPreviewOpen && selectedRequest && (
                    <div className="fixed inset-0 z-[250] flex flex-col bg-black/90 backdrop-blur-sm animate-fade-in">
                        <div className="flex items-center justify-between p-6 bg-[#1c1c1e] border-b border-[#2c2c2e]">
                            <div className="flex items-center gap-4 text-white">
                                <span className="font-bold">{activeFileName}</span>
                                <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">{activeFileSize}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={(e) => handleDownload(e, selectedRequest.files?.[activeFileIndex])} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-bold transition-colors">
                                    <Upload size={14} className="rotate-180" /> Download
                                </button>
                                <button onClick={() => setIsPreviewOpen(false)} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                            {activeFileDataUrl ? (
                                isImage ? (
                                    <img src={activeFileDataUrl} className="max-w-full max-h-full object-contain" />
                                ) : isPdf ? (
                                    <iframe src={activeFileDataUrl} className="w-full h-full border-none bg-white rounded-lg" />
                                ) : isDocx ? (
                                    <div ref={modalDocxContainerRef} className="bg-white min-h-full w-full max-w-4xl p-6 shadow-xl" />
                                ) : (
                                    <div className="text-white">Unsupported file format for preview</div>
                                )
                            ) : (
                                <div className="text-white animate-pulse">Loading preview...</div>
                            )}
                        </div>
                    </div>
                )}
                {/* Custom Alert Modal */}
                <AlertModal
                    isOpen={alertModal.isOpen}
                    onClose={() => setAlertModal({ isOpen: false, message: "", type: "error", title: "" })}
                    message={alertModal.message}
                    type={alertModal.type}
                    title={alertModal.title}
                />
                {deleteModalConfig.isOpen && (
                    <DeleteConfirmationModal
                        isOpen={deleteModalConfig.isOpen}
                        onClose={() => setDeleteModalConfig({ isOpen: false, isBulk: false, id: null })}
                        onConfirm={confirmDelete}
                        title={t("confirm_delete_title") || "Are you sure?"}
                        message={deleteModalConfig.isBulk ? (t("confirm_delete_bulk") || `Are you sure you want to delete ${selectedRows.length} requests?`) : (t("confirm_delete_single") || "Are you sure you want to delete this request?")}
                    />
                )}
                {/* Signature Modal */}
                {isSignerOpen && selectedRequest && (
                    <PdfSigner
                        fileUrl={getDocumentFileUrl(selectedRequest.files?.[0])}
                        fileName={getStoredFileName(selectedRequest.files?.[0])}
                        documentId={selectedRequest.document_id || selectedRequest.id}
                        signaturePhoto={signerSignaturePhoto}
                        onClose={() => setIsSignerOpen(false)}
                        onSuccess={(newFileName, comment) => {
                            setIsSignerOpen(false);
                            executeApprove(signerSignaturePhoto, comment, newFileName);
                        }}
                    ></PdfSigner>
                )}
            </main>
        </div >
    );
}
