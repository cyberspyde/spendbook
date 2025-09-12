import React, { useState } from 'react';
import { Download, FileSpreadsheet, Printer, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const ExportTools: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleExportExpenses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/export/expenses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xarajatlar-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintChecks = () => {
    // This would typically open a new window with printable check format
    window.print();
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Eksport Vositalari</span>
        </h3>

        {/* Date Range Filter */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Sana Oralig'i</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boshlanish sanasi
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tugash sanasi
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Excel Export */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Excel Fayli</h4>
                <p className="text-sm text-gray-600">Xarajatlarni Excel formatida yuklab oling</p>
              </div>
            </div>
            <button
              onClick={handleExportExpenses}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Excel Yuklab Olish</span>
                </>
              )}
            </button>
          </div>

          {/* Print Checks */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Printer className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Chek Bosish</h4>
                <p className="text-sm text-gray-600">A4 formatda xarajat cheklarini bosish</p>
              </div>
            </div>
            <button
              onClick={handlePrintChecks}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
            >
              <Printer className="h-5 w-5" />
              <span>Cheklar Bosish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Export History */}
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Eksport Tarixi</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <div className="font-medium text-gray-900">Xarajatlar hisoboti</div>
                <div className="text-sm text-gray-600">{format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
              </div>
            </div>
            <span className="text-sm text-green-600 font-medium">Muvaffaqiyatli</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Tezkor Ma'lumotlar</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">Excel</div>
            <div className="text-purple-200 text-sm">Formatda eksport</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">A4</div>
            <div className="text-purple-200 text-sm">Chek formati</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">Realtime</div>
            <div className="text-purple-200 text-sm">Ma'lumot yangilanishi</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">Uzbek</div>
            <div className="text-purple-200 text-sm">Til qo'llab-quvvatlash</div>
          </div>
        </div>
      </div>
    </div>
  );
};