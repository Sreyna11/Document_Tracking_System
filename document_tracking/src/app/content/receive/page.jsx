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
import CustomSelect from "@/components/CustomSelect";
import Pagination from "../../../components/Pagination";
import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";
export default function ReceivedPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
    const [isMounted, setIsMounted] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    // Data states
    const [requests, setRequests] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [availableMainRoles, setAvailableMainRoles] = useState(["ITC", "Acc", "Inventory"]);
    const [activeTab, setActiveTab] = useState("unread");
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
            localStorage.setItem("doc_tracking_requests", JSON.stringify(updatedRequests));
            window.dispatchEvent(new Event("requests_updated"));
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
    const [departments, setDepartments] = useState([]);
    const [forwardToDept, setForwardToDept] = useState("");
    // Alert Modal State
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
    const showAlert = (message) => setAlertModal({ isOpen: true, message });
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showConfirmApproveModal, setShowConfirmApproveModal] = useState(false);
    const [approveComment, setApproveComment] = useState("");
    const [pendingSignature, setPendingSignature] = useState(null);
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
            setIsMounted(true);
            // Load requests from localStorage
            try {
                const stored = localStorage.getItem("doc_tracking_requests");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    const reqs = Array.isArray(parsed) ? parsed : [];
                    setRequests(reqs);
                    if (typeof window !== "undefined") {
                        const params = new URLSearchParams(window.location.search);
                        const reqId = params.get('reqId');
                        if (reqId) {
                            const found = reqs.find(r => String(r.id) === reqId);
                            if (found) {
                                setSelectedRequest(found);
                                window.history.replaceState({}, document.title, window.location.pathname);
                            }
                        }
                    }
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
            // Load main roles from localStorage for routing assignment dropdown
            try {
                const storedMainRoles = localStorage.getItem("doc_tracking_main_roles");
                if (storedMainRoles) {
                    const parsed = JSON.parse(storedMainRoles);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setAvailableMainRoles(parsed);
                    }
                }
            } catch (e) {
                console.error("Error loading main roles", e);
            }
            // Load departments from localStorage for forwarding
            try {
                const storedDepts = localStorage.getItem("doc_tracking_departments");
                if (storedDepts) {
                    const parsedDepts = JSON.parse(storedDepts);
                    setDepartments(Array.isArray(parsedDepts) ? parsedDepts : []);
                }
            } catch (e) {
                console.error("Error loading departments", e);
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
        const handleRequestsUpdated = () => {
            try {
                const stored = localStorage.getItem("doc_tracking_requests");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setRequests(Array.isArray(parsed) ? parsed : []);
                } else {
                    setRequests([]);
                }
            } catch (error) {
                console.error("Error parsing real-time requests update:", error);
            }
        };
        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("requests_updated", handleRequestsUpdated);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("requests_updated", handleRequestsUpdated);
        };
    }, []);
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

            const isAssignedToMeForImprovement = req.status?.toLowerCase().trim() === "assigned to improve" && isExactSender;
            if (isAssignedToMeForImprovement) return true;
            const isDeclinedToMe = req.status?.toLowerCase().trim() === "failed" && isExactSender;
            if (isDeclinedToMe) return true;
            const isCompletedToMe = req.status?.toLowerCase().trim() === "completed" && isExactSender;
            if (isCompletedToMe) return true;
            
            let isCurrentApprover = false;
            if (req.path && req.path[req.currentStepIndex || 0]) {
                const currentApproverSign = (req.path[req.currentStepIndex || 0].userSign || "").toLowerCase();
                const englishSignName = currentApproverSign.replace(/[\u1780-\u17FF\u19E0-\u19FF\u200B]/g, '').replace(/\s+/g, ' ').trim();
                isCurrentApprover = (englishSignName === currentUserName) || (englishSignName === (currentUser?.username || "").toLowerCase().trim());
            }

            if (isExactSender && !isCurrentApprover && req.status !== "failed" && req.status !== "assigned to improve" && req.status !== "completed") {
                return false;
            }
            if (isGlobalSuperAdmin) return true; // Global super admin sees all OTHERS
            if (!req.path) return false;
            const myIndex = req.path.findIndex(p => {
                const role = typeof p === 'string' ? p : p.department || p.mainRole;
                return role && role.toLowerCase().trim() === userDept;
            });
            if (myIndex === -1) return false;
            
            if (!canViewAny) {
                const step = req.path[myIndex];
                if (step && step.assignedTo) {
                    const assignedEmail = (step.assignedTo.email || "").toLowerCase().trim();
                    const myEmail = (currentUser?.email || "").toLowerCase().trim();
                    if (assignedEmail && myEmail && assignedEmail !== myEmail) {
                        return false;
                    }
                }
            }

            const currentIndex = req.currentStepIndex !== undefined ? req.currentStepIndex : 0;
            return currentIndex >= myIndex;
        });
        if (searchTerm.trim() !== "") {
            const lower = searchTerm.toLowerCase();
            list = list.filter(
                (req) => (req.subject || "").toLowerCase().includes(lower) || (req.trackingNumber || "").toLowerCase().includes(lower) || (req.description || "").toLowerCase().includes(lower) || (req.senderName || "").toLowerCase().includes(lower)
            );
        }
        const userId = currentUser?.email || currentUser?.username || userDept;
        if (activeTab === "unread") {
            list = list.filter(req => !(req.readBy || []).includes(userId));
        } else if (activeTab === "read") {
            list = list.filter(req => (req.readBy || []).includes(userId));
        }
        setFilteredRequests(list);
        setCurrentPage(1);
    }, [requests, currentUser, searchTerm, activeTab, selectedRequest?.id]);
    const handleSelectRequest = (req) => {
        setSelectedRequest(req);
        if (!currentUser) return;
        const userDept = (currentUser.department || currentUser.mainRole || "").toLowerCase().trim();
        let updatedReq = { ...req };
        let changed = false;
        const readBy = req.readBy || [];
        const userId = currentUser?.email || currentUser?.username || userDept;
        if (!readBy.includes(userId)) {
            updatedReq.readBy = [...readBy, userId];
            changed = true;
        }
        const currentStepObj = req.path && req.path[req.currentStepIndex || 0];
        const currentDept = currentStepObj ? (typeof currentStepObj === 'string' ? currentStepObj : currentStepObj.department || currentStepObj.mainRole) : "";
        const isMyTurn = currentDept && currentDept.toLowerCase().trim() === userDept;
        if ((req.status === "In Progress" || req.status === "Pending") && isMyTurn) {
            updatedReq.status = "In Progressing";
            changed = true;
        }
        if (isMyTurn && currentStepObj && typeof currentStepObj === 'object' && !currentStepObj.viewedAt) {
            const clonedPath = [...(updatedReq.path || [])];
            clonedPath[updatedReq.currentStepIndex || 0] = { ...currentStepObj, viewedAt: new Date().toISOString() };
            updatedReq.path = clonedPath;
            changed = true;
        }
        if (changed) {
            const list = requests.map(r => r.id === req.id ? updatedReq : r);
            setRequests(list);
            localStorage.setItem("doc_tracking_requests", JSON.stringify(list));
            window.dispatchEvent(new Event("requests_updated"));
            setSelectedRequest(updatedReq);
        }
    };
    // Load actual file dataUrl from IndexedDB when a request is selected
    useEffect(() => {
        if (selectedRequest) {
            const files = selectedRequest.files || [];
            const file = files[activeFileIndex];
            const inlined = file?.dataUrl || file?.base64 || file?.data;
            if (inlined) {
                setActiveFileDataUrl(inlined);
            } else {
                getFileFromIndexedDB(selectedRequest.id).then((url) => setActiveFileDataUrl(url || null));
            }
        } else {
            setActiveFileDataUrl(null);
        }
    }, [selectedRequest, activeFileIndex]);
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
    const getEnglishName = (name) => {
        if (!name) return "Unknown";
        const englishOnly = name.replace(/[\u1780-\u17FF\u19E0-\u19FF]+/g, '').trim();
        return englishOnly || name;
    };
    const getDisplaySenderName = (req) => {
        if (!req) return "Unknown";
        let name = "Unknown";
        if (req.senderName && req.senderName !== "Unknown") name = req.senderName;
        else if (req.path && req.path.length > 0 && typeof req.path[0] === 'object') {
            name = req.path[0].userSign || req.path[0].department || "Unknown";
        }
        return getEnglishName(name);
    };
    const getDisplayReceiver = (req) => {
        if (!req) return "";
        let name = "Unknown";
        let dept = "Unknown";
        if (req.path && req.path.length > 0) {
            let stepIndex = req.currentStepIndex || 0;
            if (req.status === "Completed") stepIndex = req.path.length - 1;
            const currentStep = req.path[stepIndex];
            if (currentStep) {
                if (typeof currentStep === 'object') {
                    name = currentStep.userSign || currentStep.department || currentStep.mainRole || "Unknown";
                    dept = currentStep.department || currentStep.mainRole || "Unknown";
                } else {
                    name = currentStep;
                    dept = currentStep;
                }
            }
        }
        // Find email
        let email = null;
        if (usersList.length > 0) {
            const matched = usersList.find(u =>
                (`${u.firstName} ${u.lastName}`.toLowerCase().trim() === name.toLowerCase().trim()) ||
                ((u.username || u.name)?.toLowerCase().trim() === name.toLowerCase().trim())
            );
            if (matched && matched.email) email = matched.email;
        }
        // Generate fallback email if none found
        if (!email && name !== "Unknown") {
            email = `${name.toLowerCase().replace(/\s+/g, '.')}@rupp.edu.kh`;
        } else if (!email) {
            email = "user@rupp.edu.kh";
        }
        return `(Dept ${dept}) - ${getEnglishName(name)} <${email}>`;
    };
    const getRoleString = (step) => {
        if (!step) return "Unknown";
        return typeof step === 'string' ? step : step.department || step.mainRole || "Unknown";
    };
    const getNodeUserInfo = (userName) => {
        if (!userName || usersList.length === 0) return null;
        const target = getEnglishName(userName).toLowerCase().trim();
        if (!target) return null;
        const matchedByName = usersList.find(u => {
            const fName = getEnglishName(`${u.firstName || ""} ${u.lastName || ""}`).toLowerCase().trim();
            const uName = getEnglishName(u.username || u.name || "").toLowerCase().trim();
            if (fName === target || uName === target) return true;

            const fNameParts = fName.split(' ');
            const uNameParts = uName.split(' ');
            return fNameParts.includes(target) || uNameParts.includes(target);
        });
        
        if (matchedByName) return matchedByName;
        
        return usersList.find(u => (u.department || u.mainRole || "").toLowerCase().trim() === target) || null;
    };
    const getFileFromIndexedDB = (id) => {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open("DocTrackingDB", 1);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
                };
                request.onsuccess = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains("files")) return resolve(null);
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
    const handleDeleteFile = (e, fileIndexToDelete) => {
        e.stopPropagation();
        if (!selectedRequest) return;

        const updatedFiles = selectedRequest.files.filter((_, idx) => idx !== fileIndexToDelete);
        const updatedRequest = { ...selectedRequest, files: updatedFiles };

        setSelectedRequest(updatedRequest);

        const list = requests.map(req => req.id === updatedRequest.id ? updatedRequest : req);
        setRequests(list);
        localStorage.setItem("doc_tracking_requests", JSON.stringify(list));
        window.dispatchEvent(new Event("requests_updated"));
    };

    const handleFileAdded = (e) => {
        const files = Array.from(e.target.files);
        if (!files || files.length === 0 || !selectedRequest) return;

        const newFilesPromises = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        dataUrl: reader.result,
                        addedBy: userDept,
                        addedAt: new Date().toISOString()
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(newFilesPromises).then(newFiles => {
            const updatedFiles = [...(selectedRequest.files || []), ...newFiles];
            const updatedRequest = { ...selectedRequest, files: updatedFiles };
            
            setSelectedRequest(updatedRequest);
            
            const list = requests.map(req => req.id === updatedRequest.id ? updatedRequest : req);
            setRequests(list);
            localStorage.setItem("doc_tracking_requests", JSON.stringify(list));
            window.dispatchEvent(new Event("requests_updated"));
        });
    };
    const handleDownload = async (e, fileToDownload) => {
        if (e) e.stopPropagation();
        if (!selectedRequest) return;
        // If no specific file is provided, try to use the first one (fallback)
        const file = fileToDownload || (selectedRequest.files && selectedRequest.files[0]);
        if (!file) return;
        // Use file's own dataUrl if present, otherwise fetch from DB
        let dataUrl = file.dataUrl || file.base64 || file.data;
        if (!dataUrl) {
            // In this app, sometimes the file data is stored by request id
            dataUrl = activeFileDataUrl || await getFileFromIndexedDB(selectedRequest.id);
        }
        if (dataUrl) {
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = file.name || "download";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };
    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return "Unknown Date";
        try {
            const dateObj = new Date(dateStr);
            if (isNaN(dateObj.getTime())) return dateStr;
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            const formatted = dateObj.toLocaleDateString('en-GB', options);
            if (isSameDay(dateObj, today)) return `Today, ${formatted}`;
            if (isSameDay(dateObj, yesterday)) return `Yesterday, ${formatted}`;
            return formatted;
        } catch (e) {
            return dateStr;
        }
    };
    const getSenderPhoto = (req) => {
        if (!req) return null;
        const displayName = getEnglishName(getDisplaySenderName(req)).toLowerCase().trim();
        if (usersList.length > 0) {
            const matched = usersList.find((u) => {
                if (req.senderEmail && u.email?.toLowerCase().trim() === req.senderEmail.toLowerCase().trim()) return true;
                const fName = getEnglishName(`${u.firstName || ""} ${u.lastName || ""}`).toLowerCase().trim();
                return fName === displayName || (displayName && fName.includes(displayName)) || (fName && displayName.includes(fName));
            });
            if (matched && matched.profilePhoto) return matched.profilePhoto;
        }
        return req.senderPhoto || null;
    };
    const getSenderEmail = (req) => {
        if (!req) return "user@rupp.edu.kh";
        const displayName = getEnglishName(getDisplaySenderName(req)).toLowerCase().trim();
        if (usersList.length > 0) {
            const matched = usersList.find((u) => {
                const fName = getEnglishName(`${u.firstName || ""} ${u.lastName || ""}`).toLowerCase().trim();
                const uName = getEnglishName(u.username || u.name || "").toLowerCase().trim();
                return fName === displayName || uName === displayName || (displayName && fName.includes(displayName));
            });
            if (matched && matched.email) return matched.email;
        }
        if (req.senderEmail && req.senderEmail !== "user@rupp.edu.kh") return req.senderEmail;
        // Generate realistic fallback email based on name
        if (displayName && displayName !== "Unknown") {
            return `${displayName.toLowerCase().replace(/\s+/g, ".")}@rupp.edu.kh`;
        }
        return "user@rupp.edu.kh";
    };
    const updateRequestsList = (updatedList, msg) => {
        setRequests(updatedList);
        localStorage.setItem("doc_tracking_requests", JSON.stringify(updatedList));
        window.dispatchEvent(new Event("requests_updated"));

        if (selectedRequest) {
            const updatedReq = updatedList.find(r => r.id === selectedRequest.id);
            setSelectedRequest(updatedReq || null);
        }
        setSuccessMessage(msg);
        setShowSuccessAlert(true);
        setTimeout(() => {
            setShowSuccessAlert(false);
            // Removed setSelectedRequest(null) to keep the panel open and show the status
            setEditedFile(null);
        }, 2000);
    };
    useEffect(() => {
        if (selectedRequest) {
            setEditedFile(null);
            setActiveFileIndex(0);
        }
    }, [selectedRequest]);
    const handleApproveClick = () => {
        const isLast = selectedRequest && (!selectedRequest.path || selectedRequest.path.length === 0 || (selectedRequest.currentStepIndex !== undefined ? selectedRequest.currentStepIndex : 0) >= selectedRequest.path.length - 1);
        if (isLast) {
            let savedSignature = currentUser?.signaturePhoto;

            // Fallback: look up in localStorage in case session doesn't have it
            if (!savedSignature && currentUser?.email) {
                try {
                    const storedUsers = localStorage.getItem("doc_tracking_users");
                    if (storedUsers) {
                        const users = JSON.parse(storedUsers);
                        const userInDb = users.find(u => u.email === currentUser.email);
                        if (userInDb && userInDb.signaturePhoto) {
                            savedSignature = userInDb.signaturePhoto;
                        }
                    }
                } catch (e) {
                    console.error("Error fetching user signature", e);
                }
            }
            if (savedSignature) {
                setPendingSignature(savedSignature);
                setApproveComment("");
                setShowConfirmApproveModal(true);
            } else {
                setShowApproveModal(true);
                setSignatureData(null);
                setSignatureMode("draw");
            }
        } else {
            // Intermediate receivers can approve without a signature, but with an optional comment
            setPendingSignature(null);
            setApproveComment("");
            setShowConfirmApproveModal(true);
        }
    };
    const confirmIntermediateApprove = () => {
        executeApprove(pendingSignature, approveComment);
        setShowConfirmApproveModal(false);
    };
    const handleAssign = () => {
        if (!selectedRequest || !selectedAssignee) return;
        const assigneeStr = selectedAssignee;
        let assigneeObj = null;
        try {
            assigneeObj = JSON.parse(assigneeStr);
        } catch (e) {
            return;
        }
        const list = requests.map(req => {
            if (req.id === selectedRequest.id) {
                const currentIndex = req.currentStepIndex !== undefined ? req.currentStepIndex : 0;
                const newPath = req.path ? [...req.path] : [];
                if (newPath[currentIndex]) {
                    newPath[currentIndex] = {
                        ...newPath[currentIndex],
                        assignedTo: {
                            email: assigneeObj.email,
                            name: assigneeObj.firstName ? `${assigneeObj.firstName} ${assigneeObj.lastName}` : assigneeObj.username
                        }
                    };
                }
                return { ...req, path: newPath };
            }
            return req;
        });
        setRequests(list);
        localStorage.setItem("doc_tracking_requests", JSON.stringify(list));
        window.dispatchEvent(new Event("requests_updated"));
        setSuccessMessage(`Document assigned to ${assigneeObj.firstName ? assigneeObj.firstName : assigneeObj.username}!`);
        setShowSuccessAlert(true);
        setShowAssignModal(false);
        setSelectedAssignee("");
        // Update selectedRequest so UI updates immediately
        const updatedReq = list.find(r => r.id === selectedRequest.id);
        setSelectedRequest(updatedReq);
        setTimeout(() => {
            setShowSuccessAlert(false);
        }, 2000);
    };
    const executeApprove = (signature, comment = null) => {
        if (!selectedRequest) return;
        const actorDept = currentUser?.department || currentUser?.mainRole || "Department";
        const list = requests.map(req => {
            if (req.id === selectedRequest.id) {
                const pathLen = req.path ? req.path.length : 0;
                const currentIndex = req.currentStepIndex !== undefined ? req.currentStepIndex : 0;
                let updatedFiles = req.files || [];
                if (editedFile) updatedFiles = [editedFile, ...updatedFiles];
                const newPath = req.path ? [...req.path] : [];
                if (newPath[currentIndex]) {
                    newPath[currentIndex] = { ...newPath[currentIndex], signature: signature || null, approvedAt: new Date().toISOString(), comment: comment || null };
                }
                if (currentIndex >= pathLen - 1) {
                    return { ...req, path: newPath, status: "Completed", currentStepIndex: pathLen - 1, approvalSignature: signature || req.approvalSignature, files: updatedFiles, completedBy: currentUser ? (currentUser.username || `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "Unknown User") : "Unknown User", completedByRole: actorDept, completedDate: new Date().toISOString() };
                } else {
                    return { ...req, path: newPath, currentStepIndex: currentIndex + 1, files: updatedFiles };
                }
            }
            return req;
        });
        const isLast = (selectedRequest.currentStepIndex !== undefined ? selectedRequest.currentStepIndex : 0) >= (selectedRequest.path ? selectedRequest.path.length : 0) - 1;
        const msg = isLast ? "Document approved and fully completed!" : "Document approved and routed to the next step!";
        // Add Notification for the sender
        try {
            const storedNotifs = localStorage.getItem("doc_tracking_notifications");
            const allNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];
            const newNotif = {
                id: Date.now().toString(),
                requestId: selectedRequest.id,
                targetDepartment: selectedRequest.senderDepartment || "global",
                senderName: currentUser ? (currentUser.firstName ? `${currentUser.lastName} ${currentUser.firstName}` : currentUser.username) : "Unknown",
                senderDepartment: actorDept,
                subject: `Document Approved: ${selectedRequest.title || selectedRequest.subject || selectedRequest.documentType}`,
                details: (isLast ? "Your document has been fully approved." : "Your document has been approved and moved to the next step.") + (comment ? `\nComment: ${comment}` : ""),
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: false
            };
            allNotifs.unshift(newNotif);
            // Also notify the NEXT department if it's not the last step
            if (!isLast) {
                const nextIndex = (selectedRequest.currentStepIndex !== undefined ? selectedRequest.currentStepIndex : 0) + 1;
                const nextDept = selectedRequest.path[nextIndex]?.department || selectedRequest.path[nextIndex]?.mainRole || "global";

                const nextNotif = {
                    id: (Date.now() + 1).toString(),
                    requestId: selectedRequest.id,
                    targetDepartment: nextDept,
                    senderName: currentUser ? (currentUser.firstName ? `${currentUser.lastName} ${currentUser.firstName}` : currentUser.username) : "Unknown",
                    senderDepartment: actorDept,
                    subject: `New Request Routed: ${selectedRequest.title || selectedRequest.subject || selectedRequest.documentType}`,
                    details: `A document has been approved by ${actorDept} and routed to you for review.` + (comment ? `\nComment: ${comment}` : ""),
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    read: false
                };
                allNotifs.unshift(nextNotif);
            }
            localStorage.setItem("doc_tracking_notifications", JSON.stringify(allNotifs));
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("notifications_updated"));
        } catch (e) {
            console.error("Error creating notification", e);
        }
        updateRequestsList(list, msg);
        setShowApproveModal(false);
    };
    
    const handleForwardClick = () => {
        if (!forwardToDept) {
            showAlert("Please select a department to forward to.");
            return;
        }
        if (!selectedRequest) return;
        const actorDept = currentUser?.department || currentUser?.mainRole || "Department";
        const list = requests.map(req => {
            if (req.id === selectedRequest.id) {
                const currentIndex = req.currentStepIndex !== undefined ? req.currentStepIndex : 0;
                let updatedFiles = req.files || [];
                if (editedFile) updatedFiles = [editedFile, ...updatedFiles];
                
                const newPath = req.path ? [...req.path] : [];
                // Mark current step as approved
                if (newPath[currentIndex]) {
                    newPath[currentIndex] = { 
                        ...newPath[currentIndex], 
                        approvedAt: new Date().toISOString(), 
                        comment: `Forwarded to ${forwardToDept}` 
                    };
                }
                
                // Add new step
                newPath.push({
                    department: forwardToDept,
                    status: "Pending"
                });
                
                return { ...req, path: newPath, currentStepIndex: currentIndex + 1, files: updatedFiles, status: "In Progress" };
            }
            return req;
        });

        // Add Notification logic
        try {
            const storedNotifs = localStorage.getItem("doc_tracking_notifications");
            const allNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];
            const newNotif = {
                id: Date.now().toString(),
                requestId: selectedRequest.id,
                targetDepartment: forwardToDept,
                senderName: currentUser ? (currentUser.firstName ? `${currentUser.lastName} ${currentUser.firstName}` : currentUser.username) : "Unknown",
                senderDepartment: actorDept,
                subject: `Forwarded Request: ${selectedRequest.title || selectedRequest.subject || selectedRequest.documentType}`,
                details: `A custom request has been forwarded to you for review.`,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: false
            };
            allNotifs.unshift(newNotif);
            localStorage.setItem("doc_tracking_notifications", JSON.stringify(allNotifs));
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("notifications_updated"));
        } catch (e) {
            console.error("Error creating notification", e);
        }

        updateRequestsList(list, "Document forwarded to " + forwardToDept);
        setForwardToDept("");
    };

    const confirmApprove = () => {
        if (!signatureData) { showAlert("Please provide a signature to approve this request."); return; }
        executeApprove(signatureData);
    };
    const handleDeclineClick = () => {
        if (!pageComment.trim()) {
            setDeclineReason("");
            setShowDeclineModal(true);
        } else {
            // if they already wrote a comment on the page, decline immediately
            setDeclineReason(pageComment);
            confirmDeclineDirect(pageComment);
        }
    };
    const confirmDeclineDirect = (reason) => {
        if (!selectedRequest) return;
        const list = requests.map(req => {
            if (req.id === selectedRequest.id) {
                const newPath = req.path ? [...req.path] : [];
                const currentIndex = req.currentStepIndex !== undefined ? req.currentStepIndex : 0;
                if (newPath[currentIndex]) {
                    newPath[currentIndex] = { ...newPath[currentIndex], approvedAt: new Date().toISOString() };
                }
                return { ...req, status: "Failed", declineReason: reason.trim(), path: newPath, completedDate: new Date().toISOString() };
            }
            return req;
        });
        // Notification logic
        try {
            const storedNotifs = localStorage.getItem("doc_tracking_notifications");
            const allNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];
            const actorDept = currentUser?.department || currentUser?.mainRole || "Department";
            const newNotif = {
                id: Date.now().toString(),
                requestId: selectedRequest.id,
                targetDepartment: selectedRequest.senderDepartment || "global",
                senderName: currentUser ? (currentUser.firstName ? `${currentUser.lastName} ${currentUser.firstName}` : currentUser.username) : "Unknown",
                senderDepartment: actorDept,
                subject: `Document Declined: ${selectedRequest.title || selectedRequest.subject || selectedRequest.documentType}`,
                details: `Reason: ${reason.trim()}`,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: false
            };
            allNotifs.unshift(newNotif);
            localStorage.setItem("doc_tracking_notifications", JSON.stringify(allNotifs));
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("notifications_updated"));
        } catch (e) {
            console.error("Error creating notification", e);
        }
        updateRequestsList(list, "Document request declined successfully.");
        setPageComment("");
    };
    const confirmDecline = () => {
        confirmDeclineDirect(declineReason);
        setShowDeclineModal(false);
    };
    const handleReturnClick = () => {
        if (!pageComment.trim()) {
            setReturnReason("");
            setShowReturnModal(true);
        } else {
            confirmReturnDirect(pageComment);
        }
    };
    const confirmReturnDirect = (reason) => {
        if (!selectedRequest) return;
        const list = requests.map(req => {
            if (req.id === selectedRequest.id) {
                const newPath = req.path ? [...req.path] : [];
                const currentIndex = req.currentStepIndex !== undefined ? req.currentStepIndex : 0;
                if (newPath[currentIndex]) {
                    const step = newPath[currentIndex];
                    let timeSpent = 0;
                    if (step.viewedAt) {
                        timeSpent = new Date().getTime() - new Date(step.viewedAt).getTime();
                        if (timeSpent < 0) timeSpent = 0;
                    }
                    newPath[currentIndex] = {
                        ...step,
                        approvedAt: null,
                        viewedAt: null,
                        accumulatedTime: 0
                    };
                }
                return { ...req, status: "Assigned to Improve", declineReason: reason.trim(), improveAssignedTo: req.senderDepartment, path: newPath };
            }
            return req;
        });
        // Notification logic
        try {
            const storedNotifs = localStorage.getItem("doc_tracking_notifications");
            const allNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];
            const actorDept = currentUser?.department || currentUser?.mainRole || "Department";
            const newNotif = {
                id: Date.now().toString(),
                requestId: selectedRequest.id,
                targetDepartment: selectedRequest.senderDepartment || "global",
                senderName: currentUser ? (currentUser.firstName ? `${currentUser.lastName} ${currentUser.firstName}` : currentUser.username) : "Unknown",
                senderDepartment: actorDept,
                subject: `Document Returned for Improvement: ${selectedRequest.title || selectedRequest.subject || selectedRequest.documentType}`,
                details: `Reason: ${reason.trim()}`,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: false
            };
            allNotifs.unshift(newNotif);
            localStorage.setItem("doc_tracking_notifications", JSON.stringify(allNotifs));
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new Event("notifications_updated"));
        } catch (e) {
            console.error("Error creating notification", e);
        }
        updateRequestsList(list, "Document returned for improvement.");
        setPageComment("");
    };
    const confirmReturn = () => {
        if (!returnReason.trim()) { showAlert("Please provide a reason for returning."); return; }
        confirmReturnDirect(returnReason);
        setShowReturnModal(false);
    };
    const handleEditClick = () => {
        if (!selectedRequest) return;
        setEditSubject(selectedRequest.subject || "");
        setEditDescription(selectedRequest.description || "");
        setShowEditModal(true);
    };
    const confirmEdit = () => {
        if (!selectedRequest) return;
        if (!editSubject.trim()) { showAlert("Subject is required"); return; }
        const updatedRequest = {
            ...selectedRequest,
            title: editSubject.trim(), // Update title as well, since many components display title || subject
            subject: editSubject.trim(),
            description: editDescription.trim(),
        };
        const list = requests.map(req => req.id === selectedRequest.id ? updatedRequest : req);
        setRequests(list);
        localStorage.setItem("doc_tracking_requests", JSON.stringify(list));
        window.dispatchEvent(new Event("requests_updated"));
        setSelectedRequest(updatedRequest);
        setShowEditModal(false);
        setSuccessMessage("Request updated successfully.");
        setShowSuccessAlert(true);
        setTimeout(() => setShowSuccessAlert(false), 2000);
    };
    const handleResubmit = () => {
        if (!selectedRequest) return;
        const list = requests.map(req => {
            if (req.id === selectedRequest.id) {
                const currentIndex = req.currentStepIndex !== undefined ? req.currentStepIndex : 0;
                const targetDeptObj = req.path && req.path[currentIndex];
                const targetDept = typeof targetDeptObj === 'string' ? targetDeptObj : (targetDeptObj?.department || targetDeptObj?.mainRole || "");

                let newReadBy = req.readBy || [];
                if (usersList && usersList.length > 0) {
                    const targetEmails = usersList
                        .filter(u => (u.department || u.mainRole || "").toLowerCase().trim() === targetDept.toLowerCase().trim())
                        .map(u => u.email || u.username);
                    newReadBy = newReadBy.filter(r => !targetEmails.includes(r) && r !== targetDept.toLowerCase().trim());
                } else {
                    newReadBy = newReadBy.filter(r => r !== targetDept.toLowerCase().trim());
                }
                return {
                    ...req,
                    status: "In Progress",
                    declineReason: null,
                    improveAssignedTo: null,
                    readBy: newReadBy
                };
            }
            return req;
        });
        updateRequestsList(list, "Document re-submitted successfully.");
    };
    if (!isMounted) return null;
    const activeFileName = selectedRequest?.files && selectedRequest.files.length > 0 ? selectedRequest.files[activeFileIndex]?.name || "unknown_file.pdf" : "student_registration_form_v1.pdf";
    const activeFileSize = selectedRequest?.files && selectedRequest.files.length > 0 ? formatFileSize(selectedRequest.files[activeFileIndex]?.size || 0) : "177.72 KB";
    const ext = getFileExtension(activeFileName);
    const isImage = ["png", "jpg", "jpeg", "gif"].includes(ext);
    const isPdf = ext === "pdf";
    const isDocx = ext === "docx";
    const userDept = (currentUser?.department || currentUser?.mainRole || "").toLowerCase().trim();
    // Helper to group requests by date
    const getGroupedRequests = (requests) => {
        const groups = {
            "Today": [],
            "Yesterday": [],
            "2 Days ago": [],
            "Older": []
        };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        requests.forEach(req => {
            const reqDate = new Date(req.date || Date.now());
            reqDate.setHours(0, 0, 0, 0);
            const diffTime = today.getTime() - reqDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 0) groups["Today"].push(req);
            else if (diffDays === 1) groups["Yesterday"].push(req);
            else if (diffDays === 2) groups["2 Days ago"].push(req);
            else groups["Older"].push(req);
        });
        return groups;
    };
    const groupedRequests = getGroupedRequests(filteredRequests);
    const currentStepData = selectedRequest?.path && selectedRequest.path.length > 0 ? selectedRequest.path[selectedRequest.currentStepIndex !== undefined ? selectedRequest.currentStepIndex : 0] : null;
    const currentReviewerRole = currentStepData ? getRoleString(currentStepData) : null;
    const isStatusInProgress = selectedRequest?.status?.toLowerCase().trim() === "in progress" || selectedRequest?.status?.toLowerCase().trim() === "in progressing";

    const isMyDepartmentTurn = selectedRequest && isStatusInProgress && ((currentReviewerRole && currentReviewerRole.toLowerCase().trim() === userDept) || (!currentReviewerRole && (userDept === "acc" || userDept === "inventory" || userDept === "itc")));
    const hasAssignee = !!currentStepData?.assignedTo;
    const isAssignedToMe = currentStepData?.assignedTo?.email?.toLowerCase().trim() === (currentUser?.email || "").toLowerCase().trim();
    const isManager = currentUser && (
        (currentUser.role || "").toLowerCase() === "admin" || 
        (currentUser.role || "").toLowerCase() === "super admin" || 
        (currentUser.role || "").toLowerCase() === "department head" || 
        sessionStorage.getItem("isAdminAuthenticated") === "true"
    );
    const isMyTurn = isMyDepartmentTurn && (!hasAssignee || isAssignedToMe);
    return (
        <div className="flex min-h-screen bg-[#fafafb] dark:bg-[#0F1117] text-black dark:text-white">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} currentUser={currentUser} />
                {/* Alerts and Modals */}
                {showSuccessAlert && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] px-6 py-4 bg-green-950 border border-green-700/60 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in select-none">
                        <CheckCircle2 className="text-green-400" size={20} />
                        <span className="text-white text-[13px] font-bold">{successMessage}</span>
                    </div>
                )}
                {/* Modals here... */}
                {showReturnModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
                        <div className="w-full max-w-[420px] bg-white dark:bg-[#161B22] rounded-3xl p-6 text-center shadow-2xl border border-gray-50 flex flex-col items-center">
                            <div className="flex items-center justify-between w-full mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Reason of document return</h3>
                                <button onClick={() => setShowReturnModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
                            </div>
                            <div className="mb-4 w-full">
                                <textarea
                                    rows={4}
                                    placeholder="Write Something..."
                                    value={returnReason}
                                    onChange={(e) => setReturnReason(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#dcb04d] outline-none text-[13px] bg-white text-black font-semibold resize-none mb-5"
                                />
                            </div>
                            <div className="flex items-center gap-3 w-full">
                                <button onClick={() => setShowReturnModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer">Cancel</button>
                                <button onClick={confirmReturn} className="flex-1 py-3 bg-[#dcb04d] hover:bg-[#c99f43] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm">Confirm Return</button>
                            </div>
                        </div>
                    </div>
                )}
                {showDeclineModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
                        <div className="w-full max-w-[420px] bg-white dark:bg-[#161B22] rounded-3xl p-6 text-center shadow-2xl border border-gray-50 flex flex-col items-center">
                            <div className="flex items-center justify-between w-full mb-4">
                                <h3 className="text-xl font-bold text-gray-900">{t('decline_modal_title')}</h3>
                                <button onClick={() => setShowDeclineModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
                            </div>
                            <div className="mb-4 w-full">
                                <textarea
                                    rows={4}
                                    placeholder={t('reason_for_declining')}
                                    value={declineReason}
                                    onChange={(e) => setDeclineReason(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 outline-none text-[13px] bg-white text-black font-semibold resize-none mb-5"
                                />
                            </div>
                            <div className="flex items-center gap-3 w-full">
                                <button onClick={() => setShowDeclineModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer">Cancel</button>
                                <button onClick={confirmDecline} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm">Confirm Decline</button>
                            </div>
                        </div>
                    </div>
                )}
                {showAssignModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
                        <div className="w-full max-w-[420px] bg-white dark:bg-[#161B22] rounded-3xl p-6 shadow-2xl border border-gray-50 flex flex-col items-center">
                            <div className="flex items-center justify-between w-full mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Assign Document</h3>
                                <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
                            </div>
                            <div className="mb-6 w-full">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Select Department Member</label>
                                <CustomSelect
                                    value={selectedAssignee}
                                    onChange={(e) => setSelectedAssignee(e.target.value)}
                                    placeholder={t("select_member") || "Select member..."}
                                    searchable={true}
                                    searchPlaceholder={t("search_member") || "Search member..."}
                                    options={usersList
                                        .filter(u => ((u.department || u.mainRole || "ITC") === userDept || (u.department || u.mainRole || "ITC").toLowerCase().trim() === userDept) && (u.role || "").toLowerCase().trim() !== "super admin" && u.email !== currentUser?.email)
                                        .map(u => {
                                            const rawName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
                                            const engName = rawName.replace(/[\u1780-\u17FF\u19E0-\u19FF\u200B]/g, '').replace(/\s+/g, ' ').trim() || rawName;
                                            return {
                                                value: JSON.stringify({ name: rawName, email: u.email }),
                                                label: `${engName} (${u.email})`
                                            };
                                        })}
                                />
                            </div>
                            <div className="flex items-center gap-3 w-full">
                                <button onClick={() => setShowAssignModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer">Cancel</button>
                                <button onClick={handleAssign} disabled={!selectedAssignee} className="flex-1 py-3 bg-[#3b82f6] hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm">Confirm Assignment</button>
                            </div>
                        </div>
                    </div>
                )}
                {showApproveModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
                        <div className="w-full max-w-[500px] bg-white dark:bg-[#161B22] rounded-3xl p-6 shadow-2xl border border-gray-50 flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">{t('approve_modal_title')}</h3>
                                <button onClick={() => setShowApproveModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">{t('approve_modal_desc')}</p>
                            <div className="flex border-b border-gray-200 mb-4">
                                <button onClick={() => { setSignatureMode("draw"); setSignatureData(null); }} className={`flex-1 py-2 text-sm font-semibold cursor-pointer border-b-2 ${signatureMode === "draw" ? "border-green-600 text-green-700" : "border-transparent text-gray-500"}`}>{t('draw_signature')}</button>
                                <button onClick={() => { setSignatureMode("upload"); setSignatureData(null); }} className={`flex-1 py-2 text-sm font-semibold cursor-pointer border-b-2 ${signatureMode === "upload" ? "border-green-600 text-green-700" : "border-transparent text-gray-500"}`}>{t('upload_signature')}</button>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden h-[200px] flex items-center justify-center mb-5 relative">
                                {signatureMode === "draw" ? (
                                    <>
                                        <canvas ref={canvasRef} width={450} height={200} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full h-full cursor-crosshair touch-none" />
                                        <button type="button" onClick={clearSignature} className="absolute bottom-3 right-3 p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 shadow-sm"><RefreshCcw size={16} /></button>
                                        {!signatureData && <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20"><span className="text-2xl font-bold text-gray-400 transform -rotate-12 select-none">{t('sign_here')}</span></div>}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                        {signatureData ? (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <img src={signatureData} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                                                <button onClick={() => setSignatureData(null)} className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200"><XCircle size={16} /></button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-100">
                                                <Upload size={32} className="text-gray-400 mb-2" />
                                                <span className="text-sm font-medium text-gray-600">{t('click_to_upload')}</span>
                                                <input type="file" accept="image/png, image/jpeg" onChange={handleSignatureUpload} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3 w-full">
                                <button onClick={() => setShowApproveModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                                <button onClick={confirmApprove} disabled={!signatureData} className="flex-1 py-3 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-green-300 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Confirm</button>
                            </div>
                        </div>
                    </div>
                )}
                {showConfirmApproveModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
                        <div className="w-full max-w-[420px] bg-white dark:bg-[#161B22] rounded-3xl p-6 shadow-2xl border border-gray-50 flex flex-col items-center">
                            <div className="flex items-center justify-between w-full mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Confirm Approval</h3>
                                <button onClick={() => setShowConfirmApproveModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
                            </div>
                            <p className="text-sm text-gray-600 w-full mb-4 text-left">Are you sure you want to approve this document and route it to the next step?</p>
                            <div className="mb-6 w-full">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Comment (Optional)</label>
                                <textarea
                                    rows={3}
                                    value={approveComment}
                                    onChange={(e) => setApproveComment(e.target.value)}
                                    placeholder="Leave an optional comment..."
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none text-[13px] bg-white text-black resize-none"
                                />
                            </div>
                            <div className="flex items-center gap-3 w-full">
                                <button onClick={() => setShowConfirmApproveModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer">Cancel</button>
                                <button onClick={confirmIntermediateApprove} className="flex-1 py-3 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm">Confirm Approve</button>
                            </div>
                        </div>
                    </div>
                )}
                {showEditModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
                        <div className="w-full max-w-[500px] bg-white dark:bg-[#161B22] rounded-2xl p-6 shadow-2xl border border-gray-100 flex flex-col">
                            <div className="flex items-center justify-between w-full mb-4 border-b pb-4">
                                <h3 className="text-xl font-bold text-gray-900 font-serif">Edit Request Details</h3>
                                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
                            </div>
                            <div className="flex flex-col gap-4 mb-6 w-full">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={editSubject}
                                        onChange={(e) => setEditSubject(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Description (Optional)</label>
                                    <textarea
                                        rows={4}
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-green-500 outline-none resize-none"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 w-full">
                                <button onClick={() => setShowEditModal(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
                                <button onClick={confirmEdit} className="px-6 py-2.5 bg-[#dcb04d] text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-sm cursor-pointer">Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex-1 w-full mx-auto p-8 overflow-y-auto bg-[#fafafb] dark:bg-[#0F1117]">
                    <div className="w-full mb-6">
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-6">{t("receive")}</h1>
                        {/* Top Workflow Tracker */}
                        {selectedRequest && (
                            <div className="flex items-center justify-start w-full bg-[#fdfdfd] dark:bg-[#0F1117] border border-gray-100 dark:border-[#2A2F3A] rounded-xl p-4 shadow-sm mb-6 overflow-x-auto">
                                <div className="flex items-center space-x-1 min-w-max">
                                    {/* Sender Node */}
                                    {(() => {
                                        const senderNodeUser = getNodeUserInfo(selectedRequest?.senderName);
                                        const displaySenderPhoto = selectedRequest?.senderPhoto || (senderNodeUser ? (senderNodeUser.profilePhoto || senderNodeUser.photo) : null);
                                        return (
                                            <div className="flex items-center">
                                                <div className="flex items-center gap-3 bg-[#f8fcf8] dark:bg-[#161B22] border border-[#008000] dark:border-[#008000] rounded-lg p-2.5 shadow-xs min-w-[240px] z-10 relative">
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
                                    {selectedRequest.path && selectedRequest.path.length > 0 && selectedRequest.path.map((step, idx) => {
                                        const isApproved = (selectedRequest.currentStepIndex || 0) > idx || selectedRequest.status === "Completed";
                                        const isCurrent = (selectedRequest.currentStepIndex || 0) === idx && selectedRequest.status !== "Completed";
                                        const isFailed = selectedRequest.status === "Failed" && idx === (selectedRequest.currentStepIndex || 0);
                                        const isReturned = selectedRequest.status === "Assigned to Improve" && idx === (selectedRequest.currentStepIndex || 0);
                                        const isForwarded = isApproved && step.comment && step.comment.startsWith("Forwarded to");
                                        const roleName = getRoleString(step);
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
                                            if (stepUser !== "Pending" && stepUser !== "Unknown" && stepUser !== stepDept) {
                                                stepRole = nodeUser.role || "Staff";
                                            } else {
                                                stepRole = nodeUser.role || stepRole;
                                            }
                                        }
                                        const nodePhoto = nodeUser ? (nodeUser.profilePhoto || nodeUser.photo) : null;
                                        const isLeftApproved = idx === 0 || (idx > 0 && ((selectedRequest.currentStepIndex || 0) > idx - 1 || selectedRequest.status === "Completed"));
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
                                                <div className="flex items-center gap-3 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-2.5 shadow-xs min-w-[240px] z-10 relative">
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
                        <div className="flex flex-col lg:flex-row gap-6 items-start">
                            {/* Left Column: Email List */}
                            <div className="w-full lg:w-[380px] flex flex-col gap-4 shrink-0">
                                <div className="bg-white dark:bg-[#161B22] border border-gray-100 dark:border-[#2A2F3A] rounded-xl p-4 shadow-sm flex flex-col">
                                    {/* Search */}
                                    <div className="relative mb-4">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder={t("search")}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-sm bg-gray-50 dark:bg-[#242B36] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-green-500"
                                        />
                                    </div>
                                    {/* Toggles */}
                                    <div className="flex gap-2 mb-4">
                                        <button onClick={() => setActiveTab("unread")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${activeTab === 'unread' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800' : 'bg-white dark:bg-[#161B22] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#2A2F3A] hover:bg-gray-50 dark:hover:bg-[#242B36]'}`}>{t("not_yet_read")}</button>
                                        <button onClick={() => setActiveTab("read")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${activeTab === 'read' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800' : 'bg-white dark:bg-[#161B22] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#2A2F3A] hover:bg-gray-50 dark:hover:bg-[#242B36]'}`}>{t("marked_read")}</button>
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
                                                    <h3 className="text-[13px] font-medium text-gray-800 dark:text-gray-200 mb-3 ml-2">{groupName}</h3>
                                                    <div className="flex flex-col gap-2">
                                                        {items.map(req => {
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
                                                            return (
                                                                <div
                                                                    key={req.id}
                                                                    onClick={() => handleSelectRequest(req)}
                                                                    className={`flex items-start justify-between cursor-pointer p-2 rounded-lg transition-colors border-l-2 ${isSelected ? 'bg-green-50/50 dark:bg-green-900/20 border-green-500' : 'border-transparent hover:bg-gray-50 dark:hover:bg-[#242B36]'}`}
                                                                >
                                                                    <div className="flex items-center gap-3 w-[75%]">
                                                                        {getSenderPhoto(req) ? (
                                                                            <img src={getSenderPhoto(req)} className="w-8 h-8 rounded-full object-cover object-top shrink-0" />
                                                                        ) : (
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${isFailed ? 'bg-green-400' : isReturned ? 'bg-purple-400' : isSender ? 'bg-pink-400' : 'bg-yellow-500'}`}>
                                                                                {getDisplaySenderName(req).split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex flex-col overflow-hidden w-full">
                                                                            <span className="text-[13px] font-bold text-gray-900 dark:text-gray-100 uppercase truncate">{getDisplaySenderName(req)}</span>
                                                                            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{req.title || ""}</span>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`text-[11px] font-medium ${badgeColor} mt-1`}>{badgeText}</span>
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
                                        {/* Always show action buttons for testing or based on user request */}
                                        <div className="flex items-center gap-2">
                                            {selectedRequest.status === "Assigned to Improve" && (selectedRequest.improveAssignedTo || "").toLowerCase().trim() === userDept ? (
                                                <>
                                                    <button onClick={handleEditClick} className="px-6 py-2 bg-[#dcb04d] text-white text-[12px] font-bold rounded-md shadow-sm cursor-pointer hover:opacity-90 transition-opacity">{t("edit")}</button>
                                                    <button onClick={handleResubmit} className="px-6 py-2 bg-[#008000] text-white text-[12px] font-bold rounded-md shadow-sm cursor-pointer hover:opacity-90 transition-opacity">{t("request")}</button>
                                                </>
                                            ) : isMyTurn ? (
                                                <>
                                                    <button onClick={handleDeclineClick} className="px-6 py-2 bg-[#ff0000] text-white text-[12px] font-bold rounded-md cursor-pointer shadow-sm hover:opacity-90 transition-opacity">{t("declined")}</button>
                                                    <button onClick={handleReturnClick} className="px-6 py-2 bg-[#dcb04d] text-white text-[12px] font-bold rounded-md cursor-pointer shadow-sm hover:opacity-90 transition-opacity">{t("return")}</button>
                                                    <button onClick={handleApproveClick} className="px-6 py-2 bg-[#008000] text-white text-[12px] font-bold rounded-md cursor-pointer shadow-sm hover:opacity-90 transition-opacity">{t("approve")}</button>
                                                    {isManager && !hasAssignee && (
                                                        <button onClick={() => setShowAssignModal(true)} className="px-6 py-2 bg-[#3b82f6] text-white text-[12px] font-bold rounded-md cursor-pointer shadow-sm hover:opacity-90 transition-opacity">{t("assign")}</button>
                                                    )}
                                                </>
                                            ) : (
                                                (() => {
                                                    let actionText = t("read_only_view");
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
                                                        <div className={`px-4 py-2 ${bgClass} ${textClass} text-[12px] font-bold rounded-md border ${borderClass} shadow-sm select-none`}>
                                                            {actionText}
                                                        </div>
                                                    );
                                                })()
                                            )}
                                        </div>
                                    </div>
                                    {/* Sender Profile Header */}
                                    <div className="flex flex-col pb-4">
                                        <div className="flex items-center gap-3 mb-4">
                                            {getSenderPhoto(selectedRequest) ? (
                                                <img src={getSenderPhoto(selectedRequest)} className="w-8 h-8 rounded-full object-cover object-top shrink-0" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                                    {getDisplaySenderName(selectedRequest).split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-gray-800 dark:text-gray-100 uppercase">
                                                    {getDisplaySenderName(selectedRequest)} <span className="text-gray-500 dark:text-gray-400 font-normal lowercase">&lt;{getSenderEmail(selectedRequest)}&gt;</span>
                                                </span>
                                                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 mt-1">
                                                    <span className="bg-gray-100 dark:bg-[#242B36] dark:text-gray-300 text-gray-600 px-2 py-0.5 rounded">{formatDisplayDate(selectedRequest.date)}</span>
                                                    <span className="text-gray-400 dark:text-gray-300 text-[12px]">at</span>
                                                    <span>{selectedRequest.time || (selectedRequest.date ? new Date(selectedRequest.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "12:00")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Unified Document Content Box */}
                                    <div className="border border-gray-200 dark:border-[#2A2F3A] rounded-lg mb-6 flex flex-col shadow-sm overflow-hidden bg-white dark:bg-[#161B22]">
                                        {/* Metadata Header */}
                                        <div className="bg-[#f4f4f5] dark:bg-[#242B36] p-4 border-b border-gray-200 dark:border-[#2A2F3A] flex flex-col gap-1.5 text-[13px]">
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
                                                      const p = (selectedRequest.urgency || "Normal").toLowerCase().trim();
                                                      if (p === "urgent") return (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 font-extrabold text-[10px] uppercase tracking-wider border border-red-200 dark:border-red-500/20 shadow-sm leading-tight">
                                                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                          {t('urgent') || 'Urgent'}
                                                        </span>
                                                      );
                                                      if (p === "high") return (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 font-extrabold text-[10px] uppercase tracking-wider border border-orange-200 dark:border-orange-500/20 shadow-sm leading-tight">
                                                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                                          {t('high') || 'High'}
                                                        </span>
                                                      );
                                                      if (p === "medium") return (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 font-extrabold text-[10px] uppercase tracking-wider border border-yellow-200 dark:border-yellow-500/20 shadow-sm leading-tight">
                                                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                                          {t('medium') || 'Medium'}
                                                        </span>
                                                      );
                                                      if (p === "normal") return (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-extrabold text-[10px] uppercase tracking-wider border border-green-200 dark:border-green-500/20 shadow-sm leading-tight">
                                                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                          {t('normal') || 'Normal'}
                                                        </span>
                                                      );
                                                      return (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold text-[10px] uppercase tracking-wider border border-blue-200 dark:border-blue-500/20 shadow-sm leading-tight">
                                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                          {selectedRequest.urgency}
                                                        </span>
                                                      );
                                                  })()}
                                                </div>
                                            </div>
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
                                        <div className="p-5 text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium min-h-[140px]">
                                            {(selectedRequest.status === "Assigned to Improve" || selectedRequest.status === "Failed") && selectedRequest.declineReason
                                                ? selectedRequest.declineReason
                                                : (selectedRequest.details || selectedRequest.description || "No description provided.")}
                                        </div>

                                        {/* Attachments Section */}
                                        {((selectedRequest.files && selectedRequest.files.length > 0) || isMyTurn) && (
                                            <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-[#2A2F3A] mt-2">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 text-[13px]">{t("attached_file") || "Attached Files"}</span>
                                                    {isMyTurn && (
                                                        <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors text-[12px] font-bold border border-blue-200 dark:border-blue-500/20 shadow-sm">
                                                            <Plus size={14} strokeWidth={3} />
                                                            {t("add_new") || "Add New"}
                                                            <input type="file" multiple className="hidden" onChange={handleFileAdded} />
                                                        </label>
                                                    )}
                                                </div>
                                                {selectedRequest.files && selectedRequest.files.length > 0 ? (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {selectedRequest.files.map((file, idx) => {
                                                            const isIntermediateReceiver = isMyTurn && ((selectedRequest.currentStepIndex !== undefined ? selectedRequest.currentStepIndex : 0) < (selectedRequest.path ? selectedRequest.path.length - 1 : 0));
                                                            if (selectedRequest.status === "Assigned to Improve" || selectedRequest.status === "Failed" || isMyTurn) {
                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveFileIndex(idx);
                                                                            setIsPreviewOpen(true);
                                                                        }}
                                                                        className="bg-gray-100 dark:bg-[#242B36] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-2 flex items-center justify-between relative shadow-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-[#242B36] transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-3 w-full pr-8">
                                                                            <div className="w-8 h-10 border border-red-200 flex flex-col items-center justify-center bg-white rounded shrink-0 relative overflow-hidden">
                                                                                <FileText size={16} className="text-red-500 mb-2" />
                                                                                <div className="absolute bottom-0 left-0 right-0 bg-red-500 flex justify-center py-[1px]">
                                                                                    <span className="text-[6px] text-white font-bold leading-none">PDF</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex flex-col flex-1 min-w-0">
                                                                                <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">{file.name || "document.pdf"}</span>
                                                                                <span className="text-[10px] text-gray-400 truncate">{formatFileSize(file.size)}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleDownload(e, file); }}
                                                                                className="text-[#4a7239] hover:text-green-800 p-1"
                                                                            >
                                                                                <UploadCloud size={16} />
                                                                            </button>
                                                                            {(
                                                                                (selectedRequest.status === "Assigned to Improve" && (selectedRequest.improveAssignedTo || "").toLowerCase().trim() === userDept) ||
                                                                                isMyTurn
                                                                            ) && (
                                                                                    <button
                                                                                        onClick={(e) => handleDeleteFile(e, idx)}
                                                                                        className="text-red-500 hover:text-red-700 p-1"
                                                                                    >
                                                                                        <X size={16} />
                                                                                    </button>
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <div key={idx} onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveFileIndex(idx);
                                                                    setIsPreviewOpen(true);
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
                                                                        <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">{file.name || "document.pdf"}</span>
                                                                        <span className="text-[10px] text-gray-400 truncate">{formatFileSize(file.size)}</span>
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
                                                    <p className="text-[13px] text-gray-500 dark:text-gray-400 italic">No files attached yet. Click "Add New" to upload.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Forward Section for Custom Request */}
                                    {isMyTurn && selectedRequest.documentType === "Custom Request" && (
                                        <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm mb-6 flex flex-col gap-4">
                                            <p className="text-[13px] italic text-gray-800 dark:text-gray-400">
                                                This will forward the document to the next person for review and approval.
                                            </p>
                                            <div>
                                                <label className="block text-[15px] font-bold text-gray-900 dark:text-white mb-2">
                                                    Forward To:
                                                </label>
                                                <div className="flex gap-4 items-center w-full">
                                                    <div className="flex-1">
                                                        <CustomSelect
                                                            name="forwardTo"
                                                            value={forwardToDept}
                                                            onChange={(e) => setForwardToDept(e.target.value)}
                                                            placeholder="Select your destination"
                                                            options={departments.map(d => ({ label: d.title, value: d.title }))}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={handleForwardClick}
                                                        className="px-6 py-[11px] bg-[#1976D2] hover:bg-[#1565C0] text-white text-[14px] font-bold rounded-md shadow-sm transition-colors cursor-pointer"
                                                    >
                                                        Send
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Approval Information (Only when Completed, and only for sender or approver) */}
                                    {selectedRequest.status === "Completed" && (() => {
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
                                            {/* Signature block */}
                                            {(() => {
                                                const lastStep = selectedRequest.path?.[selectedRequest.path.length - 1];
                                                const finalSignature = selectedRequest.approvalSignature || lastStep?.signature;
                                                if (finalSignature) {
                                                    return (
                                                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#2A2F3A]">
                                                            <span className="text-[14px] text-gray-500 font-medium mb-3 block">{t("signature")} :</span>
                                                            <div className="h-[80px] w-full max-w-[200px] border border-gray-200 dark:border-[#2A2F3A] rounded-lg bg-gray-50/50 dark:bg-[#242B36]/20 flex items-center justify-center p-2 overflow-hidden relative">
                                                                <img
                                                                    src={finalSignature}
                                                                    alt="Final Signature"
                                                                    className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-screen"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    )}
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
                                                <button className="px-8 py-1.5 bg-[#4a7239] text-white text-[11px] font-bold rounded-full mb-2 shadow-sm pointer-events-none">Browse</button>
                                                <span className="text-[11px] font-bold text-gray-500 mb-1">Drop a file here</span>
                                                <span className="text-[11px] font-bold text-gray-400">File Supported .png, .jpg, & .jpeg</span>
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
                        <div className="flex items-center justify-between p-4 bg-[#1c1c1e] border-b border-[#2c2c2e]">
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
                                    <div ref={modalDocxContainerRef} className="bg-white min-h-full w-full max-w-4xl p-4 shadow-xl" />
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
                    onClose={() => setAlertModal({ isOpen: false, message: "" })}
                    message={alertModal.message}
                />
            </main>
        </div>
    );
}
