<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentVersion;
use Illuminate\Http\Request;

class DocumentVersionController extends Controller
{
    /**
     * Get document versions
     * 
     * Returns the file versions and history for a specific document.
     * 
     * @param string $documentNumber The document number (e.g. REQ-123)
     */
    public function index($documentNumber)
    {
        $document = Document::where('document_number', $documentNumber)->first();
        if (!$document) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        $versions = DocumentVersion::with(['uploadedBy'])
            ->where('document_id', $document->document_id)
            ->orderBy('version_number', 'desc')
            ->get();

        return response()->json($versions);
    }
}
