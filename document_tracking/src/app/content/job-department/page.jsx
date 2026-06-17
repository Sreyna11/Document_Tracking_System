"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasPermission } from "../../../utils/permissions";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import { useLanguage } from "../../context/LanguageContext";
import { Search, Filter, MoreVertical, Plus, FileText, Eye, Edit, Trash2, CheckCircle } from "lucide-react";
import BulkActionBar from "../../../components/BulkActionBar";
import Pagination from "../../../components/Pagination";
import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";
import AlertModal from "../../../components/AlertModal";
export default function RequestPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  // Core State
  const [viewState, setViewState] = useState("LIST");
  const [requests, setRequests] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [fileActionMenuOpen, setFileActionMenuOpen] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // Custom Delete Confirmation State
  const [deleteModalConfig, setDeleteModalConfig] = useState({
    isOpen: false,
    isBulk: false,
    id: null,
  });
  // Alert Modal State
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
  const showAlert = (message) => {
    setAlertModal({ isOpen: true, message });
  };
  // Form State
  const [formData, setFormData] = useState({
    documentType: "",
    title: "",
    description: ""
  });
  const [selectedFiles, setSelectedFiles] = useState([null, null, null]);
  const [selectedDocType, setSelectedDocType] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/");
      return;
    }
    setCurrentUser(JSON.parse(userStr));
    // Load stored document types for the dropdown
    const storedDocTypes = localStorage.getItem("doc_tracking_document_types_v2");
    if (storedDocTypes) {
      let parsed = JSON.parse(storedDocTypes);
      const user = JSON.parse(userStr);
      const isGlobalSuperAdmin = user?.email === "itcsuperadmin@rupp.edu.kh";
      const uDept = (user?.department || user?.mainRole || "IT Center").toLowerCase().trim();
      
      if (!isGlobalSuperAdmin) {
        parsed = parsed.filter(d => (d.creatorDept || "it center").toLowerCase().trim() === uDept);
      }
      setDocumentTypes(parsed);
    }
    // Load stored requests
    const storedRequests = localStorage.getItem("doc_tracking_requests");
    if (storedRequests) {
      setRequests(JSON.parse(storedRequests));
    }
    setIsMounted(true);
  }, [router]);
  if (!isMounted) return null;
  // Filter requests based on user role/department
  const isGlobalSuperAdmin = currentUser?.email === "itcsuperadmin@rupp.edu.kh";
  const userDept = (currentUser?.mainRole || currentUser?.department || "").toLowerCase().trim();
  const filteredRequests = isGlobalSuperAdmin ? requests : requests.filter(req => {
    const sDept = (req.senderDepartment || "").toLowerCase().trim();
    return userDept && sDept === userDept;
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
  const saveRequest = async () => {
    if (!formData.documentType || !formData.title) {
      showAlert("Please fill in Document Type and Title.");
      return;
    }
    const validFiles = selectedFiles.filter(f => f !== null);
    const filesToSave = await Promise.all(validFiles.map(file => {
      return new Promise((resolve) => {
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
    const senderDept = currentUser?.department || currentUser?.mainRole || "Unknown";
    const firstStepDept = selectedDocType?.steps?.[0]?.department || selectedDocType?.steps?.[0]?.mainRole || "";
    // Auto-advance if the sender's department is the very first step in the flow
    const initialStepIndex = (firstStepDept.toLowerCase().trim() === senderDept.toLowerCase().trim()) ? 1 : 0;
    const actualTargetDept = selectedDocType?.steps?.[initialStepIndex]?.department || selectedDocType?.steps?.[initialStepIndex]?.mainRole || "global";
    const newReq = {
      id: Date.now().toString(),
      ...formData,
      status: "In Progressing",
      stepsCount: selectedDocType?.totalSteps || 3,
      files: filesToSave,
      date: new Date().toISOString(),
      // Fields needed for global workflow tracking
      path: selectedDocType?.steps || [],
      currentStepIndex: initialStepIndex,
      senderName: (currentUser?.firstName && currentUser?.lastName)
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : (currentUser?.username || currentUser?.name || "Unknown"),
      senderDepartment: senderDept,
      senderRole: currentUser?.mainRole || "Staff",
      senderEmail: currentUser?.email || null,
      senderPhoto: currentUser?.profilePhoto || currentUser?.photo || null
    };
    const updatedList = [newReq, ...requests];
    // Notification for the receiver
    try {
      const storedNotifs = localStorage.getItem("doc_tracking_notifications");
      const allNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];
      const newNotif = {
        id: Date.now().toString(),
        requestId: newReq.id,
        targetDepartment: actualTargetDept,
        senderName: (currentUser?.firstName && currentUser?.lastName)
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : (currentUser?.username || "Unknown"),
        senderDepartment: senderDept,
        subject: `New Request: ${formData.title || formData.documentType}`,
        details: `You have received a new document request for review.`,
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
    try {
      localStorage.setItem("doc_tracking_requests", JSON.stringify(updatedList));
      setRequests(updatedList);
      setFormData({ documentType: "", title: "" });
      setSelectedFiles([null, null, null]);
      setSelectedDocType(null);
      setViewState("LIST");
    } catch (e) {
      showAlert("Storage quota exceeded! File is too large for local storage mockup. Please try a smaller file (under 2MB).");
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
    setFormData({ documentType: "", title: "" });
    setSelectedFiles([null, null, null]);
    setSelectedDocType(null);
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
  const confirmDelete = () => {
    if (deleteModalConfig.isBulk) {
      const updatedList = requests.filter(r => !selectedRows.includes(r.id));
      setRequests(updatedList);
      localStorage.setItem("doc_tracking_requests", JSON.stringify(updatedList));
      setSelectedRows([]);
    } else {
      const updatedList = requests.filter(r => r.id !== deleteModalConfig.id);
      setRequests(updatedList);
      localStorage.setItem("doc_tracking_requests", JSON.stringify(updatedList));
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
                              {selectedRows.length === filteredRequests.length && filteredRequests.length > 0 && <span className="text-white text-[10px] font-bold">✓</span>}
                            </div>
                          </th>
                          <th className="py-4 px-4 font-bold text-black dark:text-white text-[15px]">{t("title") || "Title"}</th>
                          <th className="py-4 px-4 font-bold text-black dark:text-white text-[15px]">{t("type_document")}</th>
                          <th className="py-4 px-4 font-bold text-black dark:text-white text-[15px]">{t("step")}</th>
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
                            // Generate sequence: 1 -> 2 -> 3
                            const stepsCount = req.stepsCount || 3;
                            const stepSequence = Array.from({ length: stepsCount }, (_, i) => i + 1).join(" → ");
                            const isSelected = selectedRows.includes(req.id);
                            return (
                              <tr key={req.id} className={`hover:bg-gray-50/50 dark:hover:bg-[#242B36] transition-colors ${isSelected ? 'bg-green-50/30' : ''}`}>
                                <td className={`py-4 px-6 cursor-pointer ${isSelected ? 'border-l-4 border-l-[#1a5b28]' : 'border-l-4 border-l-transparent'}`} onClick={() => toggleRowSelection(req.id)}>
                                  <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${isSelected ? 'bg-[#1a5b28] border-[#1a5b28]' : 'bg-white dark:bg-[#161B22] border-gray-400'}`}>
                                    {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                                  </div>
                                </td>
                                <td className="py-4 px-4   text-[15px]">{req.title}</td>
                                <td className="py-4 px-4   text-[15px]">{req.documentType}</td>
                                <td className="py-4 px-4   text-[15px]">{stepSequence}</td>
                                <td className="py-4 px-4">
                                  {req.status === "In Progressing" ? (
                                    <span className="px-3 py-1.5 bg-[#cfa827] text-white text-[12px] font-medium rounded-sm">
                                      {t("in_progress_stat") || t("in_progress")}
                                    </span>
                                  ) : req.status === "Failed" ? (
                                    <span className="px-3 py-1.5 bg-red-200 text-red-800 text-[12px] font-bold rounded-sm">
                                      {t("declined")}
                                    </span>
                                  ) : req.status === "Assigned to Improve" ? (
                                    <span className="px-3 py-1.5 bg-purple-200 text-purple-800 text-[12px] font-bold rounded-sm">
                                      {t("return")}
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1.5 bg-[#86efac] text-green-800 text-[12px] font-bold rounded-sm">
                                      {req.status === "Completed" ? (t("completed_stat") || t("completed")) : req.status}
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6 relative">
                                  <div className="flex justify-end relative">
                                    <button
                                      onClick={() => setActionMenuOpen(actionMenuOpen === req.id ? null : req.id)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#125821] hover:bg-[#0c4015] text-white text-[13px] font-medium rounded-md transition-colors"
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
                                        <div className="absolute top-full right-6 mt-1 w-32 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg shadow-xl z-50 overflow-hidden py-1">
                                          <button
                                            onClick={() => {
                                              setActionMenuOpen(null);
                                              setSelectedRequest(req);
                                              const doc = documentTypes.find(d => d.title === req.documentType || d.code === req.documentType);
                                              setSelectedDocType(doc || null);
                                              setViewState("VIEW");
                                            }}
                                            className="w-full text-left px-4 py-2 text-[13px] text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#242B36] dark:bg-[#242B36] flex items-center gap-2 transition-colors"
                                          >
                                            <Eye size={14} /> {t("view")}
                                          </button>
                                          {hasPermission(currentUser, "Request", "Edit") && (
                                            <button
                                              onClick={() => { setActionMenuOpen(null); handleEditClick(req); }}
                                              className="w-full text-left px-4 py-2 text-[13px] text-[#dcb23c] hover:bg-[#fff9e6] flex items-center gap-2 transition-colors"
                                            >
                                              <Edit size={14} /> {t("edit")}
                                            </button>
                                          )}
                                          {hasPermission(currentUser, "Request", "Delete") && (
                                            <button
                                              onClick={() => { setActionMenuOpen(null); handleDeleteRequest(req.id); }}
                                              className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
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
                    className="px-6 py-2 bg-gray-400 hover:bg-gray-50 dark:hover:bg-[#242B36] dark:bg-[#242B36]0 text-white text-[14px] font-medium rounded-md transition-colors"
                  >
                    {t("back") || "Back"}
                  </button>
                </div>
                <div className="flex flex-col xl:flex-row gap-6 items-start">
                  {/* Left Form Panel */}
                  <div className="w-full xl:w-[65%] flex flex-col gap-6">
                    {/* Top Inputs */}
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm flex flex-col gap-6">
                      <div className="flex flex-col md:flex-row gap-6 w-full">
                        <div className="flex-1">
                          <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                            {t("type_document")} <span className="text-red-500">*</span>
                          </label>
                          <select
                            name="documentType"
                            value={formData.documentType}
                            onChange={handleDocTypeChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[15px] bg-gray-50 dark:bg-[#242B36]/50 cursor-pointer text-gray-600 dark:text-[#a1a1aa] appearance-none"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                          >
                            <option value="" disabled>{t("type_document")}...</option>
                            {documentTypes.map((t, idx) => (
                              <option key={idx} value={t.title || t.code}>{t.title || t.code}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                            {t("title") || "Title"} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder={`${t("title") || "Title"}....`}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[15px] bg-gray-50 dark:bg-[#242B36]/50 transition-colors"
                          />
                        </div>
                      </div>
                      <div className="w-full">
                        <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                          {t("description")} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder={t("write_something")}
                          className="w-full px-4 py-3 min-h-[140px] rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[15px] bg-gray-50 dark:bg-[#242B36]/50 transition-colors resize-y"
                        />
                      </div>
                    </div>
                    {/* Upload Boxes */}
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm flex flex-col items-center">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        {selectedFiles.map((file, idx) => (
                          <div
                            key={idx}
                            onClick={() => triggerFileInput(idx)}
                            className="border-[1.5px] border-dashed border-gray-400 bg-gray-100/50 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-100 transition-colors h-48 relative overflow-hidden"
                          >
                            <input
                              type="file"
                              id={`file-upload-${idx}`}
                              className="hidden"
                              onChange={(e) => handleFileChange(idx, e)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {file ? (
                              <>
                                <div className="w-12 h-12 rounded-full bg-[#1a5b28]/10 flex items-center justify-center mb-4 text-[#1a5b28]">
                                  <FileText size={24} />
                                </div>
                                <p className="text-[14px] font-bold text-gray-800 truncate w-full px-2" title={file.name}>
                                  {file.name}
                                </p>
                                <p className="text-[12px] text-gray-500 dark:text-[#a1a1aa] mt-1">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </>
                            ) : (
                              <>
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-4 text-gray-500 dark:text-[#a1a1aa]">
                                  <FileText size={24} />
                                </div>
                                <p className="text-[14px] font-bold text-gray-400 dark:text-[#a1a1aa]" dangerouslySetInnerHTML={{__html: t("upload_file")}}>
                                </p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={addFileBox} className="mt-4 w-8 h-8 rounded-full border border-green-600 flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors">
                        <Plus size={18} strokeWidth={3} />
                      </button>
                    </div>
                    {/* Bottom Action Buttons */}
                    <div className="flex gap-4">
                      {isGlobalSuperAdmin || hasPermission(currentUser, "Request", "Create") ? (
                        <button
                          onClick={saveRequest}
                          className="px-10 py-2.5 bg-[#125821] hover:bg-[#0c4015] text-white text-[15px] font-bold rounded-md transition-colors"
                        >
                          {t("save_changes") || "Save"}
                        </button>
                      ) : null}
                      <button
                        onClick={cancelCreate}
                        className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[15px] font-bold rounded-md transition-colors"
                      >
                        {t("cancel") || "Cancel"}
                      </button>
                    </div>
                  </div>
                  {/* Right Flow Tracking Panel */}
                  <div className="w-full xl:w-[35%] bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg overflow-hidden shadow-sm flex flex-col min-h-[500px]">
                    <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A] bg-white dark:bg-[#161B22]">
                      <h2 className="text-[16px] font-bold text-black dark:text-white">{t("flow_tracking")}</h2>
                    </div>
                    <div className="p-8 flex-1 bg-white dark:bg-[#161B22] flex flex-col">
                      {!selectedDocType ? (
                        <div className="text-center text-gray-400 dark:text-[#a1a1aa] py-12 italic text-[14px] flex-1">
                          {t("select_doc_type_preview")}
                        </div>
                      ) : (
                        <div className="relative ml-3 space-y-8 pb-4 flex-1">
                          {selectedDocType.steps.map((step, idx) => {
                            const isFinal = idx === selectedDocType.steps.length - 1;
                            return (
                              <div key={idx} className="relative pl-8">
                                {/* Dot Indicator - Using Pending Color as requested */}
                                <div
                                  className="absolute w-[18px] h-[18px] rounded-full -left-[9px] top-1/2 -translate-y-1/2 z-10"
                                  style={{ backgroundColor: PENDING_COLOR }}
                                ></div>
                                {!isFinal && (
                                  <div className="absolute left-[-1px] top-1/2 w-[2px] h-[calc(100%+2rem)] bg-gray-200 dark:bg-[#242B36] z-0"></div>
                                )}
                                {/* Step Info Box */}
                                <div className="bg-gray-50 dark:bg-[#242B36]/80 border border-[#1a5b28] rounded-xl px-4 py-3 flex justify-between items-center relative w-full">
                                  <div className="flex flex-col gap-1.5">
                                    <div className="text-[13px] font-bold text-black dark:text-white">
                                      {t("department")} : <span className="text-[#1a5b28] font-normal">{step.department}</span>
                                    </div>
                                    <div className="text-[13px] font-bold text-black dark:text-white">
                                      {t("signature_by")} : <span className="text-[#1a5b28] font-normal">{step.userSign}</span>
                                    </div>
                                  </div>
                                  {isFinal && (
                                    <div className="text-red-500 text-[12px] font-medium pr-2">
                                      {t("final_step")}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Legend at the bottom */}
                      <div className="pt-8 mt-auto w-full">
                        <div className="flex flex-wrap items-center justify-center gap-4 text-[12px] font-bold text-black dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: PENDING_COLOR }}></div>
                            {t("pending")}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: IN_PROGRESS_COLOR }}></div>
                            {t("in_progress")}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: COMPLETED_COLOR }}></div>
                            {t("completed_stat") || t("completed")}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: DECLINED_COLOR }}></div>
                            {t("declined")}
                          </div>
                        </div>
                      </div>
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
                    className="px-6 py-2 bg-gray-400 hover:bg-gray-50 dark:hover:bg-[#242B36] dark:bg-[#242B36]0 text-white text-[14px] font-medium rounded-md transition-colors"
                  >
                    {t("back") || "Back"}
                  </button>
                </div>
                <div className="flex flex-col xl:flex-row gap-6 items-start">
                  {/* Left Form Panel (Read Only) */}
                  <div className="w-full xl:w-[65%] flex flex-col gap-6">
                    {/* Top Inputs */}
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm flex flex-col md:flex-row gap-6">
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
                          {t("title") || "Title"}
                        </label>
                        <div className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36]/50 text-[15px] text-gray-800 font-medium">
                          {selectedRequest.title}
                        </div>
                      </div>
                    </div>
                    {/* Upload Boxes (Read Only) */}
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm flex flex-col items-center">
                      {(!selectedRequest.files || selectedRequest.files.length === 0) ? (
                        <div className="text-gray-400 dark:text-[#a1a1aa] italic text-[14px] py-12">{t("no_files")}</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                          {selectedRequest.files.map((file, idx) => (
                            <div
                              key={idx}
                            className="border-[1.5px] border-dashed border-gray-300 dark:border-[#2A2F3A] bg-gray-50 dark:bg-[#242B36]/30 rounded-lg p-8 flex flex-col items-center justify-center text-center h-48 relative overflow-hidden"
                          >
                            <div className="w-12 h-12 rounded-full bg-[#1a5b28]/10 flex items-center justify-center mb-4 text-[#1a5b28]">
                              <FileText size={24} />
                            </div>
                            <p className="text-[14px] font-bold text-gray-800 truncate w-full px-2" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[12px] text-gray-500 dark:text-[#a1a1aa] mt-1">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            {/* Three-dot Action Menu */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFileActionMenuOpen(fileActionMenuOpen === idx ? null : idx);
                              }}
                              className="absolute bottom-3 right-3 text-gray-400 dark:text-[#a1a1aa] hover:text-gray-600 dark:text-[#a1a1aa] p-1 rounded hover:bg-gray-200/50 transition-colors z-10"
                            >
                              <MoreVertical size={18} />
                            </button>
                            {fileActionMenuOpen === idx && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => { e.stopPropagation(); setFileActionMenuOpen(null); }}
                                />
                                <div className="absolute bottom-10 right-3 w-32 bg-white dark:bg-[#161B22] border border-gray-100 dark:border-[#2A2F3A] rounded-md shadow-lg z-50 py-1 text-left flex flex-col">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFileActionMenuOpen(null);
                                      if (file.data) setPreviewFile(file);
                                      else alert("Preview data not available for this older request.");
                                    }}
                                    className="w-full text-left px-4 py-2 text-[13px] text-black dark:text-white hover:bg-gray-50 dark:hover:bg-[#242B36] dark:bg-[#242B36] transition-colors"
                                  >
                                    {t("preview")}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFileActionMenuOpen(null);
                                      handleDownload(file);
                                    }}
                                    className="w-full text-left px-4 py-2 text-[13px] text-black dark:text-white hover:bg-gray-50 dark:hover:bg-[#242B36] dark:bg-[#242B36] transition-colors"
                                  >
                                    {t("download")}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Right Flow Tracking Panel */}
                <div className="w-full xl:w-[35%] bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg overflow-hidden shadow-sm flex flex-col min-h-[500px]">
                  <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A] bg-white dark:bg-[#161B22]">
                    <h2 className="text-[16px] font-bold text-black dark:text-white">{t("flow_tracking")}</h2>
                  </div>
                  <div className="p-8 flex-1 bg-white dark:bg-[#161B22] flex flex-col">
                    {!selectedRequest || !selectedRequest.path ? (
                      <div className="text-center text-gray-400 dark:text-[#a1a1aa] py-12 italic text-[14px] flex-1">
                        {t("no_tracking_info")}
                      </div>
                    ) : (
                      <div className="relative ml-3 space-y-8 pb-4 flex-1">
                        {selectedRequest.path.map((step, idx) => {
                          const isFinal = idx === selectedRequest.path.length - 1;
                          // Determine node color based on request status
                          const currentIndex = selectedRequest.currentStepIndex || 0;
                          let dotColor = PENDING_COLOR;
                          if (selectedRequest.status === "Failed") {
                            if (idx === currentIndex) {
                              dotColor = DECLINED_COLOR;
                            } else if (idx < currentIndex) {
                              dotColor = COMPLETED_COLOR;
                            }
                          } else if (selectedRequest.status === "Completed") {
                            dotColor = COMPLETED_COLOR;
                          } else {
                            // In Progress or Pending
                            if (idx < currentIndex) {
                              dotColor = COMPLETED_COLOR;
                            } else if (idx === currentIndex) {
                              dotColor = IN_PROGRESS_COLOR;
                            }
                          }
                          const stepDept = typeof step === 'string' ? step : (step.department || step.mainRole || "Unknown");
                          const stepUser = typeof step === 'string' ? "Unknown" : (step.userSign || stepDept);
                          return (
                            <div key={idx} className="relative pl-8">
                              {/* Dot Indicator */}
                              <div
                                className="absolute w-[18px] h-[18px] rounded-full -left-[9px] top-1/2 -translate-y-1/2 z-10"
                                style={{ backgroundColor: dotColor }}
                              ></div>
                              {!isFinal && (
                                <div className="absolute left-[-1px] top-1/2 w-[2px] h-[calc(100%+2rem)] bg-gray-200 dark:bg-[#242B36] z-0"></div>
                              )}
                              {/* Step Info Box */}
                              <div className="bg-gray-50 dark:bg-[#242B36]/80 border border-[#1a5b28] rounded-xl px-4 py-3 flex flex-col relative w-full">
                                <div className="flex justify-between items-start w-full">
                                  <div className="flex flex-col gap-1.5">
                                    <div className="text-[13px] font-bold text-black dark:text-white">
                                      {t("department")} : <span className="text-[#1a5b28] font-normal">{stepDept}</span>
                                    </div>
                                    <div className="text-[13px] font-bold text-black dark:text-white">
                                      {t("signature_by")} : <span className="text-[#1a5b28] font-normal">{stepUser}</span>
                                    </div>
                                  </div>
                                  {isFinal && (
                                    <div className="text-red-500 text-[12px] font-medium pr-2">
                                      {t("final_step")}
                                    </div>
                                  )}
                                </div>
                                {step.signature && (
                                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#2A2F3A] flex flex-col">
                                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">{t("attached_signature")}</span>
                                    <img src={step.signature} alt="Signature" className="h-12 object-contain self-start mix-blend-multiply dark:mix-blend-screen" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Legend at the bottom */}
                    <div className="pt-8 mt-auto w-full">
                      <div className="flex flex-wrap items-center justify-center gap-4 text-[12px] font-bold text-black dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: PENDING_COLOR }}></div>
                          {t("pending")}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: IN_PROGRESS_COLOR }}></div>
                          {t("in_progress")}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: COMPLETED_COLOR }}></div>
                          {t("completed_stat") || t("completed")}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: DECLINED_COLOR }}></div>
                          {t("declined")}
                        </div>
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
      {/* Preview Modal */ }
  {
    previewFile && (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 md:p-10">
        <div className="bg-white dark:bg-[#161B22] rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[80vh] flex flex-col overflow-hidden animate-fade-in">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-[#2A2F3A]">
            <h3 className="font-bold text-[16px] text-gray-800">{previewFile.name}</h3>
            <button onClick={() => setPreviewFile(null)} className="text-gray-500 dark:text-[#a1a1aa] hover:text-red-500 font-medium">
              Close
            </button>
          </div>
          <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-auto p-4 relative">
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
  {/* Delete Confirmation Modal */ }
  <DeleteConfirmationModal
    isOpen={deleteModalConfig.isOpen}
    onClose={() => setDeleteModalConfig({ isOpen: false, isBulk: false, id: null })}
    onConfirm={confirmDelete}
    itemCount={deleteModalConfig.isBulk ? selectedRows.length : 1}
    itemName={""}
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
