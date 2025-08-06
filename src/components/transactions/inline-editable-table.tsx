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
  isSaved?: boolean;
}

interface InlineEditableTableProps {
  title: string;
  categories: string[];
  accounts: string[];
  onTransactionSave?: (transaction: EditableTransaction) => Promise<string | void>; // Can return new ID
  onTransactionDelete?: (transactionId: string) => void;
  initialTransactions?: EditableTransaction[];
  onTransactionsChange?: (transactions: EditableTransaction[]) => void;
  defaultMonth?: string;
}


// Custom Combobox component for category/account selection
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
    // Auto-highlight first match when typing
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
      const dropdownHeight = 240; // Max height of dropdown (max-h-60 = 240px)
      
      // Check if dropdown would go below viewport
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
    // Delay to allow option clicks to register and prevent focus loss issues
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
      setFilteredOptions(options); // Show all options when dropdown is clicked
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

export function InlineEditableTable({
  title,
  categories,
  accounts,
  onTransactionSave,
  onTransactionDelete,
  initialTransactions = [],
  onTransactionsChange,
  defaultMonth
}: InlineEditableTableProps) {
  const [transactions, setTransactions] = useState<EditableTransaction[]>([]);
  const [filters, setFilters] = useState({
    vendor: '',
    category: '',
    account: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [savedRows, setSavedRows] = useState<Set<string>>(new Set()); // Permanently saved rows
  const [pendingSaveRows, setPendingSaveRows] = useState<Set<string>>(new Set()); // Rows with pending save timers
  const [autoSaveTimeouts, setAutoSaveTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [activeRows, setActiveRows] = useState<Set<string>>(new Set());
  const [originalTransactions, setOriginalTransactions] = useState<Map<string, EditableTransaction>>(new Map()); // Track original values
  const [buttonPosition, setButtonPosition] = useState({ left: 0, width: 0 });
  const initializedRef = useRef(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Initialize with blank rows
  useEffect(() => {
    if (initializedRef.current) return;
    
    const createBlankRow = (index: number): EditableTransaction => ({
      id: `new-${Date.now()}-${index}`,
      date: defaultMonth || '',
      vendor: '',
      amount: '',
      category: '',
      notes: '',
      account: '',
      isNew: true
    });

    if (initialTransactions.length === 0) {
      const blankRows = Array.from({ length: 10 }, (_, i) => createBlankRow(i));
      setTransactions(blankRows);
      // Store original state for change tracking
      const originalMap = new Map();
      blankRows.forEach(row => originalMap.set(row.id, { ...row }));
      setOriginalTransactions(originalMap);
    } else {
      console.log('Loading initial transactions:', initialTransactions.length);
      setTransactions(initialTransactions);
      
      // Store original state for change tracking
      const originalMap = new Map();
      initialTransactions.forEach(transaction => originalMap.set(transaction.id, { ...transaction }));
      setOriginalTransactions(originalMap);
      
      // Mark existing transactions (from database) as saved
      const savedTransactionIds = initialTransactions
        .filter(t => !t.isNew && t.vendor && t.amount)
        .map(t => t.id);
      
      console.log('Marking as saved:', savedTransactionIds);
      
      if (savedTransactionIds.length > 0) {
        setSavedRows(new Set(savedTransactionIds));
      }
    }
    
    initializedRef.current = true;
  }, [initialTransactions]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      autoSaveTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Update button position to center it with the table
  useEffect(() => {
    const updateButtonPosition = () => {
      if (tableRef.current) {
        const rect = tableRef.current.getBoundingClientRect();
        setButtonPosition({
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };

    updateButtonPosition();
    window.addEventListener('resize', updateButtonPosition);
    window.addEventListener('scroll', updateButtonPosition);

    return () => {
      window.removeEventListener('resize', updateButtonPosition);
      window.removeEventListener('scroll', updateButtonPosition);
    };
  }, []);

  const createBlankRow = (): EditableTransaction => ({
    id: `new-${Date.now()}-${Math.random()}`,
    date: defaultMonth || '',
    vendor: '',
    amount: '',
    category: '',
    notes: '',
    account: '',
    isNew: true
  });

  // Check if transaction has actually changed from its original state
  const hasTransactionChanged = (transaction: EditableTransaction): boolean => {
    const original = originalTransactions.get(transaction.id);
    if (!original) return true; // New transaction, consider it changed
    
    return (
      original.date !== transaction.date ||
      original.vendor !== transaction.vendor ||
      original.amount !== transaction.amount ||
      original.category !== transaction.category ||
      original.notes !== transaction.notes ||
      original.account !== transaction.account
    );
  };

  // Row-based autosave system
  const scheduleRowAutoSave = (rowId: string) => {
    const transaction = transactions.find(t => t.id === rowId);
    console.log('scheduleRowAutoSave called for:', rowId, 'transaction:', transaction?.vendor, transaction?.amount);
    
    // Clear existing timeout for this row
    const existingTimeout = autoSaveTimeouts.get(rowId);
    if (existingTimeout) {
      console.log('Clearing existing timeout for:', rowId);
      clearTimeout(existingTimeout);
    }

    // Only schedule save for transactions with minimal data AND actual changes
    const hasVendor = transaction?.vendor && transaction.vendor.trim() !== '';
    const hasAmount = transaction?.amount && transaction.amount !== '' && parseInt(transaction.amount.toString()) > 0;
    const hasActualChanges = transaction ? hasTransactionChanged(transaction) : false;
    
    if (!transaction || !hasVendor || !hasAmount || !hasActualChanges) {
      console.log('Not scheduling save - insufficient data or no changes:', { 
        vendor: transaction?.vendor, 
        hasVendor, 
        amount: transaction?.amount, 
        hasAmount,
        hasActualChanges,
        amountParsed: transaction?.amount ? parseInt(transaction.amount.toString()) : 'N/A'
      });
      return;
    }

    console.log('Scheduling save for:', rowId, 'in 5 seconds');
    // Mark row as having a pending save (show spinner)
    setPendingSaveRows(prev => new Set(prev).add(rowId));

    const timeout = setTimeout(async () => {
      console.log('Save timeout triggered for:', rowId);
      console.log('Active rows:', Array.from(activeRows));
      console.log('Row is active?', activeRows.has(rowId));
      
      // Save regardless of active state - the timeout means user left the row
      // The 5-second delay is sufficient to indicate user intent to save
      const proceedWithSave = true; // !activeRows.has(rowId)
      
      if (proceedWithSave) {
        const transaction = transactions.find(t => t.id === rowId);
        const hasVendor = transaction?.vendor && transaction.vendor.trim() !== '';
        const hasAmount = transaction?.amount && transaction.amount !== '' && parseInt(transaction.amount.toString()) > 0;
        
        console.log('Final save check:', { transaction: transaction?.vendor, hasVendor, hasAmount });
        
        if (transaction && hasVendor && hasAmount) {
          if (onTransactionSave) {
            console.log('Saving transaction:', transaction.id, transaction.vendor);
            try {
              const newId = await onTransactionSave(transaction);
              
              // If a new ID was returned (for new transactions), update our tracking
              const finalId = newId || rowId;
              
              // Mark as permanently saved (show checkmark)
              setSavedRows(prev => {
                const newSet = new Set(prev);
                newSet.add(finalId);
                console.log('Marked as saved:', finalId, 'Total saved rows:', newSet.size);
                return newSet;
              });
              
              // Update original transaction state to prevent unnecessary saves
              setOriginalTransactions(prev => {
                const newMap = new Map(prev);
                if (newId && newId !== rowId) {
                  // Remove old ID and add new ID
                  newMap.delete(rowId);
                  newMap.set(newId, { ...transaction, id: newId, isNew: false });
                } else {
                  newMap.set(finalId, { ...transaction, isNew: false });
                }
                return newMap;
              });
              
              // If ID changed, update our local transactions state
              if (newId && newId !== rowId) {
                console.log('Updating transaction ID from', rowId, 'to', newId);
                setTransactions(prevTransactions => {
                  const updated = prevTransactions.map(t => 
                    t.id === rowId 
                      ? { ...t, id: newId, isNew: false }
                      : t
                  );
                  
                  // Notify parent of the ID change
                  if (onTransactionsChange) {
                    setTimeout(() => onTransactionsChange(updated), 0);
                  }
                  
                  return updated;
                });
              }
            } catch (error) {
              console.error('Error saving transaction:', error);
            }
          }
        } else {
          console.log('Skipping save - failed final check');
        }
      } else {
        console.log('Skipping save - row is still active');
      }
      
      // Remove from pending saves
      setPendingSaveRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowId);
        return newSet;
      });
      
      // Clean up the timeout from our map
      setAutoSaveTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(rowId);
        return newMap;
      });
    }, 5000); // 5 second delay

    // Store the timeout
    setAutoSaveTimeouts(prev => {
      const newMap = new Map(prev);
      newMap.set(rowId, timeout);
      return newMap;
    });
  };

  const handleRowFocus = (rowId: string) => {
    console.log('Row focused:', rowId);
    setActiveRows(prev => new Set(prev).add(rowId));
  };

  const handleRowBlur = (rowId: string) => {
    console.log('Row blurred:', rowId);
    setActiveRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(rowId);
      return newSet;
    });
    // Schedule autosave when row becomes inactive - delay to ensure state updates
    setTimeout(() => scheduleRowAutoSave(rowId), 100);
  };

  const handleFieldChange = (id: string, field: keyof EditableTransaction, value: string | number) => {
    console.log('Field changed:', field, 'value:', value, 'for transaction:', id);
    setTransactions(prev => {
      const updated = prev.map(transaction => {
        if (transaction.id === id) {
          const updatedTransaction = { ...transaction, [field]: value };
          console.log('Updated transaction:', updatedTransaction);
          
          // Clear saved state when editing a previously saved row (only if there are actual changes)
          if (savedRows.has(id) && hasTransactionChanged(updatedTransaction)) {
            setSavedRows(current => {
              const newSet = new Set(current);
              newSet.delete(id);
              return newSet;
            });
          }
          
          return updatedTransaction;
        }
        return transaction;
      });

      // Notify parent of changes
      if (onTransactionsChange) {
        setTimeout(() => onTransactionsChange(updated), 0);
      }

      return updated;
    });
    
    // Schedule autosave (will check for changes internally)
    scheduleRowAutoSave(id);
  };

  const handleFieldBlur = (transaction: EditableTransaction) => {
    // Blur events no longer trigger immediate saves - we rely on delayed autosave
    // This prevents focus issues during tabbing
  };


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

  const handleDelete = (transactionId: string) => {
    if (onTransactionDelete) {
      onTransactionDelete(transactionId);
      // Remove from local state
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
    }
  };

  const addBlankRow = () => {
    const newRow = createBlankRow();
    setTransactions(prev => [...prev, newRow]);
    
    // Add new row to original transactions map for change tracking
    setOriginalTransactions(prev => {
      const newMap = new Map(prev);
      newMap.set(newRow.id, { ...newRow });
      return newMap;
    });
  };

  return (
    <div className="relative pb-24" ref={tableRef}>
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
                      onChange={(e) => handleFieldChange(transaction.id, 'date', e.target.value)}
                      onFocus={() => handleRowFocus(transaction.id)}
                      onBlur={() => handleRowBlur(transaction.id)}
                      className="border-0 focus:ring-0 focus:outline-none bg-transparent h-8 px-2 shadow-none"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input
                      value={transaction.vendor}
                      onChange={(e) => handleFieldChange(transaction.id, 'vendor', e.target.value)}
                      onFocus={() => handleRowFocus(transaction.id)}
                      onBlur={() => handleRowBlur(transaction.id)}
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
                        handleFieldChange(transaction.id, 'amount', value);
                      }}
                      onFocus={() => handleRowFocus(transaction.id)}
                      onBlur={() => handleRowBlur(transaction.id)}
                      placeholder="0"
                      className="border-0 focus:ring-0 focus:outline-none bg-transparent h-8 px-2 text-right shadow-none"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <ComboboxInput
                      value={transaction.category || ''}
                      options={categories}
                      placeholder="Category"
                      onChange={(value) => {
                        handleFieldChange(transaction.id, 'category', value);
                      }}
                      onFocus={() => handleRowFocus(transaction.id)}
                      onBlur={() => handleRowBlur(transaction.id)}
                      className="border-0 focus:ring-0 focus:outline-none bg-transparent h-8 px-2 shadow-none"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input
                      value={transaction.notes}
                      onChange={(e) => handleFieldChange(transaction.id, 'notes', e.target.value)}
                      onFocus={() => handleRowFocus(transaction.id)}
                      onBlur={() => handleRowBlur(transaction.id)}
                      placeholder="Notes"
                      className="border-0 focus:ring-0 focus:outline-none bg-transparent h-8 px-2 shadow-none"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <ComboboxInput
                      value={transaction.account || ''}
                      options={accounts}
                      placeholder="Account"
                      onChange={(value) => {
                        handleFieldChange(transaction.id, 'account', value);
                      }}
                      onFocus={() => handleRowFocus(transaction.id)}
                      onBlur={() => handleRowBlur(transaction.id)}
                      className="border-0 focus:ring-0 focus:outline-none bg-transparent h-8 px-2 shadow-none"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 flex items-center justify-center">
                        {pendingSaveRows.has(transaction.id) ? (
                          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        ) : savedRows.has(transaction.id) ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-xs text-gray-400">•</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(transaction.id)}
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
      
      {/* Floating Add Row Button - Bottom of viewport, centered to table */}
      <Button 
        onClick={addBlankRow}
        className="fixed bottom-6 z-50 bg-purple-600 hover:bg-purple-700 text-white shadow-lg rounded-full px-24 py-4 flex items-center gap-3 w-96"
        style={{
          left: buttonPosition.left + (buttonPosition.width / 2) - 192, // 192px = w-96/2
        }}
      >
        <Plus className="h-5 w-5" />
        Add row
      </Button>
    </div>
  );
}