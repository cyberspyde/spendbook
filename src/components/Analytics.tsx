import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

interface CategoryData {
  category: string;
  color: string;
  total: string;
}

interface MonthlyData {
  month: string;
  total: string;
}

export const Analytics: React.FC = () => {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategoryData(data.categories);
        setMonthlyData(data.monthly);
      }
    } catch (error) {
      console.error('Fetch analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const chartCategoryData = categoryData.map(item => ({
    name: item.category,
    value: parseFloat(item.total),
    color: item.color
  }));

  const chartMonthlyData = monthlyData.map(item => ({
    month: item.month,
    total: parseFloat(item.total)
  }));

  const totalExpenses = categoryData.reduce((sum, item) => sum + parseFloat(item.total), 0);

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Jami Xarajatlar</p>
              <p className="text-2xl font-bold">{totalExpenses.toLocaleString()} so'm</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Kategoriyalar</p>
              <p className="text-2xl font-bold">{categoryData.length}</p>
            </div>
            <PieChartIcon className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Oylik O'rtacha</p>
              <p className="text-2xl font-bold">
                {monthlyData.length ? Math.round(totalExpenses / monthlyData.length).toLocaleString() : 0} so'm
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Distribution */}
        <div className="bg-white rounded-lg p-6 border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Kategoriya Bo'yicha Taqsimot</h3>
          {chartCategoryData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {chartCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString()} so'm`, 'Miqdor']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              Ma'lumot topilmadi
            </div>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg p-6 border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Oylik Trend</h3>
          {chartMonthlyData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString()} so'm`, 'Jami']}
                    labelFormatter={(month) => `Oy: ${month}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              Ma'lumot topilmadi
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Kategoriya Detallari</h3>
        <div className="space-y-4">
          {categoryData.map((category) => {
            const percentage = totalExpenses > 0 ? (parseFloat(category.total) / totalExpenses) * 100 : 0;
            return (
              <div key={category.category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="font-medium text-gray-900">{category.category}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {parseFloat(category.total).toLocaleString()} so'm
                  </div>
                  <div className="text-sm text-gray-500">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};