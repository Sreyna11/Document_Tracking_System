"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Inbox,
  FileSearch,
  Files,
  Users,
  ShieldCheck,
  Briefcase,
  UserCog,
  LogOut,
  Search,
  Bell,
  Menu,
  ChevronDown,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
import { useState } from "react";

export default function ContentLayout({ children }) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState({
    documentFlow: true,
    settings: true,
    rolePermission: true
  });

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const isMenuActive = (path) => pathname === path;

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed md:relative z-50 h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-[280px] translate-x-0' : 'w-[280px] -translate-x-full md:w-0 md:hidden'}`}>
        {/* Logo Area */}
        <div className="h-20 flex items-center px-6 shrink-0 mt-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 relative">
              <img src="/Rupp_logo.svg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-[#D4AF37] font-bold text-[13px] font-khmer leading-tight mb-0.5">សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ</h1>
              <p className="text-[#D4AF37] text-[10px] font-medium leading-tight">Royal University of Phnom Penh</p>
            </div>
          </div>
        </div>

        {/* Search Sidebar */}
        <div className="px-6 py-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-400 shadow-sm"
            />
          </div>
        </div>

        {/* Navigation Menus */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          
          <Link href="/content/dashboard" className={`flex items-center space-x-4 px-4 py-3 rounded-xl text-sm ${isMenuActive('/content/dashboard') ? 'font-semibold bg-green-50 text-[#115E26]' : 'font-medium text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>

          <div className="pt-4">
            <button 
              onClick={() => toggleMenu('documentFlow')}
              className="w-full flex items-center justify-between px-4 py-2 mb-1 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors focus:outline-none"
            >
              <h3 className="text-sm font-medium">Document Flow</h3>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${openMenus.documentFlow ? 'rotate-180' : ''}`} />
            </button>
            {openMenus.documentFlow && (
              <div className="space-y-1 mt-2">
                <Link href="/content/request" className={`flex items-center space-x-4 px-4 py-2.5 rounded-xl text-sm relative group ${isMenuActive('/content/request') ? 'font-semibold bg-green-50 text-[#115E26]' : 'font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
                  <FileText className="h-5 w-5" />
                  <span>Request</span>
                </Link>
                <Link href="/content/receive" className={`flex items-center space-x-4 px-4 py-2.5 rounded-xl text-sm relative group ${isMenuActive('/content/receive') ? 'font-semibold bg-green-50 text-[#115E26]' : 'font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
                  <Inbox className="h-5 w-5" />
                  <span>Receive</span>
                </Link>
                <Link href="/content/tracking-document" className={`flex items-center space-x-4 px-4 py-2.5 rounded-xl text-sm relative group ${isMenuActive('/content/tracking-document') ? 'font-semibold bg-green-50 text-[#115E26]' : 'font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
                  <FileSearch className="h-5 w-5" />
                  <span>Tracking Document</span>
                </Link>
                <Link href="/content/document-type" className={`flex items-center space-x-4 px-4 py-2.5 rounded-xl text-sm relative group ${isMenuActive('/content/document-type') ? 'font-semibold bg-green-50 text-[#115E26]' : 'font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
                  <Files className="h-5 w-5" />
                  <span>Document Type</span>
                </Link>
              </div>
            )}
          </div>

          <div className="pt-4 pb-12">
            <button 
              onClick={() => toggleMenu('settings')}
              className="w-full flex items-center justify-between px-4 py-2 mb-1 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors focus:outline-none"
            >
              <h3 className="text-sm font-medium">Settings</h3>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${openMenus.settings ? 'rotate-180' : ''}`} />
            </button>
            {openMenus.settings && (
              <div className="space-y-1 mt-2">
                <Link href="/content/account" className={`flex items-center space-x-4 px-4 py-3 rounded-xl text-sm font-semibold ${isMenuActive('/content/account') ? 'bg-[#115E26] text-white' : 'font-medium text-gray-500 hover:bg-gray-50'}`}>
                  <Users className="h-5 w-5" />
                  <span>Account</span>
                </Link>
                
                <div className="mt-2">
                  <button 
                    onClick={() => toggleMenu('rolePermission')}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 rounded-xl transition-colors focus:outline-none"
                  >
                    <div className="flex items-center space-x-4">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="text-sm font-medium">Role & Permission</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${openMenus.rolePermission ? 'rotate-180' : ''}`} />
                  </button>
                  {openMenus.rolePermission && (
                    <div className="ml-6 mt-1 pl-4 border-l-2 border-gray-100 space-y-1 relative">
                      <Link href="/content/job-department" className={`flex items-center space-x-3 px-4 py-2 rounded-xl text-sm relative group ${isMenuActive('/content/job-department') ? 'font-semibold bg-green-50 text-[#115E26]' : 'font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                        <div className="absolute -left-[18px] top-1/2 w-3 border-t-2 border-gray-100 group-hover:border-gray-200"></div>
                        <div className={`absolute -left-[20px] top-1/2 w-1.5 h-1.5 rounded-full border-2 bg-white -mt-[3px] ${isMenuActive('/content/job-department') ? 'border-[#115E26]' : 'border-gray-200 group-hover:border-gray-300'}`}></div>
                        <span>Job Department</span>
                      </Link>
                       <Link href="/content/set-role-permission" className={`flex items-center space-x-3 px-4 py-2 rounded-xl text-sm relative group ${isMenuActive('/content/set-role-permission') ? 'font-semibold bg-green-50 text-[#115E26]' : 'font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                        <div className="absolute -left-[18px] top-1/2 w-3 border-t-2 border-gray-100 group-hover:border-gray-200"></div>
                        <div className={`absolute -left-[20px] top-1/2 w-1.5 h-1.5 rounded-full border-2 bg-white -mt-[3px] ${isMenuActive('/content/set-role-permission') ? 'border-[#115E26]' : 'border-gray-200 group-hover:border-gray-300'}`}></div>
                        <span>Set Role Permission</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 w-full">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-500 hover:text-gray-700 mr-4 focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center space-x-6">
            <button className="relative text-gray-400 hover:text-gray-600">
              <Bell className="h-6 w-6" />
              <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold text-center leading-4 ring-2 ring-white">
                28
              </span>
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-3 focus:outline-none"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">Var Sovanndara</p>
                  <p className="text-[10px] text-green-700 font-bold uppercase tracking-wider bg-green-100 rounded px-1.5 py-0.5 mt-0.5 inline-block border border-green-200">SUPER ADMIN</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center relative border-2 border-white shadow-sm overflow-hidden">
                   <img src={`https://ui-avatars.com/api/?name=Var+Sovanndara&background=random`} alt="Avatar" className="w-full h-full object-cover" />
                   <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white"></div>
                </div>
              </button>

              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 py-6 px-6 z-50">
                    
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border border-gray-200">
                        <img src={`https://ui-avatars.com/api/?name=Var+Sovanndara&background=random`} alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-gray-900 uppercase">Var Sovanndara</h3>
                      </div>
                      <span className="bg-green-300/80 text-green-800 text-[11px] font-bold px-2.5 py-1 rounded-md">
                        Active
                      </span>
                    </div>

                    <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-2 flex justify-between items-center mb-6">
                      <button className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-white shadow-sm border border-gray-100 text-green-700">
                        <Sun className="h-5 w-5 mb-1" />
                        <span className="text-[11px] font-bold">Light</span>
                      </button>
                      <button className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg text-gray-500 hover:text-gray-700 transition-colors">
                        <Moon className="h-5 w-5 mb-1" />
                        <span className="text-[11px] font-medium">Dark</span>
                      </button>
                      <button className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg text-gray-500 hover:text-gray-700 transition-colors">
                        <Monitor className="h-5 w-5 mb-1" />
                        <span className="text-[11px] font-medium">System</span>
                      </button>
                    </div>

                    <Link href="/login" className="w-full flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl py-3 transition-colors">
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm font-bold uppercase tracking-wider">Sign Out</span>
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center border border-gray-200 rounded-full p-0.5 bg-gray-50">
              <button className="px-3 py-1 text-xs font-semibold rounded-full bg-white shadow-sm text-gray-800">EN</button>
              <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700">KM</button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
