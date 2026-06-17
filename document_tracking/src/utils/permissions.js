// Centralized Role-Based Access Control (RBAC) Logic
export const hasPermission = (currentUser, menuName, action) => {
  if (!currentUser) return false;
  // Global Super Admins bypass all restrictions
  const isGlobalSuperAdmin = currentUser?.email === "admin@rupp.edu.kh";
  if (isGlobalSuperAdmin) return true;
  try {
    const permissionsData = localStorage.getItem("doc_tracking_permissions");
    if (!permissionsData) return true; // Default ALLOW if matrix is not set up
    const permissions = JSON.parse(permissionsData);
    
    // Construct the key used in Set Role Permission matrix: "DepartmentName-RoleName"
    let userDept = currentUser.department || currentUser.mainRole || "Default";
    if (userDept.toLowerCase().trim() === "itc" || userDept.toLowerCase().trim() === "itc center") {
      userDept = "IT Center";
    }
    const userType = currentUser.type || currentUser.role || "Staff";
    const key = `${userDept}-${userType}`;
    // If permissions exist for this role, check the specific action for the menu
    if (permissions[key] && permissions[key][menuName]) {
      // Return true if the action is explicitly allowed, false if explicitly denied
      return !!permissions[key][menuName][action];
    }
    // Default ALLOW if this specific role or menu hasn't been configured yet
    return true;
  } catch (error) {
    console.error("Error reading permissions from localStorage", error);
    return true; // Default ALLOW on error
  }
};
