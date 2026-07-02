<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    protected $token;
    protected $apiUrl;

    public function __construct()
    {
        $this->token = env('TELEGRAM_BOT_TOKEN');
        $this->apiUrl = 'https://api.telegram.org/bot' . $this->token;
    }

    /**
     * Get the default persistent keyboard for the bot
     *
     * @return array
     */
    public function getDefaultKeyboard()
    {
        return [
            'keyboard' => [
                [
                    ['text' => '🏠 Main Menu']
                ],
                [
                    ['text' => '📄 My Documents'],
                    ['text' => '📥 Pending Approval']
                ],
                [
                    ['text' => '🔍 Track Document'],
                    ['text' => '👤 Profile']
                ],
                [
                    ['text' => '❓ Help']
                ]
            ],
            'resize_keyboard' => true,
            'persistent' => true
        ];
    }

    /**
     * Send a message to a specific Telegram Chat ID
     * 
     * @param string|int $chatId The Telegram chat ID
     * @param string $message The message text to send
     * @param array|null $replyMarkup Optional inline keyboard
     * @return bool True if successful, False otherwise
     */
    public function sendMessage($chatId, $message, $replyMarkup = null)
    {
        if (empty($this->token)) {
            Log::warning("Telegram Bot Token is not set.");
            return false;
        }

        if (empty($chatId)) {
            Log::warning("Telegram Chat ID is missing for the recipient.");
            return false;
        }

        try {
            $payload = [
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'HTML',
            ];

            if ($replyMarkup) {
                $payload['reply_markup'] = json_encode($replyMarkup);
            }

            $response = Http::post("{$this->apiUrl}/sendMessage", $payload);

            if ($response->successful()) {
                return true;
            } else {
                Log::error("Telegram API Error: " . $response->body());
                return false;
            }
        } catch (\Exception $e) {
            Log::error("Telegram Sending Exception: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Edit an existing message (used for updating the status after clicking an inline button)
     */
    public function editMessageText($chatId, $messageId, $newText, $replyMarkup = null)
    {
        try {
            $payload = [
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'text' => $newText,
                'parse_mode' => 'HTML',
            ];

            if ($replyMarkup) {
                $payload['reply_markup'] = json_encode($replyMarkup);
            } else {
                // To remove inline keyboard, pass an empty inline_keyboard array
                $payload['reply_markup'] = json_encode(['inline_keyboard' => []]);
            }

            $response = Http::post("{$this->apiUrl}/editMessageText", $payload);
            return $response->successful();
        } catch (\Exception $e) {
            Log::error("Telegram Edit Exception: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Answer a callback query to stop the loading spinner on the button
     */
    public function answerCallbackQuery($callbackQueryId, $text = null)
    {
        try {
            $payload = ['callback_query_id' => $callbackQueryId];
            if ($text) {
                $payload['text'] = $text;
            }
            Http::post("{$this->apiUrl}/answerCallbackQuery", $payload);
        } catch (\Exception $e) {
            Log::error("Telegram AnswerCallbackQuery Exception: " . $e->getMessage());
        }
    }

    /**
     * Notification Template: New Document Request
     */
    public function notifyNewRequest($request, $recipientChatId)
    {
        $senderName = $request->senderName ?? 'Unknown';
        $senderDept = $request->senderDepartment ?? 'Unknown';
        $priority = $request->priority ?? 'Normal';
        
        $tracking = $request->document_number ?? $request->trackingNumber ?? 'N/A';
        $title = $request->title ?? $request->subject ?? 'Untitled';
        
        $msg = "📄 <b>New Document Request</b>\n";
        $msg .= "━━━━━━━━━━━━━━━━━━\n";
        $msg .= "From: {$senderName} ({$senderDept})\n";
        $msg .= "Tracking #: {$tracking}\n";
        $msg .= "Title: {$title}\n";
        $msg .= "Description: {$request->description}\n";
        $msg .= "Tag: {$priority}\n";
        $msg .= "━━━━━━━━━━━━━━━━━━\n";
        $msg .= "👉 Action required from you.";

        $appUrl = env('APP_URL', 'http://localhost:3000');
        if (!preg_match("~^(?:f|ht)tps?://~i", $appUrl)) {
            $appUrl = "http://" . $appUrl;
        }
        
        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🔍 View in Web App', 'url' => "{$appUrl}/receive"]
                ]
            ]
        ];

        return $this->sendMessage($recipientChatId, $msg, $keyboard);
    }

    /**
     * Notification Template: Approved
     */
    public function notifyApproved($request, $approver, $comment, $recipientChatId)
    {
        $approverName = $approver->fullname_en ?? $approver->name ?? $approver->username ?? 'Unknown';
        $dept = $approver->department ?? null;
        $approverDept = $dept ? (is_string($dept) ? $dept : ($dept->name ?? 'Unknown')) : 'Unknown';
        $date = now()->format('d M Y \a\t H:i');

        $tracking = $request->document_number ?? $request->trackingNumber ?? 'N/A';
        $title = $request->title ?? $request->subject ?? 'Untitled';
        $type = isset($request->documentType) ? $request->documentType->name : (isset($request->type) ? $request->type : 'N/A');

        $msg = "✅ <b>Document Approved</b>\n";
        $msg .= "━━━━━━━━━━━━━━━━━━\n";
        $msg .= "Doc: ({$tracking})\n";
        $msg .= "Title: {$title}\n";
        $msg .= "Document Type : {$type}\n";
        $msg .= "Approved by: {$approverName}\n";
        $msg .= "Department : {$approverDept}\n";
        if ($comment && trim($comment) !== '') {
            $msg .= "Comment: {$comment}\n";
        }
        $msg .= "Date: {$date}\n";
        $msg .= "Status: Completed 🎉\n";

        return $this->sendMessage($recipientChatId, $msg);
    }

    /**
     * Notification Template: Declined
     */
    public function notifyDeclined($request, $decliner, $reason, $recipientChatId)
    {
        $declinerName = $decliner->fullname_en ?? $decliner->name ?? $decliner->username ?? 'Unknown';
        $dept = $decliner->department ?? null;
        $declinerDept = $dept ? (is_string($dept) ? $dept : ($dept->name ?? 'Unknown')) : 'Unknown';
        $date = now()->format('d M Y \a\t H:i');

        $tracking = $request->document_number ?? $request->trackingNumber ?? 'N/A';
        $title = $request->title ?? $request->subject ?? 'Untitled';

        $msg = "❌ <b>Document Declined</b>\n";
        $msg .= "━━━━━━━━━━━━━━━━━━\n";
        $msg .= "Doc: ({$tracking})\n";
        $msg .= "Title: {$title}\n";
        $msg .= "Declined by: {$declinerName} ({$declinerDept})\n";
        $msg .= "Reason: {$reason}\n";
        $msg .= "Date: {$date}\n";

        return $this->sendMessage($recipientChatId, $msg);
    }

    /**
     * Notification Template: Returned
     */
    public function notifyReturned($request, $returner, $comment, $recipientChatId)
    {
        $returnerName = $returner->fullname_en ?? $returner->name ?? $returner->username ?? 'Unknown';
        $dept = $returner->department ?? null;
        $returnerDept = $dept ? (is_string($dept) ? $dept : ($dept->name ?? 'Unknown')) : 'Unknown';

        $tracking = $request->document_number ?? $request->trackingNumber ?? 'N/A';
        $title = $request->title ?? $request->subject ?? 'Untitled';

        $msg = "🔄 <b>Document Returned</b>\n";
        $msg .= "━━━━━━━━━━━━━━━━━━\n";
        $msg .= "Doc: ({$tracking})\n";
        $msg .= "Title: {$title}\n";
        $msg .= "Returned by: {$returnerName} ({$returnerDept})\n";
        $msg .= "Comment: {$comment}\n";
        $msg .= "Action: Please revise and resubmit\n";

        return $this->sendMessage($recipientChatId, $msg);
    }

    /**
     * Notification Template: Assigned To You
     */
    public function notifyAssigned($request, $assigner, $recipientChatId, $role)
    {
        $assignerName = $assigner->fullname_en ?? $assigner->name ?? $assigner->username ?? 'Unknown';
        $role = $role ?? 'Staff';

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

        return $this->sendMessage($recipientChatId, $msg);
    }

    /**
     * Notification Template: Resubmitted
     */
    public function notifyResubmitted($request, $sender, $recipientChatId)
    {
        $senderName = $sender->fullname_en ?? $sender->name ?? $sender->username ?? 'Unknown';
        $dept = $sender->department ?? null;
        $senderDept = $dept ? (is_string($dept) ? $dept : ($dept->name ?? 'Unknown')) : 'Unknown';

        $tracking = $request->document_number ?? $request->trackingNumber ?? 'N/A';
        $title = $request->title ?? $request->subject ?? 'Untitled';

        $msg = "📝 <b>Document Re-submitted</b>\n";
        $msg .= "━━━━━━━━━━━━━━━━━━\n";
        $msg .= "Doc: ({$tracking})\n";
        $msg .= "Title: {$title}\n";
        $msg .= "Re-submitted by: {$senderName} ({$senderDept})\n";
        $msg .= "Please review the updated document.\n";

        return $this->sendMessage($recipientChatId, $msg);
    }
}