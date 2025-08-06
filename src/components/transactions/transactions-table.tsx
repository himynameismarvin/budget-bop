'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { HashedTransaction } from '@/lib/transaction-hash';
import { 
  Edit2, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  Calendar,
  Tag,
  AlertTriangle
} from 'lucide-react';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  account?: string;
  category?: string;
  reference?: string;
  hash: string;
  isDuplicate?: boolean;
  isEditing?: boolean;
}

interface TransactionsTableProps {
  transactions: HashedTransaction[];
  onTransactionUpdate?: (transaction: Transaction) => void;
  onTransactionDelete?: (transactionId: string) => void;
  onTransactionCreate?: (transaction: Omit<Transaction, 'id' | 'hash'>) => void;
  categories?: string[];
  accounts?: string[];
}

export function TransactionsTable({ 
  transactions, 
  onTransactionUpdate, 
  onTransactionDelete,
  onTransactionCreate,
  categories = [],
  accounts = []
}: TransactionsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [sortField, setSortField] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Convert HashedTransaction to Transaction format
  const tableTransactions: Transaction[] = useMemo(() => 
    transactions.map((t, index) => ({
      id: t.hash || `temp-${index}`,
      date: t.date,
      description: t.description,
      amount: t.amount,
      account: t.account,
      category: t.category,
      reference: t.reference,
      hash: t.hash || '',
      isDuplicate: t.isDuplicate
    })), [transactions]
  );

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = tableTransactions.filter(transaction => {
      const matchesSearch = !searchTerm || 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !filterCategory || filterCategory === '__all__' || transaction.category === filterCategory;
      const matchesAccount = !filterAccount || filterAccount === '__all__' || transaction.account === filterAccount;
      const matchesDuplicateFilter = !showDuplicatesOnly || transaction.isDuplicate;
      
      return matchesSearch && matchesCategory && matchesAccount && matchesDuplicateFilter;
    });

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tableTransactions, searchTerm, filterCategory, filterAccount, showDuplicatesOnly, sortField, sortDirection]);

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
  };

  const handleSave = (transaction: Transaction) => {
    onTransactionUpdate?.(transaction);
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleDelete = (transactionId: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      onTransactionDelete?.(transactionId);
    }
  };

  const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2);
    return amount < 0 ? `-$${formatted}` : `$${formatted}`;
  };

  const getAmountColor = (amount: number) => {
    return amount < 0 ? 'text-red-600' : 'text-green-600';
  };

  // Statistics
  const stats = useMemo(() => {
    const total = filteredAndSortedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const income = filteredAndSortedTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredAndSortedTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
    const duplicates = filteredAndSortedTransactions.filter(t => t.isDuplicate).length;
    
    return { total, income, expenses: Math.abs(expenses), duplicates };
  }, [filteredAndSortedTransactions]);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div className="ml-2">
              <p className="text-xs font-medium text-muted-foreground">Net Total</p>
              <p className={`text-sm font-bold ${getAmountColor(stats.total)}`}>
                {formatCurrency(stats.total)}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div className="ml-2">
              <p className="text-xs font-medium text-muted-foreground">Income</p>
              <p className="text-sm font-bold text-green-600">{formatCurrency(stats.income)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <XCircle className="h-4 w-4 text-red-600" />
            <div className="ml-2">
              <p className="text-xs font-medium text-muted-foreground">Expenses</p>
              <p className="text-sm font-bold text-red-600">{formatCurrency(stats.expenses)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <div className="ml-2">
              <p className="text-xs font-medium text-muted-foreground">Duplicates</p>
              <p className="text-sm font-bold">{stats.duplicates}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Transactions
              </CardTitle>
              <CardDescription>
                {filteredAndSortedTransactions.length} of {tableTransactions.length} transactions
              </CardDescription>
            </div>
            <Button onClick={() => {/* TODO: Implement create transaction */}}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Accounts</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account} value={account}>{account}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant={showDuplicatesOnly ? "default" : "outline"}
              onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Duplicates Only
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    <Button variant="ghost" onClick={() => handleSort('date')} className="h-8 p-1">
                      Date
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('description')} className="h-8 p-1">
                      Description
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <Button variant="ghost" onClick={() => handleSort('amount')} className="h-8 p-1">
                      Amount
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px]">Category</TableHead>
                  <TableHead className="w-[120px]">Account</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTransactions.map((transaction) => (
                  <EditableTransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    isEditing={editingId === transaction.id}
                    categories={categories}
                    accounts={accounts}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    onDelete={handleDelete}
                    formatCurrency={formatCurrency}
                    getAmountColor={getAmountColor}
                  />
                ))}
                {filteredAndSortedTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Editable row component
interface EditableTransactionRowProps {
  transaction: Transaction;
  isEditing: boolean;
  categories: string[];
  accounts: string[];
  onEdit: (transaction: Transaction) => void;
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
  onDelete: (transactionId: string) => void;
  formatCurrency: (amount: number) => string;
  getAmountColor: (amount: number) => string;
}

function EditableTransactionRow({
  transaction,
  isEditing,
  categories,
  accounts,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  formatCurrency,
  getAmountColor
}: EditableTransactionRowProps) {
  const [editedTransaction, setEditedTransaction] = useState<Transaction>(transaction);

  const handleSave = () => {
    onSave(editedTransaction);
  };

  const handleCancel = () => {
    setEditedTransaction(transaction);
    onCancel();
  };

  if (isEditing) {
    return (
      <TableRow>
        <TableCell>
          <Input
            type="date"
            value={editedTransaction.date}
            onChange={(e) => setEditedTransaction(prev => ({ ...prev, date: e.target.value }))}
          />
        </TableCell>
        <TableCell>
          <Input
            value={editedTransaction.description}
            onChange={(e) => setEditedTransaction(prev => ({ ...prev, description: e.target.value }))}
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            step="0.01"
            value={editedTransaction.amount}
            onChange={(e) => setEditedTransaction(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
          />
        </TableCell>
        <TableCell>
          <Select value={editedTransaction.category || '__none__'} onValueChange={(value) => setEditedTransaction(prev => ({ ...prev, category: value === '__none__' ? undefined : value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Select value={editedTransaction.account || '__none__'} onValueChange={(value) => setEditedTransaction(prev => ({ ...prev, account: value === '__none__' ? undefined : value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {accounts.map(account => (
                <SelectItem key={account} value={account}>{account}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className={transaction.isDuplicate ? 'bg-orange-50' : ''}>
      <TableCell className="font-mono text-sm">{transaction.date}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {transaction.isDuplicate && <AlertTriangle className="h-4 w-4 text-orange-600" />}
          {transaction.description}
        </div>
      </TableCell>
      <TableCell className={`font-mono text-sm ${getAmountColor(transaction.amount)}`}>
        {formatCurrency(transaction.amount)}
      </TableCell>
      <TableCell>
        {transaction.category && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
            <Tag className="h-3 w-3" />
            {transaction.category}
          </span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{transaction.account}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(transaction)}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(transaction.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}