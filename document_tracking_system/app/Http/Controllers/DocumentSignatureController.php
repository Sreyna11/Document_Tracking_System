<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use setasign\Fpdi\Fpdi;

class DocumentSignatureController extends Controller
{
    private function getSourcePdf(Document $doc, string $fileName): ?string
    {
        if ($fileName) {
            if (Storage::disk('s3')->exists('signed/' . $fileName)) {
                return Storage::disk('s3')->get('signed/' . $fileName);
            } elseif (Storage::disk('s3')->exists('unsigned/' . $fileName)) {
                return Storage::disk('s3')->get('unsigned/' . $fileName);
            } elseif (Storage::disk('s3')->exists('uploads/' . $fileName)) {
                return Storage::disk('s3')->get('uploads/' . $fileName);
            } elseif (Storage::disk('s3')->exists($fileName)) {
                return Storage::disk('s3')->get($fileName);
            }
        }

        $localPath = public_path('uploads/documents/' . $fileName);
        if ($fileName && file_exists($localPath)) {
            return file_get_contents($localPath);
        }

        $metadata = json_decode($doc->metadata, true);
        $file = $metadata['files'][0] ?? null;

        if (!$file) {
            return null;
        }

        $encoded = $file['data'] ?? $file['dataUrl'] ?? $file['base64'] ?? null;
        if (!$encoded || !is_string($encoded)) {
            return null;
        }

        $base64pos = strpos($encoded, ',');
        if ($base64pos !== false) {
            return base64_decode(substr($encoded, $base64pos + 1));
        }

        $decoded = base64_decode($encoded, true);
        return $decoded !== false ? $decoded : null;
    }

    public function sign(Request $request, string $id)
    {
        $request->validate([
            'file_name' => 'required|string',
            'signature_image' => 'required|string',
            'x' => 'required|numeric',
            'y' => 'required|numeric',
            'page' => 'required|integer',
            'pdf_width' => 'required|numeric',
            'pdf_height' => 'required|numeric',
            'signature_width' => 'required|numeric',
            'signature_height' => 'required|numeric',
        ]);

        $doc = Document::where(function ($q) use ($id) {
            if (is_numeric($id)) {
                $q->where('document_id', $id);
            }
            $q->orWhere('document_number', $id);
        })->first();
        if (!$doc) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        $userId = Auth::id() ?? $doc->owner_id;
        $metadata = json_decode($doc->metadata, true) ?: [];

        $rawData = $this->getSourcePdf($doc, $request->file_name);
        if (!$rawData) {
            return response()->json(['message' => 'Cannot preview this file. Please use the Preview button or upload a valid PDF.'], 404);
        }

        if (substr($rawData, 0, 4) !== '%PDF') {
            return response()->json(['message' => 'This file must be converted to PDF before signing.'], 422);
        }

        $tempOriginalPath = sys_get_temp_dir() . '/doc_' . uniqid() . '.pdf';
        $tempSignaturePath = null;
        $tempSignedPath = sys_get_temp_dir() . '/signed_' . uniqid() . '.pdf';

        file_put_contents($tempOriginalPath, $rawData);

        $signatureData = $request->signature_image;
        $signatureBytes = null;
        
        if (strpos($signatureData, 'http://') === 0 || strpos($signatureData, 'https://') === 0) {
            $signatureBytes = @file_get_contents($signatureData);
        } else {
            if (strpos($signatureData, ',') !== false) {
                $signatureData = explode(',', $signatureData, 2)[1];
            }
            $signatureBytes = base64_decode($signatureData);
        }

        if (!$signatureBytes) {
            return response()->json(['message' => 'Cannot use this signature image. Please upload a valid signature.'], 422);
        }

        $im = @imagecreatefromstring($signatureBytes);
        $imageType = 'PNG';

        if ($im !== false) {
            $width = imagesx($im);
            $height = imagesy($im);

            $bg = imagecreatetruecolor($width, $height);
            $white = imagecolorallocate($bg, 255, 255, 255);
            imagefill($bg, 0, 0, $white);

            imagealphablending($bg, true);
            imagecopy($bg, $im, 0, 0, 0, 0, $width, $height);

            $tempSignaturePath = sys_get_temp_dir() . '/sig_' . uniqid() . '.jpg';
            imagejpeg($bg, $tempSignaturePath, 100);

            imagedestroy($im);
            imagedestroy($bg);

            $imageType = 'JPEG';
        } else {
            $tempSignaturePath = sys_get_temp_dir() . '/sig_' . uniqid() . '.png';
            file_put_contents($tempSignaturePath, $signatureBytes);
        }

        try {
            // Using TCPDF integrated with FPDI
            $pdf = new \setasign\Fpdi\Tcpdf\Fpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            
            $pageCount = $pdf->setSourceFile($tempOriginalPath);

            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $templateId = $pdf->importPage($pageNo);
                $size = $pdf->getTemplateSize($templateId);

                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);

                if ($pageNo == $request->page) {
                    $scaleX = $size['width'] / $request->pdf_width;
                    $scaleY = $size['height'] / $request->pdf_height;

                    $targetX = $request->x * $scaleX;
                    $targetY = $request->y * $scaleY;
                    $targetW = $request->signature_width * $scaleX;
                    $targetH = $request->signature_height * $scaleY;
                    
                    // The top half is the image, the bottom half is the text
                    $imgH = $targetH / 2;

                    $pdf->Image($tempSignaturePath, $targetX, $targetY, $targetW, $imgH, $imageType);
                    
                    // Name
                    $pdf->SetFont('helvetica', 'B', 8);
                    $pdf->SetXY($targetX, $targetY + $imgH + 2);
                    $pdf->Cell($targetW, 4, Auth::user()->username ?? Auth::user()->fullname_en ?? 'Approver', 0, 1, 'C');
                    
                    // Department
                    $deptName = 'Department';
                    if (is_array($metadata) && isset($metadata['path'])) {
                        foreach ($metadata['path'] as $step) {
                            if (isset($step['status']) && $step['status'] === 'Pending') {
                                $deptName = is_string($step) ? $step : ($step['department'] ?? $step['mainRole'] ?? 'Department');
                                break;
                            }
                        }
                    }
                    
                    $pdf->SetFont('helvetica', '', 7);
                    $pdf->SetXY($targetX, $targetY + $imgH + 6);
                    $pdf->Cell($targetW, 4, $deptName, 0, 1, 'C');
                    
                    // Date
                    $pdf->SetFont('helvetica', 'I', 6);
                    $pdf->SetXY($targetX, $targetY + $imgH + 10);
                    $pdf->Cell($targetW, 4, date('d-M-Y H:i'), 0, 1, 'C');
                }
            }

