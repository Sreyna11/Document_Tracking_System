<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use App\Services\TelegramService;

class TelegramWebhookController extends Controller
{
    public function handle(Request $request, TelegramService $telegramService)
    {
        // 1. Get the incoming payload from Telegram
        $update = $request->all();

        Log::info('Telegram Webhook Hit:', $update);

        if (isset($update['message'])) {
            $message = $update['message'];
            $chatId = $message['chat']['id'];
            $text = trim($message['text'] ?? '');

            if ($text === '🏠 Main Menu') {
                $telegramService->sendMessage($chatId, "សួស្ដី! 👋 សូមស្វាគមន៍មកកាន់ Document Tracking Bot។ សូមជ្រើសរើសជម្រើសខាងក្រោម៖", $telegramService->getDefaultKeyboard());
                return response()->json(['status' => 'ok']);
            }
            elseif ($text === '📄 My Documents') $text = '/mysummary';
            elseif ($text === '📥 Pending Approval') $text = '/pending';
            elseif ($text === '🔍 Track Document') {
                $telegramService->sendMessage($chatId, "សូមវាយពាក្យ `/search` តាមដោយឈ្មោះឯកសារ ឬលេខកូដឯកសារ។\n\nឧទាហរណ៍៖ `/search កុំព្យូទ័រ`", $telegramService->getDefaultKeyboard());
                return response()->json(['status' => 'ok']);
            }
            elseif ($text === '👤 Profile') {
                $user = User::where('telegram_chat_id', (string)$chatId)->first();
                if ($user) {
                    $deptName = $user->department->name ?? 'N/A';
                    $roleName = $user->role ?? $user->mainRole ?? 'N/A';
                    $typeName = $user->type ?? 'N/A';
                    $statusName = $user->is_active ? 'Active' : 'Inactive';
                    
                    $profileMsg = "👤 <b>ព័ត៌មានគណនីរបស់អ្នក</b>\n\n";
                    $profileMsg .= "Fullname (EN): <b>" . ($user->fullname_en ?? 'N/A') . "</b>\n";
                    $profileMsg .= "Fullname (KH): <b>" . ($user->fullname_kh ?? 'N/A') . "</b>\n";
                    $profileMsg .= "Phone: " . ($user->phone ?? 'N/A') . "\n";
                    $profileMsg .= "Email: " . ($user->email ?? 'N/A') . "\n";
                    $profileMsg .= "Status: {$statusName}\n";
                    $profileMsg .= "Department: <b>{$deptName}</b>\n";
                    $profileMsg .= "Role: <b>{$roleName}</b>\n";
                    $profileMsg .= "Type: {$typeName}";

                    $telegramService->sendMessage($chatId, $profileMsg, $telegramService->getDefaultKeyboard());
                } else {
                    $telegramService->sendMessage($chatId, "❌ សូមភ្ជាប់គណនីជាមុនសិន។", $telegramService->getDefaultKeyboard());
                }
                return response()->json(['status' => 'ok']);
            }
            elseif ($text === '❓ Help') {
                $telegramService->sendMessage($chatId, "សួស្ដី! 👋 នេះគឺជា Document Tracking Bot។\n\nអ្នកអាចប្រើប្រាស់ Commands ខាងក្រោមបាន៖\n🔍 `/status [លេខឯកសារ]` - ឆែកមើលស្ថានភាពឯកសារ\n🔍 `/search [ពាក្យគន្លឹះ]` - ស្វែងរកឯកសារ\n📥 `/pending` - មើលឯកសាររង់ចាំការអនុម័ត\n📊 `/mysummary` - មើលរបាយការណ៍សង្ខេប", $telegramService->getDefaultKeyboard());
                return response()->json(['status' => 'ok']);
            }

            // 2. Check if it's the /start command with a token
            if (strpos($text, '/start ') === 0) {
                // Extract the token (e.g. /start token123 -> token123)
                $token = explode(' ', $text)[1] ?? null;

                if ($token) {
                    // 3. Find the user with this token
                    $user = User::where('telegram_link_token', $token)->first();

                    if ($user) {
                        // 4. Save the Chat ID
                        $user->telegram_chat_id = (string)$chatId;
                        $user->telegram_link_token = null; // Clear the token for security
                        $user->save();

                        // 5. Send a success message back to the user
                        $userName = $user->fullname_en ?? $user->username;
                        $welcomeMsg = "<b>ជោគជ័យ! (Success)</b> ✅\n\n";
                        $welcomeMsg .= "គណនីរបស់អ្នក <b>{$userName}</b> ត្រូវបានភ្ជាប់ជាមួយ Telegram នេះដោយជោគជ័យ។\n";
                        $welcomeMsg .= "ចាប់ពីពេលនេះទៅ អ្នកនឹងទទួលបានការជូនដំណឹងឯកសារនៅទីនេះ។";
                        
                        $telegramService->sendMessage($chatId, $welcomeMsg, $telegramService->getDefaultKeyboard());
                    } else {
                        // Invalid token
                        $telegramService->sendMessage($chatId, "❌ សុំទោស កូដរបស់អ្នកមិនត្រឹមត្រូវ ឬអស់សុពលភាព។ សូមចូលទៅចុចប៊ូតុង Connect Telegram ម្ដងទៀត។", $telegramService->getDefaultKeyboard());
                    }
                }
            } elseif (trim($text) === '/start') {
                $telegramService->sendMessage($chatId, "សួស្ដី! 👋\n\nដើម្បីភ្ជាប់ Telegram នេះទៅកាន់គណនីរបស់អ្នក សូមចូលទៅកាន់ផ្ទាំងប្រព័ន្ធ Document Tracking រួចចុចប៊ូតុង <b>Connect Telegram</b>។", $telegramService->getDefaultKeyboard());
            } elseif (strpos($text, '/status') === 0) {
                $docNumber = trim(str_replace('/status', '', $text));
                if (empty($docNumber)) {
                    $telegramService->sendMessage($chatId, "សូមបញ្ជាក់លេខឯកសារ។ ឧទាហរណ៍៖ `/status DOC-2026-00001`");
                } else {
                    $doc = \App\Models\Document::with(['documentType'])->where('document_number', $docNumber)->first();
                    if ($doc) {
                        $status = "📄 <b>{$doc->title}</b>\n";
                        $status .= "លេខឯកសារ: {$doc->document_number}\n";
                        $type = $doc->documentType->name ?? 'N/A';
                        $status .= "ប្រភេទឯកសារ: {$type}\n";
                        $status .= "ស្ថានភាព: <b>{$doc->status}</b>\n";
                        if (in_array($doc->status, ['In Progress', 'In Progressing', 'Assigned to Improve'])) {
                            $pendingApproval = \App\Models\DocumentApproval::where('document_id', $doc->document_id)
                                ->where('status', 'Pending')
                                ->orderBy('sequence_order', 'asc')
                                ->first();
                            if ($pendingApproval && $pendingApproval->department) {
                                $status .= "Currently pending at: <b>" . $pendingApproval->department->name . "</b>\n";
                            }
                        }
                        $telegramService->sendMessage($chatId, $status);
                    } else {
                        $telegramService->sendMessage($chatId, "❌ រកមិនឃើញឯកសារលេខ <b>{$docNumber}</b> ទេ។");
                    }
                }
            } elseif (strpos($text, '/search') === 0) {
                $keyword = trim(str_replace('/search', '', $text));
                $user = User::where('telegram_chat_id', (string)$chatId)->first();
                if (!$user) {
                    $telegramService->sendMessage($chatId, "❌ សូមភ្ជាប់គណនីជាមុនសិន។", $telegramService->getDefaultKeyboard());
                    return response()->json(['status' => 'ok']);
                }

                if (empty($keyword)) {
                    $telegramService->sendMessage($chatId, "សូមបញ្ជាក់ពាក្យគន្លឹះ។ ឧទាហរណ៍៖ `/search កុំព្យូទ័រ`", $telegramService->getDefaultKeyboard());
                    return response()->json(['status' => 'ok']);
                }

                $docs = \App\Models\Document::with(['documentType', 'documentApproval.department'])
                        ->where(function($q) use ($keyword) {
                            $q->where('title', 'ILIKE', "%{$keyword}%")
                              ->orWhere('document_number', 'ILIKE', "%{$keyword}%");
                        })
                        ->where(function($q) use ($user) {
                            $q->where('owner_id', $user->user_id);
                            if ($user->department_id) {
                                $q->orWhereHas('documentApproval', function($aq) use ($user) {
                                    $aq->where('department_id', $user->department_id);
                                });
                            }
                        })
                        ->orderBy('created_at', 'desc')
                        ->take(5)
                        ->get();

                if ($docs->isEmpty()) {
                    $telegramService->sendMessage($chatId, "❌ រកមិនឃើញឯកសារទាក់ទងនឹង '<b>{$keyword}</b>' ទេ។", $telegramService->getDefaultKeyboard());
                } else {
                    $msg = "🔍 <b>លទ្ធផលស្វែងរក៖ '{$keyword}'</b>\n\n";
                    foreach ($docs as $doc) {
                        $title = htmlspecialchars($doc->title ?? 'Untitled');
                        $msg .= "📄 <b>{$title}</b>\n";
                        $msg .= "លេខកូដ: <code>{$doc->document_number}</code>\n";
                        
                        $type = htmlspecialchars($doc->documentType->name ?? 'N/A');
                        $msg .= "ប្រភេទឯកសារ: {$type}\n";
                        $msg .= "ស្ថានភាព: {$doc->status}\n";

                        if (in_array($doc->status, ['In Progress', 'In Progressing', 'Assigned to Improve'])) {
                            $pendingApproval = $doc->documentApproval->where('status', 'Pending')->sortBy('sequence_order')->first();
                            if ($pendingApproval && $pendingApproval->department) {
                                $msg .= "កំពុងរង់ចាំនៅ: <b>" . htmlspecialchars($pendingApproval->department->name) . "</b>\n";
                            }
                        }

                        $msg .= "━━━━━━━━━━━━━\n";
                    }
                    $msg .= "<i>ប្រើ /status [លេខកូដ] ដើម្បីមើលលម្អិត</i>";
                    $telegramService->sendMessage($chatId, $msg, $telegramService->getDefaultKeyboard());
                }
            } elseif (trim($text) === '/pending' || trim($text) === '/mysummary') {
                $user = User::where('telegram_chat_id', (string)$chatId)->first();
                if (!$user) {
                    $telegramService->sendMessage($chatId, "❌ សូមភ្ជាប់គណនីជាមុនសិន។");
                } else {
                    if (trim($text) === '/pending') {
                        if ($user->department_id) {
                            $pendingApprovals = \App\Models\DocumentApproval::with(['document', 'document.documentTag.tag', 'document.documentType'])
                                ->where('department_id', $user->department_id)
                                ->where('status', 'Pending')
                                ->get();
                            
                            if ($pendingApprovals->isEmpty()) {
                                $telegramService->sendMessage($chatId, "✅ មិនមានឯកសាររង់ចាំការអនុម័តពីអ្នកទេ។ (No pending documents)");
                            } else {
                                $msg = "<b>ឯកសាររង់ចាំការអនុម័ត (Pending) - សរុប {$pendingApprovals->count()} ច្បាប់៖</b>\n\n";
                                foreach ($pendingApprovals as $approval) {
                                    if ($approval->document) {
                                        $doc = $approval->document;
                                        $msg .= "📄 <b>" . $doc->title . "</b>\n";
                                        $msg .= "ID: " . $doc->document_number . "\n";
                                        
                                        $tag = "Normal";
                                        if ($doc->documentTag->isNotEmpty() && $doc->documentTag->first()->tag) {
                                            $tag = $doc->documentTag->first()->tag->name;
                                        }
                                        $msg .= "Tag: " . $tag . "\n";
                                        
                                        $type = $doc->documentType->name ?? 'N/A';
                                        $msg .= "Type: " . $type . "\n";
                                        
                                        $owner = \App\Models\User::where('user_id', $doc->owner_id)->first();
                                        $senderName = $owner ? ($owner->fullname_en ?? $owner->username) : 'Unknown';
                                        $senderDept = $owner && $owner->department ? $owner->department->name : 'Unknown';
                                        
                                        $msg .= "From: {$senderName} ({$senderDept})\n";
                                        $msg .= "Date: " . \Carbon\Carbon::parse($doc->created_at)->format('d M Y, H:i') . "\n\n";
                                    }
                                }
                                $telegramService->sendMessage($chatId, $msg, $telegramService->getDefaultKeyboard());
                            }
                        } else {
                            $telegramService->sendMessage($chatId, "អ្នកមិនមានផ្នែក (Department) ត្រឹមត្រូវទេ។");
                        }
                    } elseif (trim($text) === '/mysummary') {
                        $myDocsCount = \App\Models\Document::where('owner_id', $user->user_id)->count();
                        $myCompletedCount = \App\Models\Document::where('owner_id', $user->user_id)->where('status', 'Completed')->count();
                        $myInProgressCount = \App\Models\Document::where('owner_id', $user->user_id)->whereIn('status', ['In Progress', 'In Progressing'])->count();
                        $myImproveCount = \App\Models\Document::where('owner_id', $user->user_id)->where('status', 'Assigned to Improve')->count();
                        $myRejectedCount = \App\Models\Document::where('owner_id', $user->user_id)->where('status', 'Rejected')->count();
                        
                        $approvedCount = \App\Models\DocumentApproval::where('approver_id', $user->user_id)->where('status', 'Approved')->count();
                        $rejectedCount = \App\Models\DocumentApproval::where('approver_id', $user->user_id)->where('status', 'Rejected')->count();
                        
                        $pendingCount = 0;
                        if ($user->department_id) {
                            $pendingCount = \App\Models\DocumentApproval::where('department_id', $user->department_id)->where('status', 'Pending')->count();
                        }
                        
                        $msg = "<b>របាយការណ៍សង្ខេប (My Summary)</b> 📊\n\n";
                        $msg .= "👤 Name: <b>" . ($user->fullname_en ?? $user->username) . "</b>\n";
                        $msg .= "━━━━━━━━━━━━━━━━━━\n";
                        $msg .= "<b>ឯកសារផ្ទាល់ខ្លួន (My Requests)</b>\n";
                        $msg .= "📝 បានស្នើសុំសរុប: <b>{$myDocsCount}</b>\n";
                        $msg .= "✅ ជោគជ័យ (Completed): <b>{$myCompletedCount}</b>\n";
                        $msg .= "⏳ កំពុងដំណើរការ (In Progress): <b>{$myInProgressCount}</b>\n";
                        $msg .= "⚠️ ត្រូវកែសម្រួល (To Improve): <b>{$myImproveCount}</b>\n";
                        $msg .= "❌ ត្រូវបានបដិសេធ (Rejected): <b>{$myRejectedCount}</b>\n\n";
                        
                        $msg .= "<b>ការអនុម័តរបស់អ្នក (My Approvals)</b>\n";
                        $msg .= "📥 កំពុងរង់ចាំអ្នក: <b>{$pendingCount}</b>\n";
                        $msg .= "✅ បានអនុម័ត (Approved): <b>{$approvedCount}</b>\n";
                        $msg .= "❌ បានបដិសេធ (Rejected): <b>{$rejectedCount}</b>\n";
                        
                        $telegramService->sendMessage($chatId, $msg, $telegramService->getDefaultKeyboard());
                    }
                }
            } else {
                // If not a specific command, treat it as a natural language chat message
                $user = User::where('telegram_chat_id', (string)$chatId)->first();
                if ($user) {
                    // Call the AI Service
                    $aiService = app(\App\Services\AiChatService::class);
                    // Send a temporary "thinking..." message
                    $thinkingMsg = $telegramService->sendMessage($chatId, "⏳ <i>កំពុងគិត... (Thinking...)</i>");
                    
                    // Get response from OpenAI
                    $response = $aiService->getAiResponse($user, trim($text));
                    
                    // We could edit the thinking message, or just send a new one. Sending a new one is simpler.
                    $telegramService->sendMessage($chatId, $response, $telegramService->getDefaultKeyboard());
                } else {
                    $telegramService->sendMessage($chatId, "សួស្ដី! 👋 នេះគឺជា Document Tracking Bot។\n\nអ្នកអាចប្រើប្រាស់ Commands ខាងក្រោមបាន៖\n🔍 `/status [លេខឯកសារ]` - ឆែកមើលឯកសារ\n🔍 `/search [ពាក្យគន្លឹះ]` - ស្វែងរកឯកសារ\n📥 `/pending` - មើលឯកសាររង់ចាំការអនុម័ត\n📊 `/mysummary` - មើលរបាយការណ៍សង្ខេប", $telegramService->getDefaultKeyboard());
                }
            }
        } elseif (isset($update['callback_query'])) {
            $callbackQuery = $update['callback_query'];
            $callbackId = $callbackQuery['id'];
            $chatId = $callbackQuery['message']['chat']['id'];
            $messageId = $callbackQuery['message']['message_id'];
            $data = $callbackQuery['data']; // e.g. "approve_docId_deptId" or "reject_docId"
            $telegramUserId = (string)$callbackQuery['from']['id'];

            // Identify user
            $user = User::where('telegram_chat_id', $telegramUserId)->first();

            if (!$user) {
                $telegramService->answerCallbackQuery($callbackId, "គណនីរបស់អ្នកមិនត្រឹមត្រូវ។ (Unauthorized)");
                return response()->json(['status' => 'ok']);
            }

            if (strpos($data, 'approve_') === 0) {
                $parts = explode('_', $data);
                $docId = $parts[1] ?? null;
                $deptId = $parts[2] ?? null;

                if ($docId && $deptId) {
                    $approval = \App\Models\DocumentApproval::where('document_id', $docId)
                        ->where('department_id', $deptId)
                        ->where('status', 'Pending')
                        ->first();

                    if ($approval) {
                        $approval->status = 'Approved';
                        $approval->approver_id = $user->user_id;
                        $approval->approved_at = now();
                        $approval->save();

                        \App\Models\AuditLog::create([
                            'document_id' => $docId,
                            'user_id' => $user->user_id,
                            'action' => 'Approved',
                            'action_details' => json_encode([
                                'method' => 'Telegram Bot',
                                'approved_by_role' => $user->mainRole ?? 'Unknown',
                                'timestamp' => now()->toDateTimeString()
                            ], JSON_UNESCAPED_UNICODE),
                            'ip_address' => $request->ip(),
                        ]);

                        $telegramService->answerCallbackQuery($callbackId, "Approved successfully!");
                        
                        // Edit the message to remove buttons and show approved format
                        $doc = \App\Models\Document::find($docId);
                        $type = $doc->documentType->name ?? 'N/A';
                        $approverName = $user->fullname_en ?? $user->username ?? 'Unknown';
                        $dept = $user->department ?? null;
                        $approverDept = $dept ? (is_string($dept) ? $dept : ($dept->name ?? 'Unknown')) : 'Unknown';
                        $date = now()->format('d M Y \a\t H:i');

                        $newText = "✅ <b>Document Approved</b>\n";
                        $newText .= "━━━━━━━━━━━━━━━━━━\n";
                        $newText .= "Doc: ({$doc->document_number})\n";
                        $newText .= "Title: {$doc->title}\n";
                        $newText .= "Document Type : {$type}\n";
                        $newText .= "Approved by: {$approverName}\n";
                        $newText .= "Department : {$approverDept}\n";
                        $newText .= "Date: {$date}\n";
                        $newText .= "Status: Completed 🎉\n";
                        
                        $telegramService->editMessageText($chatId, $messageId, $newText);
                    } else {
                        $telegramService->answerCallbackQuery($callbackId, "ឯកសារនេះត្រូវបានអនុម័តរួចហើយ ឬមិនមានទេ។");
                        $telegramService->editMessageText($chatId, $messageId, "⚠️ ឯកសារនេះត្រូវបានដំណើរការរួចរាល់ហើយ។");
                    }
                }
            } elseif (strpos($data, 'reject_') === 0) {
                $parts = explode('_', $data);
                $docId = $parts[1] ?? null;
                
                $telegramService->answerCallbackQuery($callbackId, "សូមបញ្ចូលមូលហេតុនៅលើវេបសាយ។");
                
                $appUrl = env('APP_URL', 'http://localhost:3000');
                if (!preg_match("~^(?:f|ht)tps?://~i", $appUrl)) {
                    $appUrl = "http://" . $appUrl;
                }
                $docUrl = "{$appUrl}";

                $msg = "❌ ដើម្បីបដិសេធឯកសារនេះ លោកអ្នកត្រូវបញ្ចូលមូលហេតុ (Comment)។\n\n";
                $msg .= "សូមចូលទៅកាន់ប្រព័ន្ធដើម្បីធ្វើការបដិសេធ៖ <a href='{$docUrl}'>ចូលប្រព័ន្ធទីនេះ</a>";

                $telegramService->sendMessage($chatId, $msg);
            }
        }

        // Always return 200 OK so Telegram knows we received it
        return response()->json(['status' => 'ok']);
    }
}
