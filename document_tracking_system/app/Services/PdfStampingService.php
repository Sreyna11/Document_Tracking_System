<?php

namespace App\Services;

use App\Models\Document;
use Illuminate\Support\Facades\Storage;
use setasign\Fpdi\Tcpdf\Fpdi;

class PdfStampingService
{
    /**
     * Stamps the given document with signatures of all approvers.
     * Returns the raw bytes of the stamped PDF.
     */
    public function stampDocument(Document $doc, array $pathData): ?string
    {
        // 1. Get the original PDF
        $originalPdfBytes = $this->getSourcePdf($doc);
        if (!$originalPdfBytes) {
            return null;
        }

        if (substr($originalPdfBytes, 0, 4) !== '%PDF') {
            return null; // Not a PDF
        }

        $tempOriginalPath = sys_get_temp_dir() . '/doc_' . uniqid() . '.pdf';
        $tempSignedPath = sys_get_temp_dir() . '/signed_' . uniqid() . '.pdf';
        
        file_put_contents($tempOriginalPath, $originalPdfBytes);
        
        $tempFiles = [$tempOriginalPath, $tempSignedPath];

        try {
            // 2. Initialize FPDI/TCPDF
            $pdf = new Fpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            
            // 3. Import existing pages
            $pageCount = $pdf->setSourceFile($tempOriginalPath);
            
            $orientation = 'P';
            $width = 210;
            $height = 297;

            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $templateId = $pdf->importPage($pageNo);
                $size = $pdf->getTemplateSize($templateId);
                
                $orientation = $size['orientation'];
                $width = $size['width'];
                $height = $size['height'];

                $pdf->AddPage($orientation, [$width, $height]);
                $pdf->useTemplate($templateId);
            }

            // 4. Create Signature Page
            $pdf->AddPage($orientation, [$width, $height]);
            
            // Title
            $pdf->SetFont('helvetica', 'B', 16);
            $pdf->Cell(0, 15, 'Official Document Signatures', 0, 1, 'C');
            $pdf->SetFont('helvetica', '', 10);
            $pdf->Cell(0, 10, 'Tracking ID: ' . $doc->document_number, 0, 1, 'C');
            $pdf->Cell(0, 10, 'Title: ' . $doc->title, 0, 1, 'C');
            $pdf->Ln(10);
            
            // Grid settings
            $gridCols = 3;
            if ($orientation === 'L') {
                $gridCols = 4;
            }
            $colWidth = $width / $gridCols;
            $currentCol = 0;
            
            $startX = 10;
            $startY = $pdf->GetY();
            
            $rowHeight = 50;

            // 5. Draw Signatures
            foreach ($pathData as $step) {
                if (!isset($step['status']) || $step['status'] !== 'Approved') {
                    continue;
                }
                
                $deptName = is_string($step) ? $step : ($step['department'] ?? $step['mainRole'] ?? 'Unknown');
                $approverName = $step['userSign'] ?? 'Unknown Approver';
                
                $dateStr = 'Unknown Date';
                if (isset($step['approvedAt'])) {
                    $dateStr = date('d-M-Y H:i', strtotime($step['approvedAt']));
                } elseif (isset($step['date'])) {
                    $dateStr = date('d-M-Y H:i', strtotime($step['date']));
                }
                
                // Get Signature Image
                $signatureImageBytes = $this->getSignatureImageBytes($approverName);
                
                $x = $startX + ($currentCol * $colWidth);
                $y = $startY;
                
                if ($signatureImageBytes) {
                    $tempSigPath = sys_get_temp_dir() . '/sig_' . uniqid() . '.png';
                    file_put_contents($tempSigPath, $signatureImageBytes);
                    $tempFiles[] = $tempSigPath;
                    
                    // Convert to JPG if necessary, or just rely on TCPDF parsing
                    try {
                        $pdf->Image($tempSigPath, $x + 5, $y, $colWidth - 20, 20, '', '', '', false, 300, '', false, false, 1, false, false, false);
                    } catch (\Exception $e) {
                        // Ignore invalid image
                    }
                }
                
                $pdf->SetXY($x + 5, $y + 25);
                $pdf->SetFont('helvetica', 'B', 10);
                $pdf->Cell($colWidth - 10, 5, $approverName, 0, 1, 'C');
                
                $pdf->SetXY($x + 5, $y + 30);
                $pdf->SetFont('helvetica', '', 9);
                $pdf->Cell($colWidth - 10, 5, $deptName, 0, 1, 'C');
                
                $pdf->SetXY($x + 5, $y + 35);
                $pdf->SetFont('helvetica', 'I', 8);
                $pdf->Cell($colWidth - 10, 5, $dateStr, 0, 1, 'C');
                
                $currentCol++;
                if ($currentCol >= $gridCols) {
                    $currentCol = 0;
                    $startY += $rowHeight;
                    if ($startY > $height - 40) {
                        $pdf->AddPage($orientation, [$width, $height]);
                        $startY = 20;
                    }
                }
            }

            // Lock PDF
            // Removed SetProtection because it prevents some PDF viewers from printing
            // $pdf->SetProtection(['print', 'print-high'], '', bin2hex(random_bytes(16)), 3, null);

            // 6. Output and return
            $pdf->Output($tempSignedPath, 'F');
            $signedBytes = file_get_contents($tempSignedPath);
            return $signedBytes;
            
        } catch (\Exception $e) {
            \Log::error("PDF Stamping Error: " . $e->getMessage());
            return null;
        } finally {
            foreach ($tempFiles as $f) {
                if (file_exists($f)) @unlink($f);
            }
        }
    }
    
    private function getSignatureImageBytes(string $username): ?string
    {
        $user = \App\Models\User::where('username', 'ILIKE', "%{$username}%")
            ->orWhere('fullname_en', 'ILIKE', "%{$username}%")
            ->whereNotNull('signature_photo')
            ->first();
            
        if (!$user) return null;
        
        $url = $user->signature_photo;
        // Parse filename from URL
        $parts = explode('/', parse_url($url, PHP_URL_PATH));
        $filename = end($parts);
        
        if ($filename && Storage::disk('s3')->exists('signatures/' . $filename)) {
            return Storage::disk('s3')->get('signatures/' . $filename);
        }
        
        if (strpos($url, 'http') === 0) {
            $bytes = @file_get_contents($url);
            if ($bytes) return $bytes;
        }
        
        return null;
    }

    private function getSourcePdf(Document $doc): ?string
    {
        $fileName = current(json_decode($doc->metadata, true)['files'] ?? [])['name'] ?? $doc->file_path;
        
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

        return null;
    }
}
