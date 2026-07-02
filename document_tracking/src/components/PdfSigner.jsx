"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Rnd } from 'react-rnd';
import { Check, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../utils/api';

// Set worker path to local to avoid CORS issues
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfSigner({ 
    fileUrl, 
    fileName, 
    documentId, 
    signaturePhoto, 
    onClose, 
    onSuccess 
}) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [signaturePos, setSignaturePos] = useState({ x: 100, y: 100, width: 150, height: 100 });
    const [isSigning, setIsSigning] = useState(false);
    const [error, setError] = useState('');
    const [comment, setComment] = useState("");
    
    // We need to track the rendered size of the PDF page to scale coordinates correctly
    const pageRef = useRef(null);
    const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    const handleSignDocument = async () => {
        if (!pdfDimensions.width || !pdfDimensions.height) {
            setError("PDF page dimensions not fully loaded yet.");
            return;
        }

        setIsSigning(true);
        setError('');

        try {
            // Retrieve token if using auth
            const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;

            const response = await fetch(`${API_BASE_URL}/documents/${documentId}/sign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    file_name: fileName,
                    signature_image: signaturePhoto,
                    x: signaturePos.x,
                    y: signaturePos.y,
                    page: pageNumber,
                    pdf_width: pdfDimensions.width,
                    pdf_height: pdfDimensions.height,
                    signature_width: signaturePos.width,
                    signature_height: signaturePos.height
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to sign document');
            }

            onSuccess(data.new_file, comment);
        } catch (err) {
            setError(err.message || "Failed to sign document. Please check console for details.");
            setIsSigning(false);
            console.error("Signature error:", err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-[#161B22] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sign Document</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-auto bg-gray-100 dark:bg-[#0F1117] p-4 flex justify-center relative">
                    <div 
                        ref={pageRef}
                        className="relative shadow-lg bg-white mx-auto"
                        style={{ 
                            width: pdfDimensions.width > 0 ? pdfDimensions.width : 'max-content',
                            height: pdfDimensions.height > 0 ? pdfDimensions.height : 'max-content'
                        }}
                    >
                        <Document
                            file={fileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={(err) => {
                                console.error("PDF Load Error:", err);
                                setError("Cannot preview this file. Please use the Preview button or upload a valid PDF.");
                            }}
                            loading={<div className="p-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-blue-500"/></div>}
                            error={<div className="p-20 text-red-500 text-center flex flex-col items-center">
                                <span className="font-bold mb-2">Failed to load PDF</span>
                                <span className="text-sm">{error || "Cannot preview this file. Please use the Preview button or upload a valid PDF."}</span>
                            </div>}
                        >
                            <Page 
                                pageNumber={pageNumber} 
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                onLoadSuccess={(page) => {
                                    setPdfDimensions({
                                        width: page.width,
                                        height: page.height
                                    });
                                }}
                            />
                        </Document>

                        {/* Draggable Signature Overlay */}
                        {pdfDimensions.width > 0 && (
                            <Rnd
                                size={{ width: signaturePos.width, height: signaturePos.height }}
                                position={{ x: signaturePos.x, y: signaturePos.y }}
                                onDragStop={(e, d) => setSignaturePos(prev => ({ ...prev, x: d.x, y: d.y }))}
                                onResizeStop={(e, direction, ref, delta, position) => {
                                    setSignaturePos({
                                        width: parseInt(ref.style.width, 10),
                                        height: parseInt(ref.style.height, 10),
                                        ...position,
                                    });
                                }}
                                bounds="parent"
                                className="border-2 border-blue-500 border-dashed rounded bg-blue-500/10 flex items-center justify-center overflow-hidden cursor-move"
                            >
                                {signaturePhoto ? (
                                    <div className="w-full h-full flex flex-col items-center justify-start relative p-1">
                                        <div className="h-1/2 w-full flex items-center justify-center">
                                            <img 
                                                src={signaturePhoto} 
                                                alt="Your Signature" 
                                                className="max-w-full max-h-full object-contain pointer-events-none opacity-80 mix-blend-multiply dark:mix-blend-normal"
                                            />
                                        </div>
                                        <div className="h-1/2 w-full flex flex-col items-center justify-center pointer-events-none text-center pt-2">
                                            <span className="font-bold text-[10px] leading-tight text-gray-800 dark:text-white" style={{fontFamily: 'Helvetica'}}>(Your Name)</span>
                                            <span className="text-[9px] leading-tight text-gray-700 dark:text-gray-200 mt-1" style={{fontFamily: 'Helvetica'}}>(Your Department)</span>
                                            <span className="italic text-[8px] leading-tight text-gray-600 dark:text-gray-400 mt-1" style={{fontFamily: 'Helvetica'}}>{new Date().toLocaleString('en-GB', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-gray-400 font-bold text-xs p-2 text-center">No Signature Provided</span>
                                )}
                            </Rnd>
                        )}
                    </div>
                </div>

                {/* Comment Section */}
                <div className="px-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <textarea 
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#0F1117] border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none placeholder-gray-400 text-gray-900 dark:text-gray-100"
                        rows="2"
                        placeholder="Add an optional comment for your approval..."
                    />
                </div>

                {/* Footer / Controls */}
                <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    
                    {/* Pagination */}
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-[#0F1117] px-4 py-2 rounded-lg">
                        <button 
                            disabled={pageNumber <= 1}
                            onClick={() => setPageNumber(p => p - 1)}
                            className="p-1 disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Page {pageNumber} of {numPages || '?'}
                        </span>
                        <button 
                            disabled={pageNumber >= numPages}
                            onClick={() => setPageNumber(p => p + 1)}
                            className="p-1 disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm font-medium">{error}</p>
                    )}

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                            onClick={onClose}
                            className="flex-1 md:flex-none px-6 py-2.5 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSignDocument}
                            disabled={isSigning || !pdfDimensions.width}
                            className="flex-1 md:flex-none px-6 py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shadow-sm shadow-blue-500/20"
                        >
                            {isSigning ? (
                                <><Loader2 size={18} className="animate-spin" /> Signing...</>
                            ) : (
                                <><Check size={18} /> Confirm Signature</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


