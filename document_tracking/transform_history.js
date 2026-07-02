const fs = require('fs');
const targetFile = 'd:\\Document_Tracking_System\\document_tracking\\src\\app\\content\\history-request\\page.jsx';

let content = fs.readFileSync(targetFile, 'utf8');

// 1. Rename Component
content = content.replace('export default function ReceivedPage() {', 'export default function HistoryPage() {');

// 2. Change Titles
content = content.replace(/\{t\("receive"\)\}/g, 'History Requests');
content = content.replace(/Receive Documents/g, 'History Requests');
content = content.replace(/t\("receive"\)/g, 't("history_request") || "History Requests"');
content = content.replace(/>Receive</g, '>History<');

// 3. Permission
content = content.replace(/hasPermission\(currentUser, "Receive", "View Any"\)/g, 'hasPermission(currentUser, "History Request", "View Any")');

// 4. Update filtering logic (around line 321)
const filterStart = content.indexOf('let list = requests.filter((req) => {');
const filterEnd = content.indexOf('if (searchTerm.trim() !== "") {');
if (filterStart !== -1 && filterEnd !== -1) {
    const historyFilter = `let list = requests.filter((req) => {
            if (isGlobalSuperAdmin || canViewAny) return true;
            
            // Check if user is the sender
            const sEmail = (req.senderEmail || "").toLowerCase().trim();
            const uEmail = (currentUser?.email || "").toLowerCase().trim();
            if (sEmail && uEmail && sEmail === uEmail) return true;
            
            const sName = (req.senderName || "").toLowerCase().trim();
            const uName = (currentUser?.username || currentUser?.name || "").toLowerCase().trim();
            if (sName && uName && sName === uName) return true;
            
            // Check if user is in the path (receiver/approver)
            if (req.path) {
                const myIndex = req.path.findIndex(p => {
                    const role = typeof p === 'string' ? p : p.department || p.mainRole;
                    return role && role.toLowerCase().trim() === userDept;
                });
                if (myIndex !== -1) {
                    const currentIndex = req.currentStepIndex !== undefined ? req.currentStepIndex : 0;
                    // If the document has passed through them, or they are current, they can see it in history
                    if (currentIndex >= myIndex) return true;
                    // Or if it's completed/failed/returned
                    if (["completed", "failed", "assigned to improve"].includes(req.status?.toLowerCase().trim())) return true;
                }
            }
            
            return false;
        });
        `;
    content = content.substring(0, filterStart) + historyFilter + content.substring(filterEnd);
}

fs.writeFileSync(targetFile, content);
console.log('Successfully transformed to HistoryPage');
