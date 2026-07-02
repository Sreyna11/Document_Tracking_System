<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentAccess;
use Illuminate\Http\Request;

class DocumentAccessController extends Controller
{
    /**
     * Get document access grants
     * 
     * Returns the list of departments that have access to this document.
     * 
     * @param string $documentNumber The document number (e.g. REQ-123)
     */
    public function index($documentNumber)
    {
        $document = Document::where('document_number', $documentNumber)->first();
        if (!$document) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        $access = DocumentAccess::with(['department', 'grantedBy'])
            ->where('document_id', $document->document_id)
            ->orderBy('granted_at', 'asc')
            ->get();

        return response()->json($access);
    }
}
