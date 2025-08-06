'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ParsedRow } from '@/lib/clipboard-parser';
import { ArrowRight, Check, MapPin } from 'lucide-react';

export interface TransactionField {
  id: string;
  label: string;
  required: boolean;
  type: 'text' | 'number' | 'date';
  description?: string;
}

export interface ColumnMapping {
  [fieldId: string]: string; // fieldId -> column header
}

export interface MappedTransaction {
  date: string;
  description: string;
  amount: number;
  account?: string;
  category?: string;
  reference?: string;
  originalRow: ParsedRow;
}

interface ColumnMapperProps {
  headers: string[];
  sampleRows: ParsedRow[];
  onMappingComplete: (mapping: ColumnMapping, mappedData: MappedTransaction[]) => void;
}

const TRANSACTION_FIELDS: TransactionField[] = [
  {
    id: 'date',
    label: 'Date',
    required: true,
    type: 'date',
    description: 'Transaction date (e.g., 2024-01-15, 01/15/2024)'
  },
  {
    id: 'description',
    label: 'Description',
    required: true,
    type: 'text',
    description: 'Transaction description or payee'
  },
  {
    id: 'amount',
    label: 'Amount',
    required: true,
    type: 'number',
    description: 'Transaction amount (positive for income, negative for expenses)'
  },
  {
    id: 'account',
    label: 'Account',
    required: false,
    type: 'text',
    description: 'Account name or type'
  },
  {
    id: 'category',
    label: 'Category',
    required: false,
    type: 'text',
    description: 'Transaction category'
  },
  {
    id: 'reference',
    label: 'Reference',
    required: false,
    type: 'text',
    description: 'Reference number or transaction ID'
  }
];

export function ColumnMapper({ headers, sampleRows, onMappingComplete }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFieldMapping = (fieldId: string, columnHeader: string) => {
    setMapping(prev => {
      const newMapping = { ...prev };
      if (columnHeader === '__none__') {
        delete newMapping[fieldId];
      } else {
        newMapping[fieldId] = columnHeader;
      }
      return newMapping;
    });
  };

  const isRequiredFieldsMapped = () => {
    const requiredFields = TRANSACTION_FIELDS.filter(field => field.required);
    return requiredFields.every(field => mapping[field.id]);
  };

  const getColumnSample = (columnHeader: string): string => {
    const samples = sampleRows.slice(0, 3).map(row => row[columnHeader]).filter(Boolean);
    return samples.length > 0 ? samples.join(', ') : 'No data';
  };

  const parseDate = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Try multiple date formats
    const formats = [
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY
      /(\d{1,2})\.(\d{1,2})\.(\d{4})/, // MM.DD.YYYY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[0]) {
          // YYYY-MM-DD
          return dateStr;
        } else {
          // Convert to YYYY-MM-DD
          const [, month, day, year] = match;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }

    // If no format matches, try Date parsing
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return dateStr; // Return original if parsing fails
  };

  const parseAmount = (amountStr: string): number => {
    if (!amountStr) return 0;
    
    // Remove currency symbols, spaces, and commas
    const cleaned = amountStr.replace(/[\$£€¥₹,\s]/g, '');
    
    // Handle parentheses for negative amounts
    let isNegative = false;
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      isNegative = true;
    }
    
    const numberStr = cleaned.replace(/[()]/g, '');
    const number = parseFloat(numberStr);
    
    if (isNaN(number)) return 0;
    
    return isNegative ? -number : number;
  };

  const handleProcessMapping = () => {
    setIsProcessing(true);
    
    try {
      const mappedData: MappedTransaction[] = sampleRows.map(row => {
        const transaction: MappedTransaction = {
          date: mapping.date ? parseDate(row[mapping.date]) : '',
          description: mapping.description ? row[mapping.description] : '',
          amount: mapping.amount ? parseAmount(row[mapping.amount]) : 0,
          account: mapping.account ? row[mapping.account] : undefined,
          category: mapping.category ? row[mapping.category] : undefined,
          reference: mapping.reference ? row[mapping.reference] : undefined,
          originalRow: row
        };
        return transaction;
      });

      onMappingComplete(mapping, mappedData);
    } catch (error) {
      console.error('Error processing mapping:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getAutoSuggestedMapping = (fieldId: string): string | undefined => {
    const field = TRANSACTION_FIELDS.find(f => f.id === fieldId);
    if (!field) return undefined;

    // Auto-suggest based on common column names
    const suggestions: Record<string, string[]> = {
      date: ['date', 'transaction date', 'posted date', 'value date', 'trans date'],
      description: ['description', 'memo', 'payee', 'merchant', 'details', 'transaction'],
      amount: ['amount', 'debit', 'credit', 'value', 'transaction amount', 'sum'],
      account: ['account', 'account name', 'account number', 'from account'],
      category: ['category', 'type', 'transaction type', 'class'],
      reference: ['reference', 'ref', 'transaction id', 'check number', 'id']
    };

    const possibleHeaders = suggestions[fieldId] || [];
    return headers.find(header => 
      possibleHeaders.some(suggestion => 
        header.toLowerCase().includes(suggestion.toLowerCase())
      )
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Map Columns to Transaction Fields
        </CardTitle>
        <CardDescription>
          Match your data columns to the required transaction fields. 
          Required fields are marked with an asterisk (*).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          {TRANSACTION_FIELDS.map(field => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
              <div>
                <Label className="text-sm font-medium">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </Label>
                <p className="text-xs text-gray-600 mt-1">{field.description}</p>
                
                <Select 
                  value={mapping[field.id] || ''} 
                  onValueChange={(value) => handleFieldMapping(field.id, value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={`Select column for ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Not mapped --</SelectItem>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>
                        {header}
                        {getAutoSuggestedMapping(field.id) === header && ' (suggested)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Sample Data</Label>
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  {mapping[field.id] ? getColumnSample(mapping[field.id]) : 'No column selected'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {isRequiredFieldsMapped() ? (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="h-4 w-4" />
                All required fields mapped
              </span>
            ) : (
              'Please map all required fields'
            )}
          </div>
          
          <Button 
            onClick={handleProcessMapping}
            disabled={!isRequiredFieldsMapped() || isProcessing}
            className="flex items-center gap-2"
          >
            {isProcessing ? 'Processing...' : 'Process Mapping'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Auto-suggest button */}
        <Button
          variant="outline"
          onClick={() => {
            const autoMapping: ColumnMapping = {};
            TRANSACTION_FIELDS.forEach(field => {
              const suggested = getAutoSuggestedMapping(field.id);
              if (suggested) {
                autoMapping[field.id] = suggested;
              }
            });
            setMapping(autoMapping);
          }}
          className="w-full"
        >
          Auto-Suggest Mappings
        </Button>
      </CardContent>
    </Card>
  );
}