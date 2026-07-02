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
    Plus,
    User,
    Tag
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
import { useDocuments, useUpdateDocument, useDocumentVersions } from '../../../hooks/useDocuments';
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

export default function ReceivedPage() {
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
    const { data: documentVersions = [], isLoading: isLoadingVersions } = useDocumentVersions(selectedRequest?.document_number);
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

            const isAssignedToMeForImprovement = req.status?.toLowerCase().trim() === "assigned to improve" && isExactSender;
            if (isAssignedToMeForImprovement) return true;

            let isCurrentApprover = false;
            if (req.path && req.path[req.currentStepIndex || 0]) {
                const currentStep = req.path[req.currentStepIndex || 0];
                const currentApproverSign = (currentStep.userSign || "").toLowerCase();
                const englishSignName = currentApproverSign.replace(/[\u1780-\u17FF\u19E0-\u19FF\u200B]/g, '').replace(/\s+/g, ' ').trim();
                if ((englishSignName === currentUserName) || (englishSignName === (currentUser?.username || "").toLowerCase().trim())) {
                    isCurrentApprover = true;
                } else {
                    // Also check if they are the target user based on department userSignature
                    const role = typeof currentStep === 'string' ? currentStep : currentStep.department || currentStep.mainRole;
                    const roleNormalized = (role || "").toLowerCase().trim();
                    if (roleNormalized === userDept) {
                        let requiredUserSign = null;
                        if (currentStep.userSign && currentStep.userSign.trim() !== "") {
                            requiredUserSign = currentStep.userSign;
                        } else {
                            const targetDeptObj = departments.find(d => (d.title || d.name || d.code || "").toLowerCase().trim() === roleNormalized);
                            const userSignValue = targetDeptObj ? (targetDeptObj.userSignature || targetDeptObj.user_signature) : null;
                            if (userSignValue && userSignValue.trim() !== "") {
                                requiredUserSign = userSignValue;
                            }
                        }

                        let isTargetUser = true;
                        if (requiredUserSign) {
                            const signName = requiredUserSign.replace(/[\u200B]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
                            const myNameEn = (currentUser?.fullname_en || "").replace(/[\u200B]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();
                            const myNameKh = (currentUser?.fullname_kh || "").replace(/[\u200B]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();
                            const myUsername = (currentUser?.username || "").replace(/[\u200B]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();
                            if (signName !== myNameEn && signName !== myNameKh && signName !== myUsername) {
                                isTargetUser = false;
                            }
                        }

                        if (currentStep.assignedTo) {
                            const assignedEmail = (currentStep.assignedTo.email || "").toLowerCase().trim();
                            if (assignedEmail === myEmail) {
                                isTargetUser = true;
                            } else {
                                isTargetUser = false;
                            }
                        }
                        if (isTargetUser) {
                            isCurrentApprover = true;
                        }
                    }
                }
            }

            if (isExactSender && !isCurrentApprover && req.status !== "failed" && req.status !== "assigned to improve" && req.status !== "completed") {
                return false;
            }
            if (isGlobalSuperAdmin) return true; // Global super admin sees all OTHERS
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
                    const targetDeptObj = departments.find(d => (d.title || d.name || d.code || "").toLowerCase().trim() === roleNormalized);
                    const userSignValue = targetDeptObj ? (targetDeptObj.userSignature || targetDeptObj.user_signature) : null;
                    if (userSignValue && userSignValue.trim() !== "") {
                        requiredUserSign = userSignValue;
                    }
                }

                if (requiredUserSign) {
                    const signName = requiredUserSign.replace(/[\u200B]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
                    const myNameEn = (currentUser?.fullname_en || "").replace(/[\u200B]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();
                    const myNameKh = (currentUser?.fullname_kh || "").replace(/[\u200B]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();
                    const myUsername = (currentUser?.username || "").replace(/[\u200B]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();

                    if (signName !== myNameEn && signName !== myNameKh && signName !== myUsername) {
                        isTargetUser = false;
                    }
                }

                if (p.assignedTo) {
                    const assignedEmail = (p.assignedTo.email || "").toLowerCase().trim();
                    const myEmailStr = (currentUser?.email || "").toLowerCase().trim();
                    if (assignedEmail && myEmailStr && assignedEmail === myEmailStr) {
                        isTargetUser = true;
                    }
                }

                if (roleNormalized === userDept && isTargetUser) return true;
                return false;
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
    }, [requests, currentUser, searchTerm, activeTab, selectedRequest?.id, departments]);
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
            updateMutation.mutate({ id: updatedReq.id, data: updatedReq });
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
                getFileFromIndexedDB(selectedRequest.id).then((url) => {
                    if (url) {
                        setActiveFileDataUrl(url);
                    } else if (file?.name) {
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
                                setActiveFileDataUrl(targetUrl); // fallback
                            });
                    } else {
                        setActiveFileDataUrl(null);
                    }
                });
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

        return usersList.find(u => {
            const deptName = typeof u.department === 'object' && u.department ? u.department.name : (u.department || u.mainRole || "");
            if (deptName.toLowerCase().trim() === target) return true;

            // Also check if any role name includes the target (e.g. target="accounting", role="Head of Accounting")
            if (u.roles && u.roles.length > 0) {
                return u.roles.some(r => r.name.toLowerCase().includes(target) || (r.department && r.department.name && r.department.name.toLowerCase().trim() === target));
            }
            return false;
        }) || null;
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
        updateMutation.mutate({ id: updatedRequest.id, data: updatedRequest });
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
                        addedBy: (currentUser?.department || currentUser?.mainRole || "Department"),
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
            updateMutation.mutate({ id: updatedRequest.id, data: updatedRequest });
        });
    };
    const handleDownload = async (e, fileToDownload) => {
        e.stopPropagation();
        const file = fileToDownload || (selectedRequest.files && selectedRequest.files[0]);
        if (!file) return;

        try {
            if (selectedRequest?.id) {
                logDocumentAction(selectedRequest.id, 'Downloaded').catch(console.error);
            }
        } catch (err) {
            console.error(err);
        }

        let dataUrl = file.dataUrl || file.base64 || file.data;
        if (!dataUrl) {
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
        if (displayName && displayName !== "Unknown") {
            return `${displayName.toLowerCase().replace(/\s+/g, ".")}@rupp.edu.kh`;
        }
        return "user@rupp.edu.kh";
    };
    const updateRequestsList = (updatedList, msg) => {
        setRequests(updatedList);
        if (selectedRequest) {
            const updatedReq = updatedList.find(r => r.id === selectedRequest.id);
            if (updatedReq) {
                updateMutation.mutate({ id: updatedReq.id, data: updatedReq });
            }
        }

        if (selectedRequest) {
            const updatedReq = updatedList.find(r => r.id === selectedRequest.id);
            setSelectedRequest(updatedReq || null);
        }
        setSuccessMessage(msg);
        setShowSuccessAlert(true);
        setTimeout(() => {
            setShowSuccessAlert(false);
            setEditedFile(null);
        }, 2000);
    };
    useEffect(() => {
        if (selectedRequest) {
            setEditedFile(null);
            setActiveFileIndex(0);
        }
    }, [selectedRequest]);
    const handleApproveClick = async () => {
        const isLast = selectedRequest && (!selectedRequest.path || selectedRequest.path.length === 0 || (selectedRequest.currentStepIndex !== undefined ? selectedRequest.currentStepIndex : 0) >= selectedRequest.path.length - 1);
        const fileName = selectedRequest?.files?.[0]?.name || selectedRequest?.files?.[0]?.stored_name || "";
        const isPdf = fileName.toLowerCase().endsWith(".pdf");
        const isImage = fileName.toLowerCase().endsWith(".jpg") || fileName.toLowerCase().endsWith(".jpeg") || fileName.toLowerCase().endsWith(".png");

        if (isLast && fileName) {
            if (isPdf) {
                let savedSignature = currentUser?.signaturePhoto || currentUser?.signature_photo;
                if (!savedSignature && currentUser?.email) {
                    const userInDb = usersList.find(u => u.email === currentUser.email);
                    if (userInDb && (userInDb.signaturePhoto || userInDb.signature_photo)) {
                        savedSignature = userInDb.signaturePhoto || userInDb.signature_photo;
                    }
                }
                if (savedSignature) {
                    setSignerSignaturePhoto(savedSignature);
                    setIsSignerOpen(true);
                } else {
                    showAlert("Please set up your signature in your Account Profile first.");
                }
            } else if (isImage) {
                try {
                    setIsConverting(true);
                    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("token");
                    const response = await fetch(`http://document_tracking_system.test/api/documents/${encodeURIComponent(fileName)}/convert-to-pdf`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || "Conversion failed");
                    }

                    const data = await response.json();

                    // Update the selected request locally with the new PDF file
                    const newFiles = [...(selectedRequest.files || [])];
                    newFiles[0] = {
                        ...newFiles[0],
                        name: data.new_filename,
                        stored_name: data.new_filename
                    };

                    setSelectedRequest(prev => ({ ...prev, files: newFiles }));

                    // Now open signer with new PDF
                    let savedSignature = currentUser?.signaturePhoto || currentUser?.signature_photo;
                    if (savedSignature) {
                        setSignerSignaturePhoto(savedSignature);
                        // Add slight delay to let state update
                        setTimeout(() => setIsSignerOpen(true), 100);
                    } else {
                        showAlert("Please set up your signature in your Account Profile first.");
                    }
                } catch (error) {
                    console.error("Conversion error:", error);
                    showAlert(error.message || "Failed to convert image to PDF");
                } finally {
                    setIsConverting(false);
                }
            } else {
                showAlert("This file must be converted to PDF before signing.");
            }
        } else {
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
                            name: assigneeObj.name || assigneeObj.email
                        }
                    };
                }
                return { ...req, path: newPath, audit_action: 'Assigned Document', audit_comment: `Assigned to ${assigneeObj.name || assigneeObj.email}` };
            }
            return req;
        });
        setRequests(list);
        const updatedReq = list.find(r => r.id === selectedRequest.id);
        if (updatedReq) {
            updateMutation.mutate({ id: updatedReq.id, data: updatedReq });
        }
        setSuccessMessage(`Document assigned to ${assigneeObj.name}!`);
        setShowSuccessAlert(true);
        setShowAssignModal(false);
        setSelectedAssignee("");
        setSelectedRequest(updatedReq);
        setTimeout(() => {
            setShowSuccessAlert(false);
        }, 2000);
    };
    const executeApprove = (signature, comment = null, newFileName = null) => {
        if (!selectedRequest) return;
        const actorDept = currentUser?.department || currentUser?.mainRole || "Department";
        const currentUserName = currentUser ? (currentUser.fullname_en || currentUser.fullname_kh || currentUser.username || "Unknown User") : "Unknown User";

        let isDelegate = false;
        const currentStepObj = selectedRequest.path?.[selectedRequest.currentStepIndex !== undefined ? selectedRequest.currentStepIndex : 0];
        if (currentStepObj) {
            const stepRole = typeof currentStepObj === 'string' ? currentStepObj : currentStepObj.department || currentStepObj.mainRole;
            if (stepRole && stepRole.toLowerCase().trim() !== actorDept.toLowerCase().trim()) {
                isDelegate = true;
            }
        }
        const finalUserName = isDelegate ? `${currentUserName} (Delegated)` : currentUserName;

        const list = requests.map(req => {
            if (req.id === selectedRequest.id) {
                const pathLen = req.path ? req.path.length : 0;
                const currentIndex = req.currentStepIndex !== undefined ? req.currentStepIndex : 0;
                let updatedFiles = req.files ? [...req.files] : [];
                if (newFileName && updatedFiles.length > 0) {
                    updatedFiles[0] = { ...updatedFiles[0], name: newFileName, stored_name: newFileName };
                    delete updatedFiles[0].data;
                    delete updatedFiles[0].dataUrl;
                    delete updatedFiles[0].base64;
                    delete updatedFiles[0].url;
                    updatedFiles[0].type = "application/pdf";
                    if (updatedFiles[0].display_name) {
                        updatedFiles[0].display_name = updatedFiles[0].display_name.replace(/\.[^.]+$/, ".pdf");
                    }
                    if (updatedFiles[0].original_name) {
                        updatedFiles[0].original_name = updatedFiles[0].original_name.replace(/\.[^.]+$/, ".pdf");
                    }
                }
                if (editedFile) updatedFiles = [editedFile, ...updatedFiles];
                const newPath = req.path ? [...req.path] : [];
                if (newPath[currentIndex]) {
                    newPath[currentIndex] = { ...newPath[currentIndex], signature: signature || null, approvedAt: new Date().toISOString(), comment: comment || null, status: "Approved", userSign: finalUserName };
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
        try {
            const senderNameStr = currentUser ? (currentUser.firstName ? `${currentUser.lastName} ${currentUser.firstName}` : currentUser.username) : "Unknown";
            const newNotif = {
                document_id: selectedRequest.document_id || selectedRequest.id,
                target_department: selectedRequest.senderDepartment || "global",
                sender_name: senderNameStr,
                sender_department: actorDept,
                subject: `Document Approved: ${selectedRequest.title || selectedRequest.subject || selectedRequest.documentType}`,
                details: (isLast ? "Your document has been fully approved." : "Your document has been approved and moved to the next step.") + (comment ? `\nComment: ${comment}` : ""),
                message: `Your document has been approved by ${actorDept}.`
            };
            createNotificationMutation.mutate(newNotif);
            // Also notify the NEXT department if it's not the last step
            if (!isLast) {
                const nextIndex = (selectedRequest.currentStepIndex !== undefined ? selectedRequest.currentStepIndex : 0) + 1;
                const nextDept = selectedRequest.path[nextIndex]?.department || selectedRequest.path[nextIndex]?.mainRole || "global";

                const nextNotif = {
                    document_id: selectedRequest.document_id || selectedRequest.id,
                    target_department: nextDept,
                    sender_name: senderNameStr,
                    sender_department: actorDept,
                    subject: `New Request Routed: ${selectedRequest.title || selectedRequest.subject || selectedRequest.documentType}`,
                    details: `A document has been approved by ${actorDept} and routed to you for review.` + (comment ? `\nComment: ${comment}` : ""),
                    message: `A document has been routed to ${nextDept} for review.`
                };
                createNotificationMutation.mutate(nextNotif);
            }
        } catch (e) {
            console.warn("Error creating notification", e);
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
            const senderNameStr = currentUser ? (currentUser.firstName ? `${currentUser.lastName} ${currentUser.firstName}` : currentUser.username) : "Unknown";
            const newNotif = {
                document_id: selectedRequest.document_id || selectedRequest.id,
                target_department: forwardToDept,
                sender_name: senderNameStr,
                sender_department: actorDept,
                subject: `Forwarded Request: ${selectedRequest.title || selectedRequest.subject || selectedRequest.documentType}`,
                details: `A custom request has been forwarded to you for review.`,
                message: `A custom request has been forwarded to you by ${actorDept}.`
            };
            createNotificationMutation.mutate(newNotif);
        } catch (e) {
            console.warn("Error creating notification", e);
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
            const actorDept = currentUser?.department || currentUser?.mainRole || "Department";
            const senderNameStr = currentUser ? (currentUser.firstName ? `${currentUser.lastName} ${currentUser.firstName}` : currentUser.username) : "Unknown";
            const newNotif = {
                document_id: selectedRequest.document_id || selectedRequest.id,
                target_department: selectedRequest.senderDepartment || "global",
                sender_name: senderNameStr,
                sender_department: actorDept,
                subject: `Document Declined: ${selectedRequest.title || selectedRequest.subject || selectedRequest.documentType}`,
                details: `Reason: ${reason.trim()}`,
                message: `Your document was declined by ${actorDept}.`
            };
            createNotificationMutation.mutate(newNotif);
        } catch (e) {
            console.warn("Error creating notification", e);
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
            const actorDept = currentUser?.department || currentUser?.mainRole || "Department";
            const senderNameStr = currentUser ? (currentUser.firstName ? `${currentUser.lastName} ${currentUser.firstName}` : currentUser.username) : "Unknown";
            const newNotif = {
                document_id: selectedRequest.document_id || selectedRequest.id,
                target_department: selectedRequest.senderDepartment || "global",
                sender_name: senderNameStr,
                sender_department: actorDept,
                subject: `Document Returned for Improvement: ${selectedRequest.title || selectedRequest.subject || selectedRequest.documentType}`,
                details: `Reason: ${reason.trim()}`,
                message: `Your document was returned for improvement by ${actorDept}.`
            };
            createNotificationMutation.mutate(newNotif);
        } catch (e) {
            console.warn("Error creating notification", e);
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
            audit_action: "Edited Details",
            audit_comment: "Updated subject and description"
        };
        const list = requests.map(req => req.id === selectedRequest.id ? updatedRequest : req);
        setRequests(list);
        updateMutation.mutate({ id: updatedRequest.id, data: updatedRequest });
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
                    readBy: newReadBy,
                    audit_action: "Resubmitted",
                    audit_comment: `Resubmitted to ${targetDept}`
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
                        <span className="text-white text-sm font-bold">{successMessage}</span>
                    </div>
                )}
                {/* Modals here... */}
                {showReturnModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
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
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#dcb04d] outline-none text-sm bg-white text-black font-semibold resize-none mb-5"
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
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
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
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 outline-none text-sm bg-white text-black font-semibold resize-none mb-5"
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
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
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
                                            const rawName = String(u.fullname_en || u.username || 'Unknown Member');
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
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
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
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
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
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 outline-none text-sm bg-white text-black resize-none"
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
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
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
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight mb-6">{t("receive")}</h1>
                        {/* Top Workflow Tracker */}
                        {selectedRequest && (
                            <div className="flex items-center justify-start w-full bg-[#fdfdfd] dark:bg-[#0F1117] border border-gray-100 dark:border-[#2A2F3A] rounded-xl p-6 shadow-sm mb-6 overflow-x-auto">
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
                                                        <div className="text-sm text-gray-800 dark:text-gray-200">
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
                                            const actualRole = (nodeUser.roles && nodeUser.roles.length > 0) ? nodeUser.roles[0].name : nodeUser.role;
                                            if (stepUser !== "Pending" && stepUser !== "Unknown" && stepUser !== stepDept) {
                                                stepRole = actualRole || "Staff";
                                            } else {
                                                stepRole = actualRole || stepRole;
                                            }
                                            // Ensure stepUser shows the person's name instead of just the department name
                                            if (stepUser === stepDept || stepUser === "Pending" || stepUser === "Unknown") {
                                                stepUser = getEnglishName(nodeUser.username || nodeUser.name || stepUser) || "Unknown User";
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
                                                        <div className="w-12 h-12 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36] flex items-center justify-center flex-shrink-0 overflow-hidden text-gray-400">
                                                            <svg className="w-full h-full p-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col leading-[1.35]">
                                                        <div className="text-sm text-gray-800 dark:text-gray-200">
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
                                <div className="bg-white dark:bg-[#161B22] border border-gray-100 dark:border-[#2A2F3A] rounded-xl p-6 shadow-sm flex flex-col">
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
                                                    <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 ml-2">{groupName}</h3>
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
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isFailed ? 'bg-green-400' : isReturned ? 'bg-purple-400' : isSender ? 'bg-pink-400' : 'bg-yellow-500'}`}>
                                                                                {getDisplaySenderName(req).split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex flex-col overflow-hidden w-full">
                                                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase truncate">{getDisplaySenderName(req)}</span>
                                                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{req.title || ""}</span>
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
                                        {/* Always show action buttons for testing or based on user request */}
                                        <div className="flex items-center gap-2">
                                            {selectedRequest.status === "Assigned to Improve" && (selectedRequest.improveAssignedTo || "").toLowerCase().trim() === userDept ? (
                                                <>
                                                    <button onClick={handleEditClick} className="px-6 py-2 bg-[#dcb04d] text-white text-sm font-bold rounded-md shadow-sm cursor-pointer hover:opacity-90 transition-opacity">{t("edit")}</button>
                                                    <button onClick={handleResubmit} className="px-6 py-2 bg-[#008000] text-white text-sm font-bold rounded-md shadow-sm cursor-pointer hover:opacity-90 transition-opacity">{t("request")}</button>
                                                </>
                                            ) : isMyTurn ? (
                                                <>
                                                    <button onClick={handleDeclineClick} className="px-6 py-2 bg-[#ff0000] text-white text-sm font-bold rounded-md cursor-pointer shadow-sm hover:opacity-90 transition-opacity">{t("declined")}</button>
                                                    <button onClick={handleReturnClick} className="px-6 py-2 bg-[#dcb04d] text-white text-sm font-bold rounded-md cursor-pointer shadow-sm hover:opacity-90 transition-opacity">{t("return")}</button>
                                                    {(() => {
                                                        const isLast = (!selectedRequest.path || selectedRequest.path.length === 0 || (selectedRequest.currentStepIndex !== undefined ? selectedRequest.currentStepIndex : 0) >= selectedRequest.path.length - 1);

                                                        let label = t("approve");
                                                        if (isLast) {
                                                            const fileName = selectedRequest?.files?.[0]?.name || selectedRequest?.files?.[0]?.stored_name || "";
                                                            const isPdf = fileName.toLowerCase().endsWith(".pdf");

                                                            if (fileName) {
                                                                label = isPdf ? "Sign Document" : "Convert to PDF & Sign";
                                                            } else {
                                                                label = t("approve");
                                                            }
                                                        }

                                                        return (
                                                            <button
                                                                onClick={handleApproveClick}
                                                                disabled={isConverting}
                                                                className="px-6 py-2 bg-[#008000] text-white text-sm font-bold rounded-md cursor-pointer shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                                                            >
                                                                {isConverting ? (
                                                                    <>
                                                                        <RefreshCcw size={14} className="animate-spin" />
                                                                        Converting...
                                                                    </>
                                                                ) : label}
                                                            </button>
                                                        );
                                                    })()}
                                                    {isManager && !hasAssignee && (
                                                        <button onClick={() => setShowAssignModal(true)} className="px-6 py-2 bg-[#3b82f6] text-white text-sm font-bold rounded-md cursor-pointer shadow-sm hover:opacity-90 transition-opacity">{t("assign")}</button>
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
                                                        <div className={`px-4 py-2 ${bgClass} ${textClass} text-sm font-bold rounded-md border ${borderClass} shadow-sm select-none`}>
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
                                                <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                    {getDisplaySenderName(selectedRequest).split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase">
                                                    {getDisplaySenderName(selectedRequest)} <span className="text-gray-500 dark:text-gray-400 font-normal lowercase">&lt;{getSenderEmail(selectedRequest)}&gt;</span>
                                                </span>
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mt-1">
                                                    <span className="bg-gray-100 dark:bg-[#242B36] dark:text-gray-300 text-gray-600 px-2 py-0.5 rounded">{formatDisplayDate(selectedRequest.date)}</span>
                                                    <span className="text-gray-400 dark:text-gray-300 text-sm">at</span>
                                                    <span>{selectedRequest.time || (selectedRequest.date ? new Date(selectedRequest.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "12:00")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Unified Document Content Box */}
                                    <div className="border border-gray-200 dark:border-[#2A2F3A] rounded-lg mb-6 flex flex-col shadow-sm overflow-hidden bg-white dark:bg-[#161B22]">
                                        {/* Metadata Header */}
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
                                                {/* {hasAssignee && ( */}
                                                    {/* <div className="flex items-center gap-2 mt-1">
                                                        <span className="font-bold text-blue-500 w-20 uppercase">{t("assigned")} :</span>
                                                        <span className="text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs truncate">
                                                            {getEnglishName(currentStepData.assignedTo.name)}
                                                        </span>
                                                    </div>
                                                )} */}
                                            </div>



                                        </div>
                                        {/* Message Body */}
                                        <div className="p-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium min-h-[140px]">
                                            {(selectedRequest.status === "Failed") && selectedRequest.declineReason
                                                ? selectedRequest.declineReason
                                                : (selectedRequest.details || selectedRequest.description || "No description provided.")}
                                        </div>

                                        {/* Attachments Section */}
                                        {((selectedRequest.files && selectedRequest.files.length > 0) || isMyTurn) && (
                                            <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-[#2A2F3A] mt-2">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{t("attached_file") || "Attached Files"}</span>
                                                    {isMyTurn && (
                                                        <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors text-sm font-bold border border-blue-200 dark:border-blue-500/20 shadow-sm">
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
                                                                            if (selectedRequest?.id) logDocumentAction(selectedRequest.id, 'Viewed').catch(console.error);
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
                                                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{file.name || "document.pdf"}</span>
                                                                                <span className="text-xs text-gray-400 truncate">{formatFileSize(file.size)}</span>
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
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No files attached yet. Click "Add New" to upload.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Forward Section for Custom Request */}
                                    {isMyTurn && (
                                        <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm mb-6 flex flex-col gap-4">
                                            <p className="text-sm italic text-gray-800 dark:text-gray-400">
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
                                        
                                        {/* Version History Section */}
                                        {documentVersions && documentVersions.length > 0 && (
                                            <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-[#2A2F3A] mt-2">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">Version History</span>
                                                    {isLoadingVersions && <span className="text-xs text-gray-400 animate-pulse">Loading...</span>}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {documentVersions.map((version, idx) => (
                                                        <div key={version.document_version_id || idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1E232B] border border-gray-200 dark:border-[#2A2F3A] rounded-lg">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-sm text-gray-700 dark:text-gray-300">
                                                                    Version {version.version_number} <span className="text-xs font-normal text-gray-500">({version.change_summary || 'Updated file'})</span>
                                                                </span>
                                                                <span className="text-xs text-gray-500 mt-1">
                                                                    {version.file_path} • {version.uploaded_by?.name || 'User'} • {new Date(version.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => handleDownload(e, {name: version.file_path})}
                                                                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-xs font-bold transition-colors border border-blue-200 dark:border-blue-500/20"
                                                            >
                                                                Download
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
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
