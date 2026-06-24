"use client";
import { useState, useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import { hasPermission } from "../../../utils/permissions";
import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";
import AlertModal from "../../../components/AlertModal";
import { Search, Edit, Trash2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import SearchableSelect from "../../../components/SearchableSelect";
export default function DocumentTypePage() {
  const router = useRouter();
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { t } = useLanguage();
  // Core State
  const [viewState, setViewState] = useState("LIST");
  const [documentTypes, setDocumentTypes] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState(null);

  // Delete Modal State
  const [deleteModalConfig, setDeleteModalConfig] = useState({ isOpen: false, id: null, title: "" });
  // Alert Modal State
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
  const showAlert = (message) => setAlertModal({ isOpen: true, message });
  // Form State
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    slug: "",
    status: "Active"
  });
  const [steps, setSteps] = useState([
    { department: "", userSign: "" }
  ]);
  // State for dropdowns (loaded from localStorage)
  const [availableDepartments, setAvailableDepartments] = useState(["IT Center", "Office of Planning and Finance", "HR Department"]);
  const [availableUsers, setAvailableUsers] = useState(["Var Sovanndara", "Sok Meng", "Linda Chan"]);
  const [departmentUsersMap, setDepartmentUsersMap] = useState({});
  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/");
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);

    // Load stored document types if any, else empty array
    // Explicitly requested: NO initial mock data.
    const stored = localStorage.getItem("doc_tracking_document_types_v2");
    if (stored) {
      let parsed = JSON.parse(stored);
      let updated = false;
      const isGlobalSuperAdmin = user?.email === "admin@rupp.edu.kh";
      const userDept = (user?.department || user?.mainRole || "IT Center").toLowerCase().trim();
      parsed = parsed.map(d => {
        if (!d.creatorDept) {
          updated = true;
          return { ...d, creatorDept: "IT Center" };
        }
        return d;
      });
      if (updated) {
        localStorage.setItem("doc_tracking_document_types_v2", JSON.stringify(parsed));
      }
      if (!isGlobalSuperAdmin) {
        parsed = parsed.filter(d => (d.creatorDept || "").toLowerCase().trim() === userDept);
      }
      setDocumentTypes(parsed);
      if (parsed.length > 0) {
        setSelectedDocType(parsed[0]);
      }
    }
    // Load actual departments and users for dropdowns
    const storedDepts = localStorage.getItem("doc_tracking_departments");
    if (storedDepts) {
      try {
        const parsedDepts = JSON.parse(storedDepts);
        if (Array.isArray(parsedDepts) && parsedDepts.length > 0) {
          const deptNames = [...new Set(parsedDepts.map(d => d.title).filter(Boolean))];
          if (deptNames.length > 0) setAvailableDepartments(deptNames);

          const users = [...new Set(parsedDepts.map(d => d.userSignature).filter(Boolean))];
          if (users.length > 0) setAvailableUsers(users);
          const mapping = {};
          parsedDepts.forEach(d => {
            if (d.title && d.userSignature) {
              mapping[d.title] = d.userSignature;
            }
          });
          setDepartmentUsersMap(mapping);
        }
      } catch (e) {
        console.error("Error loading departments for dropdowns", e);
      }
    }

    setIsMounted(true);
  }, []);
  if (!isMounted) return null;
  // Handlers for Form
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Auto slug logic if title changes and slug hasn't been manually heavily edited
    if (name === "title") {
      const autoSlug = value.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\w-]+/g, '');
      setFormData(prev => ({ ...prev, [name]: value, slug: autoSlug }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  const handleStepChange = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;

    // Auto-fill userSign when department changes
    if (field === "department" && departmentUsersMap[value]) {
      newSteps[index]["userSign"] = departmentUsersMap[value];
    }

    setSteps(newSteps);
  };
  const addStep = () => {
    setSteps([...steps, { department: "", userSign: "" }]);
  };
  const removeStep = (index) => {
    const newSteps = steps.filter((_, idx) => idx !== index);
    setSteps(newSteps);
  };
  const handleEditDocType = (e, doc) => {
    e.stopPropagation();
    setFormData({
      code: doc.code,
      title: doc.title,
      slug: doc.slug,
      status: doc.status || "Active"
    });
    setSteps(doc.steps && doc.steps.length > 0 ? [...doc.steps] : [{ department: "", userSign: "" }]);
    setSelectedDocType(doc);
    setViewState("EDIT");
  };
  const handleDeleteDocType = (e, doc) => {
    e.stopPropagation();
    setDeleteModalConfig({ isOpen: true, id: doc.id, title: doc.title || "Untitled" });
  };
  const confirmDelete = () => {
    const id = deleteModalConfig.id;
    if (id) {
      const stored = localStorage.getItem("doc_tracking_document_types_v2");
      const allDocs = stored ? JSON.parse(stored) : [];
      const newAllDocs = allDocs.filter(d => d.id !== id);
      localStorage.setItem("doc_tracking_document_types_v2", JSON.stringify(newAllDocs));
      const updatedList = documentTypes.filter(d => d.id !== id);
      setDocumentTypes(updatedList);
      if (selectedDocType?.id === id) {
        setSelectedDocType(updatedList.length > 0 ? updatedList[0] : null);
      }
    }
    setDeleteModalConfig({ isOpen: false, id: null, title: "" });
  };
  const saveDocumentType = () => {
    if (!formData.code || !formData.title || !formData.slug) {
      showAlert(t("alert_fill_code_title_slug"));
      return;
    }
    // Validate steps
    const hasEmptySteps = steps.some(s => !s.department || !s.userSign);
    if (hasEmptySteps) {
      showAlert(t("alert_select_dept_user"));
      return;
    }
    const userDept = currentUser?.department || currentUser?.mainRole || "Global";
    const newDocType = {
      id: viewState === "EDIT" && selectedDocType ? selectedDocType.id : Date.now().toString(),
      ...formData,
      steps: [...steps],
      totalSteps: steps.length,
      creatorDept: viewState === "EDIT" && selectedDocType ? (selectedDocType.creatorDept || userDept) : userDept
    };
    let updatedList;
    if (viewState === "EDIT" && selectedDocType) {
      updatedList = documentTypes.map(d => d.id === selectedDocType.id ? newDocType : d);
    } else {
      updatedList = [...documentTypes, newDocType];
    }

    setDocumentTypes(updatedList);

    const stored = localStorage.getItem("doc_tracking_document_types_v2");
    let allDocs = stored ? JSON.parse(stored) : [];
    if (viewState === "EDIT" && selectedDocType) {
      allDocs = allDocs.map(d => d.id === selectedDocType.id ? newDocType : d);
    } else {
      allDocs.push(newDocType);
    }
    localStorage.setItem("doc_tracking_document_types_v2", JSON.stringify(allDocs));

    // Reset form and return to list
    setFormData({ code: "", title: "", slug: "", status: "Active" });
    setSteps([{ department: "", userSign: "" }]);
    setSelectedDocType(newDocType);
    setViewState("LIST");
  };
  const cancelCreate = () => {
    setFormData({ code: "", title: "", slug: "", status: "Active" });
    setSteps([{ department: "", userSign: "" }]);
    setViewState("LIST");
  };
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
                  <h1 className="text-3xl font-bold text-black dark:text-white">{t("type_document")}</h1>
                  {hasPermission(currentUser, "Type Document", "Create") && (
                    <button
                      onClick={() => setViewState("CREATE")}
                      className="px-6 py-2 bg-[#125821] hover:bg-[#0c4015] dark:bg-[#1a5b28] dark:hover:bg-[#12421d] text-white text-[14px] font-bold rounded-md transition-colors"
                    >
                      {t("add_new")}
                    </button>
                  )}
                </div>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left Column: Active Template */}
                  <div className="w-full lg:w-[60%] flex flex-col">
                    <div className="bg-[#fbfbfb] dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg overflow-hidden flex flex-col min-h-[600px]">
                      <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A] flex justify-between items-center bg-white dark:bg-[#161B22]">
                        <h2 className="text-[16px] font-bold text-black dark:text-white">{t("active_template")}</h2>
                        <div className="relative">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#a1a1aa]" />
                          <input
                            type="text"
                            placeholder={t("search")}
                            className="w-48 pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-[#242B36] border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-[13px] text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-[#1a5b28] dark:focus:border-[#2da94a] transition-colors"
                          />
                        </div>
                      </div>
                      <div className="p-6">
                        {documentTypes.length === 0 ? (
                          <div className="text-center text-gray-400 dark:text-[#a1a1aa] py-12 italic text-[14px]">
                            {t("data_empty_document_type")}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {documentTypes.map((doc) => {
                              const isSelected = selectedDocType?.id === doc.id;
                              return (
                                <div
                                  key={doc.id}
                                  onClick={() => setSelectedDocType(doc)}
                                  className={`relative border-[2px] rounded-sm p-5 cursor-pointer transition-colors ${isSelected ? "border-[#1a5b28] dark:border-[#2da94a] bg-green-50 dark:bg-[#1a5b28]/20 shadow-sm" : "bg-white dark:bg-[#161B22] border-gray-200 dark:border-[#2A2F3A] hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
                                    }`}
                                >
                                  <div className="absolute bottom-4 right-4 flex gap-1">
                                    {hasPermission(currentUser, "Type Document", "Edit") && (
                                      <button
                                        onClick={(e) => handleEditDocType(e, doc)}
                                        className="p-1.5 text-gray-400 hover:text-[#dcb23c] dark:hover:text-[#dcb23c] transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-[#242B36]"
                                        title={t("edit")}
                                      >
                                        <Edit size={16} />
                                      </button>
                                    )}
                                    {hasPermission(currentUser, "Type Document", "Delete") && (
                                      <button
                                        onClick={(e) => handleDeleteDocType(e, doc)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-500/10"
                                        title={t("delete")}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </div>
                                  <h3 className="font-bold text-black dark:text-white text-[18px] mb-4 text-center">{doc.title || "Untitled"}</h3>
                                  <div className="flex flex-col gap-2.5">
                                    <div className="text-[15px]">
                                      <span className="font-bold text-black dark:text-white">{t("code")} :</span> <span className="text-[#1a5b28] dark:text-[#2da94a]">{doc.code}</span>
                                    </div>
                                    <div className="text-[15px]">
                                      <span className="font-bold text-black dark:text-white">{t("total_steps")} :</span> <span className="text-[#1a5b28] dark:text-[#2da94a]">{doc.totalSteps}</span>
                                    </div>
                                    <div className="text-[15px]">
                                      <span className="font-bold text-black dark:text-white">{t("status")} :</span> <span className="text-[#1a5b28] dark:text-[#2da94a]">{doc.status === "Active" ? t("active") : t("inactive")}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Right Column: Flow Tracking */}
                  <div className="w-full lg:w-[40%] flex flex-col">
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg overflow-hidden shadow-sm flex flex-col min-h-[600px]">
                      <div className="p-4 border-b border-gray-200 dark:border-[#2A2F3A]">
                        <h2 className="text-[16px] font-bold text-black dark:text-white">{t("flow_tracking")}</h2>
                      </div>

                      <div className="p-8 flex-1 bg-white dark:bg-[#161B22]">
                        {!selectedDocType ? (
                          <div className="text-center text-gray-400 dark:text-[#a1a1aa] py-12 italic text-[14px]">
                            {t("select_active_template")}
                          </div>
                        ) : (
                          <div className="relative ml-3 space-y-8 pb-4">
                            {selectedDocType.steps.map((step, idx) => {
                              const isFinal = idx === selectedDocType.steps.length - 1;
                              return (
                                <div key={idx} className="relative pl-8">
                                  {/* Green Dot Indicator */}
                                  <div className="absolute w-[18px] h-[18px] rounded-full bg-[#1a5b28] dark:bg-[#2da94a] -left-[9px] top-[35px] -translate-y-1/2 z-10"></div>
                                  {!isFinal && (
                                    <div className="absolute left-[-1px] top-[35px] w-[2px] h-[calc(100%+2rem)] bg-gray-200 dark:bg-[#242B36] z-0"></div>
                                  )}

                                  {/* Step Info Box */}
                                  <div className="bg-gray-100/50 dark:bg-[#242B36] border border-[#1a5b28] dark:border-[#2da94a] rounded-xl px-4 py-3 flex justify-between items-center relative w-full">
                                    <div className="flex flex-col gap-1.5">
                                      <div className="text-[13px] font-bold text-black dark:text-white">
                                        {t("department")} : <span className="text-[#1a5b28] dark:text-[#2da94a] font-normal">{step.department}</span>
                                      </div>
                                      <div className="text-[13px] font-bold text-black dark:text-white">
                                        {t("signature_by")} : <span className="text-[#1a5b28] dark:text-[#2da94a] font-normal">{step.userSign}</span>
                                      </div>
                                    </div>
                                    {isFinal && (
                                      <div className="text-red-500 dark:text-red-400 text-[12px] font-medium pr-2">
                                        {t("final_step")}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {(viewState === "CREATE" || viewState === "EDIT") && (
              <div className="flex flex-col animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-black dark:text-white">{viewState === "EDIT" ? t("edit_document_type") : t("create_document_type")}</h1>
                  <button
                    onClick={cancelCreate}
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-[#4E4F50] dark:hover:bg-[#242B36] text-white text-[14px] font-medium rounded-md transition-colors"
                  >
                    {t("back")}
                  </button>
                </div>
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Left Form Panel */}
                  <div className="w-full lg:w-1/3 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm flex flex-col gap-6">
                    <div>
                      <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                        {t("code")} <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleInputChange}
                        placeholder={`${t("code")}....`}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] dark:focus:border-[#2da94a] outline-none text-[15px] bg-gray-50/50 dark:bg-[#242B36] text-black dark:text-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                        {t("title")} <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder={`${t("title")}....`}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] dark:focus:border-[#2da94a] outline-none text-[15px] bg-gray-50/50 dark:bg-[#242B36] text-black dark:text-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                        {t("slug")} <span className="text-red-500 dark:text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="slug"
                        value={formData.slug}
                        onChange={handleInputChange}
                        placeholder={`${t("slug")}....`}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] dark:focus:border-[#2da94a] outline-none text-[15px] bg-gray-50/50 dark:bg-[#242B36] text-black dark:text-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-bold text-black dark:text-white mb-3 mt-2">
                        {t("status")}
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
                          <span className="text-[15px] text-[#1a5b28] dark:text-[#2da94a] font-medium">{t("active")}</span>
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
                          <span className="text-[15px] text-[#1a5b28] dark:text-[#2da94a] font-medium">{t("inactive")}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  {/* Right Flow Builder Panel */}
                  <div className="w-full lg:w-2/3 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-8 shadow-sm flex flex-col h-fit">
                    <div className="relative ml-3 space-y-6 pb-4">
                      {steps.map((step, idx) => (
                        <div key={idx} className="relative pl-10 flex items-center gap-4 w-full max-w-[800px]">
                          {/* Step Number Indicator */}
                          <div className="absolute w-8 h-8 rounded-full bg-green-55 dark:bg-[#123015] border-2 border-[#1a5b28] dark:border-[#2da94a] -left-[16px] top-1/2 -translate-y-1/2 z-10 flex items-center justify-center text-xs font-black text-[#1a5b28] dark:text-[#2da94a] shadow-2xs">
                            {idx + 1}
                          </div>
                          {idx !== steps.length - 1 && (
                            <div className="absolute left-[-1px] top-1/2 w-[2px] h-[calc(100%+1.5rem)] bg-gray-200 dark:bg-[#2A2F3A] z-0"></div>
                          )}

                          {/* Step Card Container */}
                          <div className="flex-1 bg-gray-50/50 dark:bg-[#242B36]/30 border border-gray-150 dark:border-[#2A2F3A] rounded-xl p-4 flex items-center gap-4 hover:border-[#1a5b28]/30 dark:hover:border-[#2da94a]/30 transition-colors shadow-2xs">
                            <div className="flex-1">
                              <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5 pl-0.5">Department</label>
                              <div className="relative">
                                <SearchableSelect
                                  options={availableDepartments}
                                  value={step.department}
                                  onChange={(e) => handleStepChange(idx, "department", e.target.value)}
                                  placeholder="Search department..."
                                  selectPlaceholder={t("select_department")}
                                />
                              </div>
                            </div>

                            <div className="text-gray-400 dark:text-[#a1a1aa] font-bold text-lg pt-5 flex-shrink-0">&rarr;</div>

                            <div className="flex-1">
                              <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5 pl-0.5">Signature User</label>
                              <div className="relative">
                                <SearchableSelect
                                  options={availableUsers}
                                  value={step.userSign}
                                  onChange={(e) => handleStepChange(idx, "userSign", e.target.value)}
                                  disabled={true}
                                  placeholder="Search user..."
                                  selectPlaceholder={t("select_user_sign")}
                                  getDisplayValue={(val) => {
                                    if (!val) return "Unknown";
                                    return val.replace(/[\u1780-\u17FF\u19E0-\u19FF\u200B]/g, '').replace(/\s+/g, ' ').trim() || val;
                                  }}
                                />
                              </div>
                            </div>

                            {steps.length > 1 && (
                              <div className="pt-5 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => removeStep(idx)}
                                  className="p-2.5 rounded-lg border border-red-200 dark:border-red-900/30 text-red-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 transition-all duration-200 cursor-pointer flex items-center justify-center"
                                  title="Delete Step"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pl-10 mt-6 flex w-full max-w-[800px] justify-center">
                      <button
                        type="button"
                        onClick={addStep}
                        className="w-[200px] py-2.5 border-2 border-dashed border-[#1a5b28]/45 dark:border-[#2da94a]/30 hover:border-[#1a5b28] dark:hover:border-[#2da94a] rounded-xl text-[13.5px] font-bold text-[#1a5b28] dark:text-[#34d399] bg-[#1a5b28]/5 dark:bg-[#2da94a]/5 hover:bg-[#1a5b28]/10 dark:hover:bg-[#2da94a]/10 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <span className="text-base font-bold">+</span> {t("add_more")}
                      </button>
                    </div>
                  </div>
                </div>
                {/* Bottom Action Buttons */}
                <div className="flex gap-4 mt-8 mb-8 pl-1">
                  <button
                    onClick={saveDocumentType}
                    className="px-10 py-2.5 bg-[#125821] hover:bg-[#0c4015] dark:bg-[#1a5b28] dark:hover:bg-[#12421d] text-white text-[15px] font-bold rounded-md transition-colors"
                  >
                    {t("save")}
                  </button>
                  <button
                    onClick={cancelCreate}
                    className="px-8 py-2.5 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white text-[15px] font-bold rounded-md transition-colors"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
      <DeleteConfirmationModal
        isOpen={deleteModalConfig.isOpen}
        onClose={() => setDeleteModalConfig({ isOpen: false, id: null, title: "" })}
        onConfirm={confirmDelete}
        itemName={deleteModalConfig.title}
        itemCount={1}
        itemType="document type"
      />
      {/* Custom Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: "" })}
        message={alertModal.message}
      />
    </div>
  );
}
