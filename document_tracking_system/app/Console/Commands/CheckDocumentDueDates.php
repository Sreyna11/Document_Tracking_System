<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Carbon\Carbon;
use App\Models\Document;
use App\Models\Notification;

#[Signature('documents:check-due-dates')]
#[Description('Checks pending documents and sends SLA reminders for upcoming and overdue tasks')]
class CheckDocumentDueDates extends Command
{
    public function handle()
    {
        $this->info("Checking document due dates...");
        
        $pendingDocuments = Document::whereIn('status', ['Pending', 'Processing', 'In Progress'])->get();
        
        $count = 0;
        foreach ($pendingDocuments as $doc) {
            $metadata = json_decode($doc->metadata, true);
            if (!isset($metadata['dueDate'])) {
                continue;
            }
            
            $dueDate = Carbon::parse($metadata['dueDate']);
            $now = Carbon::now();
            
            $path = $metadata['path'] ?? [];
            $currentIndex = $metadata['currentStepIndex'] ?? 0;
            
            if ($currentIndex >= count($path)) {
                continue; // Completed
            }
            
            $currentStep = $path[$currentIndex];
            $assignedTo = $currentStep['department'] ?? $currentStep['mainRole'] ?? null;
            
            if (!$assignedTo) {
                continue;
            }

            $isOverdue = $dueDate->isPast();
            $isWarning = !$isOverdue && $dueDate->diffInHours($now) <= 24;

            if ($isOverdue || $isWarning) {
                $statusType = $isOverdue ? 'OVERDUE' : 'REMINDER';
                $priority = $metadata['priorityLevel'] ?? 'Normal';
                
                $title = $doc->title ?: $doc->document_number;
                
                $message = $isOverdue 
                    ? "SLA OVERDUE ($priority): Document '$title' was due on {$dueDate->format('M d, Y h:i A')}."
                    : "SLA REMINDER ($priority): Document '$title' is due in less than 24 hours ({$dueDate->format('M d, Y h:i A')}).";
                
                // Avoid spamming: Check if an identical notification was sent in the last 12 hours
                $recentNotif = Notification::where('document_id', $doc->document_id)
                    ->where('message', $message)
                    ->where('created_at', '>=', $now->subHours(12))
                    ->first();
                    
                if (!$recentNotif) {
                    Notification::create([
                        'document_id' => $doc->document_id,
                        'target_department' => $assignedTo,
                        'sender_name' => 'System Reminder',
                        'sender_department' => 'System',
                        'subject' => "Action Required: Document $statusType",
                        'details' => $message,
                        'message' => $message,
                    ]);
                    $count++;
                    
                    $telegramService = app(\App\Services\TelegramService::class);
                    $deptObj = \App\Models\Department::where('name', 'ILIKE', trim($assignedTo))
                        ->orWhere('code', 'ILIKE', trim($assignedTo))
                        ->orWhere('title', 'ILIKE', trim($assignedTo))
                        ->first();
                        
                    if ($deptObj) {
                        $users = \App\Models\User::where('department_id', $deptObj->department_id)->whereNotNull('telegram_chat_id')->get();
                        foreach ($users as $user) {
                            $telegramMsg = "⚠️ <b>Auto-Reminder (Nudge)</b>\n\n";
                            $telegramMsg .= "📄 <b>{$doc->document_number}</b>\n";
                            $telegramMsg .= "Title: {$title}\n";
                            $telegramMsg .= "Status: <b>" . ($isOverdue ? 'Overdue 🔴' : 'Due Soon 🟡') . "</b>\n";
                            $telegramMsg .= "Due Date: " . $dueDate->format('d M Y, H:i') . "\n\n";
                            $telegramMsg .= "សូមមេត្តាពិនិត្យមើល និងអនុម័តឯកសារនេះផង! (Action Required)";
                            
                            $telegramService->sendMessage($user->telegram_chat_id, $telegramMsg);
                        }
                    }
                }
            }
        }
        
        $this->info("Sent {$count} SLA reminders.");
    }
}
