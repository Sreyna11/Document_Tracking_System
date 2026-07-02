"use client";
import { useState, useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import { hasPermission } from "../../../utils/permissions";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import { Search, Filter, MoreVertical, Plus, FileText, Eye, Edit, Trash2, CheckCircle, FileSpreadsheet, Presentation, Image, File, UploadCloud, X, Download, Tag } from "lucide-react";
import SearchableSelect from "../../../components/SearchableSelect";
import CustomSelect from "@/components/CustomSelect";
import BulkActionBar from "../../../components/BulkActionBar";
import Pagination from "../../../components/Pagination";
import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";
import AlertModal from "../../../components/AlertModal";
import { useDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument, useDocumentVersions } from '../../../hooks/useDocuments';
import { useDocumentTypes } from '../../../hooks/useDocumentTypes';
import { useDepartments } from '../../../hooks/useDepartments';
import { useCreateNotification } from '../../../hooks/useNotifications';

const getFileMeta = (fileName, fileType) => {
  if (!fileName) return {
    type: "generic",
    color: "bg-gray-50 dark:bg-gray-800/30 text-gray-500 border-gray-300 dark:border-gray-700",
    accent: "text-gray-500",
    icon: FileText,
    label: "Document"
  };
  const ext = fileName.split('.').pop().toLowerCase();

  if (fileType?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
    return {
      type: "image",
      color: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50",
      accent: "text-blue-600 dark:text-blue-400",
      icon: Image,
      label: "Image / Photo"
    };
  }
  if (ext === "pdf") {
    return {
      type: "pdf",
      color: "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50",
      accent: "text-red-600 dark:text-red-400",
      icon: FileText,
      label: "PDF Document"
    };
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return {
      type: "excel",
      color: "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50",
      accent: "text-green-600 dark:text-green-400",
      icon: FileSpreadsheet,
      label: "Excel Spreadsheet"
    };
  }
  if (["doc", "docx"].includes(ext)) {
    return {
      type: "word",
      color: "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50",
      accent: "text-indigo-600 dark:text-indigo-400",
      icon: FileText,
      label: "Word Document"
    };
  }
  if (["ppt", "pptx"].includes(ext)) {
    return {
      type: "powerpoint",
      color: "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50",
      accent: "text-orange-600 dark:text-orange-400",
      icon: Presentation,
      label: "PowerPoint"
    };
  }
  return {
    type: "generic",
    color: "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700/50",
    accent: "text-gray-600 dark:text-gray-400",
    icon: File,
    label: "Document File"
  };
};

export default function RequestPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  // Core State
  const [viewState, setViewState] = useState("LIST");
  const { data: documentTypesData = [] } = useDocumentTypes();
  const documentTypes = Array.isArray(documentTypesData) ? documentTypesData : [];
  const [selectedDocType, setSelectedDocType] = useState(null);
  const documentTypeOptions = documentTypes.map(d => d.title);
  const { data: departmentsData = [] } = useDepartments();
  const departments = Array.isArray(departmentsData) ? departmentsData : [];
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([null, null, null]);
  const [formData, setFormData] = useState({
    fromDepartment: "",
    toDepartment: "",
    title: "",
    documentType: "",
    tag: "Normal",
    description: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
  const showAlert = (message) => setAlertModal({ isOpen: true, message });
  const [selectedRows, setSelectedRows] = useState([]);
  const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, isBulk: false, requestId: null });
  const [previewFile, setPreviewFile] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [fileActionMenuOpen, setFileActionMenuOpen] = useState(null);

  const { data: requestsData = [], isLoading } = useDocuments();
  const { data: documentVersions = [], isLoading: isLoadingVersions } = useDocumentVersions(selectedRequest?.document_number);
  const requests = Array.isArray(requestsData) ? requestsData : [];
  const createMutation = useCreateDocument();
  const updateMutation = useUpdateDocument();
  const deleteMutation = useDeleteDocument();
  const createNotificationMutation = useCreateNotification();

  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/");
      return;
    }
    setCurrentUser(JSON.parse(userStr));
    
    setIsMounted(true);
  }, []);
  if (!isMounted) return null;
  // Filter requests based on user role/department
  const isGlobalSuperAdmin = currentUser?.email === "admin@rupp.edu.kh";
  const userDept = (currentUser?.mainRole || currentUser?.department || "").toLowerCase().trim();
  const filteredRequests = isGlobalSuperAdmin ? requests : requests.filter(req => {
    const sEmail = (req.senderEmail || "").toLowerCase().trim();
    const uEmail = (currentUser?.email || "").toLowerCase().trim();
    if (sEmail && uEmail && sEmail === uEmail) return true;

    const sName = (req.senderName || "").toLowerCase().trim();
    const uName = (currentUser?.username || currentUser?.name || "").toLowerCase().trim();
    if (sName && uName && sName === uName) return true;

    return false;
  });
  // Handlers
  const handleDocTypeChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, documentType: val }));
    const found = documentTypes.find(d => d.title === val || d.code === val);
    setSelectedDocType(found || null);
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleFileChange = (index, e) => {
    if (e.target.files && e.target.files[0]) {
      const newFiles = [...selectedFiles];
      newFiles[index] = e.target.files[0];
      setSelectedFiles(newFiles);
    }
  };
  const triggerFileInput = (index) => {
    document.getElementById(`file-upload-${index}`)?.click();
  };
  const addFileBox = () => {
    setSelectedFiles(prev => [...prev, null]);
  };
  const handleRemoveFile = (index, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const newFiles = [...selectedFiles];
    newFiles[index] = null;
    setSelectedFiles(newFiles);

    const fileInput = document.getElementById(`file-upload-${index}`);
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleEditClick = (req) => {
    setSelectedRequest(req);
    setFormData({
      fromDepartment: req.senderDepartment || "",
      toDepartment: req.toDepartment || "",
      title: req.title || req.subject || "",
      tag: req.tag || "Normal",
      description: req.details || req.description || ""
    });
    
    const existingFiles = (req.files || []).map(f => ({ ...f, existing: true }));
    let initialFiles = [null, null, null];
    for (let i = 0; i < existingFiles.length; i++) {
        if (i < initialFiles.length) {
            initialFiles[i] = existingFiles[i];
        } else {
            initialFiles.push(existingFiles[i]);
        }
    }
    setSelectedFiles(initialFiles);
    setViewState("CREATE");
  };

  const saveRequest = async () => {
    if (!formData.documentType) {
      showAlert("Please select a Document Type.");
      return;
    }
    if (!formData.fromDepartment || !formData.toDepartment) {
      showAlert("Please select From and To departments.");
      return;
    }
    if (!formData.title) {
      showAlert("Please fill in Title.");
      return;
    }
    const validFiles = selectedFiles.filter(f => f !== null);
    const filesToSave = await Promise.all(validFiles.map(file => {
      return new Promise((resolve) => {
        if (file.existing || (file.data && !file.lastModified)) {
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            data: file.data
          });
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            data: reader.result
          });
        };
        reader.readAsDataURL(file);
      });
    }));
    const senderDept = formData.fromDepartment;
    const initialStepIndex = 0; // Always start at step 0 so the department manager must approve it
    let actualTargetDept = formData.toDepartment;
    let stepsCount = 1;
    let pathSteps = [
      {
        id: Date.now().toString(),
        stepOrder: 1,
        department: formData.toDepartment,
        mainRole: formData.toDepartment,
        action: "Review",
        status: "Pending"
      }
    ];

    const calculateDueDate = (tag) => {
      const now = new Date();
      if (tag === "Urgent") {
        now.setDate(now.getDate() + 1);
      } else if (tag === "High") {
        now.setDate(now.getDate() + 3);
      } else {
        now.setDate(now.getDate() + 7);
      }
      return now.toISOString();
    };
    const newDueDate = calculateDueDate(formData.tag || "Normal");

    if (selectedRequest && viewState === "CREATE") {
      const updatedReq = {
        ...selectedRequest,
        ...formData,
        files: filesToSave,
        path: pathSteps,
        stepsCount: stepsCount,
        dueDate: newDueDate,
      };
      
      try {
        await updateMutation.mutateAsync({ id: updatedReq.id, data: updatedReq });
        cancelCreate();
      } catch (e) {
        showAlert("Error communicating with server.");
      }
      return;
    }

    const generateDocId = () => {
      const year = new Date().getFullYear();
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      return `DOC-${year}-${randomNum}`;
    };
    const newDocId = generateDocId();

    const newReq = {
      id: newDocId,
      trackingNumber: newDocId,
      ...formData,
      status: "In Progressing",
      stepsCount: stepsCount,
      files: filesToSave,
      date: new Date().toISOString(),
      dueDate: newDueDate,
      // Fields needed for global workflow tracking
      path: pathSteps,
      currentStepIndex: initialStepIndex,
      senderName: currentUser?.fullname_en || currentUser?.username || currentUser?.fullname_kh || "Unknown",
      senderDepartment: senderDept,
      senderRole: currentUser?.role || "Staff",
      senderEmail: currentUser?.email || null,
      senderPhoto: currentUser?.profilePhoto || currentUser?.photo || null
    };
    try {
      const createdDoc = await createMutation.mutateAsync(newReq);
      
      // Dispatch notification to the receiver
      const newNotif = {
        document_id: createdDoc.document_id || createdDoc.id || newReq.id,
        target_department: formData.toDepartment,
        sender_name: newReq.senderName,
        sender_department: senderDept,
        subject: `New Request: ${formData.title || formData.documentType}`,
        details: formData.description || "A new document has been sent to your department.",
        message: `A new document (${formData.title || formData.documentType}) has been sent to your department by ${newReq.senderName}.`
      };
      createNotificationMutation.mutate(newNotif);

      setFormData({ creationMode: "custom", documentType: "", fromDepartment: "", toDepartment: "", title: "", tag: "", description: "" });
      setSelectedFiles([null, null, null]);
      setSelectedDocType(null);
      setViewState("LIST");
    } catch (e) {
      showAlert("Error creating document: " + (e.message || "Unknown error"));
    }
  };
  const handleDownload = (file) => {
    if (!file.data) {
      showAlert("No file data available. You might be viewing an older request.");
      return;
    }
    const a = document.createElement("a");
    a.href = file.data;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const cancelCreate = () => {
    setFormData({ fromDepartment: "", toDepartment: "", title: "", tag: "Normal", description: "" });
    setSelectedFiles([null, null, null]);
    setSelectedRequest(null);
    setViewState("LIST");
  };
  const handleDeleteRequest = (id) => {
    setDeleteModalConfig({ isOpen: true, isBulk: false, id: id });
  };
  const handleSelectAll = () => {
    setSelectedRows(filteredRequests.map(r => r.id));
  };
  const handleDeselectAll = () => {
    setSelectedRows([]);
  };
  const handleDeleteSelected = () => {
    if (selectedRows.length > 0) {
      setDeleteModalConfig({ isOpen: true, isBulk: true, id: null });
    }
  };
  const confirmDelete = async () => {
    if (deleteModalConfig.isBulk) {
      for (const id of selectedRows) {
        await deleteMutation.mutateAsync(id);
      }
      setSelectedRows([]);
    } else {
      await deleteMutation.mutateAsync(deleteModalConfig.id);
      setSelectedRows(prev => prev.filter(rowId => rowId !== deleteModalConfig.id));
    }
    setDeleteModalConfig({ isOpen: false, isBulk: false, id: null });
  };
  const toggleRowSelection = (id) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };
  // Color Constants
  const PENDING_COLOR = "#cfa827"; // Gold/Mustard
  const IN_PROGRESS_COLOR = "#facc15"; // Yellow
  const COMPLETED_COLOR = "#16a34a"; // Green
  const DECLINED_COLOR = "#dc2626"; // Red
  // Pagination logic
  const totalItems = filteredRequests.length;
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderReadOnlyFiles = (request) => {
    if (!request || !request.files || request.files.length === 0) {
      return <div className="text-gray-400 dark:text-[#a1a1aa] italic text-[14px] py-12">{t("no_files")}</div>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {request.files.map((file, idx) => {
          const meta = getFileMeta(file.name, file.type);
          const isImage = file.type?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(file.name.split('.').pop().toLowerCase());

          return (
            <div
              key={idx}
              className="border-[1.5px] border-solid border-gray-200 dark:border-[#2A2F3A] bg-white dark:bg-[#1C212B] rounded-xl p-6 flex flex-col items-center justify-center text-center h-52 relative overflow-hidden group shadow-sm hover:shadow-md transition-all duration-200"
            >
              {isImage ? (
                <div className="w-full h-28 rounded-lg overflow-hidden border border-gray-200 dark:border-[#2A2F3A] mb-3 relative bg-gray-50 dark:bg-[#161B22]/30">
                  <img
                    src={file.data}
                    alt={file.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white font-medium uppercase">
                    {file.name.split('.').pop()}
                  </div>
                </div>
              ) : (
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 border ${meta.color} transition-transform duration-200 group-hover:scale-110 shadow-sm`}>
                  <meta.icon size={28} />
                </div>
              )}

              <p className="text-sm font-semibold text-gray-800 dark:text-white truncate w-full px-2" title={file.name}>
                {file.name}
              </p>

              <div className="flex items-center gap-2 mt-1 mb-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-bold uppercase ${isImage
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : meta.type === 'pdf' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : meta.type === 'excel' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : meta.type === 'word' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                        : meta.type === 'powerpoint' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                  {file.name.split('.').pop()}
                </span>
                <span className="text-xs text-gray-500 dark:text-[#a1a1aa] font-medium">
                  {file.size ? (file.size / 1024 / 1024).toFixed(2) : "0.00"} MB
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFileActionMenuOpen(fileActionMenuOpen === idx ? null : idx);
                }}
                className="absolute top-2.5 right-2.5 text-gray-400 dark:text-[#a1a1aa] hover:text-gray-600 dark:hover:text-white p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#242B36] transition-colors z-10"
              >
                <MoreVertical size={16} />
              </button>

              {fileActionMenuOpen === idx && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => { e.stopPropagation(); setFileActionMenuOpen(null); }}
                  />
                  <div className="absolute top-10 right-2.5 w-32 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg shadow-xl z-50 py-1 text-left flex flex-col overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileActionMenuOpen(null);
                        if (file.data) setPreviewFile(file);
                        else showAlert(t("preview_not_available") || "Preview not available for this file.");
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#242B36] flex items-center gap-2 transition-colors"
                    >
                      <Eye size={14} /> {t("preview") || "Preview"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileActionMenuOpen(null);
                        handleDownload(file);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#242B36] flex items-center gap-2 transition-colors"
                    >
                      <Download size={14} /> {t("download") || "Download"}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  return (
    <div className="flex bg-[#f3f4f6] dark:bg-[#0F1117] min-h-screen font-sans">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className={`flex-1 transition-all duration-300 ease-in-out flex flex-col min-w-0`}>
        <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} currentUser={currentUser} />
        <main className="p-8 flex-1 overflow-x-hidden bg-[#f4f5f7] dark:bg-[#0F1117] flex flex-col">
          <div className="w-full flex flex-col flex-1">
            {viewState === "LIST" && (
              <div className="flex flex-col h-full animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-black dark:text-white">{t("create_request") || t("request")}</h1>
                  {hasPermission(currentUser, "Request", "Create") && (
                    <button
                      onClick={() => setViewState("CREATE")}
                      className="px-6 py-2 bg-[#125821] hover:bg-[#0c4015] text-white text-[14px] font-bold rounded-md transition-colors"
                    >
                      {t("add_new")}
                    </button>
                  )}
                </div>
                <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-xl overflow-hidden shadow-sm flex flex-col">
                  <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-200 dark:border-[#2A2F3A] bg-white dark:bg-[#161B22]">
                    <div className="w-full md:w-auto">
                      <BulkActionBar
                        selectedCount={selectedRows.length}
                        totalCount={filteredRequests.length}
                        onSelectAll={handleSelectAll}
                        onDeselectAll={handleDeselectAll}
                        onDelete={handleDeleteSelected}
                      />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#a1a1aa]" />
                        <input
                          type="text"
                          placeholder={t("search")}
                          className="w-64 pl-9 pr-3 py-2 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-[#1a5b28] dark:focus:border-[#2da94a] transition-colors"
                        />
                      </div>
                      <button className="p-2 border border-gray-200 dark:border-[#2A2F3A] rounded-lg bg-white dark:bg-[#161B22] hover:bg-gray-50 dark:hover:bg-[#242B36] dark:bg-[#242B36] text-gray-500 dark:text-[#a1a1aa]">
                        <Filter size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 dark:bg-[#242B36] border-b border-gray-200 dark:border-[#2A2F3A]">
                        <tr>
                          <th className="py-4 px-6 w-12 cursor-pointer" onClick={() => selectedRows.length === filteredRequests.length && filteredRequests.length > 0 ? handleDeselectAll() : handleSelectAll()}>
                            <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${selectedRows.length === filteredRequests.length && filteredRequests.length > 0 ? 'bg-[#1a5b28] border-[#1a5b28]' : 'bg-white dark:bg-[#161B22] border-gray-400'}`}>
                              {selectedRows.length === filteredRequests.length && filteredRequests.length > 0 && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                          </th>
                          <th className="px-4 py-4 font-bold text-black dark:text-white text-[15px]">{t("document_type") || "Document Type"}</th>
                          <th className="py-4 px-4 font-bold text-black dark:text-white text-[15px]">{t("title") || "Title"}</th>
                          <th className="py-4 px-4 font-bold text-black dark:text-white text-[15px]">{t("from_department") || "From Department"}</th>
                          <th className="py-4 px-4 font-bold text-black dark:text-white text-[15px]">{t("to_department") || "To Department"}</th>
                          <th className="py-4 px-4 font-bold text-black dark:text-white text-[15px]">{t("tag") || "Tag"}</th>
                          <th className="py-4 px-4 font-bold text-black dark:text-white text-[15px]">{t("status")}</th>
                          <th className="py-4 px-6 font-bold text-black dark:text-white text-[15px] text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2A2F3A] bg-white dark:bg-[#161B22] text-gray-700 dark:text-white">
                        {paginatedRequests.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-gray-400 dark:text-[#a1a1aa] italic">
                              {t("data_empty")}
                            </td>
                          </tr>
                        ) : (
                          paginatedRequests.map((req, idx) => {
                            // Generate sequence: 0 -> 1 -> 2 -> ... based on dynamic path length
                            const actualStepsCount = (req.path && req.path.length > 0) ? req.path.length : (req.stepsCount || 3);
                            const stepSequence = Array.from({ length: actualStepsCount + 1 }, (_, i) => i).join(" → ");
                            const isSelected = selectedRows.includes(req.id);
                            return (
                              <tr key={req.id ? `req-${req.id}-${idx}` : `req-idx-${idx}`} className={`hover:bg-gray-50/50 dark:hover:bg-[#242B36] transition-colors ${isSelected ? 'bg-green-50/30' : ''}`}>
                                <td className={`py-4 px-6 cursor-pointer ${isSelected ? 'border-l-4 border-l-[#1a5b28]' : 'border-l-4 border-l-transparent'}`} onClick={() => toggleRowSelection(req.id)}>
                                  <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${isSelected ? 'bg-[#1a5b28] border-[#1a5b28]' : 'bg-white dark:bg-[#161B22] border-gray-400'}`}>
                                    {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                                  </div>
                                </td>
                                <td className="py-4 px-4   text-[15px]">{req.documentType || "—"}</td>
                                <td className="py-4 px-4   text-[15px]">{req.title}</td>
                                <td className="py-4 px-4   text-[15px]">{req.fromDepartment || req.senderDepartment || "—"}</td>
                                <td className="py-4 px-4   text-[15px]">{req.toDepartment || "—"}</td>
                                <td className="py-4 px-4   text-[15px]">
                                  {(() => {
                                    const p = (req.tag || "Normal").toLowerCase().trim();
                                    if (p === "urgent") return (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 font-extrabold text-xs uppercase tracking-wider border border-red-200 dark:border-red-500/20 shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                        {t('urgent') || 'Urgent'}
                                      </span>
                                    );
                                    if (p === "high") return (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 font-extrabold text-xs uppercase tracking-wider border border-orange-200 dark:border-orange-500/20 shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                        {t('high') || 'High'}
                                      </span>
                                    );
                                    if (p === "medium") return (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 font-extrabold text-xs uppercase tracking-wider border border-yellow-200 dark:border-yellow-500/20 shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                        {t('medium') || 'Medium'}
                                      </span>
                                    );
                                    if (p === "normal") return (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-extrabold text-xs uppercase tracking-wider border border-green-200 dark:border-green-500/20 shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                        {t('normal') || 'Normal'}
                                      </span>
                                    );
                                    return (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold text-xs uppercase tracking-wider border border-blue-200 dark:border-blue-500/20 shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                        {req.tag}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="py-4 px-4">
                                  {req.status === "In Progressing" ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef9c3] text-[#a16207] dark:bg-[#a16207]/10 dark:text-[#fde047] font-extrabold text-xs uppercase tracking-wider border border-[#fef08a] dark:border-[#ca8a04]/30 shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#eab308] animate-pulse"></span>
                                      {t("in_progress_stat") || t("in_progress")}
                                    </span>
                                  ) : req.status === "Failed" ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 font-extrabold text-xs uppercase tracking-wider border border-red-200 dark:border-red-500/20 shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                      {t("declined")}
                                    </span>
                                  ) : req.status === "Assigned to Improve" ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 font-extrabold text-xs uppercase tracking-wider border border-orange-200 dark:border-orange-500/20 shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                      {t("return")}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-extrabold text-xs uppercase tracking-wider border border-green-200 dark:border-green-500/20 shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                      {req.status === "Completed" ? (t("completed_stat") || t("completed")) : req.status}
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6 relative">
                                  <div className="flex justify-end relative">
                                    <button
                                      onClick={() => setActionMenuOpen(actionMenuOpen === req.id ? null : req.id)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#125821] hover:bg-[#0c4015] text-white text-sm font-medium rounded-md transition-colors"
                                    >
                                      <MoreVertical size={14} className="opacity-80 -ml-1" />
                                      {t("action")}
                                    </button>
                                    {actionMenuOpen === req.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-40"
                                          onClick={() => setActionMenuOpen(null)}
                                        />
                                        <div className={`absolute right-6 w-32 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg shadow-xl z-50 overflow-hidden py-1 ${(idx === paginatedRequests.length - 1 || (idx === paginatedRequests.length - 2 && paginatedRequests.length >= 3)) ? 'bottom-full mb-1' : 'top-full mt-1'
                                          }`}>
                                          <button
                                            onClick={() => {
                                              setActionMenuOpen(null);
                                              setSelectedRequest(req);
                                              const doc = documentTypes.find(d => d.title === req.documentType || d.code === req.documentType);
                                              setSelectedDocType(doc || null);
                                              setViewState("VIEW");
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#242B36] dark:bg-[#242B36] flex items-center gap-2 transition-colors"
                                          >
                                            <Eye size={14} /> {t("view")}
                                          </button>
                                          {hasPermission(currentUser, "Request", "Edit") && (!req.readBy || req.readBy.length === 0) && (
                                            <button
                                              onClick={() => { setActionMenuOpen(null); handleEditClick(req); }}
                                              className="w-full text-left px-4 py-2 text-sm text-[#dcb23c] hover:bg-[#fff9e6] flex items-center gap-2 transition-colors"
                                            >
                                              <Edit size={14} /> {t("edit")}
                                            </button>
                                          )}
                                          {hasPermission(currentUser, "Request", "Delete") && (
                                            <button
                                              onClick={() => { setActionMenuOpen(null); handleDeleteRequest(req.id); }}
                                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                            >
                                              <Trash2 size={14} /> {t("delete")}
                                            </button>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredRequests.length > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={totalItems}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                    />
                  )}
                </div>
              </div>
            )}
            {viewState === "CREATE" && (
              <div className="flex flex-col animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-black dark:text-white">{t("create_request")}</h1>
                  <button
                    onClick={cancelCreate}
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 dark:hover:bg-[#242B36] dark:bg-[#242B36]0 text-white text-[14px] font-medium rounded-md transition-colors"
                  >
                    {t("back") || "Back"}
                  </button>
                </div>
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Left Column: Main Form & Attachments */}
                  <div className="w-full lg:w-[65%] flex flex-col gap-6">
                    {/* Request Details Card */}
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg overflow-hidden shadow-sm flex flex-col">
                      <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A]">
                        <h2 className="text-[16px] font-bold text-black dark:text-white">Request Details</h2>
                      </div>
                      <div className="p-6">
                        <div className="flex flex-col gap-5">
                          {/* Document Type Selection */}
                          <div className="w-full">
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              {t("document_type")} <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                              options={documentTypeOptions}
                              value={formData.documentType || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value }))}
                              selectPlaceholder={t("select_document_type") || "Select document type"}
                              placeholder={t("search_document_type") || "Search document type..."}
                              noOptionsMessage={t("no_document_types_found")}
                              noMatchMessage={t("no_matching_document_types")}
                            />
                          </div>

                          {/* Title */}
                          <div className="w-full">
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              {t("title") || "Title"} <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="title"
                              value={formData.title}
                              onChange={handleInputChange}
                              placeholder={`${t("title") || "Title"}....`}
                              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white transition-colors"
                            />
                          </div>

                          {/* Departments */}
                          <div className="flex flex-col md:flex-row gap-5 w-full">
                            <div className="flex-1">
                              <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                                From Department <span className="text-red-500">*</span>
                              </label>
                              <SearchableSelect
                                value={formData.fromDepartment || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, fromDepartment: e.target.value }))}
                                selectPlaceholder="Select from department"
                                placeholder="Search department..."
                                options={departments.map(d => d.title)}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                                To Department <span className="text-red-500">*</span>
                              </label>
                              <SearchableSelect
                                value={formData.toDepartment || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, toDepartment: e.target.value }))}
                                selectPlaceholder="Select to department"
                                placeholder="Search department..."
                                options={departments.map(d => d.title)}
                              />
                            </div>
                          </div>

                          {/* Description */}
                          <div className="w-full">
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              {t("description")} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              name="description"
                              value={formData.description}
                              onChange={handleInputChange}
                              placeholder={t("write_something")}
                              className="w-full px-4 py-3 min-h-[140px] rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white resize-y transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Attachments Card */}
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg overflow-hidden shadow-sm flex flex-col">
                      <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A]">
                        <h2 className="text-[16px] font-bold text-black dark:text-white">Attachments</h2>
                      </div>
                      <div className="p-6 flex flex-col items-center">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                          {selectedFiles.map((file, idx) => {
                            const meta = file ? getFileMeta(file.name, file.type) : null;
                            const isImage = file && (file.type?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(file.name.split('.').pop().toLowerCase()));

                            return (
                              <div
                                key={idx}
                                onClick={() => triggerFileInput(idx)}
                                className={`border-[1.5px] border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 h-52 relative overflow-hidden group select-none shadow-sm ${file
                                  ? 'border-gray-300 dark:border-[#2A2F3A] bg-white dark:bg-[#1C212B] hover:shadow-md'
                                  : 'border-gray-300 dark:border-[#2A2F3A] bg-gray-50/50 dark:bg-[#161B22]/30 hover:bg-gray-100/70 dark:hover:bg-[#242B36]/30 hover:border-[#1a5b28]'
                                  }`}
                              >
                                <input
                                  type="file"
                                  id={`file-upload-${idx}`}
                                  className="hidden"
                                  onChange={(e) => handleFileChange(idx, e)}
                                  onClick={(e) => e.stopPropagation()}
                                  accept="image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                />

                                {file && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleRemoveFile(idx, e)}
                                    className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-950/70 dark:text-red-400 transition-colors shadow-sm opacity-90 hover:opacity-100"
                                    title={t("remove_file") || "Remove File"}
                                  >
                                    <X size={15} strokeWidth={2.5} />
                                  </button>
                                )}

                                {file ? (
                                  <div className="w-full h-full p-6 flex flex-col items-center justify-center">
                                    {isImage ? (
                                      <div className="w-full h-28 rounded-lg overflow-hidden border border-gray-200 dark:border-[#2A2F3A] mb-3 relative bg-gray-50 dark:bg-[#161B22]/30">
                                        <img
                                          src={file.data || URL.createObjectURL(file)}
                                          alt={file.name}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white font-medium uppercase">
                                          {file.name.split('.').pop()}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 border ${meta.color} transition-transform duration-200 group-hover:scale-110 shadow-sm`}>
                                        <meta.icon size={28} />
                                      </div>
                                    )}

                                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate w-full px-2" title={file.name}>
                                      {file.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold uppercase ${isImage
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        : meta.type === 'pdf' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                          : meta.type === 'excel' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : meta.type === 'word' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                              : meta.type === 'powerpoint' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                        {file.name.split('.').pop()}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-[#a1a1aa] font-medium">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-full p-6 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#242B36] flex items-center justify-center mb-3 text-gray-400 dark:text-[#a1a1aa] group-hover:bg-[#1a5b28]/10 group-hover:text-[#1a5b28] transition-colors duration-200">
                                      <UploadCloud size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-700 dark:text-white mb-2 group-hover:text-[#1a5b28] transition-colors">
                                      {t("upload_instructions_title") || "Upload your documents or files"}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-[#a1a1aa] mb-4">
                                      {t("upload_instructions_desc") || "Drag & drop or click to upload"}
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-1 mt-auto">
                                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">PDF</span>
                                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-green-50 text-green-600 border border-green-200 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400">EXCEL</span>
                                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400">WORD</span>
                                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30 dark:text-orange-400">PPT</span>
                                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400">PHOTO</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <button type="button" onClick={addFileBox} className="mt-4 w-8 h-8 rounded-full border border-green-600 flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors">
                          <Plus size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Settings */}
                  <div className="w-full lg:w-[35%] flex flex-col gap-6">
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg shadow-sm flex flex-col">
                      <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A]">
                        <h2 className="text-[16px] font-bold text-black dark:text-white">{t("tag") || "Tag"} Options</h2>
                      </div>
                      <div className="p-6">
                        <div className="flex flex-col gap-3">
                          <label className="block text-sm font-medium text-gray-600 dark:text-[#a1a1aa]">
                            Assign a tag <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="tag"
                            value={formData.tag}
                            onChange={handleInputChange}
                            placeholder="Type or choose below..."
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white transition-colors"
                            list="tag-suggestions"
                          />
                          <datalist id="tag-suggestions">
                            <option value="Normal" />
                            <option value="High" />
                            <option value="Urgent" />
                          </datalist>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {["Normal", "High", "Urgent"].map(opt => (
                              <button
                                type="button"
                                key={opt}
                                onClick={() => setFormData(prev => ({ ...prev, tag: opt }))}
                                className={`px-3 py-1.5 text-sm font-bold rounded-md border transition-colors flex-1 text-center ${formData.tag === opt
                                  ? 'bg-[#1a5b28] text-white border-[#1a5b28] dark:bg-[#2da94a] dark:border-[#2da94a]'
                                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-[#242B36] dark:text-gray-300 dark:border-[#2A2F3A] dark:hover:bg-[#2A2F3A]'
                                  }`}
                              >
                                {t(opt.toLowerCase()) || opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 mt-2 w-full">
                      {isGlobalSuperAdmin || hasPermission(currentUser, "Request", "Create") ? (
                        <button
                          onClick={saveRequest}
                          className="flex-1 py-2.5 bg-[#125821] hover:bg-[#0c4015] text-white text-[14px] font-bold rounded-md transition-colors"
                        >
                          {selectedRequest ? (t("save_change") || "Save Changes") : (t("submit") || "Submit")}
                        </button>
                      ) : null}
                      <button
                        onClick={cancelCreate}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[14px] font-bold rounded-md transition-colors"
                      >
                        {t("cancel") || "Cancel"}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}
            {viewState === "VIEW" && selectedRequest && (
              <div className="flex flex-col animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-black dark:text-white">{t("view_request")}</h1>
                  <button
                    onClick={cancelCreate}
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 dark:hover:bg-[#242B36] dark:bg-[#242B36]0 text-white text-[14px] font-medium rounded-md transition-colors"
                  >
                    {t("back") || "Back"}
                  </button>
                </div>
                <div className="flex flex-col xl:flex-row gap-6 items-start">
                  {/* Main Form Panel (Read Only) */}
                  <div className="w-full xl:w-[70%] flex flex-col gap-6">
                    {selectedRequest.documentType === "Custom Request" ? (
                      <>
                        <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm flex flex-col gap-6 mb-6">
                          <div className="w-full">
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              {t("title") || "Title"}
                            </label>
                            <div className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36]/50 text-[15px] text-gray-800 font-medium">
                              {selectedRequest.title || selectedRequest.subject}
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row gap-6 w-full">
                            <div className="flex-1">
                              <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                                From Department
                              </label>
                              <div className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36]/50 text-[15px] text-gray-800 font-medium">
                                {selectedRequest.senderDepartment || "Unknown"}
                              </div>
                            </div>
                            <div className="flex-1">
                              <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                                To Department
                              </label>
                              <div className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36]/50 text-[15px] text-gray-800 font-medium">
                                {selectedRequest.toDepartment || "Unknown"}
                              </div>
                            </div>
                          </div>
                          <div className="w-full">
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              Description
                            </label>
                            <div className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36]/50 text-[15px] text-gray-800 font-medium whitespace-pre-wrap min-h-[100px]">
                              {selectedRequest.details || selectedRequest.description || "No description provided."}
                            </div>
                          </div>
                        </div>
                        {/* Upload Boxes (Read Only) */}
                        <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm flex flex-col items-center">
                          {renderReadOnlyFiles(selectedRequest)}
                          
                          {/* Version History Section */}
                          {documentVersions && documentVersions.length > 0 && (
                              <div className="w-full pt-4 mt-6 border-t border-gray-200 dark:border-[#2A2F3A]">
                                  <div className="flex items-center gap-2 mb-4">
                                      <span className="font-bold text-gray-700 dark:text-gray-300 text-[14px]">Version History</span>
                                      {isLoadingVersions && <span className="text-xs text-gray-400 animate-pulse">Loading...</span>}
                                  </div>
                                  <div className="flex flex-col gap-3 w-full">
                                      {documentVersions.map((version, idx) => (
                                          <div key={version.document_version_id || idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-[#2A2F3A] rounded-xl hover:bg-gray-100 dark:hover:bg-[#242B36] transition-colors">
                                              <div className="flex flex-col text-left">
                                                  <span className="font-bold text-[14px] text-gray-800 dark:text-gray-200">
                                                      Version {version.version_number} <span className="text-xs font-normal text-gray-500">({version.change_summary || 'Updated file'})</span>
                                                  </span>
                                                  <span className="text-xs text-gray-500 mt-1">
                                                      {version.file_path} • {version.uploaded_by?.name || 'User'} • {new Date(version.created_at).toLocaleDateString()}
                                                  </span>
                                              </div>
                                              <button 
                                                  onClick={() => window.open(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') + '/storage/' + version.file_path, '_blank')}
                                                  className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold transition-colors border border-blue-200 dark:border-blue-500/20"
                                              >
                                                  Download
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm flex flex-col gap-6">
                          <div className="flex flex-col md:flex-row gap-6 w-full">
                            <div className="flex-1">
                              <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                                {t("type_document")}
                              </label>
                              <div className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36]/50 text-[15px] text-gray-800 font-medium">
                                {selectedRequest.documentType}
                              </div>
                            </div>
                            <div className="flex-1">
                              <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                                {t("tag") || "Tag"}
                              </label>
                              <div className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36]/50 text-[15px] text-gray-800 font-medium flex items-center">
                                {(() => {
                                  const p = (selectedRequest.tag || "Normal").toLowerCase().trim();
                                  if (p === "urgent") return (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 font-extrabold text-xs uppercase tracking-wider border border-red-200 dark:border-red-500/20 shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                      {t('urgent') || 'Urgent'}
                                    </span>
                                  );
                                  if (p === "high") return (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 font-extrabold text-xs uppercase tracking-wider border border-orange-200 dark:border-orange-500/20 shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                      {t('high') || 'High'}
                                    </span>
                                  );
                                  if (p === "medium") return (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 font-extrabold text-xs uppercase tracking-wider border border-yellow-200 dark:border-yellow-500/20 shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                      {t('medium') || 'Medium'}
                                    </span>
                                  );
                                  if (p === "normal") return (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-extrabold text-xs uppercase tracking-wider border border-green-200 dark:border-green-500/20 shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                      {t('normal') || 'Normal'}
                                    </span>
                                  );
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold text-xs uppercase tracking-wider border border-blue-200 dark:border-blue-500/20 shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                      {selectedRequest.tag}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="w-full">
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              {t("title") || "Title"}
                            </label>
                            <div className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36]/50 text-[15px] text-gray-800 font-medium">
                              {selectedRequest.title}
                            </div>
                          </div>
                        </div>
                        {/* Upload Boxes (Read Only) */}
                        <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm flex flex-col items-center">
                          {renderReadOnlyFiles(selectedRequest)}
                          
                          {/* Version History Section */}
                          {documentVersions && documentVersions.length > 0 && (
                              <div className="w-full pt-4 mt-6 border-t border-gray-200 dark:border-[#2A2F3A]">
                                  <div className="flex items-center gap-2 mb-4">
                                      <span className="font-bold text-gray-700 dark:text-gray-300 text-[14px]">Version History</span>
                                      {isLoadingVersions && <span className="text-xs text-gray-400 animate-pulse">Loading...</span>}
                                  </div>
                                  <div className="flex flex-col gap-3 w-full">
                                      {documentVersions.map((version, idx) => (
                                          <div key={version.document_version_id || idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1C212B] border border-gray-200 dark:border-[#2A2F3A] rounded-xl hover:bg-gray-100 dark:hover:bg-[#242B36] transition-colors">
                                              <div className="flex flex-col text-left">
                                                  <span className="font-bold text-[14px] text-gray-800 dark:text-gray-200">
                                                      Version {version.version_number} <span className="text-xs font-normal text-gray-500">({version.change_summary || 'Updated file'})</span>
                                                  </span>
                                                  <span className="text-xs text-gray-500 mt-1">
                                                      {version.file_path} • {version.uploaded_by?.name || 'User'} • {new Date(version.created_at).toLocaleDateString()}
                                                  </span>
                                              </div>
                                              <button 
                                                  onClick={() => window.open(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') + '/storage/' + version.file_path, '_blank')}
                                                  className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold transition-colors border border-blue-200 dark:border-blue-500/20"
                                              >
                                                  Download
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Right Side Panel */}
                  <div className="w-full xl:w-[30%] flex flex-col gap-6">
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm flex flex-col gap-4 sticky top-6">
                      <h2 className="text-[16px] font-bold text-black dark:text-white border-b border-gray-200 dark:border-[#2A2F3A] pb-3 mb-2">
                        {t("tag") || "Tag"} Options
                      </h2>
                      <div className="flex flex-col gap-3">
                        <label className="block text-sm font-medium text-gray-600 dark:text-[#a1a1aa]">
                          Selected Tag
                        </label>
                        <div className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36]/50 text-[15px] text-gray-800 font-medium flex items-center">
                          {(() => {
                            const p = (selectedRequest.tag || "Normal").toLowerCase().trim();
                            if (p === "urgent") return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 font-extrabold text-xs uppercase tracking-wider border border-red-200 dark:border-red-500/20 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                {t('urgent') || 'Urgent'}
                              </span>
                            );
                            if (p === "high") return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 font-extrabold text-xs uppercase tracking-wider border border-orange-200 dark:border-orange-500/20 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                {t('high') || 'High'}
                              </span>
                            );
                            if (p === "medium") return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 font-extrabold text-xs uppercase tracking-wider border border-yellow-200 dark:border-yellow-500/20 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                {t('medium') || 'Medium'}
                              </span>
                            );
                            if (p === "normal") return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-extrabold text-xs uppercase tracking-wider border border-green-200 dark:border-green-500/20 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                {t('normal') || 'Normal'}
                              </span>
                            );
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-extrabold text-xs uppercase tracking-wider border border-blue-200 dark:border-blue-500/20 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                {selectedRequest.tag}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      {/* Preview Modal */}
      {
        previewFile && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 md:p-10">
            <div className="bg-white dark:bg-[#161B22] rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[80vh] flex flex-col overflow-hidden animate-fade-in">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-[#2A2F3A]">
                <h3 className="font-bold text-[16px] text-gray-800">{previewFile.name}</h3>
                <button onClick={() => setPreviewFile(null)} className="text-gray-500 dark:text-[#a1a1aa] hover:text-red-500 font-medium">
                  Close
                </button>
              </div>
              <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-auto p-6 relative">
                {previewFile.type?.startsWith("image/") ? (
                  <img src={previewFile.data} alt="Preview" className="max-w-full max-h-full object-contain" />
                ) : previewFile.type === "application/pdf" ? (
                  <iframe src={previewFile.data} className="w-full h-full border-0 bg-white dark:bg-[#161B22]" title="PDF Preview" />
                ) : (
                  <div className="text-gray-500 dark:text-[#a1a1aa] text-center">
                    <FileText size={64} className="mx-auto mb-4 opacity-50" />
                    <p>Preview not available for this file type.</p>
                    <button
                      onClick={() => handleDownload(previewFile)}
                      className="mt-6 px-6 py-2.5 bg-[#1a5b28] hover:bg-[#125821] text-white font-bold rounded-md text-[14px] transition-colors"
                    >
                      Download Instead
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalConfig.isOpen}
        onClose={() => setDeleteModalConfig({ isOpen: false, isBulk: false, id: null })}
        onConfirm={confirmDelete}
        itemCount={deleteModalConfig.isBulk ? selectedRows.length : 1}
        itemName={(() => {
          const targetId = (!deleteModalConfig.isBulk && deleteModalConfig.id) 
            ? deleteModalConfig.id 
            : (deleteModalConfig.isBulk && selectedRows.length === 1) 
              ? selectedRows[0] 
              : null;
              
          if (!targetId) return "";
          
          const targetReq = requests.find(r => r.id === targetId);
          return targetReq?.title || "";
        })()}
        itemType="requests"
      />
      {/* Custom Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: "" })}
        message={alertModal.message}
      />
    </div >
  );
}