            $newFileName = pathinfo($request->file_name, PATHINFO_FILENAME) . '_signed_' . time() . '.pdf';

            // 1. Lock the PDF (Read-Only)
            // 'print' allows printing but blocks modifying, copying, or extracting content.
            // The 3rd parameter is the owner password which we generate randomly so no one can unlock it.
            // Removed SetProtection because it prevents some PDF viewers from printing
            // $pdf->SetProtection(['print'], '', bin2hex(random_bytes(16)), 3, null);

            // 2. Cryptographic Digital Signature (PKI)
            $certPath = storage_path('app/certs/dts.crt');
            $keyPath = storage_path('app/certs/dts.key');
            if (file_exists($certPath) && file_exists($keyPath)) {
                $pdf->setSignature('file://' . $certPath, 'file://' . $keyPath, '', '', 2, []);
            }

            // Output to temp file
            $pdf->Output($tempSignedPath, 'F');
            $signedBytes = file_get_contents($tempSignedPath);
            $checksum = hash('sha256', $signedBytes);

            Storage::disk('s3')->put('signed/' . $newFileName, $signedBytes);

            if (!isset($metadata['files']) || !is_array($metadata['files'])) {
                $metadata['files'] = [];
            }

            if (!isset($metadata['files'][0]) || !is_array($metadata['files'][0])) {
                $metadata['files'][0] = [];
            }

            unset(
                $metadata['files'][0]['data'],
                $metadata['files'][0]['dataUrl'],
                $metadata['files'][0]['base64']
            );

            $metadata['files'][0]['name'] = $newFileName;
            $metadata['files'][0]['stored_name'] = $newFileName;
            $metadata['files'][0]['size'] = strlen($signedBytes);
            $metadata['files'][0]['type'] = 'application/pdf';
            $metadata['files'][0]['checksum'] = $checksum;

            $doc->metadata = json_encode($metadata);
            $doc->file_path = $newFileName;
            $doc->file_size = strlen($signedBytes);
            $doc->mime_type = 'application/pdf';
            $doc->checksum = $checksum;
            $doc->save();

            $existingVersions = DocumentVersion::where('document_id', $doc->document_id)->get();
            $versionNumber = $existingVersions->count() > 0
                ? $existingVersions->max('version_number') + 1
                : 2;

            DocumentVersion::create([
                'document_id' => $doc->document_id,
                'version_number' => $versionNumber,
                'file_path' => $newFileName,
                'file_size' => strlen($signedBytes),
                'mime_type' => 'application/pdf',
                'checksum' => $checksum,
                'uploaded_by' => $userId,
                'change_summary' => 'Document Signed',
                'created_at' => now(),
            ]);

            AuditLog::create([
                'document_id' => $doc->document_id,
                'user_id' => $userId,
                'action' => 'Signed',
                'action_details' => json_encode(['page' => $request->page]),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            return response()->json([
                'message' => 'Document signed successfully',
                'new_file' => $newFileName
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error stamping signature: ' . $e->getMessage()
            ], 500);
        } finally {
            if (file_exists($tempOriginalPath)) {
                @unlink($tempOriginalPath);
            }

            if ($tempSignaturePath && file_exists($tempSignaturePath)) {
                @unlink($tempSignaturePath);
            }

            if (file_exists($tempSignedPath)) {
                @unlink($tempSignedPath);
            }
        }
    }
}

