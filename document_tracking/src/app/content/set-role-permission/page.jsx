"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import AlertModal from "../../../components/AlertModal";
import { useLanguage } from "../../context/LanguageContext";
export default function SetRolePermissionPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    "Type Document"
  ];
  const actions = ["Create", "Edit", "View", "View Any", "Delete"];
  const [rolesList, setRolesList] = useState([]);
  const [selectedRole, setSelectedRole] = useState({ dept: "", role: "" });
  
  // Alert Modal State
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
  const showAlert = (message) => {
    setAlertModal({ isOpen: true, message });
  };
  const [expandedDepts, setExpandedDepts] = useState({});
  // Permissions State: [dept-role]: { MenuName: { ActionName: boolean } }
  const [permissions, setPermissions] = useState({});
  useEffect(() => {
    const userStr = sessionStorage.getItem("currentUser");
    if (!userStr) {
      router.push("/");
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);
    setIsMounted(true);
    let depts = [];
    try {
      const storedDepts = localStorage.getItem("doc_tracking_departments");
      if (storedDepts) {
        const parsedDepts = JSON.parse(storedDepts);
        if (Array.isArray(parsedDepts) && parsedDepts.length > 0) {
          depts = parsedDepts.map(d => d.title);
        }
      }
    } catch (e) { console.error(e); }
    if (depts.length === 0) {
      depts = ["IT Center", "Office of Planning and Finance"];
    }
    let uniqueTypes = ["Super Admin", "Admin", "Head of Unit", "Staff"];
    try {
      const storedRoles = localStorage.getItem("doc_tracking_roles");
      if (storedRoles) {
        const parsedRoles = JSON.parse(storedRoles);
        if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
          const typesSet = new Set();
          parsedRoles.forEach(r => {
            if (r.type) typesSet.add(r.type);
          });
          if (typesSet.size > 0) {
            uniqueTypes = Array.from(typesSet);
          }
        }
      }
    } catch (e) { console.error(e); }
    const isGlobal = user?.email === "admin@rupp.edu.kh";
    const adminCheckStr1 = (user?.type || user?.role || "").toLowerCase();
    const isDeptAdmin = adminCheckStr1.includes("super admin") || adminCheckStr1 === "admin";
    if (!isGlobal && isDeptAdmin) {
      const allowedDept = (user?.department || user?.mainRole || "").toLowerCase().trim();
      depts = depts.filter(d => d.toLowerCase().trim() === allowedDept);
      if (depts.length === 0) {
        depts = [user?.department || user?.mainRole || "Default Department"];
      }
    }
    const formattedData = depts.map(deptName => ({
      name: deptName,
      roles: uniqueTypes
    }));
    setDepartmentsData(formattedData);
    const newExpanded = {};
    formattedData.forEach(d => { newExpanded[d.name] = true; });
    setExpandedDepts(newExpanded);
    let defaultDept = formattedData.length > 0 ? formattedData[0].name : "IT Center";
    let defaultRole = uniqueTypes.length > 0 ? uniqueTypes[0] : "Staff";
    setSelectedRole({ dept: defaultDept, role: defaultRole });
    const storedPerms = localStorage.getItem("doc_tracking_permissions");
    if (storedPerms) {
      try {
        setPermissions(JSON.parse(storedPerms));
      } catch (e) {
        console.error("Failed to parse permissions", e);
      }
    } else {
      // Initialize mock permissions matching the screenshot for default role
      setPermissions({
        [`${defaultDept}-${defaultRole}`]: {
          "Request": { Create: true, Edit: true, View: true, "View Any": false, Delete: true },
          "Receive": { Create: false, Edit: false, View: false, "View Any": false, Delete: false },
          "Tracking Document": { Create: false, Edit: false, View: false, "View Any": false, Delete: false },
          "Account": { Create: false, Edit: false, View: false, "View Any": false, Delete: false },
          "Job Department": { Create: false, Edit: false, View: false, "View Any": false, Delete: false },
          "Set Role Permission": { Create: false, Edit: false, View: false, "View Any": false, Delete: false },
          "Type Document": { Create: false, Edit: false, View: false, "View Any": false, Delete: false }
        }
      });
    }
  }, [router]);
  if (!isMounted) return null;
  const isGlobalSuperAdmin = currentUser?.email === "admin@rupp.edu.kh";
  const adminCheckStr = (currentUser?.type || currentUser?.role || "").toLowerCase();
  const isDepartmentAdmin = adminCheckStr.includes("super admin") || adminCheckStr === "admin";
  const hasAccess = currentUser && (isGlobalSuperAdmin || isDepartmentAdmin);
  const toggleDept = (deptName) => {
    setExpandedDepts(prev => ({ ...prev, [deptName]: !prev[deptName] }));
  };
  const handleRoleSelect = (dept, role) => {
    setSelectedRole({ dept, role });
    // Auto-initialize if empty
    const key = `${dept}-${role}`;
    if (!permissions[key]) {
      const initialPerms = {};
      menus.forEach(menu => {
        initialPerms[menu] = { Create: false, Edit: false, View: false, "View Any": false, Delete: false };
      });
      setPermissions(prev => ({ ...prev, [key]: initialPerms }));
    }
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
  const handleSave = () => {
    localStorage.setItem("doc_tracking_permissions", JSON.stringify(permissions));
    showAlert(t('permissions_saved'));
  };
  return (
    <>
      <div className="flex min-h-screen bg-[#fafafb] dark:bg-[#0F1117] text-gray-900 dark:text-gray-100 font-sans">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      
      <div className={`flex-1 transition-all duration-300 ease-in-out flex flex-col min-w-0 bg-slate-50/50 dark:bg-[#0F1117]`}>
        <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} currentUser={currentUser} />
        
        <main className="p-6 md:p-10 flex-1 w-full mx-auto flex flex-col gap-6 animate-fade-in">
          <div className="w-full">
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-8">{t('set_role_permission')}</h1>
            
            {!hasAccess ? (
              <div className="bg-white dark:bg-[#161B22] border border-gray-100 dark:border-gray-700 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('access_denied')}</h3>
                <p className="text-gray-500 font-medium text-[15px]">{t('no_permission_role')}</p>
              </div>
            ) : (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Left Column: Roles Accordion */}
              <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-4">
                {departmentsData.map((dept, idx) => {
                  const isDeptActive = selectedRole.dept === dept.name;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`bg-white dark:bg-[#161B22] rounded-md overflow-hidden border-[1.5px] ${isDeptActive ? 'border-[#1a5b28] dark:border-[#2da94a]' : 'border-gray-200 dark:border-gray-700'} shadow-sm`}
                    >
                      <button 
                        onClick={() => toggleDept(dept.name)}
                        className={`w-full flex items-center justify-between p-4 cursor-pointer transition-colors bg-white dark:bg-[#161B22]`}
                      >
                        <span className="font-bold text-black dark:text-white text-[15px]">{dept.name}</span>
                        {expandedDepts[dept.name] ? (
                          <ChevronUp size={18} className="text-gray-500 dark:text-[#a1a1aa]" />
                        ) : (
                          <ChevronDown size={18} className="text-gray-500 dark:text-[#a1a1aa]" />
                        )}
                      </button>
                      
                      {expandedDepts[dept.name] && (
                        <div className="flex flex-col px-4 pb-4 gap-3">
                          <div className="h-px bg-gray-100 dark:bg-[#242B36] w-full mb-1"></div>
                          {dept.roles.map((typeStr, rIdx) => {
                            const isSelected = selectedRole.dept === dept.name && selectedRole.role === typeStr;
                            return (
                              <div key={rIdx} className="flex justify-between items-center group w-full">
                                <button
                                  onClick={() => handleRoleSelect(dept.name, typeStr)}
                                  className={`text-left text-[14px] px-1 py-1 transition-colors flex-1 min-w-0 truncate ${
                                    isSelected ? 'text-[#1a5b28] dark:text-[#2da94a] font-bold' : 'text-black dark:text-[#a1a1aa] font-semibold hover:text-[#1a5b28] dark:hover:text-[#2da94a]'
                                  }`}
                                >
                                  {typeStr}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Right Column: Permissions Matrix */}
              <div className="flex-1 overflow-x-auto h-fit sticky top-6">
                <div className="bg-white dark:bg-[#161B22] rounded-md shadow-sm border border-gray-200 dark:border-[#374151] flex flex-col overflow-hidden w-full min-w-max lg:min-w-0">
                  <table className="w-full text-left border-collapse text-[15px]">
                    <thead className="bg-white dark:bg-[#161B22]">
                      <tr className="border-b border-gray-200 dark:border-[#374151]">
                        <th className="py-4 px-6 font-medium text-black dark:text-white border-r border-gray-100 dark:border-[#374151] w-[35%]">
                          <div className="flex items-center justify-between">
                            <span>{t('menu')}</span>
                            <div className="flex items-center gap-2 cursor-pointer group" onClick={handleSelectAll}>
                               <div className={`w-[18px] h-[18px] flex items-center justify-center rounded-[2px] border-[1.5px] transition-all ${
                                      isAllSelected 
                                        ? 'border-[#5ca95c] dark:border-[#5ca95c] bg-white dark:bg-transparent' 
                                        : 'border-gray-400 dark:border-[#2A2F3A] bg-white dark:bg-transparent group-hover:border-gray-500 dark:group-hover:border-[#475569]'
                                    }`}>
                                      {isAllSelected && <Check size={18} className="text-[#5ca95c] relative top-[-1px] right-[-1px]" strokeWidth={3} />}
                               </div>
                               <span className="text-[15px] font-normal text-gray-600 dark:text-[#a1a1aa]">{t('select_all')}</span>
                            </div>
                          </div>
                        </th>
                        {actions.map((action, idx) => (
                          <th key={idx} className="py-4 px-2 font-medium text-black dark:text-white text-center whitespace-nowrap w-[13%]">{t(action.toLowerCase().replace(' ', '_'))}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#374151] bg-white dark:bg-[#161B22] text-gray-700 dark:text-white">
                      {menus.map((menu, mIdx) => {
                        const menuPerms = currentPermissions[menu] || {};
                        return (
                          <tr key={mIdx} className="hover:bg-gray-50 dark:bg-[#0F1117]/50 dark:hover:bg-[#242B36]/50">
                            <td className="py-4 px-6   font-semibold border-r border-gray-100 dark:border-[#374151]">
                              {t(menu === "Request" ? "create_request" : menu === "Receive" ? "received" : menu === "Tracking Document" ? "tracking" : menu === "Account" ? "account" : menu === "Job Department" ? "job_department" : menu === "Set Role Permission" ? "set_role_permission" : menu === "Type Document" ? "type_document" : menu)}
                            </td>
                            {actions.map((action, aIdx) => {
                              const isChecked = !!menuPerms[action];
                              return (
                                <td key={aIdx} className="py-4 px-4 text-center">
                                  <button
                                    onClick={() => togglePermission(menu, action)}
                                    className="inline-flex items-center justify-center w-6 h-6 focus:outline-none"
                                  >
                                    <div className={`w-[18px] h-[18px] flex items-center justify-center rounded-[2px] border-[1.5px] transition-all ${
                                      isChecked 
                                        ? 'border-[#5ca95c] dark:border-[#5ca95c] bg-white dark:bg-transparent' 
                                        : 'border-gray-400 dark:border-[#2A2F3A] bg-white dark:bg-transparent hover:border-gray-500 dark:hover:border-gray-400'
                                    }`}>
                                      {isChecked && <Check size={18} className="text-[#5ca95c] relative top-[-1px] right-[-1px]" strokeWidth={3} />}
                                    </div>
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    className="px-10 py-2.5 bg-[#125821] hover:bg-[#0c4015] text-white text-[15px] font-bold rounded-md transition-colors"
                  >
                    {t('save')}
                  </button>
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
