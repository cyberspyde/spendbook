import React, { useState, useEffect } from 'react';
import { User, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Expense {
  id: number;
  amount: string;
  description: string;
  date: string;
  created_at: string;
  first_name: string;
  last_name: string;
  username: string;
  category_name: string;
  category_color: string;
  image_path?: string | null;
}

export const ExpenseList: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/expenses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error('Fetch expenses error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const today = new Date().toDateString();
    const expenseDate = new Date(expense.date).toDateString();
    
    switch (filter) {
      case 'today':
        return expenseDate === today;
      case 'week':
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return new Date(expense.date) >= weekAgo;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex space-x-2">
        {[
          { id: 'all', label: 'Hammasi' },
          { id: 'today', label: 'Bugun' },
          { id: 'week', label: 'Bu hafta' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Xarajatlar topilmadi</p>
            <p>Hozircha hech qanday xarajat qayd etilmagan</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <div key={expense.id} className="bg-gray-50 rounded-lg p-4 border hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: expense.category_color }}
                  ></div>
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: expense.category_color }}
                  >
                    {expense.category_name}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {parseFloat(expense.amount).toLocaleString()} so'm
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(parseISO(expense.date), 'dd/MM/yyyy')}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{expense.first_name} {expense.last_name}</span>
                    {expense.username && (
                      <span className="text-gray-400">(@{expense.username})</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {format(parseISO(expense.created_at), 'HH:mm')}
                </div>
              </div>

              {expense.description && (
                <div className="mt-2 text-sm text-gray-700 bg-white rounded p-2 border-l-2 border-gray-200">
                  {expense.description}
                </div>
              )}

              {expense.image_path && (
                <div className="mt-3">
                  <a href={expense.image_path} target="_blank" rel="noreferrer">
                    <img
                      src={expense.image_path}
                      alt="Xarajat rasmi"
                      className="rounded border max-h-40 object-cover"
                      loading="lazy"
                    />
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {filteredExpenses.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-900">
              Jami ({filteredExpenses.length} ta xarajat):
            </span>
            <span className="text-xl font-bold text-blue-900">
              {filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toLocaleString()} so'm
            </span>
          </div>
        </div>
      )}
    </div>
  );
};