// Centralized Role-Based Access Control (RBAC) Logic
export const hasPermission = (currentUser, menuName, action) => {
  if (!currentUser) return false;
  
  // The Global System Admin bypasses all restrictions
  if (currentUser?.email === "admin@rupp.edu.kh" || currentUser?.role?.toLowerCase() === "super admin" || currentUser?.type?.toLowerCase() === "super admin") {
    return true;
  }

  try {
    // The permissions are now loaded directly from the API and stored on the currentUser object
    const permissions = currentUser.permissions || {};
    
    // Normalize menu names just in case
    const menuMap = {
      "Request": "Request Document",
      "Receive": "Received Document",
      "Type Document": "Document Type",
      // Reverse mapping
      "Request Document": "Request",
      "Received Document": "Receive",
      "Document Type": "Type Document"
    };
    
    const actualMenuName = menuMap[menuName] || menuName;

    // Check exact requested name first
    if (permissions[menuName] && permissions[menuName][action] !== undefined) {
      return !!permissions[menuName][action];
    }
    // Check mapped name
    if (permissions[actualMenuName] && permissions[actualMenuName][action] !== undefined) {
      return !!permissions[actualMenuName][action];
    }
    
    // Default DENY if this specific role or menu action is unconfigured
    return false;
  } catch (error) {
    console.error("Error evaluating permissions", error);
    return false; // Default DENY on error for security
  }
};
