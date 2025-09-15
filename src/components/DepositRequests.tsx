import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, User, DollarSign, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Deposit {
  id: number;
  amount: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  processed_at?: string;
  first_name: string;
  last_name: string;
  username: string;
}

interface DepositRequestsProps {
  onUpdate: () => void;
}

export const DepositRequests: React.FC<DepositRequestsProps> = ({ onUpdate }) => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      const [pendingRes, allRes] = await Promise.all([
        fetch('/api/deposits/pending', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/deposits', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (pendingRes.ok && allRes.ok) {
        const pending = await pendingRes.json();
        const all = await allRes.json();
        
        setPendingDeposits(pending);
        setDeposits(all);
      }
    } catch (error) {
      console.error('Fetch deposits error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      const token = localStorage.getItem('admin_token');
      let approvedAmount: number | undefined = undefined;
      if (status === 'approved') {
        const current = deposits.find(d => d.id === id) || pendingDeposits.find(d => d.id === id);
        const defaultVal = current ? String(parseFloat(current.amount)) : '';
        const input = window.prompt("Tasdiqlanadigan miqdorni kiriting (so'm)", defaultVal);
        if (input === null) {
          setProcessingId(null);
          return; // canceled
        }
        const parsed = parseFloat(input.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          approvedAmount = parsed;
        }
      }
      const response = await fetch(`/api/deposits/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, approvedAmount })
      });

      if (response.ok) {
        await fetchDeposits();
        onUpdate();
      }
    } catch (error) {
      console.error('Update deposit error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Kutilmoqda
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Tasdiqlangan
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rad etilgan
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const displayDeposits = activeTab === 'pending' ? pendingDeposits : deposits;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Kutilayotgan ({pendingDeposits.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Hammasi ({deposits.length})
        </button>
      </div>

      {/* Deposits List */}
      <div className="space-y-4">
        {displayDeposits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              {activeTab === 'pending' ? 'Kutilayotgan so\'rovlar yo\'q' : 'Depozit so\'rovlari topilmadi'}
            </p>
            <p>
              {activeTab === 'pending' 
                ? 'Hozircha tasdiqlash kutayotgan so\'rovlar yo\'q' 
                : 'Hozircha hech qanday depozit so\'rovi yo\'q'
              }
            </p>
          </div>
        ) : (
          displayDeposits.map((deposit) => (
            <div key={deposit.id} className="bg-white border rounded-lg p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-500" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {deposit.first_name} {deposit.last_name}
                      </div>
                      {deposit.username && (
                        <div className="text-sm text-gray-500">@{deposit.username}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {parseFloat(deposit.amount).toLocaleString()} so'm
                  </div>
                  {getStatusBadge(deposit.status)}
                </div>
              </div>

              {deposit.description && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                  <div className="flex items-start space-x-2">
                    <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 text-sm">{deposit.description}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  So'ralgan: {format(parseISO(deposit.requested_at), 'dd/MM/yyyy HH:mm')}
                  {deposit.processed_at && (
                    <span className="ml-4">
                      Ishlangan: {format(parseISO(deposit.processed_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  )}
                </div>

                {deposit.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusUpdate(deposit.id, 'rejected')}
                      disabled={processingId === deposit.id}
                      className="inline-flex items-center px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {processingId === deposit.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Rad etish
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(deposit.id, 'approved')}
                      disabled={processingId === deposit.id}
                      className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {processingId === deposit.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Tasdiqlash
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};