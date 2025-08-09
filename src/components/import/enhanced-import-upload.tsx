'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Upload, 
  File, 
  FileText, 
  Clipboard, 
  X, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  FileSpreadsheet,
  FileType
} from 'lucide-react';
import { ExcelParser, ExcelParseResult } from '@/lib/parsers/excel-parser';
import { PDFParser, PDFParseResult } from '@/lib/parsers/pdf-parser';
import { ClipboardParser, ParseResult } from '@/lib/clipboard-parser';
import { AITransactionParser, TransactionParsingRequest } from '@/lib/ai-transaction-parser';

export interface FileUploadResult {
  type: 'structured' | 'unstructured';
  structured?: ParseResult | ExcelParseResult;
  unstructured?: {
    text: string;
    aiParsed?: any;
  };
  filename: string;
  fileType: string;
}

export interface EnhancedImportUploadProps {
  onDataParsed?: (result: FileUploadResult) => void;
  onError?: (error: string) => void;
}

const SUPPORTED_FILE_TYPES = {
  'text/csv': 'CSV',
  'application/vnd.ms-excel': 'Excel (.xls)',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel (.xlsx)',
  'application/pdf': 'PDF',
  'text/plain': 'Text'
};

export function EnhancedImportUpload({ onDataParsed, onError }: EnhancedImportUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [parseResults, setParseResults] = useState<FileUploadResult[]>([]);
  const [textContent, setTextContent] = useState('');
  const [showTextArea, setShowTextArea] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!Object.keys(SUPPORTED_FILE_TYPES).includes(file.type) && 
        !file.name.match(/\.(csv|xlsx|xls|pdf|txt)$/i)) {
      return `Unsupported file type: ${file.type || 'unknown'}`;
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size exceeds 50MB limit';
    }

    return null;
  }, []);

  const processFile = useCallback(async (file: File): Promise<FileUploadResult> => {
    const fileType = file.type || '';
    const fileName = file.name.toLowerCase();

    try {
      // Handle Excel files - Try AI parsing first
      if (fileType.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setProcessingStatus(`Reading Excel file: ${file.name}`);
        const result = await ExcelParser.parseFile(file);
        
        // Convert Excel data to text format for AI
        const fileContent = result.headers.join(',') + '\n' + 
          result.rows.map(row => result.headers.map(h => row[h] || '').join(',')).join('\n');
        
        try {
          setProcessingStatus(`🤖 AI parsing Excel file: ${file.name}`);
          console.log('🚀 Attempting AI parsing for Excel file:', file.name);
          
          const aiResult = await AITransactionParser.parseTransactions({
            text: fileContent,
            format: 'csv'
          });

          console.log('✅ AI parsing successful for Excel:', aiResult);

          return {
            type: 'unstructured',
            unstructured: {
              text: fileContent,
              aiParsed: aiResult
            },
            filename: file.name,
            fileType: 'Excel (AI Parsed)'
          };
        } catch (aiError) {
          console.warn('🤖 AI parsing failed for Excel, falling back to basic extraction:', aiError);
          setProcessingStatus(`⚠️ AI unavailable, using basic parsing for ${file.name}`);
          
          return {
            type: 'structured',
            structured: {
              headers: result.headers,
              rows: result.rows,
              format: 'csv' as const
            },
            filename: file.name,
            fileType: 'Excel (Basic Parsing - AI Unavailable)'
          };
        }
      }

      // Handle CSV files - Try AI parsing first with fallback
      if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
        const text = await file.text();
        
        try {
          setProcessingStatus(`🤖 AI parsing CSV file: ${file.name}`);
          console.log('🚀 Attempting AI parsing for CSV file:', file.name);
          
          const aiResult = await AITransactionParser.parseTransactions({
            text,
            format: 'csv'
          });

          console.log('✅ AI parsing successful for CSV:', aiResult);

          return {
            type: 'unstructured',
            unstructured: {
              text,
              aiParsed: aiResult
            },
            filename: file.name,
            fileType: 'CSV (AI Parsed)'
          };
        } catch (aiError) {
          console.warn('🤖 AI parsing failed for CSV, falling back to basic extraction:', aiError);
          setProcessingStatus(`⚠️ AI unavailable, using basic parsing for ${file.name}`);
          
          const result = ExcelParser.parseCSVText(text);
          return {
            type: 'structured',
            structured: {
              headers: result.headers,
              rows: result.rows,
              format: 'csv' as const
            },
            filename: file.name,
            fileType: 'CSV (Basic Parsing - AI Unavailable)'
          };
        }
      }

      // Handle PDF files - For now, we'll skip PDF processing in browser
      if (fileType === 'application/pdf') {
        setProcessingStatus(`PDF processing not yet supported in browser: ${file.name}`);
        
        // For now, return a placeholder - in production this would be handled server-side
        return {
          type: 'unstructured',
          unstructured: {
            text: `PDF file uploaded: ${file.name}\n\nPDF text extraction will be implemented in the server-side processing.`,
            aiParsed: {
              transactions: [],
              totalFound: 0,
              successRate: 0,
              errors: ['PDF processing requires server-side implementation'],
              warnings: ['PDF files are not yet fully supported']
            }
          },
          filename: file.name,
          fileType: 'PDF (Limited Support)'
        };
      }

      // Handle text files - Try AI parsing first with fallback
      if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        const text = await file.text();
        
        try {
          setProcessingStatus(`🤖 AI parsing text file: ${file.name}`);
          console.log('🚀 Attempting AI parsing for text file:', file.name);
          
          const aiResult = await AITransactionParser.parseTransactions({
            text,
            format: 'auto'
          });

          console.log('✅ AI parsing successful for text:', aiResult);

          return {
            type: 'unstructured',
            unstructured: {
              text,
              aiParsed: aiResult
            },
            filename: file.name,
            fileType: 'Text (AI Parsed)'
          };
        } catch (aiError) {
          console.warn('🤖 AI parsing failed for text, falling back to basic extraction:', aiError);
          setProcessingStatus(`⚠️ AI unavailable, trying basic parsing for ${file.name}`);
          
          // Try basic structured parsing as fallback
          try {
            const structuredResult = ClipboardParser.parseText(text);
            return {
              type: 'structured',
              structured: structuredResult,
              filename: file.name,
              fileType: 'Text (Basic Parsing - AI Unavailable)'
            };
          } catch (basicError) {
            throw new Error(`Both AI and basic parsing failed: AI: ${aiError instanceof Error ? aiError.message : 'Unknown AI error'}, Basic: ${basicError instanceof Error ? basicError.message : 'Unknown basic error'}`);
          }
        }
      }

      throw new Error(`Unsupported file format: ${file.type || 'unknown'}`);

    } catch (error) {
      throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    // Validate all files first
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      onError?.(errors.join('\n'));
      return;
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
    setIsProcessing(true);
    setProcessingStatus('Starting file processing...');

    try {
      const results: FileUploadResult[] = [];

      for (const file of validFiles) {
        const result = await processFile(file);
        results.push(result);
        onDataParsed?.(result);
      }

      setParseResults(prev => [...prev, ...results]);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'File processing failed');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  }, [validateFile, processFile, onDataParsed, onError]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(Array.from(files));
    }
  }, [handleFiles]);

  const handleClipboardImport = useCallback(async () => {
    setIsProcessing(true);
    setProcessingStatus('Reading from clipboard...');

    try {
      // Get clipboard text first
      const text = await navigator.clipboard.readText();
      
      // Try AI parsing first
      try {
        setProcessingStatus('🤖 AI parsing clipboard data...');
        console.log('🚀 Attempting AI parsing for clipboard data');
        
        const aiResult = await AITransactionParser.parseTransactions({
          text,
          format: 'auto'
        });

        console.log('✅ AI parsing successful for clipboard:', aiResult);

        const uploadResult: FileUploadResult = {
          type: 'unstructured',
          unstructured: {
            text,
            aiParsed: aiResult
          },
          filename: 'Clipboard Data',
          fileType: 'Clipboard (AI Parsed)'
        };

        setParseResults(prev => [...prev, uploadResult]);
        onDataParsed?.(uploadResult);
      } catch (aiError) {
        console.warn('🤖 AI parsing failed for clipboard, falling back to basic extraction:', aiError);
        setProcessingStatus('⚠️ AI unavailable, using basic parsing for clipboard data');
        
        // Fallback to basic parsing
        const result = await ClipboardParser.parseFromClipboard();
        const uploadResult: FileUploadResult = {
          type: 'structured',
          structured: result,
          filename: 'Clipboard Data',
          fileType: 'Clipboard (Basic Parsing - AI Unavailable)'
        };

        setParseResults(prev => [...prev, uploadResult]);
        onDataParsed?.(uploadResult);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to parse clipboard content');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  }, [onDataParsed, onError]);

  const handleTextImport = useCallback(async () => {
    if (!textContent.trim()) {
      onError?.('Please enter some text to parse');
      return;
    }

    setIsProcessing(true);

    try {
      // Try AI parsing first
      try {
        setProcessingStatus('🤖 AI parsing text content...');
        console.log('🚀 Attempting AI parsing for manual text input');
        
        const aiResult = await AITransactionParser.parseTransactions({
          text: textContent,
          format: 'auto'
        });

        console.log('✅ AI parsing successful for text input:', aiResult);

        const uploadResult: FileUploadResult = {
          type: 'unstructured',
          unstructured: {
            text: textContent,
            aiParsed: aiResult
          },
          filename: 'Manual Text Input',
          fileType: 'Text (AI Parsed)'
        };

        setParseResults(prev => [...prev, uploadResult]);
        onDataParsed?.(uploadResult);
      } catch (aiError) {
        console.warn('🤖 AI parsing failed for text input, falling back to basic extraction:', aiError);
        setProcessingStatus('⚠️ AI unavailable, trying basic parsing for text input');
        
        // Fallback to basic structured parsing
        try {
          const structuredResult = ClipboardParser.parseText(textContent);
          const uploadResult: FileUploadResult = {
            type: 'structured',
            structured: structuredResult,
            filename: 'Manual Text Input',
            fileType: 'Text (Basic Parsing - AI Unavailable)'
          };

          setParseResults(prev => [...prev, uploadResult]);
          onDataParsed?.(uploadResult);
        } catch (basicError) {
          throw new Error(`Both AI and basic parsing failed: AI: ${aiError instanceof Error ? aiError.message : 'Unknown AI error'}, Basic: ${basicError instanceof Error ? basicError.message : 'Unknown basic error'}`);
        }
      }

      setTextContent('');
      setShowTextArea(false);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to parse text content');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  }, [textContent, onDataParsed, onError]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setParseResults(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'Excel (.xls)':
      case 'Excel (.xlsx)':
      case 'Excel': 
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
      case 'PDF': return <FileType className="h-5 w-5 text-red-600" />;
      case 'CSV': return <File className="h-5 w-5 text-blue-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Transaction Data
          </CardTitle>
          <CardDescription>
            Upload Excel (.xlsx), CSV, PDF files, or paste text data. AI will extract transactions automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
          >
            <div className="space-y-4">
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  Drop files here or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports Excel, CSV, PDF, and text files up to 50MB
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {Object.values(SUPPORTED_FILE_TYPES).map(type => (
                  <Badge key={type} variant="secondary">{type}</Badge>
                ))}
              </div>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                Choose Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.pdf,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Alternative Import Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border">
              <CardContent className="p-4 text-center space-y-3">
                <Clipboard className="h-8 w-8 text-blue-600 mx-auto" />
                <div>
                  <h3 className="font-medium">From Clipboard</h3>
                  <p className="text-sm text-gray-600">Paste copied data directly</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClipboardImport}
                  disabled={isProcessing}
                >
                  Import from Clipboard
                </Button>
              </CardContent>
            </Card>

            <Card className="border">
              <CardContent className="p-4 text-center space-y-3">
                <FileText className="h-8 w-8 text-green-600 mx-auto" />
                <div>
                  <h3 className="font-medium">Type/Paste Text</h3>
                  <p className="text-sm text-gray-600">Enter transaction data manually</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowTextArea(!showTextArea)}
                  disabled={isProcessing}
                >
                  {showTextArea ? 'Hide Text Area' : 'Show Text Area'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Text Area */}
          {showTextArea && (
            <Card className="border">
              <CardContent className="p-4 space-y-4">
                <textarea
                  className="w-full h-32 p-3 border rounded-md resize-y"
                  placeholder="Paste or type your transaction data here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleTextImport}
                    disabled={!textContent.trim() || isProcessing}
                  >
                    Parse Text
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setTextContent('');
                      setShowTextArea(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-blue-800">{processingStatus}</span>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Upload Results */}
      {parseResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Import Results ({parseResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {parseResults.map((result, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  {getFileIcon(result.fileType)}
                  <div className="flex-1">
                    <div className="font-medium">{result.filename}</div>
                    <div className="text-sm text-gray-600">
                      Type: {result.fileType} | 
                      {result.type === 'structured' 
                        ? ` Found ${result.structured?.rows.length || 0} rows`
                        : ` AI extracted ${result.unstructured?.aiParsed?.transactions?.length || 0} transactions`
                      }
                    </div>
                  </div>
                  <Badge variant={result.type === 'structured' ? 'default' : 'secondary'}>
                    {result.type === 'structured' ? 'Structured' : 'AI Parsed'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview of last parsed data */}
      {parseResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
            <CardDescription>
              Preview of the most recently processed file
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const lastResult = parseResults[parseResults.length - 1];
              
              if (lastResult.type === 'structured' && lastResult.structured) {
                const data = lastResult.structured;
                return (
                  <div className="max-h-64 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {data.headers.map((header, index) => (
                            <TableHead key={index} className="min-w-[120px]">
                              {header || `Column ${index + 1}`}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.rows.slice(0, 5).map((row, index) => (
                          <TableRow key={index}>
                            {data.headers.map((header, cellIndex) => (
                              <TableCell key={cellIndex} className="max-w-[200px] truncate">
                                {row[header] || ''}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {data.rows.length > 5 && (
                      <div className="mt-2 text-sm text-gray-500 text-center">
                        Showing first 5 of {data.rows.length} rows
                      </div>
                    )}
                  </div>
                );
              }

              if (lastResult.type === 'unstructured' && lastResult.unstructured?.aiParsed) {
                const aiData = lastResult.unstructured.aiParsed;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="secondary">
                        {aiData.transactions?.length || 0} transactions found
                      </Badge>
                      <Badge variant={aiData.successRate > 0.8 ? 'default' : 'secondary'}>
                        {Math.round((aiData.successRate || 0) * 100)}% confidence
                      </Badge>
                    </div>
                    
                    {aiData.transactions && aiData.transactions.length > 0 && (
                      <div className="max-h-64 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Vendor</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Confidence</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {aiData.transactions.slice(0, 5).map((tx: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{tx.vendor}</TableCell>
                                <TableCell>${tx.amount}</TableCell>
                                <TableCell>
                                  <Badge variant={tx.confidence > 0.8 ? 'default' : 'secondary'}>
                                    {Math.round(tx.confidence * 100)}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              }

              return <div className="text-gray-500">No preview available</div>;
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}