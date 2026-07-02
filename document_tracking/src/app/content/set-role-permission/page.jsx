"use client";
import { useState, useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import {
  ChevronDown,
  ChevronUp,
  Check,
  ShieldCheck,
  Key,
  FileText,
  Inbox,
  Eye,
  Users,
  Briefcase,
  Settings,
  RotateCcw,
  CheckSquare,
  Save,
  Shield,
  History
} from "lucide-react";
import AlertModal from "../../../components/AlertModal";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";

export default function SetRolePermissionPage() {
  const router = useRouter();
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { t } = useLanguage();

  // Departments and Roles state
  const [departmentsData, setDepartmentsData] = useState([]);
  const menus = [
    "Request",
    "Receive",
    "Tracking Document",
    "Account",
    "Job Department",
    "Set Role Permission",
    "Type Document",
    "History Request"
  ];
  const actions = ["Create", "Edit", "View", "View Any", "Delete"];

  // Custom Icon and Color mappings for premium styling
  const menuMeta = {
    "Request": { icon: FileText, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
    "Receive": { icon: Inbox, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
    "Tracking Document": { icon: Eye, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" },
    "Account": { icon: Users, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
    "Job Department": { icon: Briefcase, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
    "Set Role Permission": { icon: ShieldCheck, color: "text-rose-500 bg-rose-50 dark:bg-rose-900/20" },
    "Type Document": { icon: Settings, color: "text-teal-500 bg-teal-50 dark:bg-teal-900/20" },
    "History Request": { icon: History, color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20" }
  };

  const [selectedRole, setSelectedRole] = useState({ dept: "", role: "" });

  // Alert Modal State
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
  const showAlert = (message) => {
    setAlertModal({ isOpen: true, message });
  };
  const [expandedDepts, setExpandedDepts] = useState({});
  // Permissions State: [dept-role]: { MenuName: { ActionName: boolean } }
  const [permissions, setPermissions] = useState({});
  const [savedPermissions, setSavedPermissions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (Object.keys(permissions).length > 0 || Object.keys(savedPermissions).length > 0) {
      setHasChanges(JSON.stringify(permissions) !== JSON.stringify(savedPermissions));
    } else {
      setHasChanges(false);
    }
  }, [permissions, savedPermissions]);

  const fetchPermissionsForRole = async (dept, role) => {
    const key = `${dept}-${role}`;
    try {
      const response = await fetch(`http://document_tracking_system.test/api/permissions?department=${encodeURIComponent(dept)}&type=${encodeURIComponent(role)}`);
      const data = await response.json();
      const rolePerms = data.permissions || {};
      const initialPerms = {};
      menus.forEach(menu => {
        initialPerms[menu] = rolePerms[menu] || { Create: false, Edit: false, View: false, "View Any": false, Delete: false };
      });
      setPermissions(prev => ({ ...prev, [key]: initialPerms }));
      setSavedPermissions(prev => ({ ...prev, [key]: JSON.parse(JSON.stringify(initialPerms)) }));
    } catch (e) {
      console.error("Failed to fetch permissions", e);
    }
  };

  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/");
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);
    setIsMounted(true);

    const loadData = async () => {
      try {
        const response = await fetch("http://document_tracking_system.test/api/departments");
        let formattedData = await response.json();

        if (formattedData.length === 0) {
          formattedData = [];
        }

        const isSuperAdmin = user?.email === "admin@rupp.edu.kh" || user?.email === "itcsuperadmin@rupp.edu.kh";
        if (!isSuperAdmin) {
            const userDept = (user?.mainRole || user?.department || "").toLowerCase().trim();
            formattedData = formattedData.filter(d => (d.name || d.department || "").toLowerCase().trim() === userDept);
        }

        setDepartmentsData(formattedData);
        const newExpanded = {};
        formattedData.forEach(d => { newExpanded[d.name] = true; });
        setExpandedDepts(newExpanded);

        let defaultDept = formattedData.length > 0 ? formattedData[0].name : "Organization Roles";
        let defaultRole = (formattedData.length > 0 && formattedData[0].roles.length > 0)
          ? formattedData[0].roles[0]
          : "Staff";
        
        setSelectedRole({ dept: defaultDept, role: defaultRole });
        await fetchPermissionsForRole(defaultDept, defaultRole);
      } catch (e) {
        console.error("Failed to load departments from API", e);
      }
    };
    
    loadData();
  }, []);

  if (!isMounted) return null;
  const isGlobalSuperAdmin = currentUser?.email === "admin@rupp.edu.kh";
  const adminCheckStr = (currentUser?.type || currentUser?.role || "").toLowerCase();
  const isDepartmentAdmin = adminCheckStr.includes("super admin") || adminCheckStr === "admin";
  const hasAccess = currentUser && (isGlobalSuperAdmin || isDepartmentAdmin);

  const toggleDept = (deptName) => {
    setExpandedDepts(prev => ({ ...prev, [deptName]: !prev[deptName] }));
  };

  const handleRoleSelect = async (dept, role) => {
    setSelectedRole({ dept, role });
    await fetchPermissionsForRole(dept, role);
  };

  const togglePermission = (menu, action) => {
    const key = `${selectedRole.dept}-${selectedRole.role}`;
    setPermissions(prev => {
      const currentPerms = prev[key] || {};
      const menuPerms = currentPerms[menu] || { Create: false, Edit: false, View: false, "View Any": false, Delete: false };

      return {
        ...prev,
        [key]: {
          ...currentPerms,
          [menu]: {
            ...menuPerms,
            [action]: !menuPerms[action]
          }
        }
      };
    });
  };

  const currentKey = `${selectedRole.dept}-${selectedRole.role}`;
  const currentPermissions = permissions[currentKey] || {};

  const handleToggleColumn = (action, isAllChecked) => {
    setPermissions(prev => {
      const currentPerms = prev[currentKey] || {};
      const updatedPerms = { ...currentPerms };
      menus.forEach(menu => {
        if (!updatedPerms[menu]) {
          updatedPerms[menu] = { Create: false, Edit: false, View: false, "View Any": false, Delete: false };
        }
        updatedPerms[menu] = {
          ...updatedPerms[menu],
          [action]: !isAllChecked
        };
      });
      return {
        ...prev,
        [currentKey]: updatedPerms
      };
    });
  };

  const handleToggleRow = (menu, isAllChecked) => {
    setPermissions(prev => {
      const currentPerms = prev[currentKey] || {};
      const updatedMenuPerms = {};
      actions.forEach(action => {
        updatedMenuPerms[action] = !isAllChecked;
      });
      return {
        ...prev,
        [currentKey]: {
          ...currentPerms,
          [menu]: updatedMenuPerms
        }
      };
    });
  };

  let isAllSelected = true;
  for (const menu of menus) {
    for (const action of actions) {
      if (!currentPermissions[menu]?.[action]) {
        isAllSelected = false;
        break;
      }
    }
    if (!isAllSelected) break;
  }

  const handleSelectAll = () => {
    const newPerms = {};
    menus.forEach(menu => {
      newPerms[menu] = {};
      actions.forEach(action => {
        newPerms[menu][action] = !isAllSelected;
      });
    });
    setPermissions(prev => ({
      ...prev,
      [currentKey]: newPerms
    }));
  };

  // Helper to apply common permission configurations in one click
  const applyPreset = (presetType) => {
    const newPerms = {};
    menus.forEach(menu => {
      newPerms[menu] = {};
      actions.forEach(action => {
        if (presetType === "FULL") {
          newPerms[menu][action] = true;
        } else if (presetType === "READ_ONLY") {
          newPerms[menu][action] = (action === "View" || action === "View Any");
        } else { // CLEAR
          newPerms[menu][action] = false;
        }
      });
    });
    setPermissions(prev => ({
      ...prev,
      [currentKey]: newPerms
    }));
  };

  const handleSave = async () => {
    const key = `${selectedRole.dept}-${selectedRole.role}`;
    const rolePerms = permissions[key];

    try {
      const response = await fetch(`http://document_tracking_system.test/api/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ 
          permissions: rolePerms,
          department: selectedRole.dept,
          type: selectedRole.role
        })
      });
      
      if (response.ok) {
        window.dispatchEvent(new Event("permissions_updated"));
        setSavedPermissions(JSON.parse(JSON.stringify(permissions)));
        setHasChanges(false);
        showAlert(t('permissions_saved'));
      } else {
        alert("Failed to save permissions to server.");
      }
    } catch (e) {
      console.error("Failed to save", e);
      alert("Error saving permissions.");
    }
  };

  return (
    <>
      <div className="flex min-h-screen bg-[#fafafb] dark:bg-[#0F1117] text-gray-900 dark:text-gray-100 font-sans">
        <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        <div className="flex-1 transition-all duration-300 ease-in-out flex flex-col min-w-0 bg-[#f8fafc] dark:bg-[#0F1117]">
          <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} currentUser={currentUser} />

          <main className="p-6 md:p-10 flex-1 w-full mx-auto flex flex-col gap-6 animate-fade-in">
            <div className="w-full">
              {/* Header Title */}
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                  {t('set_role_permission')}
                </h1>
                {hasAccess && (
                  <div className="flex items-center gap-3">
                    {hasChanges && (
                      <span className="text-[12px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        {t('unsaved_changes') || 'Unsaved Changes'}
                      </span>
                    )}
                    <button
                      onClick={handleSave}
                      className={`px-6 py-2.5 text-[14px] font-bold rounded-xl transition-all shadow-md flex items-center gap-2 hover:shadow-lg active:scale-[0.98] cursor-pointer ${hasChanges
                          ? 'bg-gradient-to-r from-[#0c3f0d] to-[#15803d] text-white ring-2 ring-emerald-500/30 shadow-emerald-500/20'
                          : 'bg-[#0c3f0d] hover:bg-[#072408] text-white opacity-85'
                        }`}
                    >
                      <Save size={16} />
                      {t('save')}
                    </button>
                  </div>
                )}
              </div>

              {!hasAccess ? (
                <div className="bg-white dark:bg-[#161B22] border border-gray-100 dark:border-gray-700 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('access_denied')}</h3>
                  <p className="text-gray-500 font-medium text-[15px]">{t('no_permission_role')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Info Alert Header Banner */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex gap-3.5 items-start shadow-sm leading-relaxed">
                    <ShieldCheck className="text-[#0c3f0d] dark:text-[#2da94a] shrink-0 mt-0.5" size={22} />
                    <div className="flex flex-col gap-0.5">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">Role-Based Access Control Setup</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Choose a department and role from the left menu to display its permission matrix. Modify authorization blocks for each system menu and click save to apply configurations instantly.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Left Column: Departments & Roles Sidebar Card */}
                    <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-4">
                      {departmentsData.map((dept, idx) => {
                        const isDeptActive = selectedRole.dept === dept.name;

                        return (
                          <div
                            key={idx}
                            className={`bg-white dark:bg-[#161B22] rounded-xl overflow-hidden border-[1.5px] transition-all duration-200 ${isDeptActive
                                ? 'border-[#0c3f0d] dark:border-[#2da94a] shadow-md ring-1 ring-[#0c3f0d]/10'
                                : 'border-slate-200 dark:border-gray-700 shadow-sm'
                              }`}
                          >
                            <button
                              onClick={() => toggleDept(dept.name)}
                              className="w-full flex items-center justify-between p-4 cursor-pointer transition-colors bg-white dark:bg-[#161B22] hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-left"
                            >
                              <div className="flex items-center gap-2.5">
                                <Briefcase size={16} className={isDeptActive ? 'text-[#0c3f0d] dark:text-[#2da94a]' : 'text-slate-400'} />
                                <span className="font-bold text-slate-800 dark:text-white text-[14px]">{dept.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                                  {dept.roles.length} roles
                                </span>
                                {expandedDepts[dept.name] ? (
                                  <ChevronUp size={16} className="text-slate-400" />
                                ) : (
                                  <ChevronDown size={16} className="text-slate-400" />
                                )}
                              </div>
                            </button>

                            {expandedDepts[dept.name] && (
                              <div className="flex flex-col px-3 pb-3 gap-1.5">
                                <div className="h-px bg-slate-100 dark:bg-[#242B36] w-full mb-1"></div>
                                {dept.roles.length === 0 ? (
                                  <div className="text-[12px] text-gray-400 dark:text-gray-500 italic py-2 text-center select-none">
                                    No roles configured
                                  </div>
                                ) : (
                                  dept.roles.map((typeStr, rIdx) => {
                                    const isSelected = selectedRole.dept === dept.name && selectedRole.role === typeStr;
                                    return (
                                      <button
                                        key={rIdx}
                                        onClick={() => handleRoleSelect(dept.name, typeStr)}
                                        className={`text-left text-[13px] px-3.5 py-2.5 transition-all rounded-lg flex items-center gap-2.5 w-full cursor-pointer border ${isSelected
                                            ? 'bg-[#0c3f0d]/10 dark:bg-[#0c3f0d]/25 text-[#0c3f0d] dark:text-[#2da94a] font-bold border-[#0c3f0d]/25 dark:border-[#2da94a]/25 shadow-sm'
                                            : 'text-slate-600 dark:text-[#a1a1aa] font-medium hover:bg-slate-50 dark:hover:bg-[#242B36]/50 hover:text-slate-900 dark:hover:text-white border-transparent'
                                          }`}
                                      >
                                        <Shield size={13} className={isSelected ? 'text-[#0c3f0d] dark:text-[#2da94a]' : 'text-slate-400'} />
                                        <span className="truncate">{typeStr}</span>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Right Column: Permissions Matrix Table */}
                    <div className="flex-1 overflow-x-auto h-fit sticky top-6 bg-white dark:bg-[#161B22] rounded-2xl shadow-sm border border-slate-200/80 dark:border-[#2A2F3A]">
                      {!selectedRole.role ? (
                        <div className="p-16 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 gap-4">
                          <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-[#242B36] border border-slate-100 dark:border-[#2A2F3A] flex items-center justify-center shadow-sm">
                            <Shield className="text-slate-300 dark:text-slate-600 animate-pulse" size={28} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <h4 className="font-bold text-[16px] text-slate-800 dark:text-white">No Active Role Selected</h4>
                            <p className="text-xs max-w-sm text-slate-400 leading-relaxed">
                              Select a department and an active role from the left menu to customize or view its access permissions matrix.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full flex flex-col">
                          {/* Current Config Info Header banner */}
                          <div className="p-4.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-b border-slate-200 dark:border-[#2A2F3A] flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center px-6">
                            <div className="flex items-center gap-2">
                              <Key size={16} className="text-[#0c3f0d] dark:text-[#2da94a]" />
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Role Configuration</span>
                            </div>
                            <div className="text-[14px] font-bold text-[#0c3f0d] dark:text-[#2da94a] bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 py-1 rounded-full border border-emerald-500/15">
                              {selectedRole.dept} <span className="text-emerald-400 dark:text-emerald-600 px-1 font-normal">/</span> {selectedRole.role}
                            </div>
                          </div>

                          {/* Preset Quick Actions Panel */}
                          <div className="p-4 bg-slate-50/50 dark:bg-[#1b222d] border-b border-slate-200 dark:border-[#2A2F3A] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-6">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs font-bold text-slate-400 dark:text-[#a1a1aa] uppercase tracking-wider">Presets:</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => applyPreset("FULL")}
                                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/30 text-[#0c3f0d] dark:text-emerald-400 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                                >
                                  <CheckSquare size={13} />
                                  Full Access
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyPreset("READ_ONLY")}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-900/50 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                                >
                                  <Eye size={13} />
                                  Read-Only
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyPreset("CLEAR")}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                                >
                                  <RotateCcw size={13} />
                                  Clear All
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 cursor-pointer group select-none" onClick={handleSelectAll}>
                              <div className={`w-[18px] h-[18px] flex items-center justify-center rounded-md border-[1.5px] transition-all duration-200 ${isAllSelected
                                  ? 'border-[#0c3f0d] bg-[#0c3f0d] text-white shadow-sm'
                                  : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-[#161B22] group-hover:border-slate-400'
                                }`}>
                                {isAllSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                              <span className="text-[13px] font-semibold text-slate-600 dark:text-[#a1a1aa] group-hover:text-slate-800 dark:group-hover:text-white transition-colors">{t('select_all')}</span>
                            </div>
                          </div>

                          {/* Permissions Matrix Grid Table */}
                          <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse text-[13px] min-w-[750px] lg:min-w-0">
                              <thead className="bg-[#fafafb] dark:bg-[#161B22] border-b border-slate-200 dark:border-[#2A2F3A]">
                                <tr>
                                  <th className="py-4 px-6 font-bold text-slate-700 dark:text-white w-[30%] tracking-wide uppercase text-[11px] border-r border-slate-100 dark:border-[#2A2F3A]">
                                    {t('menu')}
                                  </th>
                                  {actions.map((action, idx) => {
                                    // Check if all menus are checked for this specific action
                                    let isActionAllChecked = true;
                                    for (const menu of menus) {
                                      if (!currentPermissions[menu]?.[action]) {
                                        isActionAllChecked = false;
                                        break;
                                      }
                                    }

                                    return (
                                      <th
                                        key={idx}
                                        className="py-3 px-2 text-center w-[12%] select-none"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleToggleColumn(action, isActionAllChecked)}
                                          className="inline-flex flex-col items-center gap-1.5 group cursor-pointer w-full focus:outline-none"
                                        >
                                          <span className="font-bold text-slate-700 dark:text-white tracking-wide uppercase text-[10px] group-hover:text-[#0c3f0d] dark:group-hover:text-[#2da94a] transition-colors">
                                            {t(action.toLowerCase().replace(' ', '_'))}
                                          </span>
                                          <div className={`w-4 h-4 flex items-center justify-center rounded border transition-all duration-200 hover:scale-105 active:scale-95 ${isActionAllChecked
                                              ? 'border-[#0c3f0d] bg-[#0c3f0d] text-white shadow-sm'
                                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#161B22] group-hover:border-slate-400'
                                            }`}>
                                            {isActionAllChecked && <Check size={10} strokeWidth={4} />}
                                          </div>
                                        </button>
                                      </th>
                                    );
                                  })}
                                  <th className="py-4 px-4 text-center w-[10%] font-bold text-slate-700 dark:text-white tracking-wide uppercase text-[11px]">
                                    {t('all') || 'All'}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-[#2A2F3A] bg-white dark:bg-[#161B22] text-slate-700 dark:text-white">
                                {menus.map((menu, mIdx) => {
                                  const menuPerms = currentPermissions[menu] || {};
                                  const meta = menuMeta[menu] || { icon: FileText, color: "text-slate-500 bg-slate-50 dark:bg-slate-900/20" };
                                  const MenuIcon = meta.icon;

                                  // Check if all actions are checked for this row
                                  let isRowAllChecked = true;
                                  for (const action of actions) {
                                    if (!menuPerms[action]) {
                                      isRowAllChecked = false;
                                      break;
                                    }
                                  }

                                  return (
                                    <tr key={mIdx} className="hover:bg-slate-50/50 dark:hover:bg-[#242B36]/30 transition-colors duration-150">
                                      <td className="py-3.5 px-6 font-semibold border-r border-slate-100 dark:border-[#2A2F3A]">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center shrink-0 shadow-sm border border-slate-200/10`}>
                                            <MenuIcon size={15} />
                                          </div>
                                          <span className="text-slate-800 dark:text-slate-200 font-medium text-[13.5px]">
                                            {t(menu === "Request" ? "create_request" : menu === "Receive" ? "received" : menu === "Tracking Document" ? "tracking" : menu === "Type Document" ? "type_document" : menu === "Account" ? "account" : menu === "Job Department" ? "job_department" : menu === "Set Role Permission" ? "set_role_permission"  : menu === "History Request" ? "history_request" : menu)}
                                          </span>
                                        </div>
                                      </td>
                                      {actions.map((action, aIdx) => {
                                        const isChecked = !!menuPerms[action];
                                        return (
                                          <td
                                            key={aIdx}
                                            className={`py-3.5 px-2 text-center transition-colors duration-200 ${isChecked
                                                ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]'
                                                : ''
                                              }`}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => togglePermission(menu, action)}
                                              className="inline-flex items-center justify-center w-6 h-6 focus:outline-none cursor-pointer"
                                            >
                                              <div className={`w-5 h-5 flex items-center justify-center rounded-md border-[1.5px] transition-all duration-200 hover:scale-110 active:scale-90 ${isChecked
                                                  ? 'border-[#0c3f0d] bg-[#0c3f0d] text-white shadow-sm'
                                                  : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-[#161B22] hover:border-slate-400'
                                                }`}>
                                                {isChecked && <Check size={12} strokeWidth={3.5} />}
                                              </div>
                                            </button>
                                          </td>
                                        );
                                      })}
                                      {/* Row-level "ALL" toggle */}
                                      <td className="py-3.5 px-4 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleRow(menu, isRowAllChecked)}
                                          className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition-all active:scale-95 cursor-pointer whitespace-nowrap ${isRowAllChecked
                                              ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400'
                                              : 'bg-emerald-50 border-emerald-200 text-[#0c3f0d] hover:bg-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400'
                                            }`}
                                        >
                                          {isRowAllChecked ? (t('clear') || 'Clear') : (t('all') || 'All')}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}


                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      {/* Custom Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: "" })}
        message={alertModal.message}
        title="Success"
      />
    </>
  );
}
