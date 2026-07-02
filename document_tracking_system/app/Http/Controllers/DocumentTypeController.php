<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DocumentType;

class DocumentTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $documentTypes = DocumentType::all()->map(function ($type) {
            return [
                'id' => $type->document_type_id,
                'title' => $type->name,
                'description' => $type->description,
                'requires_approval' => $type->requires_approval ? 'Yes' : 'No',
                'retention_days' => $type->retention_days,
                'status' => $type->status ?? 'Active'
            ];
        });

        return response()->json($documentTypes);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'description' => 'nullable|string',
            'requires_approval' => 'required|in:Yes,No',
            'retention_days' => 'required|integer|min:1',
            'status' => 'nullable|string|max:20',
        ]);

        $documentType = DocumentType::create([
            'name' => $validated['title'],
            'description' => $validated['description'],
            'requires_approval' => $validated['requires_approval'] === 'Yes',
            'retention_days' => $validated['retention_days'],
            'status' => $validated['status'] ?? 'Active',
        ]);

        if ($request->user()) {
            \App\Models\AuditLog::create([
                'document_id' => null,
                'user_id' => $request->user()->user_id,
                'action' => 'Document Type Created',
                'action_details' => json_encode([
                    'type_id' => $documentType->type_id,
                    'name' => $documentType->name,
                    'created_by' => $request->user()->name
                ])
            ]);
        }

        return response()->json([
            'message' => 'Document Type created successfully',
            'documentType' => [
                'id' => $documentType->document_type_id,
                'title' => $documentType->name,
                'description' => $documentType->description,
                'requires_approval' => $documentType->requires_approval ? 'Yes' : 'No',
                'retention_days' => $documentType->retention_days,
                'status' => $documentType->status ?? 'Active'
            ]
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $documentType = DocumentType::findOrFail($id);
        
        return response()->json([
            'id' => $documentType->document_type_id,
            'title' => $documentType->name,
            'description' => $documentType->description,
            'requires_approval' => $documentType->requires_approval ? 'Yes' : 'No',
            'retention_days' => $documentType->retention_days,
            'status' => $documentType->status ?? 'Active'
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $documentType = DocumentType::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'description' => 'nullable|string',
            'requires_approval' => 'required|in:Yes,No',
            'retention_days' => 'required|integer|min:1',
            'status' => 'nullable|string|max:20',
        ]);

        $documentType->update([
            'name' => $validated['title'],
            'description' => $validated['description'],
            'requires_approval' => $validated['requires_approval'] === 'Yes',
            'retention_days' => $validated['retention_days'],
            'status' => $validated['status'] ?? $documentType->status,
        ]);

        if ($request->user()) {
            \App\Models\AuditLog::create([
                'document_id' => null,
                'user_id' => $request->user()->user_id,
                'action' => 'Document Type Updated',
                'action_details' => json_encode([
                    'type_id' => $documentType->type_id,
                    'name' => $documentType->name,
                    'updated_by' => $request->user()->name
                ])
            ]);
        }

        return response()->json([
            'message' => 'Document Type updated successfully',
            'documentType' => [
                'id' => $documentType->document_type_id,
                'title' => $documentType->name,
                'description' => $documentType->description,
                'requires_approval' => $documentType->requires_approval ? 'Yes' : 'No',
                'retention_days' => $documentType->retention_days,
                'status' => 'Active'
            ]
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $documentType = DocumentType::findOrFail($id);
        $documentType->delete();

        return response()->json([
            'message' => 'Document Type deleted successfully'
        ]);
    }
}
