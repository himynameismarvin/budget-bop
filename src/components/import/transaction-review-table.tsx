'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter,
  Trash2,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { ParsedTransaction } from '@/lib/ai-transaction-parser';
import { VendorNormalizationResult } from '@/lib/vendor-normalizer';

export interface ReviewableTransaction extends ParsedTransaction {
  vendorNormalization?: VendorNormalizationResult;
  suggestedCategory?: string;
  categoryConfidence?: number;
  isEdited?: boolean;
  isDuplicate?: boolean;
  validationErrors: string[];
  notes?: string;
}

export interface TransactionReviewTableProps {
  transactions: ReviewableTransaction[];
  categories: string[];
  onTransactionUpdate: (transactionId: string, updates: Partial<ReviewableTransaction>) => void;
  onTransactionDelete: (transactionId: string) => void;
  onBulkUpdate: (transactionIds: string[], updates: Partial<ReviewableTransaction>) => void;
  onSaveAll: (transactions: ReviewableTransaction[]) => void;
  isLoading?: boolean;
}

type FilterType = 'all' | 'issues' | 'duplicates' | 'low_confidence' | 'edited' | 'needs_vendor';
type SortField = 'date' | 'vendor' | 'amount' | 'confidence' | 'category';

export function TransactionReviewTable({ 
  transactions,
  categories,
  onTransactionUpdate,
  onTransactionDelete,
  onBulkUpdate,
  onSaveAll,
  isLoading = false
}: TransactionReviewTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showResolved, setShowResolved] = useState(true);

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.vendor.toLowerCase().includes(term) ||
        tx.description.toLowerCase().includes(term) ||
        tx.originalVendor.toLowerCase().includes(term)
      );
    }

    // Apply filters
    switch (filter) {
      case 'issues':
        filtered = filtered.filter(tx => tx.validationErrors.length > 0 || tx.issues.length > 0);
        break;
      case 'duplicates':
        filtered = filtered.filter(tx => tx.isDuplicate);
        break;
      case 'low_confidence':
        filtered = filtered.filter(tx => tx.confidence < 0.7);
        break;
      case 'edited':
        filtered = filtered.filter(tx => tx.isEdited);
        break;
      case 'needs_vendor':
        filtered = filtered.filter(tx => 
          !tx.vendor || 
          tx.vendor === 'Unknown Vendor' || 
          (tx.vendorNormalization?.needsReview)
        );
        break;
    }

    // Hide resolved transactions if requested
    if (!showResolved) {
      filtered = filtered.filter(tx => 
        tx.validationErrors.length > 0 || 
        tx.issues.length > 0 || 
        !tx.suggestedCategory
      );
    }

    // Sort transactions
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'vendor':
          aValue = a.vendor.toLowerCase();
          bValue = b.vendor.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'confidence':
          aValue = a.confidence;
          bValue = b.confidence;
          break;
        case 'category':
          aValue = a.suggestedCategory || '';
          bValue = b.suggestedCategory || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [transactions, searchTerm, filter, sortField, sortDirection, showResolved]);

  // Statistics
  const stats = useMemo(() => {
    const total = transactions.length;
    const issues = transactions.filter(tx => tx.validationErrors.length > 0 || tx.issues.length > 0).length;
    const duplicates = transactions.filter(tx => tx.isDuplicate).length;
    const needsVendor = transactions.filter(tx => 
      !tx.vendor || tx.vendor === 'Unknown Vendor' || tx.vendorNormalization?.needsReview
    ).length;
    const edited = transactions.filter(tx => tx.isEdited).length;
    const ready = total - issues;

    return { total, issues, duplicates, needsVendor, edited, ready };
  }, [transactions]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredTransactions.map(tx => tx.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectTransaction = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkCategoryUpdate = (category: string) => {
    if (selectedIds.size > 0) {
      onBulkUpdate(Array.from(selectedIds), { 
        suggestedCategory: category,
        isEdited: true 
      });
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => onTransactionDelete(id));
    setSelectedIds(new Set());
  };


  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
            <div className="text-sm text-gray-600">Ready</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.issues}</div>
            <div className="text-sm text-gray-600">Issues</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.needsVendor}</div>
            <div className="text-sm text-gray-600">Need Vendor</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.duplicates}</div>
            <div className="text-sm text-gray-600">Duplicates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.edited}</div>
            <div className="text-sm text-gray-600">Edited</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Review Transactions</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResolved(!showResolved)}
                className="flex items-center gap-1"
              >
                {showResolved ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showResolved ? 'Hide Resolved' : 'Show All'}
              </Button>
              <Button
                onClick={() => onSaveAll(transactions.filter(tx => tx.validationErrors.length === 0))}
                disabled={isLoading || stats.ready === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save {stats.ready} Transactions
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search vendor, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="issues">Has Issues ({stats.issues})</SelectItem>
                <SelectItem value="needs_vendor">Needs Vendor ({stats.needsVendor})</SelectItem>
                <SelectItem value="duplicates">Duplicates ({stats.duplicates})</SelectItem>
                <SelectItem value="low_confidence">Low Confidence</SelectItem>
                <SelectItem value="edited">Edited ({stats.edited})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <div className="flex gap-2">
                <Select onValueChange={handleBulkCategoryUpdate}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Set category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Results count */}
          <div className="text-sm text-gray-600">
            Showing {filteredTransactions.length} of {stats.total} transactions
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortField === 'date') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('date');
                        setSortDirection('desc');
                      }
                    }}
                  >
                    Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortField === 'vendor') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('vendor');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    Vendor {sortField === 'vendor' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortField === 'amount') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('amount');
                        setSortDirection('desc');
                      }
                    }}
                  >
                    Amount {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map(transaction => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    categories={categories}
                    isSelected={selectedIds.has(transaction.id)}
                    onSelect={(checked) => handleSelectTransaction(transaction.id, checked)}
                    onUpdate={(updates) => {
                      onTransactionUpdate(transaction.id, { ...updates, isEdited: true });
                    }}
                    onDelete={() => onTransactionDelete(transaction.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual transaction row component
function TransactionRow({ 
  transaction, 
  categories,
  isSelected,
  onSelect,
  onUpdate,
  onDelete
}: {
  transaction: ReviewableTransaction;
  categories: string[];
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onUpdate: (updates: Partial<ReviewableTransaction>) => void;
  onDelete: () => void;
}) {
  const handleFieldUpdate = (field: string, value: any) => {
    onUpdate({ [field]: value });
  };


  return (
    <TableRow className={`${isSelected ? 'bg-blue-50' : ''} ${transaction.isEdited ? 'bg-purple-50' : ''}`}>
      <TableCell>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </TableCell>
      <TableCell>
        <Input
          type="date"
          value={transaction.date}
          onChange={(e) => handleFieldUpdate('date', e.target.value)}
          className="w-32"
        />
      </TableCell>
      <TableCell>
        <Input
          value={transaction.vendor}
          onChange={(e) => handleFieldUpdate('vendor', e.target.value)}
          className="min-w-32"
          placeholder="Vendor name"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={transaction.amount}
          onChange={(e) => handleFieldUpdate('amount', Number(e.target.value))}
          className="w-20"
          step="0.01"
        />
      </TableCell>
      <TableCell>
        <Select
          value={transaction.suggestedCategory || ''}
          onValueChange={(value) => handleFieldUpdate('suggestedCategory', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={transaction.notes || ''}
          onChange={(e) => handleFieldUpdate('notes', e.target.value)}
          className="min-w-32"
          placeholder="Notes..."
        />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3 text-red-500" />
        </Button>
      </TableCell>
    </TableRow>
  );
}