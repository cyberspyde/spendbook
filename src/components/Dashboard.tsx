import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  Users, 
  LogOut,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { ExpenseList } from './ExpenseList';
import { DepositRequests } from './DepositRequests';
import { Analytics } from './Analytics';
import { ExportTools } from './ExportTools';

interface DashboardProps {
  onLogout: () => void;
}

interface Stats {
  totalExpenses: number;
  totalDeposits: number;
  pendingDeposits: number;
  activeUsers: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('expenses');
  const [stats, setStats] = useState<Stats>({
    totalExpenses: 0,
    totalDeposits: 0,
    pendingDeposits: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // Setup WebSocket connection for real-time updates
    const ws = new WebSocket(`ws://localhost:3001`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'data_update') {
        fetchStats();
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      const [expensesRes, depositsRes, pendingRes] = await Promise.all([
        fetch('/api/expenses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/deposits', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/deposits/pending', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const expenses = await expensesRes.json();
      const deposits = await depositsRes.json();
      const pending = await pendingRes.json();

      const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
      const totalDeposits = deposits
        .filter((dep: any) => dep.status === 'approved')
        .reduce((sum: number, dep: any) => sum + parseFloat(dep.amount), 0);
      
      const uniqueUsers = new Set(expenses.map((exp: any) => exp.user_id)).size;

      setStats({
        totalExpenses,
        totalDeposits,
        pendingDeposits: pending.length,
        activeUsers: uniqueUsers
      });
    } catch (error) {
      console.error('Stats fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'expenses', label: 'Xarajatlar', icon: DollarSign },
    { id: 'deposits', label: 'Depozit so\'rovlari', icon: TrendingUp },
    { id: 'analytics', label: 'Tahlil', icon: BarChart3 },
    { id: 'export', label: 'Eksport', icon: Download }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Xarajatlar Boshqaruvi
              </h1>
              <p className="text-gray-600 mt-1">
                Telegram bot va administrator paneli
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchStats}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title="Yangilash"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 text-gray-700 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Chiqish</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Jami Xarajatlar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalExpenses.toLocaleString()} so'm
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Jami Depozitlar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalDeposits.toLocaleString()} so'm
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Kutilayotgan So'rovlar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.pendingDeposits}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Faol Foydalanuvchilar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.activeUsers}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'expenses' && <ExpenseList />}
                {activeTab === 'deposits' && <DepositRequests onUpdate={fetchStats} />}
                {activeTab === 'analytics' && <Analytics />}
                {activeTab === 'export' && <ExportTools />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};