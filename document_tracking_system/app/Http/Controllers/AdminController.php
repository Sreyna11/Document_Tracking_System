<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use App\Models\User;
use App\Models\Department;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class AdminController extends Controller
{
    public function getDashboardStats(Request $request)
    {
        // 1. Total Metrics
        $totalDocuments = Document::count();
        $totalUsers = User::count();
        $totalDepartments = Department::count();
        $completedDocuments = Document::where('status', 'Completed')->count();

        // 2. Documents Flow (Last 30 days)
        $thirtyDaysAgo = now()->subDays(30);
        $documentFlow = Document::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('COUNT(*) as total_created'),
            DB::raw('SUM(CASE WHEN status = "Completed" THEN 1 ELSE 0 END) as total_completed')
        )
        ->where('created_at', '>=', $thirtyDaysAgo)
        ->groupBy(DB::raw('DATE(created_at)'))
        ->orderBy(DB::raw('DATE(created_at)'))
        ->get();

        // 3. Department Volume (Top active departments by sending/receiving)
        // For simplicity, we count documents created per department
        $departmentVolume = DB::table('documents')
            ->join('departments', 'documents.department_id', '=', 'departments.department_id')
            ->select('departments.name as department_name', DB::raw('COUNT(documents.document_id) as total_documents'))
            ->groupBy('departments.department_id', 'departments.name')
            ->orderByDesc('total_documents')
            ->limit(10)
            ->get();

        // 4. Recent Audit Logs
        $recentLogs = AuditLog::with('user', 'document')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'action_details' => json_decode($log->action_details, true),
                    'user_name' => $log->user ? $log->user->name : 'Unknown User',
                    'document_number' => $log->document ? $log->document->document_number : 'Unknown Document',
                    'document_title' => $log->document ? $log->document->title : '',
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json([
            'metrics' => [
                'total_documents' => $totalDocuments,
                'total_users' => $totalUsers,
                'total_departments' => $totalDepartments,
                'completed_documents' => $completedDocuments
            ],
            'document_flow' => $documentFlow,
            'department_volume' => $departmentVolume,
            'recent_logs' => $recentLogs
        ]);
    }
}
