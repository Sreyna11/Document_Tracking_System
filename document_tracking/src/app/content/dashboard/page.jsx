"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import { useLanguage } from "../../context/LanguageContext";
import {
    AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
    BarChart, Bar, Cell
} from "recharts";
import { Bell, FileText, CheckCircle, XCircle, Clock, Calendar, ChevronDown, ChevronRight, X, Info } from "lucide-react";
const CustomXAxisTick = (props) => {
    const { x, y, payload } = props;
    const words = payload.value.split(' ');
    const lines = [];
    let currentLine = '';
    words.forEach((word) => {
        if ((currentLine + word).length > 15) {
            if (currentLine) lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine += word + ' ';
        }
    });
    if (currentLine) lines.push(currentLine.trim());
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight={600}>
                {lines.map((line, index) => (
                    <tspan x={0} dy={index === 0 ? 0 : 14} key={index}>
                        {line}
                    </tspan>
                ))}
            </text>
        </g>
    );
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
export default function DashboardPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const today = new Date();
    const currentMonthValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
    const [monthOptions, setMonthOptions] = useState([]);
    const [chartTimeframe, setChartTimeframe] = useState("Day");
    const [showSent, setShowSent] = useState(true);
    const [showCompleted, setShowCompleted] = useState(true);
    const [showLongestModal, setShowLongestModal] = useState(false);
    const [selectedLongestReq, setSelectedLongestReq] = useState(null);
    const [stats, setStats] = useState({ actionRequired: 0, totalSent: 0, completed: 0, returned: 0, inProgress: 0 });
    const [chartData, setChartData] = useState([]);
    const [longestApprovalRequests, setLongestApprovalRequests] = useState([]);
    const [docTypeUsageData, setDocTypeUsageData] = useState([]);
    const [recentRequests, setRecentRequests] = useState([]);
    useEffect(() => {
        if (showLongestModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [showLongestModal]);
    useEffect(() => {
        const userStr = sessionStorage.getItem("currentUser");
        if (!userStr) {
            router.push("/");
            return;
        }
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setIsMounted(true);
        const loadData = () => {
            try {
                const usersStr = localStorage.getItem("doc_tracking_users");
                if (usersStr) setUsersList(JSON.parse(usersStr));
            } catch (e) {
                console.error("Error loading users", e);
            }
            const reqs = JSON.parse(localStorage.getItem("doc_tracking_requests") || "[]");
            const userDept = (user.mainRole || user.department || "").toLowerCase().trim();
            // Generate the last 12 months for the dropdown
            const monthsSet = new Set();
            for (let i = 0; i < 12; i++) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            }
            // Also include any months from the requests that might be older than 12 months
            reqs.forEach(r => {
                if (r.date) {
                    const d = new Date(r.date);
                    if (!isNaN(d.getTime())) {
                        monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                    }
                }
            });
            const sortedMonths = Array.from(monthsSet).sort().reverse();
            setMonthOptions(sortedMonths);
            // --- FILTER BY SELECTED MONTH ---
            const filteredReqs = reqs.filter(r => {
                if (!r.date) return false;
                return r.date.startsWith(selectedMonth);
            });
            // Filter by department involvement so each sees their own data
            const isGlobalSuperAdmin = user.email === "admin@rupp.edu.kh";
            const myRelevantRequests = filteredReqs.filter(req => {
                if (isGlobalSuperAdmin) return true;
                const isSender = req.senderName === user.username ||
                    req.senderEmail === user.email ||
                    (userDept && req.senderDepartment && req.senderDepartment.toLowerCase().trim() === userDept);
                return isSender;
            });
            // 1. My Sent Requests
            const mySentRequests = myRelevantRequests;
            let totalSent = mySentRequests.length;
            let completedSent = 0;
            let returnedSent = 0;
            let inProgressSent = 0;
            mySentRequests.forEach(req => {
                const status = (req.status || "").toLowerCase().trim();
                if (status === "completed") completedSent++;
                else if (status === "assigned to improve" || status === "failed") returnedSent++;
                else if (status === "in progress" || status === "in progressing" || status === "pending") inProgressSent++;
            });
            // 2. Action Required (Pending Approvals for ME in selected month)
            const pendingList = filteredReqs.filter(req => {
                const status = (req.status || "").toLowerCase().trim();
                if (status !== "in progress" && status !== "in progressing" && status !== "pending") return false;
                const currentReviewerRole = req.path && req.path.length > 0
                    ? (typeof req.path[req.currentStepIndex || 0] === 'string'
                        ? req.path[req.currentStepIndex || 0]
                        : req.path[req.currentStepIndex || 0].mainRole)
                    : null;
                const isMyTurn =
                    isGlobalSuperAdmin ||
                    (currentReviewerRole && currentReviewerRole.toLowerCase().trim() === userDept) ||
                    (!currentReviewerRole && (userDept === "acc" || userDept === "inventory" || userDept === "itc"));
                return isMyTurn;
            });
            setStats({
                actionRequired: pendingList.length,
                totalSent: totalSent,
                completed: completedSent,
                returned: returnedSent,
                inProgress: inProgressSent
            });
            // 3. Activity Overview Area Chart (Day/Week/Month)
            let formattedChartData = [];
            const dataMap = {};
            const [selYear, selMonth] = selectedMonth.split('-');
            if (chartTimeframe === "Day") {
                const daysInMonth = new Date(parseInt(selYear), parseInt(selMonth), 0).getDate();
                for (let i = 1; i <= daysInMonth; i++) {
                    const dateKey = `${selectedMonth}-${String(i).padStart(2, '0')}`;
                    dataMap[dateKey] = { date: dateKey, sent: 0, completed: 0 };
                }
                myRelevantRequests.forEach(r => {
                    if (!r.date) return;
                    const dateKey = r.date.split('T')[0];
                    if (dataMap[dateKey]) {
                        dataMap[dateKey].sent++;
                        if ((r.status || "").toLowerCase().trim() === "completed") dataMap[dateKey].completed++;
                    }
                });
                formattedChartData = Object.values(dataMap);
                if (selectedMonth === currentMonthValue) {
                    const currentDay = today.getDate();
                    formattedChartData = formattedChartData.filter(d => parseInt(d.date.split('-')[2]) <= currentDay);
                }
                formattedChartData = formattedChartData.map(d => {
                    const [y, m, day] = d.date.split('-');
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    return { name: `${parseInt(day)} ${monthNames[parseInt(m) - 1]}`, Sent: d.sent, Completed: d.completed };
                });
            } else if (chartTimeframe === "Week") {
                for (let i = 1; i <= 4; i++) {
                    dataMap[`Week ${i}`] = { name: `Week ${i}`, sent: 0, completed: 0 };
                }
                myRelevantRequests.forEach(r => {
                    if (!r.date) return;
                    const dateStr = r.date.split('T')[0];
                    if (dateStr.startsWith(selectedMonth)) {
                        const day = parseInt(dateStr.split('-')[2]);
                        const weekNum = Math.min(Math.ceil(day / 7), 4);
                        const wKey = `Week ${weekNum}`;
                        dataMap[wKey].sent++;
                        if ((r.status || "").toLowerCase().trim() === "completed") dataMap[wKey].completed++;
                    }
                });
                formattedChartData = Object.values(dataMap).map(d => ({
                    name: d.name,
                    Sent: d.sent,
                    Completed: d.completed
                }));
            } else if (chartTimeframe === "Month") {
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                for (let i = 1; i <= 12; i++) {
                    const mKey = `${selYear}-${String(i).padStart(2, '0')}`;
                    dataMap[mKey] = { name: monthNames[i - 1], sent: 0, completed: 0 };
                }
                const yearReqs = reqs.filter(r => r.date && r.date.startsWith(selYear));
                const myYearReqs = yearReqs.filter(req => {
                    if (isGlobalSuperAdmin) return true;
                    const isSender = req.senderName === user.username ||
                        req.senderEmail === user.email ||
                        (userDept && req.senderDepartment && req.senderDepartment.toLowerCase().trim() === userDept);
                    return isSender;
                });
                myYearReqs.forEach(r => {
                    const mKey = r.date.substring(0, 7);
                    if (dataMap[mKey]) {
                        dataMap[mKey].sent++;
                        if ((r.status || "").toLowerCase().trim() === "completed") dataMap[mKey].completed++;
                    }
                });
                formattedChartData = Object.values(dataMap).map(d => ({
                    name: d.name,
                    Sent: d.sent,
                    Completed: d.completed
                }));
                if (selYear === String(today.getFullYear())) {
                    const currentM = today.getMonth() + 1;
                    formattedChartData = formattedChartData.slice(0, currentM);
                }
            }
            setChartData(formattedChartData);
            // 4. Longest Time to Approve Table
            const completedReqs = myRelevantRequests.filter(r => {
                const s = (r.status || "").toLowerCase().trim();
                return s === "completed";
            });
            const getExactTimeMs = (startStr, endStr) => {
                if (!startStr) return 0;
                const sDate = new Date(startStr);
                const eDate = endStr ? new Date(endStr) : new Date();
                if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return 0;
                return Math.max(0, eDate - sDate);
            };
            const formatDuration = (diffMs) => {
                const diffSecs = Math.floor(diffMs / 1000);
                const days = Math.floor(diffSecs / 86400);
                const hours = Math.floor((diffSecs % 86400) / 3600);
                const mins = Math.floor((diffSecs % 3600) / 60);
                const secs = diffSecs % 60;
                if (days > 0) return `${days}d ${hours}h ${mins}m`;
                if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
                if (mins > 0) return `${mins}m ${secs}s`;
                return `${secs}s`;
            };
            const longestArr = completedReqs.map(r => {
                let longestStepMs = 0;
                let longestStepName = "Unknown";
                let totalMs = 0;
                let stepsDetail = [];
                if (r.path && r.path.length > 1) {
                    for (let i = 1; i < r.path.length; i++) {
                        const currentStepObj = r.path[i];
                        const deptName = typeof currentStepObj === 'string' ? currentStepObj : currentStepObj.department || currentStepObj.mainRole || "Unknown";
                        let startStr = currentStepObj.viewedAt || r.path[i - 1].approvedAt || r.date;
                        let endStr = currentStepObj.approvedAt || new Date().toISOString();
                        const stepMs = getExactTimeMs(startStr, endStr);
                        totalMs += stepMs;
                        if (stepMs >= longestStepMs) {
                            longestStepMs = stepMs;
                            longestStepName = deptName;
                        }
                        stepsDetail.push({
                            index: i,
                            name: `Step ${i}`,
                            department: deptName,
                            timeMs: stepMs,
                            timeFormatted: formatDuration(stepMs)
                        });
                    }
                }
                return {
                    ...r,
                    id: r.id,
                    documentType: r.documentType || r.type || r.requestType || "Unknown Document Type",
                    title: r.title || r.subject || "Untitled Request",
                    longestStepName,
                    longestStepMs,
                    totalMs,
                    longestStepFormatted: formatDuration(longestStepMs),
                    totalTimeFormatted: formatDuration(totalMs),
                    stepsDetail
                };
            }).sort((a, b) => b.longestStepMs - a.longestStepMs).slice(0, 5);
            setLongestApprovalRequests(longestArr);
            // 5. Document Type Usage (Most Used) Bar Chart
            const docTypeCount = {};
            myRelevantRequests.forEach(r => {
                const t = r.documentType || "Other";
                docTypeCount[t] = (docTypeCount[t] || 0) + 1;
            });
            const docTypeArr = Object.entries(docTypeCount)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
            setDocTypeUsageData(docTypeArr);
            // 6. My Recent Requests
            setRecentRequests(mySentRequests.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3));
        };
        loadData();
        const handleStorageChange = (e) => {
            if (e.key === "doc_tracking_requests") {
                loadData();
            }
        };
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [router, selectedMonth, chartTimeframe]);
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };
    const getDisplayName = () => {
        let name = "User";
        if (currentUser?.firstName || currentUser?.lastName) {
            name = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim();
        } else if (currentUser?.username) {
            name = currentUser.username;
        }
        const englishOnly = name.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim();
        return englishOnly || name;
    };
    const formatMonthOption = (val) => {
        if (!val) return "";
        const [y, m] = val.split('-');
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return `${monthNames[parseInt(m) - 1]} ${y}`;
    };
    const getFallbackSigner = (req) => {
        let name = "Final Receiver";
        if (req.completedBy) {
            name = req.completedBy;
        } else if (req.path && req.path.length > 0) {
            const lastStep = req.path[req.path.length - 1];
            const role = (typeof lastStep === 'string' ? lastStep : lastStep.mainRole).toLowerCase().trim();
            const user = usersList.find(u => (u.mainRole || u.department || "").toLowerCase().trim() === role);
            if (user) name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        }
        const englishOnly = name.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim();
        return englishOnly || name;
    };
    const getFallbackSignerRole = (req) => {
        if (req.completedByRole) return req.completedByRole;
        if (req.path && req.path.length > 0) {
            const lastStep = req.path[req.path.length - 1];
            return typeof lastStep === 'string' ? lastStep : lastStep.mainRole;
        }
        return "Unknown";
    };
    const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899'];
    if (!isMounted) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0F1117] flex items-center justify-center select-none">
                <div className="text-gray-400 font-semibold animate-pulse">{t('checking_credentials')}</div>
            </div>
        );
    }
    return (
        <div className="flex min-h-screen bg-[#f8fafc] dark:bg-[#0F1117] text-gray-900 dark:text-white font-sans">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <main className={`flex-1 transition-all duration-300 ease-in-out flex flex-col min-w-0`}>
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} currentUser={currentUser} />
                <div className="p-6 md:p-8 flex-1 w-full mx-auto flex flex-col gap-6 animate-fade-in">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                                {getGreeting()}, <span className="text-emerald-500 dark:text-emerald-400">{getDisplayName()}</span> 👋
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Here's what's happening with your documents today.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-white dark:bg-[#161B22] px-4 py-2 rounded-lg border border-slate-200 dark:border-[#2A2F3A] shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Calendar size={16} className="text-slate-400 dark:text-slate-500" />
                                {today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="relative">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="appearance-none bg-white dark:bg-[#161B22] px-4 py-2 pr-10 rounded-lg border border-slate-200 dark:border-[#2A2F3A] shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                >
                                    {monthOptions.map(m => (
                                        <option key={m} value={m}>{m === currentMonthValue ? "This Month" : formatMonthOption(m)}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                    {/* Top Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {/* Action Required */}
                        <div className="bg-white dark:bg-[#161B22] rounded-xl p-5 border border-slate-100 dark:border-[#2A2F3A] shadow-sm flex flex-col gap-1 transition-all hover:shadow-md cursor-pointer" onClick={() => router.push("/content/received")}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 dark:text-orange-400">
                                    <Bell size={16} />
                                </div>
                                <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400">{t("actions_required") || "Action Required"}</h3>
                            </div>
                            <div className="text-3xl font-black text-slate-800 dark:text-white">{stats.actionRequired}</div>
                            <div className="text-xs font-semibold text-orange-500 dark:text-orange-400 mt-1 flex items-center gap-1">{t("requires_attention")} <ChevronRight size={12} /></div>
                        </div>
                        {/* Total Sent */}
                        <div className="bg-white dark:bg-[#161B22] rounded-xl p-5 border border-slate-100 dark:border-[#2A2F3A] shadow-sm flex flex-col gap-1 transition-all hover:shadow-md cursor-pointer" onClick={() => router.push("/content/tracking-document")}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-500 dark:text-purple-400">
                                    <FileText size={16} />
                                </div>
                                <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400">{t("total")} {t("sent")}</h3>
                            </div>
                            <div className="text-3xl font-black text-slate-800 dark:text-white">{stats.totalSent}</div>
                            <div className="text-xs font-semibold text-purple-500 dark:text-purple-400 mt-1 flex items-center gap-1">{t("documents_initiated")} <ChevronRight size={12} /></div>
                        </div>
                        {/* Completed */}
                        <div className="bg-white dark:bg-[#161B22] rounded-xl p-5 border border-slate-100 dark:border-[#2A2F3A] shadow-sm flex flex-col gap-1 transition-all hover:shadow-md cursor-pointer" onClick={() => router.push("/content/completed")}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                                    <CheckCircle size={16} />
                                </div>
                                <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400">{t("completed_stat") || t("completed")}</h3>
                            </div>
                            <div className="text-3xl font-black text-slate-800 dark:text-white">{stats.completed}</div>
                            <div className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 mt-1 flex items-center gap-1">{t("successfully_finished")} <ChevronRight size={12} /></div>
                        </div>
                        {/* Returned / Failed */}
                        <div className="bg-white dark:bg-[#161B22] rounded-xl p-5 border border-slate-100 dark:border-[#2A2F3A] shadow-sm flex flex-col gap-1 transition-all hover:shadow-md cursor-pointer" onClick={() => router.push("/content/returned")}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-500 dark:text-rose-400">
                                    <XCircle size={16} />
                                </div>
                                <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400">{t("returned_failed")}</h3>
                            </div>
                            <div className="text-3xl font-black text-slate-800 dark:text-white">{stats.returned}</div>
                            <div className="text-xs font-semibold text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">{t("needs_corrections")} <ChevronRight size={12} /></div>
                        </div>
                        {/* In Progress */}
                        <div className="bg-white dark:bg-[#161B22] rounded-xl p-5 border border-slate-100 dark:border-[#2A2F3A] shadow-sm flex flex-col gap-1 transition-all hover:shadow-md cursor-pointer" onClick={() => router.push("/content/in-progress")}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400">
                                    <Clock size={16} />
                                </div>
                                <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400">{t("in_progress_stat") || t("in_progress")}</h3>
                            </div>
                            <div className="text-3xl font-black text-slate-800 dark:text-white">{stats.inProgress}</div>
                            <div className="text-xs font-semibold text-blue-500 dark:text-blue-400 mt-1 flex items-center gap-1">{t("currently_in_process")} <ChevronRight size={12} /></div>
                        </div>
                    </div>
                    {/* Row 2: Charts and Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Activity Overview */}
                            <div className="bg-white dark:bg-[#161B22] rounded-xl p-6 shadow-sm border border-slate-100 dark:border-[#2A2F3A] flex flex-col min-h-[350px]">
                                <div className="flex items-center gap-2 mb-6">
                                    <h3 className="text-base font-extrabold text-slate-800 dark:text-white">{t("activity_overview")}</h3>
                                </div>
                                {/* Header: Legend on Left, Toggle on Right */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                    {/* Custom Legend */}
                                    <div className="flex items-center gap-6">
                                        <div
                                            className={`flex items-center gap-2 cursor-pointer group ${!showSent ? 'opacity-40 grayscale' : ''}`}
                                            onClick={() => setShowSent(!showSent)}
                                        >
                                            <div className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center bg-white dark:bg-[#161B22] group-hover:bg-blue-50 dark:group-hover:bg-[#242B36] transition-colors">
                                                <div className={`w-2 h-2 rounded-full bg-blue-500 ${showSent ? 'scale-100' : 'scale-0'} transition-transform`}></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-blue-600 dark:text-blue-400">{t("total")} {t("sent")}</span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{t("activity")}</span>
                                            </div>
                                        </div>
                                        <div
                                            className={`flex items-center gap-2 cursor-pointer group ${!showCompleted ? 'opacity-40 grayscale' : ''}`}
                                            onClick={() => setShowCompleted(!showCompleted)}
                                        >
                                            <div className="w-4 h-4 rounded-full border-2 border-green-500 flex items-center justify-center bg-white dark:bg-[#161B22] group-hover:bg-green-50 dark:group-hover:bg-[#242B36] transition-colors">
                                                <div className={`w-2 h-2 rounded-full bg-green-500 ${showCompleted ? 'scale-100' : 'scale-0'} transition-transform`}></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-green-600 dark:text-green-400">{t("completed_stat") || t("completed")}</span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{t("activity")}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Day/Week/Month Toggle */}
                                    <div className="flex bg-slate-50 dark:bg-[#0F1117] p-1 rounded-lg border border-slate-100 dark:border-[#2A2F3A]">
                                        {['Day', 'Week', 'Month'].map(tf => (
                                            <button
                                                key={tf}
                                                onClick={() => setChartTimeframe(tf)}
                                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${chartTimeframe === tf ? 'bg-white dark:bg-[#242B36] text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                            >
                                                {tf}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1 w-full relative">
                                    {chartData.length === 0 ? (
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm font-medium">No activity data available.</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-[#2A2F3A]" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} dy={10} />
                                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} dx={-10} />
                                                <RechartsTooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)', padding: '8px 12px', fontSize: '12px' }}
                                                    labelStyle={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}
                                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                                                />
                                                {showSent && <Area type="monotone" dataKey="Sent" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSent)" activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }} />}
                                                {showCompleted && <Area type="monotone" dataKey="Completed" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" activeDot={{ r: 6, strokeWidth: 0, fill: '#22c55e' }} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#22c55e' }} />}
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                            {/* Requests Taking Longest Time */}
                            <div className="bg-white dark:bg-[#161B22] rounded-xl p-6 shadow-sm border border-slate-100 dark:border-[#2A2F3A] flex flex-col min-h-[350px]">
                                <div className="flex items-center gap-2 mb-4">
                                    <Clock size={18} className="text-rose-500 dark:text-rose-400" />
                                    <h3 className="text-base font-extrabold text-rose-600 dark:text-rose-400">{t("requests_longest_time")}</h3>
                                </div>
                                <div className="flex-1 overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead>
                                            <tr className="text-[14px] font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-[#2A2F3A]">
                                                <th className="pb-3 font-bold">{t("type_document")}</th>
                                                <th className="pb-3 font-bold">{t("title") || "Title"}</th>
                                                <th className="pb-3 font-bold text-center">{t("total_times")}</th>
                                                <th className="pb-3 font-bold text-center">{t("action")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-slate-700 dark:text-slate-300">
                                            {longestApprovalRequests.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-8 text-slate-400 dark:text-slate-500 font-medium">No completed requests found.</td>
                                                </tr>
                                            ) : longestApprovalRequests.map((req, idx) => (
                                                <tr
                                                    key={idx}
                                                    onClick={() => router.push("/content/tracking-document?id=" + req.id)}
                                                    className="border-b border-slate-50 dark:border-[#242B36] last:border-none hover:bg-slate-50 dark:hover:bg-[#242B36]/50 transition-colors cursor-pointer"
                                                >
                                                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{req.documentType}</td>
                                                    <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-white max-w-[150px] truncate" title={req.title}>{req.title}</td>
                                                    <td className="py-3 pl-2 text-center">
                                                        <span className="px-2 py-1 rounded text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                                            {req.totalTimeFormatted}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 pl-2 text-center">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedLongestReq(req); setShowLongestModal(true); }}
                                                            className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!longestApprovalRequests || longestApprovalRequests.length === 0) && (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-8 text-slate-400 dark:text-slate-500 font-medium">No completed requests found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-auto flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                    <Info size={18} className="shrink-0 mt-0.5 text-blue-500 dark:text-blue-400" />
                                    <span className="text-sm font-medium leading-relaxed">
                                        These requests took the longest time to be processed and completed.
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Row 3: Document Type Usage and My Recent Requests */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
                            {/* Document Type Usage */}
                            <div className="bg-white dark:bg-[#161B22] rounded-xl p-6 shadow-sm border border-slate-100 dark:border-[#2A2F3A] flex flex-col h-[420px] lg:col-span-2">
                                <h3 className="text-base font-extrabold text-slate-800 dark:text-white mb-6">{t("document_type_usage")}</h3>
                                <div className="flex-1 w-full relative">
                                    {docTypeUsageData.length === 0 ? (
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm font-medium">No data available.</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={docTypeUsageData} margin={{ top: 20, right: 20, left: -20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-[#2A2F3A]" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={<CustomXAxisTick />} interval={0} />
                                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
                                                <RechartsTooltip
                                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)', padding: '8px 12px', fontSize: '12px' }}
                                                />
                                                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40} label={{ position: 'top', fill: '#64748b', fontSize: 12, fontWeight: 600, dy: -5 }}>
                                                    {docTypeUsageData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                            {/* My Recent Requests */}
                            <div className="bg-white dark:bg-[#161B22] rounded-xl p-6 shadow-sm border border-slate-100 dark:border-[#2A2F3A] flex flex-col h-[420px] lg:col-span-1">
                                <h3 className="text-base font-extrabold text-slate-800 dark:text-white mb-4">{t("my_recent_requests")}</h3>
                                <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
                                    {recentRequests.length === 0 ? (
                                        <div className="text-slate-400 dark:text-slate-500 font-medium text-center py-10">No recent requests found</div>
                                    ) : (
                                        recentRequests.map((req, idx) => {
                                            const status = (req.status || "").toLowerCase().trim();
                                            const isCompleted = status === "completed";
                                            const isReturned = status === "assigned to improve" || status === "failed";
                                            return (
                                                <div key={idx} className="flex flex-col gap-2 p-3.5 rounded-xl border border-slate-100 dark:border-[#2A2F3A] bg-white dark:bg-[#161B22] hover:border-blue-100 dark:hover:border-blue-500/30 hover:shadow-sm transition-all cursor-pointer" onClick={() => router.push("/content/tracking-document?id=" + req.id)}>
                                                    {/* Top Row: ID & Status */}
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 tracking-wider">#{req.trackingNumber || req.id}</span>
                                                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                                                            isReturned ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' :
                                                                'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                            }`}>
                                                            {req.status === "In Progressing" ? "In Progress" : req.status || "Pending"}
                                                        </span>
                                                    </div>
                                                    {/* Middle Row: Title */}
                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2 leading-snug pr-2">
                                                        {req.title || req.subject || req.documentType}
                                                    </h4>
                                                    {/* Bottom Row: Signer Info */}
                                                    <div className="mt-1 pt-2 border-t border-slate-50 dark:border-[#242B36]">
                                                        {isCompleted ? (
                                                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                                                {t("signed_by")} <span className="font-bold text-slate-700 dark:text-slate-300">{getFallbackSigner(req)}</span> <span className="text-slate-400 dark:text-slate-500 uppercase text-[9px] hidden sm:inline">({getFallbackSignerRole(req)})</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                                                {t("waiting_sign_by")} <span className="font-bold text-slate-700 dark:text-slate-300">{req.path && req.path[req.currentStepIndex || 0] ? (typeof req.path[req.currentStepIndex || 0] === 'string' ? req.path[req.currentStepIndex || 0] : req.path[req.currentStepIndex || 0].mainRole) : "N/A"}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    {recentRequests.length > 0 && (
                                        <button className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-center py-2" onClick={() => router.push("/content/tracking-document")}>
                                            {t("view_all_requests")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div> {/* Close Row 3 Grid */}
                        
                        {/* Longest Time Request Detail Modal */}
                            {showLongestModal && selectedLongestReq && (
                                <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/50 backdrop-blur-md animate-fade-in p-4 sm:p-6" onClick={() => setShowLongestModal(false)}>
                                    <div className="mx-auto mt-8 sm:mt-12 mb-8 bg-white dark:bg-[#161B22] rounded-2xl shadow-xl border border-slate-100 dark:border-[#2A2F3A] w-full max-w-4xl flex flex-col" onClick={e => e.stopPropagation()}>
                                        {/* Modal Header */}
                                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-[#2A2F3A]">
                                            <h2 className="text-xl font-black text-slate-800 dark:text-white">{t("request_details")}</h2>
                                            <button
                                                onClick={() => setShowLongestModal(false)}
                                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2A2F3A] rounded-full transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                        {/* Modal Body */}
                                        <div className="p-6 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white dark:bg-[#0F1117] rounded-b-2xl">
                                            {/* Left Panel: Request Taking Longest */}
                                            <div className="bg-white dark:bg-[#0B0D12] rounded-xl p-6 border border-slate-200 dark:border-[#2A2F3A] shadow-sm flex flex-col relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
                                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">{t("request_taking_longest") || "Request Taking Longest"}</h3>
                                                <div className="flex items-start gap-4 mb-8">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{selectedLongestReq.title || selectedLongestReq.subject}</h4>
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 mt-2 border border-purple-200 dark:border-purple-800/50">
                                                            {selectedLongestReq.trackingNumber || selectedLongestReq.id}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-5 mb-8 flex-1">
                                                    <div>
                                                        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">{t("requested_by")}</div>
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-white">{selectedLongestReq.senderDepartment || "Unknown Department"}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">{t("requested_on")}</div>
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-white">
                                                            {selectedLongestReq.date ? new Date(selectedLongestReq.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Unknown Date"}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">{t("current_step")}</div>
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-white">
                                                            {selectedLongestReq.path && selectedLongestReq.path.length > 0
                                                                ? (typeof selectedLongestReq.path[selectedLongestReq.path.length - 1] === 'string'
                                                                    ? selectedLongestReq.path[selectedLongestReq.path.length - 1]
                                                                    : selectedLongestReq.path[selectedLongestReq.path.length - 1].department || selectedLongestReq.path[selectedLongestReq.path.length - 1].mainRole)
                                                                : "Completed"}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-auto flex items-center justify-between p-4 bg-white dark:bg-[#161B22] rounded-xl border border-slate-100 dark:border-[#2A2F3A]">
                                                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                                                        <Clock size={16} />
                                                        {t("total_time_elapsed") || "Total Time Elapsed"}
                                                    </div>
                                                    <div className="px-3 py-1 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-sm">
                                                        {selectedLongestReq.totalTimeFormatted}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Right Panel: Step Taking Longest Time */}
                                            <div className="bg-white dark:bg-[#0B0D12] rounded-xl p-6 border border-slate-200 dark:border-[#2A2F3A] shadow-sm flex flex-col relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">{t("step_taking_longest_time") || "Step Taking Longest Time"}</h3>

                                                <div className="overflow-hidden border border-slate-100 dark:border-[#2A2F3A] rounded-xl mb-6">
                                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                                        <thead className="bg-white dark:bg-[#161B22]">
                                                            <tr className="text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                                                                <th className="px-4 py-3 border-b border-slate-100 dark:border-[#2A2F3A]">{t("step") || "Step"}</th>
                                                                <th className="px-4 py-3 border-b border-slate-100 dark:border-[#2A2F3A]">{t("department") || "Department"}</th>
                                                                <th className="px-4 py-3 border-b border-slate-100 dark:border-[#2A2F3A] text-right">{t("time_spent") || "Time Spent"}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-[#2A2F3A] font-medium text-slate-700 dark:text-slate-300">
                                                            {selectedLongestReq.stepsDetail?.map((step, idx) => (
                                                                <tr key={idx} className="bg-white dark:bg-transparent">
                                                                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{step.index}. {step.name}</td>
                                                                    <td className="px-4 py-3.5 text-slate-800 dark:text-white font-semibold">{step.department}</td>
                                                                    <td className="px-4 py-3.5 text-right">
                                                                        {step.timeMs > 0 ? (
                                                                            <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${step.timeMs === selectedLongestReq.longestStepMs ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50' : 'bg-slate-100 dark:bg-[#161B22] text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700'}`}>
                                                                                {step.timeFormatted}
                                                                            </span>
                                                                        ) : <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {(!selectedLongestReq.stepsDetail || selectedLongestReq.stepsDetail.length === 0) && (
                                                                <tr>
                                                                    <td colSpan="3" className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 font-medium">No step details available</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="mt-auto flex items-start gap-3 p-4 bg-white dark:bg-[#161B22] text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
                                                    <Info size={18} className="shrink-0 mt-0.5 text-blue-500 dark:text-blue-400" />
                                                    <span className="text-sm font-medium leading-relaxed">
                                                        {t("step_prefix") || "The"} <strong className="font-bold">{selectedLongestReq.longestStepName}</strong> {t("step_is_taking_longest") || "step is taking the longest."}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                    </div>
                </main>
            </div>
    );
}
