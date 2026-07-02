<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentApproval;
use Illuminate\Http\Request;

class DocumentApprovalController extends Controller
{
    /**
     * Get document approvals
     * 
     * Returns the approval path and history for a specific document.
     * 
     * @param string $documentNumber The document number (e.g. REQ-123)
     */
    public function index($documentNumber)
    {
        $document = Document::where('document_number', $documentNumber)->first();
        if (!$document) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        $approvals = DocumentApproval::with(['department', 'approver'])
            ->where('document_id', $document->document_id)
            ->orderBy('sequence_order', 'asc')
            ->get();

        return response()->json($approvals);
    }
}
