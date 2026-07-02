"use client";
import { useState, useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import { hasPermission } from "../../../utils/permissions";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import BulkActionBar from "../../../components/BulkActionBar";
import {
  ShieldAlert,
  Search,
  Filter,
  MoreVertical,
  UploadCloud,
  Check,
  Trash2,
  Phone,
  Users,
  Eye,
  EyeOff,
  Edit,
  Plus,
  CheckCircle,
  XCircle,
  Upload,
  Camera
} from "lucide-react";
import AlertModal from "../../../components/AlertModal";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import Pagination from "../../../components/Pagination";
import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";
import SearchableSelect from "../../../components/SearchableSelect";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const fetchWithAuth = (url, options = {}) => {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem("auth_token") : null;
  return fetch(url, {
    ...options,
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'Accept': 'application/json',
      ...options.headers,
    }
  });
};

export default function AccountPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Queries
  const { data: departmentsList = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await fetchWithAuth('http://document_tracking_system.test/api/job-departments');
      return res.json();
    }
  });

  const { data: usersList = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetchWithAuth('http://document_tracking_system.test/api/accounts');
      return res.json();
    }
  });

  const saveMutation = useMutation({
    mutationFn: async ({ isEdit, id, payload }) => {
      const url = isEdit 
        ? `http://document_tracking_system.test/api/accounts/${id}`
        : 'http://document_tracking_system.test/api/accounts';
      
      const res = await fetchWithAuth(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `Failed to ${isEdit ? 'update' : 'create'} user.`);
      }
      return res.json();
    },
    onSuccess: async (_, { isEdit, id, payload }) => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      
      const sessionUserStr = sessionStorage.getItem("currentUser");
      if (isEdit && sessionUserStr) {
        const sessionUser = JSON.parse(sessionUserStr);
        if (sessionUser.id === id || sessionUser.email === payload.email.trim()) {
          const res = await fetchWithAuth('http://document_tracking_system.test/api/me');
          if (res.ok) {
            const data = await res.json();
            const u = data.user || data;
            const updatedSession = {
              username: u.fullname_en || u.username || u.fullname_kh,
              fullname_en: u.fullname_en,
              fullname_kh: u.fullname_kh,
              email: u.email,
              role: u.role || "Staff",
              type: u.type || "Staff",
              department: u.department?.name || "Global",
              permissions: u.menu_permissions || {},
              profilePhoto: u.profile_photo || null,
              signaturePhoto: u.signature_photo || null
            };
            sessionStorage.setItem("currentUser", JSON.stringify(updatedSession));
          }
        }
      }
      
      setViewState('LIST');
      resetForm();
    },
    onError: (error) => {
      console.error(error);
      showAlert(error.message || "An error occurred while saving.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ isBulk, selectedIds, singleId }) => {
      if (isBulk) {
        for (const id of selectedIds) {
          await fetchWithAuth(`http://document_tracking_system.test/api/accounts/${id}`, { method: 'DELETE' });
        }
      } else if (singleId) {
        await fetchWithAuth(`http://document_tracking_system.test/api/accounts/${singleId}`, { method: 'DELETE' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setSelectedRows([]);
      setDeleteModalConfig({ isOpen: false, isBulk: false, userId: null });
    },
    onError: (error) => {
      console.error(error);
      showAlert("Error deleting user.");
    }
  });

  // Derived state from queries
  const mainRoles = departmentsList.length > 0 ? [...new Set(departmentsList.map(d => d.title))] : ["IT Center", "Office of Planning and Finance"];
  
  const dynamicRoles = [];
  if (departmentsList.length > 0) {
    departmentsList.forEach(dept => {
      if (Array.isArray(dept.roles)) {
        dept.roles.forEach(role => {
          dynamicRoles.push({
            title: role.title,
            type: role.type || "Staff",
            department: dept.title
          });
        });
      }
    });
    if (dynamicRoles.length === 0) {
      mainRoles.forEach(dept => {
        dynamicRoles.push(
          { title: "Super Admin", type: "Super Admin", department: dept },
          { title: "Admin", type: "Admin", department: dept },
          { title: "Staff", type: "Staff", department: dept }
        );
      });
    }
  }

  // View state: 'LIST', 'CREATE', 'VIEW'
  const [viewState, setViewState] = useState('LIST');
  const [selectedUserView, setSelectedUserView] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  // Edit State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  // Form Fields
  const [fullname_kh, setFullname_kh] = useState("");
  const [fullname_en, setFullname_en] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedMainRole, setSelectedMainRole] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [signaturePhoto, setSignaturePhoto] = useState(null);
  const [status, setStatus] = useState("Active");
  
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Table specific states
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Alert Modal State
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
  const showAlert = (message) => setAlertModal({ isOpen: true, message });
  const [deleteModalConfig, setDeleteModalConfig] = useState({
    isOpen: false,
    isBulk: false,
    userId: null,
  });

  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/");
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);

    if (user.role && (user.role.toLowerCase().includes("super admin") || user.role.toLowerCase() === "admin")) {
      const userDept = user.department || user.mainRole || "Default";
      setSelectedMainRole(userDept);
    } else {
      setSelectedMainRole("IT Center");
    }
    setIsMounted(true);
  }, []);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);
  const getAvailableRoles = (mainRole, type, currentRole) => {
    let allowedRoles = dynamicRoles.filter(r => {
      const rDept = (r.department || "").toLowerCase().trim();
      const rType = (r.type || "").toLowerCase().trim();
      const targetDept = (mainRole || "").toLowerCase().trim();
      const targetType = (type || "").toLowerCase().trim();
      return rDept === targetDept && rType === targetType;
    });
    let roleNames = allowedRoles.map(r => r.title);
    if (currentRole && !roleNames.includes(currentRole)) {
      roleNames = [currentRole, ...roleNames];
    }
    return roleNames;
  };
  
  const canViewAny = hasPermission(currentUser, "Account", "View Any");
  useEffect(() => {
    if (isMounted && !canViewAny && viewState === 'LIST' && usersList.length > 0) {
      const me = usersList.find(u => u.email === currentUser?.email) || {
        ...currentUser,
        fullname_en: currentUser?.fullname_en || currentUser?.username || '',
        fullname_kh: currentUser?.fullname_kh || currentUser?.username || ''
      };
      setSelectedUserView(me);
      setViewState('VIEW');
    }
  }, [isMounted, canViewAny, viewState, usersList, currentUser]);
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#242B36] flex items-center justify-center select-none">
        <div className="text-gray-400 dark:text-[#a1a1aa] font-semibold animate-pulse text-base">{t("checking_credentials")}</div>
      </div>
    );
  }
  const isGlobalSuperAdmin = currentUser?.email === "admin@rupp.edu.kh";
  const adminCheckStr = (currentUser?.type || currentUser?.role || "").toLowerCase();
  const isDepartmentAdmin = adminCheckStr.includes("super admin") || adminCheckStr === "admin";
  const hasAccess = hasPermission(currentUser, "Account", "View");
  const resetForm = () => {
    setFullname_kh("");
    setFullname_en("");
    setPhone("");
    setEmail("");
    setPassword("");
    setProfilePhoto(null);
    setSignaturePhoto(null);
    setStatus("Active");
    setIsEditMode(false);
    setEditingUserId(null);

    let defaultDept = "";
    if (!isGlobalSuperAdmin) {
      defaultDept = currentUser.department || currentUser.mainRole || "";
    } else if (mainRoles.length > 0) {
      defaultDept = mainRoles[0];
    }

    setSelectedMainRole(defaultDept);
    setSelectedType("Super Admin");
    const defaultRoles = getAvailableRoles(defaultDept, "Super Admin", "");
    setSelectedRole(defaultRoles.length > 0 ? defaultRoles[0] : "Super Admin");
  };
  const handleMainRoleChange = (e) => {
    const newMainRole = e.target.value;
    setSelectedMainRole(newMainRole);
    const rolesForType = getAvailableRoles(newMainRole, selectedType, "");
    if (rolesForType.length > 0) {
      setSelectedRole(rolesForType[0]);
    } else {
      setSelectedRole("");
    }
  };
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setSelectedType(newType);
    const rolesForType = getAvailableRoles(selectedMainRole, newType, "");
    if (rolesForType.length > 0) {
      setSelectedRole(rolesForType[0]);
    } else {
      setSelectedRole("");
    }
  };
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  const autoCropImage = (dataUrl, callback) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      let isTransparent = true;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          const r = data[(y * canvas.width + x) * 4];
          const g = data[(y * canvas.width + x) * 4 + 1];
          const b = data[(y * canvas.width + x) * 4 + 2];
          
          if (alpha > 10 && (r < 250 || g < 250 || b < 250)) {
            isTransparent = false;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (isTransparent) {
        callback(dataUrl);
        return;
      }

      const padding = 10;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(canvas.width, maxX + padding);
      maxY = Math.min(canvas.height, maxY + padding);

      const croppedWidth = maxX - minX;
      const croppedHeight = maxY - minY;

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = croppedWidth;
      croppedCanvas.height = croppedHeight;
      const croppedCtx = croppedCanvas.getContext('2d');
      
      croppedCtx.drawImage(canvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
      callback(croppedCanvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        autoCropImage(reader.result, (croppedDataUrl) => {
          setSignaturePhoto(croppedDataUrl);
        });
      };
      reader.readAsDataURL(file);
    }
  };
  const handleEditClick = async (user) => {
    try {
      const res = await fetchWithAuth(`http://document_tracking_system.test/api/accounts/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      const fullUser = await res.json();
      
      setIsEditMode(true);
      setEditingUserId(fullUser.id);
      setFullname_kh(fullUser.fullname_kh || "");
      setFullname_en(fullUser.fullname_en || "");
      setEmail(fullUser.email || "");
      setPhone(fullUser.phone || "");
      setPassword(""); // Password typically not returned
      setSelectedMainRole(fullUser.mainRole || fullUser.department || "");
      setSelectedRole(fullUser.role || "");
      setSelectedType(fullUser.type || "");
      setProfilePhoto(fullUser.profilePhoto || null);
      setSignaturePhoto(fullUser.signaturePhoto || null);
      setStatus(fullUser.status || "Active");
      setViewState('CREATE');
    } catch (e) {
      console.error(e);
      showAlert("Error fetching user details.");
    }
  };
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!fullname_kh.trim() || !fullname_en.trim() || !phone.trim() || !email.trim() || (!password && !isEditMode)) {
      showAlert("Please fill all required fields.");
      return;
    }
    if (!selectedMainRole || !selectedRole) {
      showAlert("Please configure and select a valid Department and Role.");
      return;
    }

    const payload = {
      fullname_kh: fullname_kh.trim(),
      fullname_en: fullname_en.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password: password,
      department: selectedMainRole,
      role: selectedRole,
      type: selectedType,
      profilePhoto: profilePhoto,
      signaturePhoto: signaturePhoto,
      status: status
    };

    saveMutation.mutate({ isEdit: isEditMode, id: editingUserId, payload });
  };
  const handleDeleteUser = (userId) => {
    setDeleteModalConfig({
      isOpen: true,
      isBulk: false,
      userId: userId
    });
  };
  const confirmDelete = async () => {
    deleteMutation.mutate({ 
      isBulk: deleteModalConfig.isBulk, 
      selectedIds: selectedRows, 
      singleId: deleteModalConfig.userId 
    });
  };
  const handleSelectAll = () => {
    setSelectedRows(paginatedUsers.map(u => u.id));
  };
  const handleConnectTelegram = async () => {
    try {
      const res = await fetchWithAuth('http://document_tracking_system.test/api/telegram/generate-token', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        const botUsername = data.bot_username || "MyDocTrackingBot";
        window.open(`https://t.me/${botUsername}?start=${data.token}`, '_blank');
      } else {
        showAlert("Failed to generate Telegram token.");
      }
    } catch (e) {
      console.error(e);
      showAlert("Error connecting to Telegram.");
    }
  };
  const handleDeselectAll = () => {
    setSelectedRows([]);
  };
  const handleDeleteSelected = () => {
    if (selectedRows.length > 0) {
      setDeleteModalConfig({
        isOpen: true,
        isBulk: true,
        userId: null
      });
    }
  };
  const toggleRowSelection = (id) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };
  const getInitials = (first, last) => {
    const f = first ? first.charAt(0).toUpperCase() : "";
    const l = last ? last.charAt(0).toUpperCase() : "";
    return `${f}${l}` || "?";
  };
  const filteredUsers = usersList.filter(user => {
    if (!isGlobalSuperAdmin) {
      // If the user does not have View Any permission, they can only see their own account
      if (!canViewAny && user.email !== currentUser?.email) {
        return false;
      }
      
      const allowedDept = (currentUser?.department || currentUser?.mainRole || "").toLowerCase().trim();
      const userDept = (user.mainRole || user.department || "").toLowerCase().trim();
      if (allowedDept && userDept !== allowedDept) return false;
    }
    const searchLower = searchTerm.toLowerCase();
    return (
      (user.fullname_en || "").toLowerCase().includes(searchLower) ||
      (user.fullname_kh || "").toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.mainRole || user.department || "").toLowerCase().includes(searchLower) ||
      (user.role || "").toLowerCase().includes(searchLower)
    );
  });
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  return (
    <div className="flex min-h-screen bg-[#fafafb] dark:bg-[#0F1117] text-black dark:text-white font-sans">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} currentUser={currentUser} />
        <div className="p-6 md:p-8 flex-1 w-full mx-auto flex flex-col">
          {!hasAccess ? (
            <div className="bg-white dark:bg-[#161B22] border border-gray-100 dark:border-[#2A2F3A] rounded-3xl p-10 flex-1 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-5">
                <ShieldAlert size={36} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">{t("access_denied")}</h3>
            </div>
          ) : (
            <>
              {viewState === 'LIST' && (
                <div className="flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-black dark:text-white">{t("account")}</h1>
                    {hasPermission(currentUser, "Account", "Create") && (
                      <button
                        onClick={() => { resetForm(); setViewState('CREATE'); }}
                        className="px-6 py-2 bg-[#1a5b28] hover:bg-[#13461d] text-white text-[14px] font-medium rounded-md transition-colors"
                      >
                        {t("new_user") || "New User"}
                      </button>
                    )}
                  </div>
                  <div className="bg-white dark:bg-[#161B22] rounded-xl shadow-sm border border-gray-100 dark:border-[#2A2F3A] flex flex-col overflow-hidden md:overflow-visible">
                    <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-100 dark:border-[#2A2F3A] bg-white dark:bg-[#161B22]">
                      <div className="w-full md:w-auto">
                        <BulkActionBar
                          selectedCount={selectedRows.length}
                          totalCount={paginatedUsers.length}
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
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-200 dark:border-[#2A2F3A] rounded-lg text-sm outline-none focus:border-gray-400 dark:focus:border-gray-500 w-64 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                          />
                        </div>
                        <button className="p-2 text-gray-500 dark:text-[#a1a1aa] hover:text-black dark:text-white">
                          <Filter size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto md:overflow-visible">
                      <table className="w-full text-left text-[14px]">
                        <thead className="bg-gray-50 dark:bg-[#242B36] text-gray-700 dark:text-white font-semibold">
                          <tr className="border-b border-gray-200 dark:border-[#2A2F3A]">
                            <th className="py-3 px-4 w-12 text-center cursor-pointer" onClick={() => selectedRows.length === paginatedUsers.length && paginatedUsers.length > 0 ? handleDeselectAll() : handleSelectAll()}>
                              <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors mx-auto ${selectedRows.length === paginatedUsers.length && paginatedUsers.length > 0 ? 'bg-[#1a5b28] border-[#1a5b28]' : 'bg-white dark:bg-[#161B22] border-gray-400'}`}>
                                {selectedRows.length === paginatedUsers.length && paginatedUsers.length > 0 && <span className="text-white text-[10px] font-bold">✓</span>}
                              </div>
                            </th>
                            <th className="py-3 px-4">Profile Picture</th>
                            <th className="py-3 px-4">Full Name</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Department</th>
                            <th className="py-3 px-4">Role</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-4 w-24"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#2A2F3A] bg-white dark:bg-[#161B22] text-gray-700 dark:text-white">
                          {paginatedUsers.map((user, idx) => {
                            const isSelected = selectedRows.includes(user.id);
                            return (
                              <tr key={user.id} className={`hover:bg-gray-50/50 dark:hover:bg-[#242B36] transition-colors ${isSelected ? 'bg-green-50/30' : ''}`}>
                                <td className={`py-3 px-4 text-center cursor-pointer ${isSelected ? 'border-l-4 border-l-[#1a5b28]' : 'border-l-4 border-l-transparent'}`} onClick={() => toggleRowSelection(user.id)}>
                                  <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors mx-auto ${isSelected ? 'bg-[#1a5b28] border-[#1a5b28]' : 'bg-white dark:bg-[#161B22] border-gray-400'}`}>
                                    {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  {user.profilePhoto ? (
                                    <img src={user.profilePhoto} alt="Profile" className="w-10 h-10 rounded-full object-cover object-top border border-gray-200 dark:border-[#2A2F3A]" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 dark:text-[#a1a1aa] text-[12px] font-bold flex items-center justify-center border border-gray-300 dark:border-[#2A2F3A]">
                                      {getInitials(user.fullname_en, "")}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-semibold text-black dark:text-white">{user.fullname_kh}</div>
                                  <div className="text-[12px] text-gray-500 dark:text-[#a1a1aa]">{user.fullname_en}</div>
                                </td>
                                <td className="py-3 px-4">
                                  {user.email}
                                </td>
                                <td className="py-3 px-4">
                                  {user.mainRole || user.department}
                                </td>
                                <td className="py-3 px-4">
                                  {user.role}
                                </td>
                                <td className="py-3 px-4">
                                  {user.type ? (
                                    <span className={`inline-flex items-center justify-center px-3 py-1 text-[12px] font-bold rounded-sm ${(user.type || '').toLowerCase().includes('super') ? 'bg-green-100 text-green-700' :
                                        (user.type || '').toLowerCase().includes('admin') ? 'bg-pink-100 text-pink-700' :
                                          (user.type || '').toLowerCase().includes('staff') ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                      }`}>{user.type}</span>
                                  ) : <span className="text-gray-400 italic text-[11px]">N/A</span>}
                                </td>
                                <td className={`py-3 px-4 relative ${actionMenuOpen === user.id ? 'z-30' : ''}`}>
                                  <div className="flex justify-end relative">
                                    <button
                                      onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                                      className="px-3 py-1.5 bg-[#1a5b28] hover:bg-[#13461d] text-white text-[13px] font-medium rounded-md flex items-center gap-1"
                                    >
                                      <MoreVertical size={14} className="opacity-80" /> {t("action")}
                                    </button>
                                    {actionMenuOpen === user.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-40"
                                          onClick={() => setActionMenuOpen(null)}
                                        />
                                        <div className={`absolute right-0 w-32 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg shadow-xl z-50 overflow-hidden py-1 ${(idx === paginatedUsers.length - 1 || (idx === paginatedUsers.length - 2 && paginatedUsers.length >= 3)) ? 'bottom-full mb-1' : 'top-full mt-1'
                                          }`}>
                                          <button
                                            onClick={async () => {
                                              setActionMenuOpen(null);
                                              try {
                                                const res = await fetchWithAuth(`http://document_tracking_system.test/api/accounts/${user.id}`);
                                                if (!res.ok) throw new Error("Failed to fetch user");
                                                const fullUser = await res.json();
                                                setSelectedUserView(fullUser);
                                                setViewState('VIEW');
                                              } catch (e) {
                                                console.error(e);
                                                showAlert("Error fetching user details.");
                                              }
                                            }}
                                            className="w-full text-left px-4 py-2 text-[13px] text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#242B36] dark:bg-[#242B36] flex items-center gap-2 transition-colors"
                                          >
                                            <Eye size={14} /> {t("view")}
                                          </button>
                                          {hasPermission(currentUser, "Account", "Edit") && (
                                            <button
                                              onClick={() => { setActionMenuOpen(null); handleEditClick(user); }}
                                              className="w-full text-left px-4 py-2 text-[13px] text-[#dcb23c] hover:bg-[#fff9e6] flex items-center gap-2 transition-colors"
                                            >
                                              <Edit size={14} /> {t("edit") || "Edit"}
                                            </button>
                                          )}
                                          {hasPermission(currentUser, "Account", "Delete") && (
                                            <button
                                              onClick={() => { setActionMenuOpen(null); handleDeleteUser(user.id); }}
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
                            )
                          })}
                          {filteredUsers.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-gray-400 dark:text-[#a1a1aa] italic">No users found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {paginatedUsers.length > 0 && (
                      <Pagination
                        currentPage={currentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={filteredUsers.length}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                      />
                    )}
                  </div>
                </div>
              )}
              {viewState === 'CREATE' && (
                <div className="flex flex-col flex-1 w-full">
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-black dark:text-white">{isEditMode ? t("edit_user") : t("create_new_user")}</h1>
                    <div className="flex gap-3">
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const user = usersList.find(u => u.id === editingUserId);
                            if (user) setSelectedUserView(user);
                            setViewState('VIEW');
                          }}
                          className="px-6 py-2 bg-[#dcb23c] hover:bg-[#c29c30] text-white text-[14px] font-medium rounded-md transition-colors"
                        >
                          {t("view")}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setViewState('LIST');
                          resetForm();
                        }}
                        className="px-6 py-2 bg-gray-500 hover:bg-gray-600 dark:hover:bg-[#242B36] dark:bg-[#242B36]0 text-white text-[14px] font-medium rounded-md transition-colors"
                      >
                        {t("back")}
                      </button>
                    </div>
                  </div>
                  <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Left Column */}
                      <div className="w-full md:w-1/3 flex flex-col gap-6">
                        <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 flex flex-col items-center shadow-sm">
                          <h3 className="font-bold text-black dark:text-white mb-4">{t("profile_photo")}</h3>
                          <label className="w-40 h-40 rounded-full bg-gray-200 dark:bg-[#242B36] border border-dashed border-gray-400 dark:border-[#475569] flex items-center justify-center cursor-pointer relative overflow-hidden group">
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            {profilePhoto ? (
                              <img src={profilePhoto} alt="Preview" className="absolute inset-0 w-full h-full object-cover object-top" />
                            ) : (
                              <div className="bg-white dark:bg-[#161B22] px-3 py-1 rounded text-xs font-bold text-gray-700 dark:text-white shadow-sm z-10 group-hover:bg-gray-100 dark:group-hover:bg-[#2A2F3A]">
                                Upload
                              </div>
                            )}
                          </label>
                        </div>
                        <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 flex flex-col items-center shadow-sm">
                          <h3 className="font-bold text-black dark:text-white mb-4">{t("upload_signature")}</h3>
                          <label className="w-full h-32 rounded-lg bg-gray-50 dark:bg-[#242B36] border border-dashed border-gray-300 dark:border-[#475569] flex items-center justify-center cursor-pointer relative overflow-hidden group hover:bg-gray-100 dark:hover:bg-[#2A2F3A] transition-colors">
                            <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                            {signaturePhoto ? (
                              <img src={signaturePhoto} alt="Signature Preview" className="absolute inset-0 w-full h-full object-contain p-2" />
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <UploadCloud size={24} className="text-gray-400" />
                                <div className="bg-white dark:bg-[#161B22] px-3 py-1 rounded text-xs font-bold text-gray-700 dark:text-white shadow-sm z-10 group-hover:bg-gray-100 dark:group-hover:bg-[#2A2F3A]">
                                  Upload Signature
                                </div>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                      {/* Right Column */}
                      <div className="w-full md:w-2/3 flex flex-col gap-6">
                        <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm flex-1">
                          <h3 className="font-bold text-black dark:text-white mb-6 text-lg">{t("user_information")}</h3>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                            <div>
                              <label className="block text-[13px] font-bold text-black dark:text-white mb-1">
                                {t("Full Name (KH)")} <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={fullname_kh}
                                onChange={(e) => setFullname_kh(e.target.value)}
                                placeholder="ឈ្មោះពេញ"
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36]"
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] font-bold text-black dark:text-white mb-1">
                                {t("Full Name (EN)")} <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={fullname_en}
                                onChange={(e) => setFullname_en(e.target.value)}
                                placeholder="Fullname"
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36]"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[13px] font-bold text-black dark:text-white mb-1">
                                {t("phone")} <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Phone Number"
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36]"
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] font-bold text-black dark:text-white mb-1">
                                {t("email_contact")} <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36]"
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] font-bold text-black dark:text-white mb-1">
                                {t("password")} <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="password"
                                required={!isEditMode}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36]"
                              />
                            </div>
                            <div className="col-span-2 pt-2">
                              <label className="block text-[14px] font-bold text-black dark:text-white mb-2">
                                Status
                              </label>
                              <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="status"
                                    checked={status === "Active"}
                                    onChange={() => setStatus("Active")}
                                    className="w-4 h-4 text-green-600 border-gray-300 dark:border-[#2A2F3A] focus:ring-green-500"
                                  />
                                  <span className="text-[14px] text-green-700">Active</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="status"
                                    checked={status === "Inactive"}
                                    onChange={() => setStatus("Inactive")}
                                    className="w-4 h-4 text-gray-400 dark:text-[#a1a1aa] border-gray-300 dark:border-[#2A2F3A] focus:ring-gray-400"
                                  />
                                  <span className="text-[14px] text-green-700">Inactive</span>
                                </label>
                              </div>
                            </div>
                            <div className="col-span-2 pt-4 mt-2 border-t border-gray-100 dark:border-[#2A2F3A]">
                              <h3 className="font-bold text-black dark:text-white text-[15px] mb-4">Department & Role</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                                <div>
                                  <label className="block text-[13px] font-bold text-black dark:text-white mb-1">
                                    Department <span className="text-red-500">*</span>
                                  </label>
                                  {mainRoles.length === 0 ? (
                                    <input
                                      type="text"
                                      required
                                      value={selectedMainRole}
                                      onChange={handleMainRoleChange}
                                      placeholder="E.g. IT Center"
                                      disabled={!isGlobalSuperAdmin}
                                      className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-[#2A2F3A] focus:border-[#1a5b28] outline-none text-[14px] bg-gray-50 dark:bg-[#242B36] ${!isGlobalSuperAdmin ? "opacity-70 cursor-not-allowed" : ""}`}
                                    />
                                  ) : (
                                  <SearchableSelect
                                      options={mainRoles}
                                      value={selectedMainRole}
                                      onChange={handleMainRoleChange}
                                      disabled={!isGlobalSuperAdmin}
                                      placeholder={t('search_department') || "Search department..."}
                                      selectPlaceholder={t('select_department') || "Select department"}
                                    />
                                  )}
                                </div>
                                <div>
                                  <label className="block text-[13px] font-bold text-black dark:text-white mb-1">
                                    Type <span className="text-red-500">*</span>
                                  </label>
                                    <SearchableSelect
                                      options={["Super Admin", "Admin", "Staff"]}
                                      value={selectedType}
                                      onChange={handleTypeChange}
                                      disabled={!(isGlobalSuperAdmin || isDepartmentAdmin)}
                                      placeholder={t('search_type') || "Search type..."}
                                      selectPlaceholder={t('select_type') || "Select type"}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[13px] font-bold text-black dark:text-white mb-1">
                                      Role <span className="text-red-500">*</span>
                                    </label>
                                    <SearchableSelect
                                      options={getAvailableRoles(selectedMainRole, selectedType, selectedRole)}
                                      value={selectedRole}
                                      onChange={(e) => setSelectedRole(e.target.value)}
                                      disabled={!(isGlobalSuperAdmin || isDepartmentAdmin) || getAvailableRoles(selectedMainRole, selectedType, selectedRole).length === 0}
                                      placeholder={t('search_role') || "Search role..."}
                                      selectPlaceholder={getAvailableRoles(selectedMainRole, selectedType, selectedRole).length === 0 ? "No data select" : (t('select_role') || "Select role")}
                                    />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-8 py-2.5 bg-[#125821] hover:bg-[#0c4015] text-white text-[14px] font-bold rounded-md transition-colors"
                      >
                        {t("save") || "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewState('LIST');
                          resetForm();
                        }}
                        className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[14px] font-bold rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      {showSuccess && (
                        <div className="ml-4 flex items-center text-green-600 font-bold text-sm">
                          <Check size={18} className="mr-1" /> Saved successfully
                        </div>
                      )}
                    </div>
                  </form>
                </div>
              )}
              {viewState === 'VIEW' && selectedUserView && (
                <div className="flex flex-col flex-1 w-full animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-black dark:text-white">View Account</h1>
                    <div className="flex gap-3">
                      {hasPermission(currentUser, "Account", "Edit") && (
                        <button
                          onClick={() => handleEditClick(selectedUserView)}
                          className="px-6 py-2 bg-[#dcb23c] hover:bg-[#c29c30] text-white text-[14px] font-medium rounded-md transition-colors"
                        >
                          {t("edit")}
                        </button>
                      )}
                      {(isGlobalSuperAdmin || isDepartmentAdmin) && (
                        <button
                          onClick={() => setViewState('LIST')}
                          className="px-6 py-2 bg-gray-500 hover:bg-gray-600 dark:hover:bg-[#242B36] text-white text-[14px] font-medium rounded-md transition-colors"
                        >
                          {t("back")}
                        </button>
                      )}
                      {currentUser?.email === selectedUserView.email && (
                        <button
                          onClick={handleConnectTelegram}
                          className="px-6 py-2 bg-[#229ED9] hover:bg-[#1E8BBF] text-white text-[14px] font-medium rounded-md transition-colors flex items-center gap-2"
                        >
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.21 3.45-.49.33-.94.5-1.35.49-.45-.01-1.32-.26-1.96-.46-.79-.26-1.42-.4-1.36-.84.03-.22.34-.45.92-.68 3.58-1.56 5.96-2.58 7.15-3.08 3.4-1.42 4.11-1.67 4.57-1.68.1 0 .32.02.46.13.12.09.15.22.16.32.01.12 0 .25-.01.35z"/></svg>
                          Connect Telegram
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm flex-1">
                      <h3 className="font-bold text-black dark:text-white mb-4 border-b border-gray-100 dark:border-[#2A2F3A] pb-2 text-lg">Information Account</h3>
                      <div className="flex gap-6">
                        <div className="w-56 bg-[#f9fafb] dark:bg-[#242B36]/50 border border-gray-200 dark:border-[#2A2F3A] rounded-xl flex flex-col items-center p-6 flex-shrink-0 shadow-sm">
                          <span className="text-[15px] font-bold text-gray-800 dark:text-white mb-5">Profile Identity</span>
                          <div className="w-32 h-32 rounded-full border-4 border-white dark:border-[#2A2F3A] shadow-md flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-[#161B22] mb-6 relative ring-1 ring-gray-200 dark:ring-gray-700">
                            {selectedUserView.profilePhoto ? (
                              <img src={selectedUserView.profilePhoto} alt="Profile" className="w-full h-full object-cover object-top" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                                <Users size={56} />
                              </div>
                            )}
                          </div>
                          <div className="w-full pt-5 border-t border-gray-200 dark:border-gray-700 flex flex-col items-center">
                            <span className="text-[13px] font-bold text-gray-600 dark:text-gray-300 mb-3 tracking-wide uppercase">Signature</span>
                            <div className="w-full h-20 rounded bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] shadow-inner flex items-center justify-center p-2 overflow-hidden">
                              {selectedUserView.signaturePhoto ? (
                                <img src={selectedUserView.signaturePhoto} alt="Signature" className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-gray-400 text-xs italic">Not Provided</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-x-8 gap-y-5 flex-1 pt-2 content-start">
                          {/* Row 1 */}
                          <div>
                            <div className="text-[15px] font-bold text-black dark:text-white mb-1">Fullname (KM)</div>
                            <div className="text-[#1a5b28] text-[15px]">{selectedUserView.fullname_kh || "-"}</div>
                          </div>
                          <div>
                            <div className="text-[15px] font-bold text-black dark:text-white mb-1">Fullname (EN)</div>
                            <div className="text-[#1a5b28] text-[15px]">{selectedUserView.fullname_en || "-"}</div>
                          </div>
                          <div>
                            <div className="text-[15px] font-bold text-black dark:text-white mb-1">Phone</div>
                            <div className="text-[#1a5b28] text-[15px]">{selectedUserView.phone}</div>
                          </div>
                          {/* Row 2 */}
                          <div className="col-span-2">
                            <div className="text-[15px] font-bold text-black dark:text-white mb-1">Email</div>
                            <div className="text-[#1a5b28] text-[15px]">{selectedUserView.email}</div>
                          </div>
                          <div>
                            <div className="text-[15px] font-bold text-black dark:text-white mb-1">Password</div>
                            <div className="flex items-center gap-2">
                              <div className="text-[#1a5b28] text-[15px] tracking-wide">{showPassword ? "Encrypted" : "••••••••"}</div>
                              <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-[#1a5b28] transition-colors cursor-pointer" title="Passwords are encrypted for security">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                          {/* Row 3 */}
                          <div className="col-span-3">
                            <div className="text-[15px] font-bold text-black dark:text-white mb-1.5">Status</div>
                            <span className={`inline-flex items-center justify-center px-4 py-1 text-[11px] font-bold uppercase rounded-full border ${
                              (!selectedUserView.status || selectedUserView.status === 'Active') 
                                ? 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]' 
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                              {(!selectedUserView.status || selectedUserView.status === 'Active') ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-[#2A2F3A] rounded-lg p-6 shadow-sm w-[350px] h-fit">
                      <h3 className="font-bold text-black dark:text-white mb-4 border-b border-gray-100 dark:border-[#2A2F3A] pb-2 text-lg">Department & Role</h3>
                      <div className="grid grid-cols-2 gap-y-6 gap-x-4 mt-6">
                        <div>
                          <div className="text-[14px] font-bold text-black dark:text-white mb-1">Department</div>
                          <div className="text-[#1a5b28] text-[14px]">{selectedUserView.mainRole || selectedUserView.department}</div>
                        </div>
                        <div>
                          <div className="text-[14px] font-bold text-black dark:text-white mb-1">Campus Suite</div>
                          <div className="text-[#1a5b28] text-[14px]">
                            {departmentsList.find(d => d.title === (selectedUserView.mainRole || selectedUserView.department))?.campusSuite || "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[14px] font-bold text-black dark:text-white mb-1">Role</div>
                          <div className="text-[#1a5b28] text-[14px]">
                            {selectedUserView.role}
                          </div>
                        </div>
                        <div>
                          <div className="text-[14px] font-bold text-black dark:text-white mb-1">Type</div>
                          <div className="text-[#1a5b28] text-[14px]">
                            {selectedUserView.type ? (
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-bold rounded-sm ${selectedUserView.type.toLowerCase().trim() === "super admin" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/30" :
                                  selectedUserView.type.toLowerCase().trim() === "admin" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30" :
                                    selectedUserView.type.toLowerCase().trim() === "head of unit" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30" :
                                      selectedUserView.type.toLowerCase().trim() === "staff" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/30" :
                                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                                }`}>{selectedUserView.type}</span>
                            ) : <span className="text-gray-400 italic text-[14px]">N/A</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={deleteModalConfig.isOpen}
        onClose={() => setDeleteModalConfig({ isOpen: false, isBulk: false, userId: null })}
        onConfirm={confirmDelete}
        itemCount={deleteModalConfig.isBulk ? selectedRows.length : 1}
        itemName={(() => {
          const targetId = (!deleteModalConfig.isBulk && deleteModalConfig.userId) 
            ? deleteModalConfig.userId 
            : (deleteModalConfig.isBulk && selectedRows.length === 1) 
              ? selectedRows[0] 
              : null;
              
          if (!targetId) return "";
          
          const targetUser = usersList.find(u => u.id === targetId);
          return language === 'en' ? targetUser?.fullname_en : targetUser?.fullname_kh;
        })()}
        itemType="users"
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
