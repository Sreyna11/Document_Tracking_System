<?php

namespace App\Services;

use Telegram\Bot\Laravel\Facades\Telegram;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class TelegramNotificationService
{
    /**
     * Send a notification to a specific user.
     */
    public function sendToUser(User $user, string $message, array $keyboard = null)
    {
        if (!$user->telegram_chat_id) {
            return false;
        }

        try {
            $data = [
                'chat_id' => $user->telegram_chat_id,
                'text' => $message,
                'parse_mode' => 'HTML',
            ];

            if ($keyboard) {
                $data['reply_markup'] = json_encode(['inline_keyboard' => $keyboard]);
            }

            return Telegram::sendMessage($data);
        } catch (\Exception $e) {
            Log::error("Failed to send Telegram message to User ID {$user->id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Notification Template: New Document Request
     */
    public function notifyNewRequest($request, User $recipient)
    {
        $senderName = $request->senderName ?? 'Unknown';
        $senderDept = $request->senderDepartment ?? 'Unknown';
        $date = now()->format('d M Y \a\t H:i');
        
        $msg = "📄 <b>New Document Request</b>\n";
        $msg .= "━━━━━━━━━━━━━━━━━━\n";
        $msg .= "From: {$senderName} ({$senderDept})\n";
        $msg .= "Tracking #: {$request->trackingNumber}\n";
        $msg .= "Title: {$request->subject}\n";
        $msg .= "Description: {$request->description}\n";
        $msg .= "Tag: {$request->priority}\n";
        $msg .= "Date : {$date}\n";
        $msg .= "━━━━━━━━━━━━━━━━━━\n";
        $msg .= "👉 Action required from you.";

        $keyboard = [
            [
                ['text' => '🔍 View in Web App', 'url' => url('/receive')]
            ]
        ];

        return $this->sendToUser($recipient, $msg, $keyboard);
    }

    /**
     * Notification Template: Approved
     */
    public function notifyApproved($request, $approver, User $recipient)
    {
        $approverName = $approver->name ?? 'Unknown';
        $approverDept = $approver->department ?? 'Unknown';
        $approverComment = $approver->comment ??'';
        $date = now()->format('d M Y \a\t H:i');
        
        $type = isset($request->documentType) ? $request->documentType->name : (isset($request->type) ? $request->type : 'N/A');

        $msg = "✅ <b>Document Approved</b>\n";
        $msg .= "━━━━━━━━━━━━━━━━━━\n";
        $msg .= "Doc: ({$request->trackingNumber})\n";
        $msg .= "Title: {$request->subject}\n";
        $msg .= "Document Type : {$type}\n";
        $msg .= "Approved by: {$approverName}\n";
        $msg .= "Department : {$approverDept}\n";
        $msg .= "Comment : {$approverComment}\n";
        $msg .= "Date: {$date}\n";
        $msg .= "Status: Completed 🎉\n";

        return $this->sendToUser($recipient, $msg);
    }

    /**
     * Notification Template: Declined
     */
    public function notifyDeclined($request, $decliner, $reason, User $recipient)
    {
        $declinerName = $decliner->name ?? 'Unknown';
        $declinerDept = $decliner->department ?? 'Unknown';
        $date = now()->format('d M Y \a\t H:i');

        $msg = "❌ <b>Document Declined</b>\n";
        $msg .= "━━━━━━━━━━━━━━━━━━\n";
        $msg .= "Doc: ({$request->trackingNumber})\n";
        $msg .= "Title: {$request->subject}\n";
        $msg .= "Declined by: {$declinerName} ({$declinerDept})\n";
        $msg .= "Reason: {$reason}\n";
        $msg .= "Date: {$date}\n";

        return $this->sendToUser($recipient, $msg);
    }

    /**
     * Notification Template: Returned
     */
    public function notifyReturned($request, $returner, $comment, User $recipient)
    {
        $returnerName = $returner->name ?? 'Unknown';
        $returnerDept = $returner->department ?? 'Unknown';

        $msg = "🔄 <b>Document Returned</b>\n";
        $msg .= "━━━━━━━━━━━━━━━━━━\n";
        $msg .= "Doc: ({$request->trackingNumber})\n";
        $msg .= "Title: {$request->subject}\n";
        $msg .= "Returned by: {$returnerName} ({$returnerDept})\n";
        $msg .= "Comment: {$comment}\n";
        $msg .= "Action: Please revise and resubmit\n";

        return $this->sendToUser($recipient, $msg);
    }

    /**
     * Notification Template: Assigned To You
     */
    public function notifyAssigned($request, $assigner, User $recipient)
    {
        $assignerName = $assigner->fullname_en ?? $assigner->name ?? $assigner->username ?? 'Unknown';
        
        $tracking = $request->document_number ?? $request->trackingNumber ?? 'N/A';
        $title = $request->title ?? $request->subject ?? 'Untitled';
        $type = isset($request->documentType) ? $request->documentType->name : 'N/A';
        $dept = isset($assigner->department) ? $assigner->department->name : 'Unknown';
        $date = isset($request->created_at) ? $request->created_at->format('Y-m-d') : date('Y-m-d');

        $msg = "👤 <b>Document forwarded to You</b>\n";
        $msg .= "━━━━━━━━━━━━━━━━━━\n";
        $msg .= "Doc: {$tracking}\n";
        $msg .= "Title: {$title}\n";
        $msg .= "Type Document : {$type}\n";
        $msg .= "From : {$assignerName}\n";
        $msg .= "From Department : {$dept}\n";
        $msg .= "Date : {$date}\n";
        $msg .= "Please review and take action\n";

        return $this->sendToUser($recipient, $msg);
    }
}
