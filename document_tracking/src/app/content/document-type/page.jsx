"use client";
import { useState, useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import { hasPermission } from "../../../utils/permissions";
import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";
import BulkActionBar from "../../../components/BulkActionBar";
import { useDepartments } from '../../../hooks/useDepartments';
import AlertModal from "../../../components/AlertModal";
import { Check, Edit, Trash2, X, FileText, Settings, UploadCloud, Search, Plus, Filter, Calendar, Users, Eye } from "lucide-react";
import { useDocumentTypes, useCreateDocumentType, useUpdateDocumentType, useDeleteDocumentType } from "@/hooks/useDocumentTypes";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import Pagination from "../../../components/Pagination";

export default function DocumentTypePage() {
  const router = useRouter();
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { t } = useLanguage();
  
  // Core State
  const [viewState, setViewState] = useState("LIST");

  
  // Table State
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Modal State
  const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, id: null, isBulk: false, title: "" });
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
  const showAlert = (message) => setAlertModal({ isOpen: true, message });
  
  // Form State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    retention_days: "",
    requires_approval: "No",
    status: "Active"
  });

  const { data: documentTypesData = [], isLoading } = useDocumentTypes();
  const documentTypes = Array.isArray(documentTypesData) ? documentTypesData : [];
  
  const createMutation = useCreateDocumentType();
  const updateMutation = useUpdateDocumentType();
  const deleteMutation = useDeleteDocumentType();

  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/");
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // Handlers for Form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (doc) => {
    setFormData({
      title: doc.title || "",
      description: doc.description || "",
      retention_days: doc.retention_days || "",
      requires_approval: doc.requires_approval || "No",
      status: doc.status || "Active"
    });
    setIsEditMode(true);
    setEditingId(doc.id);
    setViewState("CREATE");
  };

  const handleDeleteClick = (doc) => {
    setDeleteModalConfig({ isOpen: true, id: doc.id, isBulk: false, title: doc.title || "Untitled" });
  };

  const handleSelectAll = () => {
    setSelectedRows(paginatedData.map(d => d.id));
  };

  const handleDeselectAll = () => {
    setSelectedRows([]);
  };

  const handleDeleteSelected = () => {
    if (selectedRows.length > 0) {
      setDeleteModalConfig({ isOpen: true, id: null, isBulk: true, title: "" });
    }
  };

  const toggleRowSelection = (id) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
  };

  const confirmDelete = () => {
    if (deleteModalConfig.isBulk) {
      selectedRows.forEach(id => deleteMutation.mutate(id));
      setSelectedRows([]);
    } else if (deleteModalConfig.id) {
      deleteMutation.mutate(deleteModalConfig.id);
    }
    setDeleteModalConfig({ isOpen: false, id: null, isBulk: false, title: "" });
  };

  const saveDocumentType = () => {
    if (!formData.title) {
      showAlert(t("alert_fill_code_title_slug") || "Please fill in the title.");
      return;
    }

    if (isEditMode && editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }

    cancelCreate();
  };

  const cancelCreate = () => {
    setFormData({ title: "", description: "", retention_days: "", requires_approval: "No", status: "Active" });
    setIsEditMode(false);
    setEditingId(null);
    setViewState("LIST");
  };

  const filteredData = documentTypes.filter(doc => {
    const searchLower = searchTerm.toLowerCase();
    return (doc.title || "").toLowerCase().includes(searchLower) ||
      (doc.description || "").toLowerCase().includes(searchLower);
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex bg-[#fdfdfd] dark:bg-[#0F1117] min-h-screen font-sans">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className={`flex-1 transition-all duration-300 ease-in-out flex flex-col min-w-0 dark:bg-[#0F1117]`}>
        <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} currentUser={currentUser} />

        <main className="p-8 flex-1 overflow-x-hidden flex flex-col">
          <div className="w-full flex flex-col flex-1">

            {viewState === "LIST" && (
              <div className="flex flex-col h-full animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-black dark:text-white">{t("type_document") || "Document Type"}</h1>
                  {hasPermission(currentUser, "Type Document", "Create") && (
                    <button
                      onClick={() => setViewState("CREATE")}
                      className="px-6 py-2 bg-[#125821] hover:bg-[#0c4015] dark:bg-[#1a5b28] dark:hover:bg-[#12421d] text-white text-[14px] font-bold rounded-md transition-colors"
                    >
                      {t("add_new") || "Add New"}
                    </button>
                  )}
                </div>

                <div className="bg-white dark:bg-[#161B22] rounded-xl shadow-sm border border-gray-100 dark:border-[#2A2F3A] flex flex-col overflow-hidden md:overflow-visible">
                  <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-100 dark:border-[#2A2F3A]">
                    <div className="w-full md:w-auto">
                      <BulkActionBar
                        selectedCount={selectedRows.length}
                        totalCount={paginatedData.length}
                        onSelectAll={handleSelectAll}
                        onDeselectAll={handleDeselectAll}
                        onDelete={handleDeleteSelected}
                      />
                    </div>
                    <div className="relative w-full md:w-auto">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#a1a1aa]" />
                      <input
                        type="text"
                        placeholder={t("search")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-64 pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#242B36] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-[14px] text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-[#1a5b28] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto md:overflow-visible">
                    <table className="w-full text-left text-[14px]">
                      <thead className="bg-[#f5f5f5] dark:bg-[#242B36] text-black dark:text-white font-bold text-[15px]">
                        <tr className="border-b border-gray-200 dark:border-[#2A2F3A]">
                          <th className="py-3 px-4 w-12 text-center cursor-pointer" onClick={() => selectedRows.length === paginatedData.length && paginatedData.length > 0 ? handleDeselectAll() : handleSelectAll()}>
                            <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors mx-auto ${selectedRows.length === paginatedData.length && paginatedData.length > 0 ? 'bg-[#1a5b28] border-[#1a5b28]' : 'bg-white dark:bg-[#161B22] border-gray-400'}`}>
                              {selectedRows.length === paginatedData.length && paginatedData.length > 0 && <span className="text-white text-[10px] font-bold">✓</span>}
                            </div>
                          </th>
                          <th className="py-3 px-4">{t("name") || "Name"}</th>
                          <th className="py-3 px-4">{t("description") || "Description"}</th>
                          <th className="py-3 px-4">{t("retention_days") || "Retention Days"}</th>
                          <th className="py-3 px-4">{t("requires_approval") || "Requires Approval"}</th>
                          <th className="py-3 px-4">{t("status") || "Status"}</th>
                          <th className="py-3 px-4 w-24"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2A2F3A] text-gray-700 dark:text-white">
                        {paginatedData.map((doc, idx) => {
                          const isSelected = selectedRows.includes(doc.id);
                          return (
                            <tr key={doc.id} className={`hover:bg-gray-50/50 dark:hover:bg-[#242B36] transition-colors ${isSelected ? 'bg-green-50/30' : ''}`}>
                              <td className={`text-[14px] py-3 px-4 text-center cursor-pointer ${isSelected ? 'border-l-4 border-l-[#1a5b28]' : 'border-l-4 border-l-transparent'}`} onClick={() => toggleRowSelection(doc.id)}>
                                <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors mx-auto ${isSelected ? 'bg-[#1a5b28] border-[#1a5b28]' : 'bg-white dark:bg-[#161B22] border-gray-400'}`}>
                                  {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                                </div>
                              </td>
                              <td className="text-[14px] py-4 px-4 text-gray-800 dark:text-gray-200">{doc.title}</td>
                              <td className="text-[14px] py-4 px-4 text-gray-800 dark:text-gray-200 truncate max-w-[250px]">{doc.description || "—"}</td>
                              <td className="text-[14px] py-4 px-4 text-gray-800 dark:text-gray-200">{doc.retention_days || "—"}</td>
                              <td className="text-[14px] py-4 px-4 text-gray-800 dark:text-gray-200">
                                <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md border ${
                                  doc.requires_approval === 'Yes' 
                                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' 
                                    : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
                                }`}>
                                  {doc.requires_approval || "No"}
                                </span>
                              </td>
                              <td className="text-[14px] py-4 px-4 text-gray-800 dark:text-gray-200">
                                <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md border ${
                                  doc.status === 'Active' 
                                    ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' 
                                    : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
                                }`}>
                                  {doc.status || "Active"}
                                </span>
                              </td>
                              <td className={`py-3 px-4 relative ${actionMenuOpen === doc.id ? 'z-30' : ''}`}>
                                <div className="flex justify-end relative">
                                  <button
                                    onClick={() => setActionMenuOpen(actionMenuOpen === doc.id ? null : doc.id)}
                                    className="px-3 py-1.5 bg-[#063b12] hover:bg-[#04240b] text-white text-[13px] rounded-md flex items-center gap-1 font-medium tracking-wide shadow-sm"
                                  >
                                    <span className="text-sm font-bold flex items-center leading-none">⋮</span> {t("action") || "Action"}
                                  </button>
                                  {actionMenuOpen === doc.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(null)} />
                                      <div className={`absolute right-0 w-32 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg shadow-xl z-50 overflow-hidden py-1 ${(idx === paginatedData.length - 1 || (idx === paginatedData.length - 2 && paginatedData.length >= 3)) ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                                        {hasPermission(currentUser, "Type Document", "Edit") && (
                                          <button
                                            onClick={() => { setActionMenuOpen(null); handleEditClick(doc); }}
                                            className="w-full text-left px-4 py-2 text-[13px] text-[#dcb23c] hover:bg-[#fff9e6] flex items-center gap-2 transition-colors"
                                          >
                                            <Edit size={14} /> {t("edit") || "Edit"}
                                          </button>
                                        )}
                                        {hasPermission(currentUser, "Type Document", "Delete") && (
                                          <button
                                            onClick={() => { setActionMenuOpen(null); handleDeleteClick(doc); }}
                                            className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                          >
                                            <Trash2 size={14} /> {t("delete") || "Delete"}
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredData.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400 dark:text-[#a1a1aa] italic">No document types found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {paginatedData.length > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={filteredData.length}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                    />
                  )}
                </div>
              </div>
            )}

            {viewState === "CREATE" && (
              <div className="flex flex-col animate-fade-in w-full">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-black dark:text-white">
                    {isEditMode ? t("edit_document_type") || "Edit Document Type" : t("create_document_type") || "Create Document Type"}
                  </h1>
                  <button
                    onClick={cancelCreate}
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white text-[14px] font-medium rounded-md transition-colors capitalize"
                  >
                    {t("back") || "Back"}
                  </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Left Column: Detail */}
                  <div className="w-full lg:w-[65%] flex flex-col gap-4">
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg overflow-hidden shadow-sm flex flex-col">
                      <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A]">
                        <h2 className="text-[16px] font-bold text-black dark:text-white">Document Type Detail</h2>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                          {/* Name */}
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              {t("name") || "Name"} <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="title"
                              value={formData.title}
                              onChange={handleInputChange}
                              placeholder={`${t("name") || "Name"}....`}
                              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white transition-colors"
                            />
                          </div>
                          
                          {/* Description */}
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              {t("description") || "Description"} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              name="description"
                              value={formData.description}
                              onChange={handleInputChange}
                              placeholder={`${t("description") || "Description"}....`}
                              className="w-full px-4 py-3 min-h-[160px] rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white resize-y transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 mt-2">
                      <button
                        onClick={saveDocumentType}
                        className="px-8 py-2 bg-[#0c4a17] hover:bg-[#0a3a12] text-white text-[14px] font-bold rounded-md transition-colors"
                      >
                        {t("save") || "Save"}
                      </button>
                      <button
                        onClick={cancelCreate}
                        className="px-8 py-2 bg-[#e51010] hover:bg-[#cc0e0e] text-white text-[14px] font-bold rounded-md transition-colors"
                      >
                        {t("cancel") || "Cancel"}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Settings */}
                  <div className="w-full lg:w-[35%]">
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg shadow-sm flex flex-col">
                      <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A]">
                        <h2 className="text-[16px] font-bold text-black dark:text-white">Settings</h2>
                      </div>
                      <div className="p-6">
                        {/* Retention Days */}
                        <div className="mb-6">
                          <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                            {t("retention_days") || "Retention Days"} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="retention_days"
                            value={formData.retention_days}
                            onChange={handleInputChange}
                            placeholder={`${t("retention_days") || "Retention Days"}....`}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white transition-colors"
                          />
                        </div>

                        {/* Requires Approval */}
                        <div>
                          <label className="block text-[14px] font-bold text-black dark:text-white mb-3">
                            {t("requires_approval") || "Requires Approval"}
                          </label>
                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center ${formData.requires_approval === "Yes" ? "border-[#1a5b28] dark:border-[#2da94a]" : "border-gray-300 dark:border-[#2A2F3A]"}`}>
                                {formData.requires_approval === "Yes" && <div className="w-2.5 h-2.5 rounded-full bg-[#1a5b28] dark:bg-[#2da94a]"></div>}
                              </div>
                              <input
                                type="radio"
                                name="requires_approval"
                                value="Yes"
                                checked={formData.requires_approval === "Yes"}
                                onChange={(e) => setFormData({ ...formData, requires_approval: e.target.value })}
                                className="hidden"
                              />
                              <span className="text-[14px] text-[#1a5b28] dark:text-[#2da94a] font-medium">{t("yes") || "Yes"}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center ${formData.requires_approval === "No" ? "border-[#1a5b28] dark:border-[#2da94a]" : "border-gray-300 dark:border-[#2A2F3A]"}`}>
                                {formData.requires_approval === "No" && <div className="w-2.5 h-2.5 rounded-full bg-[#1a5b28] dark:bg-[#2da94a]"></div>}
                              </div>
                              <input
                                type="radio"
                                name="requires_approval"
                                value="No"
                                checked={formData.requires_approval === "No"}
                                onChange={(e) => setFormData({ ...formData, requires_approval: e.target.value })}
                                className="hidden"
                              />
                              <span className="text-[14px] text-[#1a5b28] dark:text-[#2da94a] font-medium">{t("no") || "No"}</span>
                            </label>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="mt-6">
                          <label className="block text-[14px] font-bold text-black dark:text-white mb-3">
                            {t("status") || "Status"}
                          </label>
                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center ${formData.status === "Active" ? "border-[#1a5b28] dark:border-[#2da94a]" : "border-gray-300 dark:border-[#2A2F3A]"}`}>
                                {formData.status === "Active" && <div className="w-2.5 h-2.5 rounded-full bg-[#1a5b28] dark:bg-[#2da94a]"></div>}
                              </div>
                              <input
                                type="radio"
                                name="status"
                                value="Active"
                                checked={formData.status === "Active"}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="hidden"
                              />
                              <span className="text-[14px] text-[#1a5b28] dark:text-[#2da94a] font-medium">{t("active") || "Active"}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center ${formData.status === "Inactive" ? "border-[#1a5b28] dark:border-[#2da94a]" : "border-gray-300 dark:border-[#2A2F3A]"}`}>
                                {formData.status === "Inactive" && <div className="w-2.5 h-2.5 rounded-full bg-[#1a5b28] dark:bg-[#2da94a]"></div>}
                              </div>
                              <input
                                type="radio"
                                name="status"
                                value="Inactive"
                                checked={formData.status === "Inactive"}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="hidden"
                              />
                              <span className="text-[14px] text-[#1a5b28] dark:text-[#2da94a] font-medium">{t("inactive") || "Inactive"}</span>
                            </label>
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
      
      <DeleteConfirmationModal
        isOpen={deleteModalConfig.isOpen}
        onClose={() => setDeleteModalConfig({ isOpen: false, id: null, isBulk: false, title: "" })}
        onConfirm={confirmDelete}
        itemName={deleteModalConfig.title || "Selected Document Types"}
        itemCount={deleteModalConfig.isBulk ? selectedRows.length : 1}
        itemType="document type"
      />
      
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: "" })}
        message={alertModal.message}
      />
    </div>
  );
}
