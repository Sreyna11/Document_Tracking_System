<?php

namespace App\Services;

use App\Models\User;
use App\Models\Document;
use App\Models\DocumentApproval;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiChatService
{
    /**
     * Get a response from OpenAI based on the user's input and their context.
     *
     * @param User $user
     * @param string $message
     * @return string
     */
    public function getAiResponse(User $user, string $message): string
    {
        $apiKey = env('GEMINI_API_KEY');

        if (!$apiKey) {
            return "❌ សុំទោស មុខងារ AI មិនទាន់ត្រូវបានដំឡើងពេញលេញទេ (Missing API Key)។ សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ។";
        }

        // Build the user's context
        $userName = $user->fullname_en ?? $user->username;
        $deptName = $user->department ? $user->department->name : 'No Department';
        
        $myDocsCount = Document::where('owner_id', $user->user_id)->count();
        $myCompletedCount = Document::where('owner_id', $user->user_id)->where('status', 'Completed')->count();
        
        $approvedCount = DocumentApproval::where('approver_id', $user->user_id)->where('status', 'Approved')->count();
        $rejectedCount = DocumentApproval::where('approver_id', $user->user_id)->where('status', 'Rejected')->count();
        
        $pendingCount = 0;
        if ($user->department_id) {
            $pendingCount = DocumentApproval::where('department_id', $user->department_id)->where('status', 'Pending')->count();
        }

        // Find the longest approved document
        $completedDocs = Document::where('owner_id', $user->user_id)->where('status', 'Completed')->get();
        $longestDoc = null;
        $maxDuration = -1;
        foreach ($completedDocs as $cDoc) {
            $duration = $cDoc->created_at->diffInSeconds($cDoc->updated_at);
            if ($duration > $maxDuration) {
                $maxDuration = $duration;
                $longestDoc = $cDoc;
            }
        }

        // Find the longest approval they did
        $approvedDocs = DocumentApproval::with('document')->where('approver_id', $user->user_id)->where('status', 'Approved')->get();
        $longestApproval = null;
        $maxApproveDuration = -1;
        foreach ($approvedDocs as $aDoc) {
            $duration = $aDoc->created_at->diffInSeconds($aDoc->updated_at);
            if ($duration > $maxApproveDuration) {
                $maxApproveDuration = $duration;
                $longestApproval = $aDoc;
            }
        }

        // Create the system prompt
        $systemPrompt = "You are an intelligent, helpful, and friendly AI assistant for a Document Tracking System. ";
        $systemPrompt .= "You are chatting with a user via Telegram. Respond in Khmer language natively, but keep technical terms like 'Approve', 'Reject', 'Pending', 'Completed' in English. ";
        $systemPrompt .= "Be concise, clear, and polite. Use emojis to make the conversation engaging.\n\n";
        
        $systemPrompt .= "Here is the current user's context/statistics:\n";
        $systemPrompt .= "- Name: {$userName}\n";
        $systemPrompt .= "- Department: {$deptName}\n";
        $systemPrompt .= "- Documents they requested: {$myDocsCount} (Completed: {$myCompletedCount})\n";
        $systemPrompt .= "- Documents they need to approve right now (Pending): {$pendingCount}\n";
        $systemPrompt .= "- Documents they have approved historically: {$approvedCount}\n";
        $systemPrompt .= "- Documents they have rejected historically: {$rejectedCount}\n";
        
        if ($longestDoc) {
            $durationStr = $longestDoc->created_at->diffForHumans($longestDoc->updated_at, ['parts' => 2, 'syntax' => \Carbon\CarbonInterface::DIFF_ABSOLUTE]);
            $systemPrompt .= "- The document they requested that took the longest to be completed is {$longestDoc->document_number} ({$longestDoc->title}), which took {$durationStr}.\n";
        }
        
        if ($longestApproval && $longestApproval->document) {
            $doc = $longestApproval->document;
            $durationStr = $longestApproval->created_at->diffForHumans($longestApproval->updated_at, ['parts' => 2, 'syntax' => \Carbon\CarbonInterface::DIFF_ABSOLUTE]);
            $systemPrompt .= "- The document they took the longest to approve was {$doc->document_number} ({$doc->title}), which took them {$durationStr} to review and approve.\n\n";
        } else {
            $systemPrompt .= "\n";
        }

        $systemPrompt .= "If the user asks about their documents, use the statistics above. ";
        $systemPrompt .= "If they ask about a specific document number, advise them to use the command `/status DOC-YYYY-NUMBER` (e.g., /status DOC-2026-00001). ";
        $systemPrompt .= "If they ask to see the list of pending documents, advise them to use `/pending`. ";
        $systemPrompt .= "If they ask about something completely unrelated to the document tracking system, politely remind them that your main job is to help with document tracking, but you can still answer briefly.";

        $tools = [
            [
                'functionDeclarations' => [
                    [
                        'name' => 'searchDocuments',
                        'description' => 'Search for documents owned by the user by keyword or ID.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'keyword' => [
                                    'type' => 'STRING',
                                    'description' => 'Search keyword for title or document number'
                                ]
                            ],
                            'required' => ['keyword']
                        ]
                    ],
                    [
                        'name' => 'getDocumentDetails',
                        'description' => 'Get full details and approval history of a specific document.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'document_number' => [
                                    'type' => 'STRING',
                                    'description' => 'The unique document number (e.g., DOC-2026-00001)'
                                ]
                            ],
                            'required' => ['document_number']
                        ]
                    ],
                    [
                        'name' => 'getRecentDocuments',
                        'description' => 'Get the 5 most recent documents requested by the user. Use this when the user asks about their recent documents without specifying a keyword or ID.',
                        'parameters' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'limit' => [
                                    'type' => 'INTEGER',
                                    'description' => 'Number of documents to return (default 5)'
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ];

        try {
            $requestData = [
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => "System Instructions:\n" . $systemPrompt . "\n\nUser Question:\n" . $message]]]
                ],
                'tools' => $tools,
                'generationConfig' => [
                    'temperature' => 0.7,
                    'maxOutputTokens' => 800,
                ]
            ];
            
            $response = Http::timeout(30)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' . $apiKey, $requestData);

            if ($response->successful()) {
                $data = $response->json();
                $iterations = 0;
                
                while (isset($data['candidates'][0]['content']['parts'][0]['functionCall']) && $iterations < 3) {
                    $iterations++;
                    $functionCall = $data['candidates'][0]['content']['parts'][0]['functionCall'];
                    $functionName = $functionCall['name'];
                    $args = $functionCall['args'] ?? [];
                    
                    $functionResult = $this->executeAiTool($user, $functionName, $args);
                    
                    // Append model's functionCall
                    $requestData['contents'][] = $data['candidates'][0]['content'];
                    // Append our functionResponse
                    $requestData['contents'][] = [
                        'role' => 'user',
                        'parts' => [
                            [
                                'functionResponse' => [
                                    'name' => $functionName,
                                    'response' => ['result' => $functionResult]
                                ]
                            ]
                        ]
                    ];
                    
                    // Call again
                    $response = Http::timeout(30)
                        ->withHeaders(['Content-Type' => 'application/json'])
                        ->post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' . $apiKey, $requestData);
                        
                    if (!$response->successful()) {
                        return "⚠️ មានបញ្ហាពេលដំណើរការទិន្នន័យពី Database (API Error on iteration {$iterations})។";
                    }
                    $data = $response->json();
                }

                return $data['candidates'][0]['content']['parts'][0]['text'] ?? "សុំទោស ខ្ញុំមិនអាចឆ្លើយតបបានទេនៅពេលនេះ។";
            }

            Log::error('Gemini API Error: ' . $response->body());
            return "⚠️ សុំទោស មានបញ្ហាក្នុងការតភ្ជាប់ទៅកាន់ AI (API Error)។ សូមសាកល្បងម្ដងទៀតនៅពេលក្រោយ។";

        } catch (\Exception $e) {
            Log::error('Gemini Exception: ' . $e->getMessage());
            return "⚠️ សុំទោស មានកំហុសប្រព័ន្ធ (System Error) ពេលព្យាយាមទាក់ទង AI។";
        }
    }

    private function executeAiTool(User $user, string $functionName, array $args): string
    {
        if ($functionName === 'getDocumentDetails') {
            $docNumber = $args['document_number'] ?? '';
            $doc = Document::with(['documentType', 'documentApproval.department'])->where('document_number', $docNumber)->first();
            if (!$doc) return "Document not found or does not exist.";
            
            // Format details
            $result = "Title: {$doc->title}\nType: " . ($doc->documentType->name ?? 'N/A') . "\nStatus: {$doc->status}\n";
            $result .= "Approval History:\n";
            foreach ($doc->documentApproval->sortBy('sequence_order') as $app) {
                $dept = $app->department->name ?? 'Unknown';
                $result .= "- Department {$dept}: {$app->status} (Updated at: {$app->updated_at})\n";
            }
            return $result;
        }
        
        if ($functionName === 'searchDocuments') {
            $keyword = $args['keyword'] ?? '';
            $docs = Document::where('owner_id', $user->user_id)
                ->where(function($q) use ($keyword) {
                    $q->where('title', 'ILIKE', "%{$keyword}%")
                      ->orWhere('document_number', 'ILIKE', "%{$keyword}%");
                })->orderBy('created_at', 'desc')->take(5)->get();
                
            if ($docs->isEmpty()) return "No documents found matching the keyword '{$keyword}'.";
            
            $result = "Found " . $docs->count() . " matching documents (limited to 5):\n";
            foreach ($docs as $doc) {
                $result .= "- {$doc->document_number}: {$doc->title} (Status: {$doc->status})\n";
            }
            return $result;
        }
        
        if ($functionName === 'getRecentDocuments') {
            $limit = $args['limit'] ?? 5;
            $docs = Document::where('owner_id', $user->user_id)->orderBy('created_at', 'desc')->take($limit)->get();
                
            if ($docs->isEmpty()) return "User has not requested any documents.";
            
            $result = "User's most recent {$docs->count()} documents:\n";
            foreach ($docs as $doc) {
                $result .= "- {$doc->document_number}: {$doc->title} (Status: {$doc->status}, Date: {$doc->created_at})\n";
            }
            return $result;
        }
        
        return "Unknown function.";
    }
}
