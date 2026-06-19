"use client";
import { useState, useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import { hasPermission } from "../../../utils/permissions";
import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";
import AlertModal from "../../../components/AlertModal";
import { Search, Edit, Trash2, Eye, MoreVertical } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import BulkActionBar from "../../../components/BulkActionBar";
import Pagination from "../../../components/Pagination";

export default function JobDepartmentPage() {
  const router = useRouter();
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { t } = useLanguage();

  // Core State
  const [viewState, setViewState] = useState("LIST");
  const [departments, setDepartments] = useState([]);

  // Table state
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Modals
  const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, id: null, isBulk: false });
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
  const showAlert = (message) => setAlertModal({ isOpen: true, message });

  // Form State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    campusSuite: "",
    userSignature: "",
    description: "",
    status: "Active",
    roles: []
  });

  // Roles State
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleFormData, setRoleFormData] = useState({ title: '', slug: '', level: '', type: 'Super Admin', coreFunction: '' });
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleActionMenuOpen, setRoleActionMenuOpen] = useState(null);
  const [viewingRole, setViewingRole] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [roleSearchTerm, setRoleSearchTerm] = useState("");

  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/");
      return;
    }
    setCurrentUser(JSON.parse(userStr));

    const storedUsers = localStorage.getItem("doc_tracking_users");
    if (storedUsers) {
      setRegisteredUsers(JSON.parse(storedUsers));
    }

    // Load stored departments
    const stored = localStorage.getItem("doc_tracking_departments");
    if (stored) {
      setDepartments(JSON.parse(stored));
    } else {
      // Default departments
      const defaultDepts = [
        { id: "dept-1", title: "IT Center", code: "ITC", userSignature: "Var Sovanndara", description: "Information Technology Center", status: "Active" },
        { id: "dept-2", title: "Office of Planning and Finance", code: "OPF", userSignature: "Sok Meng", description: "Finance and Planning", status: "Active" },
        { id: "dept-3", title: "HR Department", code: "HRD", userSignature: "Linda Chan", description: "Human Resources", status: "Active" }
      ];
      setDepartments(defaultDepts);
      localStorage.setItem("doc_tracking_departments", JSON.stringify(defaultDepts));
    }

    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleViewClick = (dept) => {
    setFormData({
      title: dept.title || "",
      code: dept.code || "",
      campusSuite: dept.campusSuite || "",
      userSignature: dept.userSignature || "",
      description: dept.description || "",
      status: dept.status || "Active",
      roles: dept.roles || []
    });
    setEditingId(dept.id);
    setViewState("VIEW");
  };

  const handleEditClick = (dept) => {
    setFormData({
      title: dept.title || "",
      code: dept.code || "",
      campusSuite: dept.campusSuite || "",
      userSignature: dept.userSignature || "",
      description: dept.description || "",
      status: dept.status || "Active",
      roles: dept.roles || []
    });
    setIsEditMode(true);
    setEditingId(dept.id);
    setViewState("CREATE");
  };

  const handleDeleteClick = (id) => {
    setDeleteModalConfig({ isOpen: true, id, isBulk: false });
  };

  const confirmDelete = () => {
    if (deleteModalConfig.isBulk) {
      const updatedList = departments.filter(d => !selectedRows.includes(d.id));
      setDepartments(updatedList);
      localStorage.setItem("doc_tracking_departments", JSON.stringify(updatedList));
      setSelectedRows([]);
    } else {
      const updatedList = departments.filter(d => d.id !== deleteModalConfig.id);
      setDepartments(updatedList);
      localStorage.setItem("doc_tracking_departments", JSON.stringify(updatedList));
      setSelectedRows(prev => prev.filter(rowId => rowId !== deleteModalConfig.id));
    }
    setDeleteModalConfig({ isOpen: false, id: null, isBulk: false });
  };

  // Role Management Functions
  const handleRoleInputChange = (e) => {
    const { name, value } = e.target;
    setRoleFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Auto-generate slug when title changes
      if (name === "title") {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      }
      return updated;
    });
  };

  const openNewRoleModal = () => {
    setRoleFormData({ title: '', slug: '', level: '', type: 'Super Admin', coreFunction: '' });
    setEditingRoleId(null);
    setViewingRole(false);
    setRoleModalOpen(true);
  };

  const openEditRoleModal = (role) => {
    setRoleFormData(role);
    setEditingRoleId(role.id);
    setViewingRole(false);
    setRoleModalOpen(true);
  };

  const openViewRoleModal = (role) => {
    setRoleFormData(role);
    setEditingRoleId(role.id);
    setViewingRole(true);
    setRoleModalOpen(true);
  };

  const saveRole = () => {
    if (!roleFormData.title || !roleFormData.slug) {
      showAlert(t("Please fill in Role Title and Slug"));
      return;
    }

    let updatedRoles = formData.roles ? [...formData.roles] : [];

    if (editingRoleId && !viewingRole) {
      updatedRoles = updatedRoles.map(r => r.id === editingRoleId ? { ...roleFormData } : r);
    } else if (!viewingRole) {
      updatedRoles.push({ id: "role-" + Date.now(), ...roleFormData });
    }

    setFormData(prev => ({ ...prev, roles: updatedRoles }));

    if (editingId) {
      const updatedDepartments = departments.map(d =>
        d.id === editingId ? { ...d, roles: updatedRoles } : d
      );
      setDepartments(updatedDepartments);
      localStorage.setItem("doc_tracking_departments", JSON.stringify(updatedDepartments));
    }

    setRoleModalOpen(false);
  };

  const deleteRole = (roleId) => {
    const updatedRoles = (formData.roles || []).filter(r => r.id !== roleId);
    setFormData(prev => ({ ...prev, roles: updatedRoles }));

    if (editingId) {
      const updatedDepartments = departments.map(d =>
        d.id === editingId ? { ...d, roles: updatedRoles } : d
      );
      setDepartments(updatedDepartments);
      localStorage.setItem("doc_tracking_departments", JSON.stringify(updatedDepartments));
    }
  };

  const saveDepartment = () => {
    if (!formData.title || !formData.userSignature) {
      showAlert(t("Please fill in Department Name and User Signature"));
      return;
    }

    let updatedList;
    if (isEditMode) {
      updatedList = departments.map(d =>
        d.id === editingId ? { ...d, ...formData } : d
      );
    } else {
      const newDept = {
        id: "dept-" + Date.now(),
        ...formData
      };
      updatedList = [...departments, newDept];
    }

    setDepartments(updatedList);
    localStorage.setItem("doc_tracking_departments", JSON.stringify(updatedList));

    cancelCreate();
  };

  const cancelCreate = () => {
    setFormData({ title: "", code: "", campusSuite: "", userSignature: "", description: "", status: "Active" });
    setIsEditMode(false);
    setEditingId(null);
    setViewState("LIST");
    setRoleSearchTerm("");
  };

  const handleSelectAll = () => {
    setSelectedRows(paginatedData.map(d => d.id));
  };

  const handleDeselectAll = () => {
    setSelectedRows([]);
  };

  const handleDeleteSelected = () => {
    if (selectedRows.length > 0) {
      setDeleteModalConfig({ isOpen: true, id: null, isBulk: true });
    }
  };

  const toggleRowSelection = (id) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
  };

  const isGlobalSuperAdmin = currentUser?.email === "admin@rupp.edu.kh";
  const userDept = (currentUser?.mainRole || currentUser?.department || "").toLowerCase().trim();

  const filteredData = departments.filter(dept => {
    if (!isGlobalSuperAdmin) {
      const dTitle = (dept.title || "").toLowerCase().trim();
      if (!userDept || dTitle !== userDept) return false;
    }
    const searchLower = searchTerm.toLowerCase();
    return (dept.title || "").toLowerCase().includes(searchLower) ||
      (dept.userSignature || "").toLowerCase().includes(searchLower);
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredRoles = (formData.roles || []).filter(role => {
    const searchLower = roleSearchTerm.toLowerCase();
    return (role.title || "").toLowerCase().includes(searchLower) ||
      (role.slug || "").toLowerCase().includes(searchLower) ||
      (role.type || "").toLowerCase().includes(searchLower) ||
      (role.coreFunction || "").toLowerCase().includes(searchLower);
  });

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
                  <h1 className="text-3xl font-bold text-black dark:text-white">{t("job_department") || "Job Department"}</h1>
                  {hasPermission(currentUser, "Job Department", "Create") && (
                    <button
                      onClick={() => setViewState("CREATE")}
                      className="px-6 py-2 bg-[#125821] hover:bg-[#0c4015] dark:bg-[#1a5b28] dark:hover:bg-[#12421d] text-white text-[14px] font-bold rounded-md transition-colors"
                    >
                      {t("add_new")}
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
                      <thead className="bg-[#f5f5f5] dark:bg-[#242B36] text-black dark:text-white font-bold">
                        <tr className="border-b border-gray-200 dark:border-[#2A2F3A]">
                          <th className="py-3 px-4 w-12 text-center cursor-pointer" onClick={() => selectedRows.length === paginatedData.length && paginatedData.length > 0 ? handleDeselectAll() : handleSelectAll()}>
                            <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors mx-auto ${selectedRows.length === paginatedData.length && paginatedData.length > 0 ? 'bg-[#1a5b28] border-[#1a5b28]' : 'bg-white dark:bg-[#161B22] border-gray-400'}`}>
                              {selectedRows.length === paginatedData.length && paginatedData.length > 0 && <span className="text-white text-[10px] font-bold">✓</span>}
                            </div>
                          </th>
                          <th className="py-3 px-4">{t("code") || "Code"}</th>
                          <th className="py-3 px-4">{t("title") || "Title"}</th>
                          <th className="py-3 px-4">{t("signature_by") || "User Sign"}</th>
                          <th className="py-3 px-4">{t("status") || "Status"}</th>
                          <th className="py-3 px-4 w-24"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2A2F3A] text-gray-700 dark:text-white">
                        {paginatedData.map((dept, idx) => {
                          const isSelected = selectedRows.includes(dept.id);
                          return (
                            <tr key={dept.id} className={`hover:bg-gray-50/50 dark:hover:bg-[#242B36] transition-colors ${isSelected ? 'bg-green-50/30' : ''}`}>
                              <td className={`py-3 px-4 text-center cursor-pointer ${isSelected ? 'border-l-4 border-l-[#1a5b28]' : 'border-l-4 border-l-transparent'}`} onClick={() => toggleRowSelection(dept.id)}>
                                <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors mx-auto ${isSelected ? 'bg-[#1a5b28] border-[#1a5b28]' : 'bg-white dark:bg-[#161B22] border-gray-400'}`}>
                                  {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-gray-800 dark:text-gray-200">{dept.code}</td>
                              <td className="py-4 px-4 text-gray-800 dark:text-gray-200">{dept.title}</td>
                              <td className="py-4 px-4 text-gray-800 dark:text-gray-200">{dept.userSignature}</td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center justify-center px-3 py-1 text-[11px] font-bold rounded-sm ${dept.status === 'Active' ? 'bg-[#8ee093] text-[#0c4015]' : 'bg-gray-300 text-gray-700'}`}>
                                  {dept.status === 'Active' ? t("active") || "Active" : t("inactive") || "Inactive"}
                                </span>
                              </td>
                              <td className={`py-3 px-4 relative ${actionMenuOpen === dept.id ? 'z-30' : ''}`}>
                                <div className="flex justify-end relative">
                                  <button
                                    onClick={() => setActionMenuOpen(actionMenuOpen === dept.id ? null : dept.id)}
                                    className="px-3 py-1.5 bg-[#063b12] hover:bg-[#04240b] text-white text-[13px] rounded-md flex items-center gap-1 font-medium tracking-wide shadow-sm"
                                  >
                                    <span className="text-sm font-bold flex items-center leading-none">⋮</span> {t("action") || "Action"}
                                  </button>
                                  {actionMenuOpen === dept.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(null)} />
                                      <div className={`absolute right-0 w-32 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg shadow-xl z-50 overflow-hidden py-1 ${(idx === paginatedData.length - 1 || (idx === paginatedData.length - 2 && paginatedData.length >= 3)) ? 'bottom-full mb-1' : 'top-full mt-1'
                                        }`}>
                                        {hasPermission(currentUser, "Job Department", "View") && (
                                          <button
                                            onClick={() => { setActionMenuOpen(null); handleViewClick(dept); }}
                                            className="w-full text-left px-4 py-2 text-[13px] text-[#1a5b28] hover:bg-green-50 flex items-center gap-2 transition-colors"
                                          >
                                            <Eye size={14} /> {t("view") || "View"}
                                          </button>
                                        )}
                                        {hasPermission(currentUser, "Job Department", "Edit") && (
                                          <button
                                            onClick={() => { setActionMenuOpen(null); handleEditClick(dept); }}
                                            className="w-full text-left px-4 py-2 text-[13px] text-[#dcb23c] hover:bg-[#fff9e6] flex items-center gap-2 transition-colors"
                                          >
                                            <Edit size={14} /> {t("edit")}
                                          </button>
                                        )}
                                        {hasPermission(currentUser, "Job Department", "Delete") && (
                                          <button
                                            onClick={() => { setActionMenuOpen(null); handleDeleteClick(dept.id); }}
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
                        })}
                        {filteredData.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400 dark:text-[#a1a1aa] italic">No departments found.</td>
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
                    {isEditMode ? "Edit Job Department" : "Create Job Department"}
                  </h1>
                  <button
                    onClick={cancelCreate}
                    className="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white text-[14px] font-medium rounded-md transition-colors capitalize"
                  >
                    {t("back") || "Back"}
                  </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Left Column: Department Detail */}
                  <div className="w-full lg:w-[65%] flex flex-col gap-4">
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg overflow-hidden shadow-sm flex flex-col">
                      <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A]">
                        <h2 className="text-[16px] font-bold text-black dark:text-white">Department Detail</h2>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                          {/* Code */}
                          <div>
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              {t("code") || "Code"} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleInputChange}
                                placeholder="Enter code..."
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white"
                              />
                            </div>
                          </div>

                          {/* Title */}
                          <div>
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              {t("title") || "Title"} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="Enter title..."
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white"
                              />
                            </div>
                          </div>

                          {/* Campus Suite */}
                          <div>
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              Campus Suite <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                name="campusSuite"
                                value={formData.campusSuite}
                                onChange={handleInputChange}
                                placeholder="Enter campus suite..."
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white"
                              />
                            </div>
                          </div>

                          {/* Status */}
                          <div>
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              {t("status") || "Status"}
                            </label>
                            <div className="flex items-center gap-6 mt-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${formData.status === 'Active' ? 'border-green-600' : 'border-gray-400'}`}>
                                  {formData.status === 'Active' && <div className="w-3 h-3 rounded-full bg-green-600"></div>}
                                </div>
                                <input
                                  type="radio"
                                  name="status"
                                  value="Active"
                                  checked={formData.status === "Active"}
                                  onChange={handleInputChange}
                                  className="hidden"
                                />
                                <span className={`text-[14px] ${formData.status === 'Active' ? 'text-green-700 font-medium' : 'text-gray-600'}`}>Active</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${formData.status === 'Inactive' ? 'border-green-600' : 'border-gray-400'}`}>
                                  {formData.status === 'Inactive' && <div className="w-3 h-3 rounded-full bg-green-600"></div>}
                                </div>
                                <input
                                  type="radio"
                                  name="status"
                                  value="Inactive"
                                  checked={formData.status === "Inactive"}
                                  onChange={handleInputChange}
                                  className="hidden"
                                />
                                <span className={`text-[14px] ${formData.status === 'Inactive' ? 'text-green-700 font-medium' : 'text-gray-600'}`}>Inactive</span>
                              </label>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                              {t("description") || "Description"}
                            </label>
                            <textarea
                              name="description"
                              value={formData.description}
                              onChange={handleInputChange}
                              placeholder="Write Description..."
                              className="w-full px-4 py-3 min-h-[160px] rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white resize-y"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 mt-2">
                      <button
                        onClick={saveDepartment}
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

                  {/* Right Column: User Signature Assigned */}
                  <div className="w-full lg:w-[35%]">
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg overflow-hidden shadow-sm flex flex-col">
                      <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A]">
                        <h2 className="text-[16px] font-bold text-black dark:text-white">User Signature Assigned</h2>
                      </div>
                      <div className="p-6">
                        <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                          User Signature
                        </label>
                        <div className="relative">
                          <select
                            name="userSignature"
                            value={formData.userSignature}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-gray-700 dark:text-white appearance-none cursor-pointer"
                          >
                            <option value="" disabled>Select User</option>
                            <option value="Var Sovanndara">Var Sovanndara</option>
                            <option value="Sok Meng">Sok Meng</option>
                            <option value="Linda Chan">Linda Chan</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                          </div>
                        </div>
                        <p className="mt-4 text-[13px] text-gray-500">
                          <span className="text-[#eab308] font-medium">Warning :</span> This User only that can sign after finished or approved final step.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Roles Table */}
                <div className="bg-[#f5f5f5] dark:bg-[#161B22] rounded-lg overflow-hidden md:overflow-visible shadow-sm p-6 mb-8 mt-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-black dark:text-white">Role in {formData.title || "Department"}</h3>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="relative flex-1 md:flex-initial">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={roleSearchTerm}
                          onChange={(e) => setRoleSearchTerm(e.target.value)}
                          className="w-full md:w-64 pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-[#2A2F3A] outline-none text-[14px] bg-white dark:bg-[#242B36] text-black dark:text-white"
                        />
                      </div>
                      <button
                        onClick={openNewRoleModal}
                        className="px-4 py-2 bg-[#125821] hover:bg-[#0c4015] text-white text-[14px] font-bold rounded-md flex items-center gap-1 shrink-0"
                      >
                        <span className="text-lg leading-none">+</span> New Role
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto md:overflow-visible bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-[#2A2F3A]">
                    <table className="w-full text-left text-[14px]">
                      <thead className="bg-[#ececec] dark:bg-[#242B36] text-black dark:text-white font-bold">
                        <tr>
                          <th className="py-4 px-4 w-12 text-center border-b border-gray-200 dark:border-[#2A2F3A]">
                            <div className="w-4 h-4 border border-gray-500 bg-white rounded-sm mx-auto"></div>
                          </th>
                          <th className="py-4 px-4 text-[16px] border-b border-gray-200 dark:border-[#2A2F3A]">Title</th>
                          <th className="py-4 px-4 text-[16px] border-b border-gray-200 dark:border-[#2A2F3A]">Slug</th>
                          <th className="py-4 px-4 text-[16px] border-b border-gray-200 dark:border-[#2A2F3A]">Level</th>
                          <th className="py-4 px-4 text-[16px] border-b border-gray-200 dark:border-[#2A2F3A]">Type</th>
                          <th className="py-4 px-4 text-[16px] border-b border-gray-200 dark:border-[#2A2F3A]">Core Function</th>
                          <th className="py-4 px-4 w-32 border-b border-gray-200 dark:border-[#2A2F3A]"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2A2F3A]">
                        {filteredRoles && filteredRoles.length > 0 ? (
                          filteredRoles.map((role, idx) => (
                            <tr key={role.id || idx} className="hover:bg-gray-50 dark:hover:bg-[#242B36] transition-colors bg-white dark:bg-[#161B22]">
                              <td className="py-4 px-4 text-center">
                                <div className="w-4 h-4 border border-gray-500 bg-white rounded-sm mx-auto"></div>
                              </td>
                              <td className="py-4 px-4 text-[16px] text-gray-700 dark:text-gray-300">{role.title}</td>
                              <td className="py-4 px-4 text-[16px] text-gray-700 dark:text-gray-300">{role.slug}</td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-[#8ee093] text-white font-bold text-[12px]">
                                  {role.level}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center justify-center px-3 py-1 text-[12px] font-bold rounded-sm ${(role.type || '').toLowerCase().includes('super') ? 'bg-green-100 text-green-700' :
                                  (role.type || '').toLowerCase().includes('admin') ? 'bg-pink-100 text-pink-700' :
                                    (role.type || '').toLowerCase().includes('staff') ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-700'
                                  }`}>
                                  {role.type || 'N/A'}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-[11px] text-gray-600 dark:text-gray-400 max-w-sm">
                                {role.coreFunction}
                              </td>
                              <td className={`py-4 px-4 relative ${roleActionMenuOpen === role.id ? 'z-30' : ''}`}>
                                <div className="flex justify-end relative">
                                  <button
                                    onClick={() => setRoleActionMenuOpen(roleActionMenuOpen === role.id ? null : role.id)}
                                    className="px-3 py-1.5 bg-[#125821] hover:bg-[#0c4015] text-white text-[13px] font-medium rounded-md flex items-center gap-1 w-full justify-center"
                                  >
                                    ⋮ Action
                                  </button>
                                  {roleActionMenuOpen === role.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setRoleActionMenuOpen(null)} />
                                      <div className={`absolute right-0 w-32 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg shadow-xl z-50 overflow-hidden py-1 ${(idx === filteredRoles.length - 1 || (idx === filteredRoles.length - 2 && filteredRoles.length >= 3)) ? 'bottom-full mb-1' : 'top-full mt-1'
                                        }`}>
                                        <button
                                          onClick={() => { setRoleActionMenuOpen(null); openViewRoleModal(role); }}
                                          className="w-full text-left px-4 py-2 text-[13px] text-[#1a5b28] hover:bg-green-50 flex items-center gap-2 transition-colors"
                                        >
                                          <Eye size={14} /> View
                                        </button>
                                        <button
                                          onClick={() => { setRoleActionMenuOpen(null); openEditRoleModal(role); }}
                                          className="w-full text-left px-4 py-2 text-[13px] text-[#dcb23c] hover:bg-[#fff9e6] flex items-center gap-2 transition-colors"
                                        >
                                          <Edit size={14} /> Edit
                                        </button>
                                        <button
                                          onClick={() => { setRoleActionMenuOpen(null); deleteRole(role.id); }}
                                          className="w-full text-left px-4 py-2 text-[13px] text-red-655 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                        >
                                          <Trash2 size={14} /> Delete
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="py-8 text-center text-gray-500">
                              No roles have been added yet. Click "+ New Role" to create one.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {viewState === "VIEW" && (
              <div className="flex flex-col animate-fade-in w-full">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-black dark:text-white">
                    View Job Department
                  </h1>
                  <div className="flex gap-4">
                    <button
                      onClick={() => { setIsEditMode(true); setViewState("CREATE"); }}
                      className="px-8 py-2 bg-[#dcb23c] hover:bg-[#c9a02a] text-white text-[14px] font-bold rounded-md transition-colors"
                    >
                      {t("edit") || "Edit"}
                    </button>
                    <button
                      onClick={cancelCreate}
                      className="px-8 py-2 bg-gray-400 hover:bg-gray-500 text-white text-[14px] font-bold rounded-md transition-colors capitalize"
                    >
                      {t("back") || "Back"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start mb-6">
                  {/* Left Column: Department Detail */}
                  <div className="w-full lg:w-[65%] flex flex-col gap-4">
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg overflow-hidden shadow-sm flex flex-col">
                      <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A]">
                        <h2 className="text-[16px] font-bold text-black dark:text-white">Department Detail</h2>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                          <div>
                            <div className="font-bold text-black dark:text-white mb-2 text-[14px]">Code</div>
                            <div className="text-[#1a5b28] text-[14px]">{formData.code || "-"}</div>
                          </div>
                          <div>
                            <div className="font-bold text-black dark:text-white mb-2 text-[14px]">Title</div>
                            <div className="text-[#1a5b28] text-[14px]">{formData.title || "-"}</div>
                          </div>
                          <div>
                            <div className="font-bold text-black dark:text-white mb-2 text-[14px]">Status</div>
                            <div className="text-[#1a5b28] text-[14px]">{formData.status}</div>
                          </div>
                          <div>
                            <div className="font-bold text-black dark:text-white mb-2 text-[14px]">Campus Suite</div>
                            <div className="text-[#1a5b28] text-[14px]">{formData.campusSuite || "-"}</div>
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-black dark:text-white mb-2 text-[14px]">Description</div>
                          <div className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
                            {formData.description || "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: User Signature Assigned */}
                  <div className="w-full lg:w-[35%] h-full">
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg overflow-hidden shadow-sm flex flex-col h-[230px]">
                      <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A]">
                        <h2 className="text-[16px] font-bold text-black dark:text-white">User Signature Assigned</h2>
                      </div>
                      <div className="p-6 flex flex-col gap-5">
                        {(() => {
                          const assignedUser = registeredUsers.find(
                            u => `${u.firstName || ''} ${u.lastName || ''}`.trim() === formData.userSignature ||
                              u.username === formData.userSignature ||
                              u.email === formData.userSignature
                          ) || (currentUser?.username === formData.userSignature ? currentUser : null);

                          const displayEmail = assignedUser?.email || (formData.userSignature ? formData.userSignature.toLowerCase().replace(" ", ".") + "@rupp.edu.kh" : "-");
                          const displayPhone = assignedUser?.phone || "+855 12 345 678";

                          return (
                            <>
                              <div className="flex">
                                <span className="font-bold text-[14px] text-black dark:text-white w-16">Name</span>
                                <span className="font-bold text-[14px] text-black dark:text-white mr-2">:</span>
                                <span className="text-[#1a5b28] text-[14px]">{formData.userSignature || "-"}</span>
                              </div>
                              <div className="flex">
                                <span className="font-bold text-[14px] text-black dark:text-white w-16">Email</span>
                                <span className="font-bold text-[14px] text-black dark:text-white mr-2">:</span>
                                <span className="text-[#1a5b28] text-[14px]">{displayEmail}</span>
                              </div>
                              <div className="flex">
                                <span className="font-bold text-[14px] text-black dark:text-white w-16">Phone</span>
                                <span className="font-bold text-[14px] text-black dark:text-white mr-2">:</span>
                                <span className="text-[#1a5b28] text-[14px]">{displayPhone}</span>
                              </div>
                            </>
                          );
                        })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Roles Table */}
              <div className="bg-[#f5f5f5] dark:bg-[#161B22] rounded-lg overflow-hidden md:overflow-visible shadow-sm p-6 mb-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-black dark:text-white">Role in {formData.title || "Department"}</h3>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="relative flex-1 md:flex-initial">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={roleSearchTerm}
                          onChange={(e) => setRoleSearchTerm(e.target.value)}
                          className="w-full md:w-64 pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-[#2A2F3A] outline-none text-[14px] bg-white dark:bg-[#242B36] text-black dark:text-white"
                        />
                      </div>
                      <button
                        onClick={openNewRoleModal}
                        className="px-4 py-2 bg-[#125821] hover:bg-[#0c4015] text-white text-[14px] font-bold rounded-md flex items-center gap-1 shrink-0"
                      >
                        <span className="text-lg leading-none">+</span> New Role
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto md:overflow-visible bg-white dark:bg-[#161B22] rounded-lg border border-gray-200 dark:border-[#2A2F3A]">
                    <table className="w-full text-left text-[14px]">
                      <thead className="bg-[#ececec] dark:bg-[#242B36] text-black dark:text-white font-bold">
                        <tr>
                          <th className="py-4 px-4 w-12 text-center border-b border-gray-200 dark:border-[#2A2F3A]">
                            <div className="w-4 h-4 border border-gray-500 bg-white rounded-sm mx-auto"></div>
                          </th>
                          <th className="py-4 px-4 text-[16px] border-b border-gray-200 dark:border-[#2A2F3A]">Title</th>
                          <th className="py-4 px-4 text-[16px] border-b border-gray-200 dark:border-[#2A2F3A]">Slug</th>
                          <th className="py-4 px-4 text-[16px] border-b border-gray-200 dark:border-[#2A2F3A]">Level</th>
                          <th className="py-4 px-4 text-[16px] border-b border-gray-200 dark:border-[#2A2F3A]">Type</th>
                          <th className="py-4 px-4 text-[16px] border-b border-gray-200 dark:border-[#2A2F3A]">Core Function</th>
                          <th className="py-4 px-4 w-32 border-b border-gray-200 dark:border-[#2A2F3A]"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#2A2F3A]">
                        {filteredRoles && filteredRoles.length > 0 ? (
                          filteredRoles.map((role, idx) => (
                            <tr key={role.id || idx} className="hover:bg-gray-50 dark:hover:bg-[#242B36] transition-colors bg-white dark:bg-[#161B22]">
                              <td className="py-4 px-4 text-center">
                                <div className="w-4 h-4 border border-gray-500 bg-white rounded-sm mx-auto"></div>
                              </td>
                              <td className="py-4 px-4 text-[16px] text-gray-700 dark:text-gray-300">{role.title}</td>
                              <td className="py-4 px-4 text-[16px] text-gray-700 dark:text-gray-300">{role.slug}</td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-[#8ee093] text-white font-bold text-[12px]">
                                  {role.level}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center justify-center px-3 py-1 text-[12px] font-bold rounded-sm ${(role.type || '').toLowerCase().includes('super') ? 'bg-green-100 text-green-700' :
                                  (role.type || '').toLowerCase().includes('admin') ? 'bg-pink-100 text-pink-700' :
                                    (role.type || '').toLowerCase().includes('staff') ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-700'
                                  }`}>
                                  {role.type || 'N/A'}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-[11px] text-gray-600 dark:text-gray-400 max-w-sm">
                                {role.coreFunction}
                              </td>
                              <td className={`py-4 px-4 relative ${roleActionMenuOpen === role.id ? 'z-30' : ''}`}>
                                <div className="flex justify-end relative">
                                  <button
                                    onClick={() => setRoleActionMenuOpen(roleActionMenuOpen === role.id ? null : role.id)}
                                    className="px-3 py-1.5 bg-[#125821] hover:bg-[#0c4015] text-white text-[13px] font-medium rounded-md flex items-center gap-1 w-full justify-center"
                                  >
                                    ⋮ Action
                                  </button>
                                  {roleActionMenuOpen === role.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setRoleActionMenuOpen(null)} />
                                      <div className={`absolute right-0 w-32 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg shadow-xl z-50 overflow-hidden py-1 ${(idx === filteredRoles.length - 1 || (idx === filteredRoles.length - 2 && filteredRoles.length >= 3)) ? 'bottom-full mb-1' : 'top-full mt-1'
                                        }`}>
                                        <button
                                          onClick={() => { setRoleActionMenuOpen(null); openViewRoleModal(role); }}
                                          className="w-full text-left px-4 py-2 text-[13px] text-[#1a5b28] hover:bg-green-50 flex items-center gap-2 transition-colors"
                                        >
                                          <Eye size={14} /> View
                                        </button>
                                        <button
                                          onClick={() => { setRoleActionMenuOpen(null); openEditRoleModal(role); }}
                                          className="w-full text-left px-4 py-2 text-[13px] text-[#dcb23c] hover:bg-[#fff9e6] flex items-center gap-2 transition-colors"
                                        >
                                          <Edit size={14} /> Edit
                                        </button>
                                        <button
                                          onClick={() => { setRoleActionMenuOpen(null); deleteRole(role.id); }}
                                          className="w-full text-left px-4 py-2 text-[13px] text-red-650 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                        >
                                          <Trash2 size={14} /> Delete
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="py-8 text-center text-gray-500">
                              No roles have been added yet. Click "+ New Role" to create one.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Create/Edit Role Modal */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#161B22] w-full max-w-2xl rounded-lg shadow-xl flex flex-col overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-200 dark:border-[#2A2F3A] flex justify-between items-center">
              <h2 className="text-2xl font-bold text-black dark:text-white">
                {editingRoleId ? (viewingRole ? "View Role" : "Edit Role") : "Create New Role"}
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setRoleModalOpen(false)}
                  className="px-6 py-2 bg-[#ff0000] hover:bg-[#cc0000] text-white text-[14px] font-bold rounded-md transition-colors"
                >
                  Cancel
                </button>
                {viewingRole ? (
                  <button
                    onClick={() => setViewingRole(false)}
                    className="px-8 py-2 bg-[#dcb23c] hover:bg-[#c9a135] text-white text-[14px] font-bold rounded-md transition-colors"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={saveRole}
                    className="px-8 py-2 bg-[#0f4d1a] hover:bg-[#0a3512] text-white text-[14px] font-bold rounded-md transition-colors"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[16px] font-bold text-black dark:text-white mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={roleFormData.title}
                    onChange={handleRoleInputChange}
                    disabled={viewingRole}
                    placeholder="Input Title..."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white disabled:opacity-70"
                  />
                </div>
                <div>
                  <label className="block text-[16px] font-bold text-black dark:text-white mb-2">
                    Slug
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={roleFormData.slug}
                    onChange={handleRoleInputChange}
                    disabled={viewingRole}
                    placeholder="Auto Slug..."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white disabled:opacity-70"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[16px] font-bold text-black dark:text-white mb-2">
                    Level
                  </label>
                  <input
                    type="text"
                    name="level"
                    value={roleFormData.level}
                    onChange={handleRoleInputChange}
                    disabled={viewingRole}
                    placeholder="Input Level No."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white disabled:opacity-70"
                  />
                </div>
                <div>
                  <label className="block text-[16px] font-bold text-black dark:text-white mb-2">
                    Type
                  </label>
                  <select
                    name="type"
                    value={roleFormData.type}
                    onChange={handleRoleInputChange}
                    disabled={viewingRole}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white disabled:opacity-70 cursor-pointer"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[16px] font-bold text-black dark:text-white mb-2">
                  Core Function
                </label>
                <textarea
                  name="coreFunction"
                  value={roleFormData.coreFunction}
                  onChange={handleRoleInputChange}
                  disabled={viewingRole}
                  placeholder="Write Core Function..."
                  rows="6"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] text-black dark:text-white resize-none disabled:opacity-70"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalConfig.isOpen}
        onClose={() => setDeleteModalConfig({ isOpen: false, id: null, isBulk: false })}
        onConfirm={confirmDelete}
        itemCount={deleteModalConfig.isBulk ? selectedRows.length : 1}
        itemName={""}
        itemType="department(s)"
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: "" })}
        message={alertModal.message}
      />
    </div>
  );
}
