'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardParser, ParseResult } from '@/lib/clipboard-parser';
import { Clipboard, FileText, Upload } from 'lucide-react';

interface ClipboardImportProps {
  onDataParsed?: (result: ParseResult) => void;
}

export function ClipboardImport({ onDataParsed }: ClipboardImportProps) {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClipboardImport = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ClipboardParser.parseFromClipboard();
      setParseResult(result);
      onDataParsed?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse clipboard content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextImport = (text: string) => {
    setError(null);
    
    try {
      const result = ClipboardParser.parseText(text);
      setParseResult(result);
      onDataParsed?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse text content');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clipboard className="h-5 w-5" />
            Import from Clipboard
          </CardTitle>
          <CardDescription>
            Copy transaction data from your bank statement and paste it here. 
            Supports CSV, TSV, and HTML table formats.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleClipboardImport}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Clipboard className="h-4 w-4" />
              {isLoading ? 'Parsing...' : 'Import from Clipboard'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                const textarea = document.createElement('textarea');
                textarea.placeholder = 'Paste your transaction data here...';
                textarea.className = 'w-full h-32 p-2 border rounded';
                textarea.onchange = (e) => {
                  const target = e.target as HTMLTextAreaElement;
                  if (target.value.trim()) {
                    handleTextImport(target.value);
                  }
                };
                // This would need to be implemented as a proper modal/dialog
                // For now, we'll use the clipboard method
              }}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Paste Text
            </Button>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {parseResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Parsed Data Preview
            </CardTitle>
            <CardDescription>
              Found {parseResult.rows.length} rows in {parseResult.format.toUpperCase()} format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {parseResult.headers.map((header, index) => (
                      <TableHead key={index} className="min-w-[120px]">
                        {header || `Column ${index + 1}`}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResult.rows.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      {parseResult.headers.map((header, cellIndex) => (
                        <TableCell key={cellIndex} className="max-w-[200px] truncate">
                          {row[header] || ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parseResult.rows.length > 10 && (
                <div className="mt-2 text-sm text-gray-500 text-center">
                  Showing first 10 of {parseResult.rows.length} rows
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}