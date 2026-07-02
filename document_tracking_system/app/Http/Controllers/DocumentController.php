<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    private function getUploadedFileData(array $file): ?string
    {
        $encoded = $file['data'] ?? $file['dataUrl'] ?? $file['base64'] ?? null;

        if (!$encoded || !is_string($encoded)) {
            return null;
        }

        $base64pos = strpos($encoded, ',');
        if ($base64pos !== false) {
            return base64_decode(substr($encoded, $base64pos + 1));
        }

        $decoded = base64_decode($encoded, true);
        return $decoded !== false ? $decoded : $encoded;
    }

    public function index(Request $request)
    {
        $documents = Document::with('documentTag.tag')->orderBy('created_at', 'desc')->get()->map(function($doc) {
            $data = json_decode($doc->metadata, true) ?? [];
            $data['document_id'] = $doc->document_id;

            if ($doc->documentTag->isNotEmpty() && $doc->documentTag->first()->tag) {
                $data['tag'] = $doc->documentTag->first()->tag->name;
            }

            return $data;
        });

        return response()->json($documents);
    }

    public function store(Request $request)
    {
        $data = $request->all();

        if (isset($data['id'])) {
            $documentNumber = $data['id'];
        } else {
            $year = date('Y');
            $latestDoc = \App\Models\Document::where('document_number', 'LIKE', "DOC-{$year}-%")
                ->orderBy('created_at', 'desc')
                ->first();

            if ($latestDoc) {
                $parts = explode('-', $latestDoc->document_number);
                $seq = (int)end($parts);
                $newSeq = str_pad($seq + 1, 5, '0', STR_PAD_LEFT);
            } else {
                $newSeq = '00001';
            }
            $documentNumber = "DOC-{$year}-{$newSeq}";
        }
        $title = $data['title'] ?? $data['subject'] ?? 'Untitled';
        $description = $data['description'] ?? $data['details'] ?? '';

        $ownerId = Auth::id();
        if (!$ownerId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $documentTypeId = null;
        $expiresAt = null;
        if (isset($data['documentType'])) {
            $docType = \App\Models\DocumentType::where('name', $data['documentType'])->first();
            if ($docType) {
                $documentTypeId = $docType->document_type_id;
                if ($docType->retention_days) {
                    $expiresAt = now()->addDays($docType->retention_days);
                }
            }
        }

        $departmentId = null;
        if (isset($data['fromDepartment'])) {
            $dept = \App\Models\Department::where('name', $data['fromDepartment'])->first();
            if ($dept) {
                $departmentId = $dept->department_id;
            }
        }

        $filePath = null;
        $fileSize = null;
        $mimeType = null;
        $checksum = null;

        if (isset($data['files']) && is_array($data['files'])) {
            foreach ($data['files'] as &$file) {
                if ($file && isset($file['name'])) {
                    $originalName = $file['original_name'] ?? $file['display_name'] ?? $file['name'];
                    $extension = pathinfo($originalName, PATHINFO_EXTENSION);
                    $baseName = trim(pathinfo($originalName, PATHINFO_FILENAME)) ?: 'document';
                    $newFileName = $baseName . '_' . time() . ($extension ? '.' . $extension : '');

                    $file['original_name'] = $originalName;
                    $file['display_name'] = $originalName;
                    $file['stored_name'] = $newFileName;

                    $rawData = $this->getUploadedFileData($file);
                    if ($rawData !== null) {
                        // Option 1: Initial upload is unsigned
                        Storage::disk('s3')->put('unsigned/' . $newFileName, $rawData);

                        $file['name'] = $newFileName;
                        $file['size'] = strlen($rawData);
                        $file['checksum'] = hash('sha256', $rawData);
                        $checksum = $file['checksum'];

                        unset($file['data'], $file['dataUrl'], $file['base64']);
                    }

                    if (!$filePath) {
                        $filePath = $file['name'];
                        $fileSize = $file['size'] ?? null;
                        $mimeType = $file['type'] ?? null;
                    }
                }
            }
            unset($file);
        }

        $doc = Document::create([
            'document_number' => $documentNumber,
            'title' => $title,
            'description' => $description,
            'status' => $data['status'] ?? 'Pending',
            'owner_id' => $ownerId,
            'document_type_id' => $documentTypeId,
            'department_id' => $departmentId,
            'file_path' => $filePath,
            'file_size' => $fileSize,
            'mime_type' => $mimeType,
            'checksum' => $checksum,
            'expires_at' => $expiresAt,
            'metadata' => json_encode($data)
        ]);

        \App\Models\AuditLog::create([
            'document_id' => $doc->document_id,
            'user_id' => $ownerId,
            'action' => 'Created',
            'action_details' => json_encode(array_filter([
                'document_number' => $documentNumber,
                'title' => $title,
                'status' => $doc->status,
                'method' => 'Web App'
            ]), JSON_UNESCAPED_UNICODE),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);

        if (isset($data['tag']) && $data['tag']) {
            $tag = \App\Models\Tag::firstOrCreate(['name' => $data['tag']]);
            \App\Models\DocumentTag::create([
                'document_id' => $doc->document_id,
                'tag_id' => $tag->tag_id
            ]);
        }

        if (isset($data['files']) && is_array($data['files'])) {
            foreach ($data['files'] as $file) {
                if ($file && isset($file['name'])) {
                    \App\Models\DocumentVersion::create([
                        'document_id' => $doc->document_id,
                        'version_number' => 1,
                        'file_path' => $file['name'],
                        'file_size' => $file['size'] ?? null,
                        'mime_type' => $file['type'] ?? null,
                        'checksum' => $file['checksum'] ?? null,
                        'uploaded_by' => $ownerId,
                        'change_summary' => 'Initial version',
                        'created_at' => now(),
                    ]);
                }
            }
        }

        if ($departmentId) {
            \App\Models\DocumentAccess::create([
                'document_id' => $doc->document_id,
                'user_id' => $ownerId,
                'department_id' => $departmentId,
                'permission_type' => 'Owner',
                'granted_by' => $ownerId,
                'granted_at' => now(),
                'expires_at' => $expiresAt
            ]);
        }

        if (isset($data['path']) && is_array($data['path'])) {
            $sequence = 1;
            foreach ($data['path'] as $step) {
                $deptName = is_string($step) ? $step : ($step['department'] ?? $step['mainRole'] ?? null);
                if ($deptName) {
                    $dept = \App\Models\Department::where('name', $deptName)->first();
                    if ($dept) {
                        $targetUserId = null;
                        if (!empty($dept->user_signature)) {
                            $sig = trim($dept->user_signature);
                            $user = \App\Models\User::where('username', 'ILIKE', "%{$sig}%")
                                ->orWhere('fullname_en', 'ILIKE', "%{$sig}%")
                                ->orWhere('fullname_kh', 'ILIKE', "%{$sig}%")
                                ->first();
                            if ($user) {
                                $targetUserId = $user->user_id;
                            }
                        }

                        \App\Models\DocumentAccess::firstOrCreate([
                            'document_id' => $doc->document_id,
                            'department_id' => $dept->department_id,
                            'permission_type' => 'Review',
                        ], [
                            'user_id' => $targetUserId,
                            'granted_by' => $ownerId,
                            'granted_at' => now(),
                            'expires_at' => $expiresAt
                        ]);

                        \App\Models\DocumentApproval::create([
                            'document_id' => $doc->document_id,
                            'version_number' => 1,
                            'department_id' => $dept->department_id,
                            'status' => 'Pending',
                            'sequence_order' => $sequence
                        ]);

                        if ($targetUserId && isset($user) && $user->telegram_chat_id) {
                            $telegramService = app(\App\Services\TelegramService::class);
                            $senderName = Auth::user() ? (Auth::user()->fullname_en ?? Auth::user()->username) : "Unknown";
                            $dept = Auth::user() ? Auth::user()->department : null;
                            $senderDept = $dept ? (is_string($dept) ? $dept : ($dept->name ?? "Unknown")) : "Unknown";
                            $priority = $data['tag'] ?? 'Normal';
                            
                            $msg = "📄 <b>New Document Request</b>\n";
                            $msg .= "━━━━━━━━━━━━━━━━━━\n";
                            $msg .= "From: {$senderName} ({$senderDept})\n";
                            $msg .= "Tracking #: {$doc->document_number}\n";
                            
                            $typeName = $doc->documentType ? $doc->documentType->name : 'Unknown';
                            $msg .= "Type: {$typeName}\n";
                            
                            $msg .= "Title: {$doc->title}\n";
                            $msg .= "Description: {$doc->description}\n";
                            $msg .= "Tag: {$priority}\n";
                            $msg .= "━━━━━━━━━━━━━━━━━━\n";
                            $msg .= "👉 Action required from you.";
                            
                            $replyMarkup = [
                                'inline_keyboard' => [
                                    [
                                        ['text' => '✅ អនុម័ត (Approve)', 'callback_data' => "approve_{$doc->document_id}_{$dept->department_id}"],
                                        ['text' => '❌ បដិសេធ (Reject)', 'callback_data' => "reject_{$doc->document_id}"]
                                    ]
                                ]
                            ];

                            $telegramService->sendMessage($user->telegram_chat_id, $msg, $replyMarkup);
                        }
                    }
                }
                $sequence++;
            }
        }

        $data['document_id'] = $doc->document_id;

        return response()->json([
            'message' => 'Document created successfully',
            'data' => $data
        ]);
    }

    public function show(string $id)
    {
        $doc = Document::with('documentTag.tag')->where('document_number', $id)->first();
        if (!$doc) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $data = json_decode($doc->metadata, true) ?? [];
        $data['document_id'] = $doc->document_id;

        if ($doc->documentTag->isNotEmpty() && $doc->documentTag->first()->tag) {
            $data['tag'] = $doc->documentTag->first()->tag->name;
        }

        return response()->json($data);
    }

    public function update(Request $request, string $id)
    {
        $doc = Document::where('document_number', $id)->first();
        if (!$doc) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $requestData = $request->all();
        $data = json_decode($doc->metadata, true) ?? [];
        $data = array_merge($data, $requestData);

        $oldStatus = $doc->status;
        $newStatus = $data['status'] ?? $doc->status;
        
        $auditAction = $requestData['audit_action'] ?? null;
        $auditComment = $requestData['audit_comment'] ?? null;
        unset($data['audit_action']);
        unset($data['audit_comment']);

        $doc->update([
            'title' => $data['title'] ?? $doc->title,
            'description' => $data['details'] ?? $doc->description,
            'status' => $data['status'] ?? $doc->status,
            'metadata' => json_encode($data)
        ]);

        $newStatus = $data['status'] ?? $doc->status;
        $action = 'Updated';
        if ($oldStatus !== $newStatus) {
            if (in_array($newStatus, ['Approved', 'Returned', 'Declined', 'Failed', 'Completed', 'Assigned to Improve'])) {
                $action = $newStatus === 'Assigned to Improve' ? 'Returned' : $newStatus;
            } else {
                $action = 'Status Changed';
            }
            
            // Send Telegram Notification to the Owner
            $owner = \App\Models\User::where('user_id', $doc->owner_id)->first();
            if ($owner && $owner->telegram_chat_id) {
                $telegramService = app(\App\Services\TelegramService::class);
                if ($newStatus === 'Approved' || $newStatus === 'Completed') {
                    $comment = '';
                    if (isset($data['path']) && is_array($data['path'])) {
                        for ($i = count($data['path']) - 1; $i >= 0; $i--) {
                            $step = $data['path'][$i];
                            if (isset($step['status']) && $step['status'] === 'Approved') {
                                if (isset($step['comment']) && trim($step['comment']) !== '') {
                                    $comment = $step['comment'];
                                }
                                break;
                            }
                        }
                    }
                    if (empty($comment)) {
                        $comment = $data['approveComment'] ?? $data['comment'] ?? $data['reason'] ?? '';
                    }
                    $telegramService->notifyApproved($doc, Auth::user(), $comment, $owner->telegram_chat_id);
                } elseif ($newStatus === 'Returned' || $newStatus === 'Assigned to Improve') {
                    $comment = $data['declineReason'] ?? $data['comment'] ?? $data['reason'] ?? 'Please revise';
                    $telegramService->notifyReturned($doc, Auth::user(), $comment, $owner->telegram_chat_id);
                } elseif ($newStatus === 'Declined' || $newStatus === 'Failed') {
                    $reason = $data['declineReason'] ?? $data['comment'] ?? $data['reason'] ?? 'Not specified';
                    $telegramService->notifyDeclined($doc, Auth::user(), $reason, $owner->telegram_chat_id);
                }
            }
        }
        if ($auditAction) {
            $action = $auditAction;
        }

        $actionDetails = ['method' => 'Web App'];
        if ($oldStatus !== $newStatus) {
            $actionDetails['old_status'] = $oldStatus === 'Assigned to Improve' ? 'Returned' : $oldStatus;
            $actionDetails['new_status'] = $newStatus === 'Assigned to Improve' ? 'Returned' : $newStatus;
        }
        $finalComment = $auditComment ?? $data['comment'] ?? $data['reason'] ?? null;
        if (!empty($finalComment)) {
            $actionDetails['comment'] = $finalComment;
        }

        \App\Models\AuditLog::create([
            'document_id' => $doc->document_id,
            'user_id' => Auth::id() ?? $doc->owner_id,
            'action' => $action,
            'action_details' => json_encode($actionDetails, JSON_UNESCAPED_UNICODE),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);

        if (isset($data['tag']) && $data['tag']) {
            $tag = \App\Models\Tag::firstOrCreate(['name' => $data['tag']]);
            \App\Models\DocumentTag::where('document_id', $doc->document_id)->delete();
            \App\Models\DocumentTag::create([
                'document_id' => $doc->document_id,
                'tag_id' => $tag->tag_id
            ]);
        }

        $existingVersions = \App\Models\DocumentVersion::where('document_id', $doc->document_id)->get()->keyBy('checksum');
        $versionNumber = $existingVersions->count() > 0 ? $existingVersions->max('version_number') : 0;

        if (isset($data['files']) && is_array($data['files'])) {
            foreach ($data['files'] as &$file) {
                if ($file && isset($file['name'])) {
                    $fileChecksum = $file['checksum'] ?? null;
                    $rawData = $this->getUploadedFileData($file);

                    if ($rawData !== null) {
                        $fileChecksum = hash('sha256', $rawData);

                        // Option 1: Update upload is a signed document
                        if (!Storage::disk('s3')->exists('signed/' . $file['name'])) {
                            Storage::disk('s3')->put('signed/' . $file['name'], $rawData);
                        }

                        $file['size'] = strlen($rawData);
                        $file['checksum'] = $fileChecksum;
                        unset($file['data'], $file['dataUrl'], $file['base64']);
                    }

                    if ($fileChecksum && !$existingVersions->has($fileChecksum)) {
                        $versionNumber++;
                        \App\Models\DocumentVersion::create([
                            'document_id' => $doc->document_id,
                            'version_number' => $versionNumber,
                            'file_path' => $file['name'],
                            'file_size' => $file['size'] ?? null,
                            'mime_type' => $file['type'] ?? null,
                            'checksum' => $fileChecksum,
                            'uploaded_by' => Auth::id() ?? $doc->owner_id,
                            'change_summary' => 'Updated file',
                            'created_at' => now(),
                        ]);
                        $existingVersions->put($fileChecksum, true);
                    }
                }
            }
            unset($file);
        }

        if (isset($data['path']) && is_array($data['path'])) {
            $sequence = 1;
            foreach ($data['path'] as $step) {
                $deptName = is_string($step) ? $step : ($step['department'] ?? $step['mainRole'] ?? null);
                $stepStatus = is_array($step) && isset($step['status']) ? $step['status'] : 'Pending';
                $comments = is_array($step) && isset($step['comment']) ? $step['comment'] : null;

                if ($deptName) {
                    $dept = \App\Models\Department::where('name', $deptName)->first();
                    if ($dept) {
                        $approval = \App\Models\DocumentApproval::where('document_id', $doc->document_id)
                            ->where('department_id', $dept->department_id)
                            ->where('sequence_order', $sequence)
                            ->first();

                        if ($approval) {
                            $approval->status = $stepStatus;
                            $approval->comments = $comments;
                            if ($stepStatus === 'Approved' && !$approval->approved_at) {
                                $approval->approved_at = now();
                                $approval->approver_id = Auth::id() ?? $doc->owner_id;
                            }
                            $approval->save();
                        } else {
                            $targetUserId = null;
                            if (!empty($dept->user_signature)) {
                                $sig = trim($dept->user_signature);
                                $user = \App\Models\User::where('username', 'ILIKE', "%{$sig}%")
                                    ->orWhere('fullname_en', 'ILIKE', "%{$sig}%")
                                    ->orWhere('fullname_kh', 'ILIKE', "%{$sig}%")
                                    ->first();
                                if ($user) {
                                    $targetUserId = $user->user_id;
                                }
                            }

                            \App\Models\DocumentAccess::firstOrCreate([
                                'document_id' => $doc->document_id,
                                'department_id' => $dept->department_id,
                                'permission_type' => 'Review',
                            ], [
                                'user_id' => $targetUserId,
                                'granted_by' => Auth::id() ?? $doc->owner_id,
                                'granted_at' => now(),
                                'expires_at' => $doc->expires_at
                            ]);

                            \App\Models\DocumentApproval::create([
                                'document_id' => $doc->document_id,
                                'version_number' => $versionNumber > 0 ? $versionNumber : 1,
                                'department_id' => $dept->department_id,
                                'status' => $stepStatus,
                                'comments' => $comments,
                                'sequence_order' => $sequence
                            ]);
                            
                            if (isset($user) && $user && $user->telegram_chat_id) {
                                $telegramService = app(\App\Services\TelegramService::class);
                                $telegramService->notifyAssigned($doc, Auth::user(), $user->telegram_chat_id, $user->mainRole ?? 'Staff');
                            }
                        }
                    }
                }
                $sequence++;
            }
        }

        if ($oldStatus === 'Assigned to Improve' && $newStatus === 'In Progress') {
            $pendingApproval = \App\Models\DocumentApproval::where('document_id', $doc->document_id)
                        ->where('status', 'Pending')
                        ->orderBy('sequence_order', 'asc')
                        ->first();
            if ($pendingApproval && $pendingApproval->department && $pendingApproval->department->user_signature) {
                $sig = trim($pendingApproval->department->user_signature);
                $targetUser = \App\Models\User::where('username', 'ILIKE', "%{$sig}%")
                        ->orWhere('fullname_en', 'ILIKE', "%{$sig}%")
                        ->orWhere('fullname_kh', 'ILIKE', "%{$sig}%")
                        ->first();
                if ($targetUser && $targetUser->telegram_chat_id) {
                    $telegramService = app(\App\Services\TelegramService::class);
                    $telegramService->notifyResubmitted($doc, Auth::user(), $targetUser->telegram_chat_id);
                }
            }
        }
        // The Automatic Signature Summary Page feature has been disabled per user request.
        // if ($newStatus === 'Completed' && $oldStatus !== 'Completed') { ... }
        
        $doc->metadata = json_encode($data);
        $doc->save();

        $data['document_id'] = $doc->document_id;

        return response()->json([
            'message' => 'Document updated successfully',
            'data' => $data
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        $doc = Document::where('document_number', $id)->first();
        if ($doc) {
            \App\Models\AuditLog::create([
                'document_id' => $doc->document_id,
                'user_id' => Auth::id(),
                'action' => 'Deleted',
                'action_details' => json_encode([
                    'document_number' => $doc->document_number,
                    'title' => $doc->title,
                    'reason' => $request->input('reason', 'User initiated deletion')
                ], JSON_UNESCAPED_UNICODE),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);
            $doc->delete();
        }

        return response()->json(['message' => 'Deleted successfully']);
    }

    public function logAction(Request $request, $documentId)
    {
        $request->validate([
            'action' => 'required|in:Viewed,Downloaded'
        ]);

        $doc = Document::where('document_number', $documentId)
                      ->orWhere('document_id', $documentId)
                      ->first();

        if (!$doc) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        \App\Models\AuditLog::create([
            'document_id' => $doc->document_id,
            'user_id' => Auth::id(),
            'action' => $request->action,
            'action_details' => json_encode(['title' => $doc->title]),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);

        return response()->json(['message' => 'Action logged successfully']);
    }

    public function getFile($filename)
    {
        $localPath = public_path('uploads/documents/' . $filename);
        if (file_exists($localPath)) {
            return response()->file($localPath);
        }

        // Check MinIO: signed folder first, then unsigned folder, then old uploads folder, then root bucket
        $s3Path = null;
        if (Storage::disk('s3')->exists('signed/' . $filename)) {
            $s3Path = 'signed/' . $filename;
        } elseif (Storage::disk('s3')->exists('unsigned/' . $filename)) {
            $s3Path = 'unsigned/' . $filename;
        } elseif (Storage::disk('s3')->exists('uploads/' . $filename)) {
            $s3Path = 'uploads/' . $filename; // Keep support for files uploaded right before this update
        } elseif (Storage::disk('s3')->exists($filename)) {
            $s3Path = $filename; // Support for original uploads to root bucket
        }
        
        if (!$s3Path) {
            return response()->json(['message' => 'File not found'], 404);
        }

        $stream = Storage::disk('s3')->readStream($s3Path);
        $mimeType = Storage::disk('s3')->mimeType($s3Path) ?: 'application/pdf';

        return response()->stream(
            function () use ($stream) {
                fpassthru($stream);
            },
            200,
            [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'inline; filename="' . $filename . '"',
            ]
        );
    }
    public function convertToPdf(Request $request, $filename)
    {
        try {
            $s3Path = null;
            if (Storage::disk('s3')->exists('signed/' . $filename)) {
                $s3Path = 'signed/' . $filename;
            } elseif (Storage::disk('s3')->exists('unsigned/' . $filename)) {
                $s3Path = 'unsigned/' . $filename;
            } elseif (Storage::disk('s3')->exists('uploads/' . $filename)) {
                $s3Path = 'uploads/' . $filename;
            } elseif (Storage::disk('s3')->exists($filename)) {
                $s3Path = $filename;
            }

            if (!$s3Path) {
                return response()->json(['message' => 'File not found'], 404);
            }

            $mimeType = Storage::disk('s3')->mimeType($s3Path);
            if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/jpg'])) {
                return response()->json(['message' => 'Only JPG and PNG images can be converted to PDF'], 400);
            }

            $imageData = Storage::disk('s3')->get($s3Path);
            $tempImagePath = tempnam(sys_get_temp_dir(), 'img');
            file_put_contents($tempImagePath, $imageData);

            require_once base_path('vendor/setasign/fpdf/fpdf.php');
            $pdf = new \FPDF();
            $pdf->AddPage();
            
            $maxWidth = 190;
            $maxHeight = 277;
            
            $imageSize = getimagesize($tempImagePath);
            if (!$imageSize) {
                unlink($tempImagePath);
                return response()->json(['message' => 'Invalid image format'], 400);
            }
            
            $imgWidth = $imageSize[0];
            $imgHeight = $imageSize[1];
            
            $imgWidthMm = $imgWidth * 25.4 / 96;
            $imgHeightMm = $imgHeight * 25.4 / 96;
            
            $ratio = min($maxWidth / $imgWidthMm, $maxHeight / $imgHeightMm);
            if ($ratio > 1) $ratio = 1;
            
            $finalWidth = $imgWidthMm * $ratio;
            $finalHeight = $imgHeightMm * $ratio;
            
            $x = 10 + ($maxWidth - $finalWidth) / 2;
            $y = 10 + ($maxHeight - $finalHeight) / 2;
            
            $imageType = ($mimeType === 'image/png') ? 'PNG' : 'JPEG';
            
            $pdf->Image($tempImagePath, $x, $y, $finalWidth, $finalHeight, $imageType);
            
            unlink($tempImagePath);
            
            $pdfData = $pdf->Output('S');
            $newFileName = pathinfo($filename, PATHINFO_FILENAME) . '_converted.pdf';
            
            Storage::disk('s3')->put('unsigned/' . $newFileName, $pdfData);
            
            return response()->json([
                'message' => 'Converted successfully',
                'new_filename' => $newFileName
            ]);
            
        } catch (\Exception $e) {
            return response()->json(['message' => 'Conversion failed: ' . $e->getMessage()], 500);
        }
    }
}


