'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExcelParser } from '@/lib/parsers/excel-parser';
import { ClipboardParser } from '@/lib/clipboard-parser';

export function SimpleUploadTest() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const parseResult = ExcelParser.parseCSVText(text);
        setResult({ type: 'csv', data: parseResult });
      } else if (file.name.endsWith('.xlsx')) {
        const parseResult = await ExcelParser.parseFile(file);
        setResult({ type: 'excel', data: parseResult });
      } else {
        throw new Error('Unsupported file type');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClipboardTest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const parseResult = await ClipboardParser.parseFromClipboard();
      setResult({ type: 'clipboard', data: parseResult });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clipboard parsing failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simple Import Test</CardTitle>
          <CardDescription>
            Test basic file parsing functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="file-upload" className="block text-sm font-medium">
              Upload CSV or Excel file:
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <Button onClick={handleClipboardTest} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Test Clipboard Import'}
            </Button>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
              Error: {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
                Successfully parsed {result.type} data!
                <br />
                Found {result.data.rows?.length || 0} rows
                <br />
                Headers: {result.data.headers?.join(', ') || 'None'}
              </div>

              <div className="max-h-64 overflow-auto bg-gray-50 p-3 rounded">
                <pre className="text-xs">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}