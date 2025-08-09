'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { ExcelParser } from '@/lib/parsers/excel-parser';
import { ClipboardParser } from '@/lib/clipboard-parser';

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  source: 'file' | 'clipboard';
  filename?: string;
}

export function BasicImport() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      let result;
      
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        result = ExcelParser.parseCSVText(text);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        result = await ExcelParser.parseFile(file);
      } else {
        throw new Error('Unsupported file type. Please upload CSV or Excel files.');
      }

      setParsedData({
        headers: result.headers,
        rows: result.rows,
        source: 'file',
        filename: file.name
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClipboardImport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ClipboardParser.parseFromClipboard();
      setParsedData({
        headers: result.headers,
        rows: result.rows,
        source: 'clipboard'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse clipboard content');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setParsedData(null);
    setError(null);
  };

  // Mock transaction creation from parsed data
  const createTransactionsFromData = (data: ParsedData) => {
    return data.rows.map((row, index) => {
      // Simple logic to extract transaction-like data
      const dateValue = Object.entries(row).find(([key]) => 
        key.toLowerCase().includes('date')
      )?.[1] || new Date().toISOString().split('T')[0];

      const vendorValue = Object.entries(row).find(([key]) => 
        key.toLowerCase().includes('description') || 
        key.toLowerCase().includes('merchant') ||
        key.toLowerCase().includes('vendor')
      )?.[1] || 'Unknown';

      const amountValue = Object.entries(row).find(([key]) => 
        key.toLowerCase().includes('amount') ||
        key.toLowerCase().includes('total')
      )?.[1] || '0';

      return {
        id: `temp-${index}`,
        date: dateValue,
        vendor: vendorValue,
        amount: Math.abs(parseFloat(amountValue) || 0),
        description: Object.values(row).join(' - ')
      };
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Basic Import Test
          </CardTitle>
          <CardDescription>
            Upload a CSV/Excel file or paste data from clipboard to test basic parsing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!parsedData && (
            <>
              <div className="space-y-2">
                <label htmlFor="file-input" className="block text-sm font-medium">
                  Upload File:
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-500 mb-2">- OR -</div>
                <Button onClick={handleClipboardImport} disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Import from Clipboard'}
                </Button>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {parsedData && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded">
                <CheckCircle className="h-4 w-4" />
                <span>
                  Successfully parsed {parsedData.source === 'file' ? parsedData.filename : 'clipboard data'}! 
                  Found {parsedData.rows.length} rows.
                </span>
                <Button variant="outline" size="sm" onClick={reset}>
                  Import Another
                </Button>
              </div>

              {/* Headers */}
              <div className="space-y-2">
                <h4 className="font-medium">Detected Columns:</h4>
                <div className="flex flex-wrap gap-1">
                  {parsedData.headers.map((header, index) => (
                    <Badge key={`header-${index}-${header}`} variant="secondary">
                      {header || `Column ${index + 1}`}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Data Preview */}
              <div className="space-y-2">
                <h4 className="font-medium">Data Preview (First 5 rows):</h4>
                <div className="max-h-64 overflow-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {parsedData.headers.map((header, index) => (
                          <TableHead key={`th-${index}`} className="min-w-[100px]">
                            {header || `Col ${index + 1}`}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.rows.slice(0, 5).map((row, rowIndex) => (
                        <TableRow key={`row-${rowIndex}`}>
                          {parsedData.headers.map((header, colIndex) => (
                            <TableCell key={`cell-${rowIndex}-${colIndex}`} className="max-w-[150px] truncate">
                              {row[header] || ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parsedData.rows.length > 5 && (
                    <div className="p-2 text-xs text-gray-500 text-center border-t">
                      Showing 5 of {parsedData.rows.length} rows
                    </div>
                  )}
                </div>
              </div>

              {/* Mock Transactions Preview */}
              <div className="space-y-2">
                <h4 className="font-medium">Potential Transactions:</h4>
                <div className="max-h-48 overflow-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {createTransactionsFromData(parsedData).slice(0, 3).map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{tx.date}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{tx.vendor}</TableCell>
                          <TableCell>${tx.amount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-xs text-gray-500">
                  This is a preview of how transactions would be extracted. In the full system, 
                  this would be enhanced with AI parsing and vendor normalization.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}