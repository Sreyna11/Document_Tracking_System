<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Notification;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $notifications = Notification::where('user_id', $user->user_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notifications);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'document_id' => 'nullable|integer',
            'user_id' => 'nullable|integer',
            'target_department' => 'nullable|string',
            'sender_name' => 'nullable|string',
            'sender_department' => 'nullable|string',
            'subject' => 'nullable|string',
            'details' => 'nullable|string',
            'message' => 'required|string',
        ]);

        $notification = Notification::create($validated);

        return response()->json($notification, 201);
    }

    public function update(Request $request, $id)
    {
        $notification = Notification::findOrFail($id);
        
        $validated = $request->validate([
            'is_read' => 'boolean'
        ]);

        $notification->update($validated);

        return response()->json($notification);
    }
}
