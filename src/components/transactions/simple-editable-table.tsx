'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, X, Check, Trash2, Plus, ChevronDown, Loader2 } from 'lucide-react';

export interface EditableTransaction {
  id: string;
  date: string;
  vendor: string;
  amount: number | string;
  category: string;
  notes: string;
  account: string;
  isNew?: boolean;
}

interface SimpleEditableTableProps {
  title: string;
  categories: string[];
  accounts: string[];
  transactions: EditableTransaction[];
  onTransactionChange: (id: string, field: keyof EditableTransaction, value: string | number) => void;
  onTransactionDelete: (id: string) => void;
  onAddRow: () => void;
  defaultMonth?: string;
  unsavedRows: Set<string>;
  savedRows: Set<string>;
}

// Custom Combobox component (reused from original)
interface ComboboxInputProps {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

function ComboboxInput({ value, options, placeholder, onChange, onFocus, onBlur, className }: ComboboxInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, top: 0, width: 0 });
  const [isDropdownPositioned, setIsDropdownPositioned] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const filtered = options.filter(option => 
      option.toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredOptions(filtered);
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
  }, [inputValue, options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    onChange(newValue);
  };

  const handleOptionClick = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
    setIsDropdownPositioned(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0) {
        handleOptionClick(filteredOptions[highlightedIndex]);
      } else {
        setIsOpen(false);
        onBlur?.();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsDropdownPositioned(false);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
      setIsDropdownPositioned(false);
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    updateDropdownPosition();
    onFocus?.();
  };

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const dropdownHeight = 240;
      
      const spaceBelow = windowHeight - rect.bottom;
      const shouldShowAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      
      setDropdownPosition({
        left: rect.left + window.scrollX,
        top: shouldShowAbove 
          ? rect.top + window.scrollY - dropdownHeight - 4
          : rect.bottom + window.scrollY + 4,
        width: rect.width
      });
      setIsDropdownPositioned(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    setTimeout(() => {
      if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
        setIsOpen(false);
        setIsDropdownPositioned(false);
        onBlur?.();
      }
    }, 150);
  };

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
    } else {
      setFilteredOptions(options);
      updateDropdownPosition();
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`${className} pr-8`}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={handleDropdownClick}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      {isOpen && filteredOptions.length > 0 && isDropdownPositioned && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border rounded-md shadow-lg max-h-60 overflow-auto"
          style={{ 
            left: dropdownPosition.left,
            top: dropdownPosition.top,
            width: dropdownPosition.width
          }}
        >
          {filteredOptions.map((option, index) => (
            <div
              key={option}
              className={`px-3 py-2 cursor-pointer text-sm ${
                index === highlightedIndex
                  ? 'bg-purple-100 text-purple-900'
                  : 'hover:bg-gray-100'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOptionClick(option);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option}
            </div>
          ))}
          {inputValue && !options.includes(inputValue) && (
            <div
              className={`px-3 py-2 cursor-pointer text-sm border-t ${
                filteredOptions.length === highlightedIndex
                  ? 'bg-purple-100 text-purple-900'
                  : 'hover:bg-gray-100'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOptionClick(inputValue);
              }}
            >
              Add "{inputValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SimpleEditableTable({
  title,
  categories,
  accounts,
  transactions,
  onTransactionChange,
  onTransactionDelete,
  onAddRow,
  defaultMonth,
  unsavedRows,
  savedRows
}: SimpleEditableTableProps) {
  const [filters, setFilters] = useState({
    vendor: '',
    category: '',
    account: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const filteredTransactions = () => {
    return transactions.filter(transaction => {
      // Always show new/empty rows
      if (transaction.isNew && !transaction.vendor && !transaction.amount && !transaction.date) {
        return true;
      }
      
      const matchesVendor = !filters.vendor || 
        transaction.vendor.toLowerCase().includes(filters.vendor.toLowerCase());
      const matchesCategory = !filters.category || filters.category === '__all__' ||
        transaction.category === filters.category;
      const matchesAccount = !filters.account || filters.account === '__all__' ||
        transaction.account === filters.account;
      
      return matchesVendor && matchesCategory && matchesAccount;
    });
  };

  const clearFilters = () => {
    setFilters({ vendor: '', category: '', account: '' });
  };

  return (
    <div className="relative" id="expense-table-container">
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
          
          {showFilters && (
            <div className="flex gap-4 pt-4 border-t">
              <div className="flex-1">
                <Input
                  placeholder="Filter by vendor..."
                  value={filters.vendor}
                  onChange={(e) => setFilters(prev => ({ ...prev, vendor: e.target.value }))}
                />
              </div>
              <div className="w-40">
                <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={filters.account} onValueChange={(value) => setFilters(prev => ({ ...prev, account: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Accounts</SelectItem>
                    {accounts.map(account => (
                      <SelectItem key={account} value={account}>{account}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="w-28 font-semibold">Month</TableHead>
                  <TableHead className="font-semibold">Vendor</TableHead>
                  <TableHead className="w-24 font-semibold">$</TableHead>
                  <TableHead className="w-40 font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Notes</TableHead>
                  <TableHead className="w-32 font-semibold">Account</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions().map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-gray-50/50">
                    <TableCell className="p-1">
                      <Input
                        type="month"
                        value={transaction.date}
                        onChange={(e) => onTransactionChange(transaction.id, 'date', e.target.value)}
                        className="border-0 focus:ring-0 focus:outline-none bg-transparent h-8 px-2 shadow-none"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        value={transaction.vendor}
                        onChange={(e) => onTransactionChange(transaction.id, 'vendor', e.target.value)}
                        placeholder="Vendor name"
                        className="border-0 focus:ring-0 focus:outline-none bg-transparent h-8 px-2 shadow-none"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        type="text"
                        value={transaction.amount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          onTransactionChange(transaction.id, 'amount', value);
                        }}
                        placeholder="0"
                        className="border-0 focus:ring-0 focus:outline-none bg-transparent h-8 px-2 text-right shadow-none"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <ComboboxInput
                        value={transaction.category || ''}
                        options={categories}
                        placeholder="Category"
                        onChange={(value) => onTransactionChange(transaction.id, 'category', value)}
                        className="border-0 focus:ring-0 focus:outline-none bg-transparent h-8 px-2 shadow-none"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input
                        value={transaction.notes}
                        onChange={(e) => onTransactionChange(transaction.id, 'notes', e.target.value)}
                        placeholder="Notes"
                        className="border-0 focus:ring-0 focus:outline-none bg-transparent h-8 px-2 shadow-none"
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <ComboboxInput
                        value={transaction.account || ''}
                        options={accounts}
                        placeholder="Account"
                        onChange={(value) => onTransactionChange(transaction.id, 'account', value)}
                        className="border-0 focus:ring-0 focus:outline-none bg-transparent h-8 px-2 shadow-none"
                      />
                    </TableCell>
                    <TableCell className="p-1 pr-6">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 flex items-center justify-center">
                          {savedRows.has(transaction.id) ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : unsavedRows.has(transaction.id) ? (
                            <span className="text-xs text-orange-500">•</span>
                          ) : (
                            <span className="text-xs text-gray-400">•</span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onTransactionDelete(transaction.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}