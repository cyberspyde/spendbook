import React, { useEffect, useState } from 'react';

export const Settings: React.FC = () => {
  const [adminUsername, setAdminUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [authUsers, setAuthUsers] = useState<Array<{ telegram_id: string; display_name: string | null }>>([]);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const [adminRes, authRes] = await Promise.all([
          fetch('/api/settings/admin', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/settings/auth-users', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (adminRes.ok) {
          const data = await adminRes.json();
          setAdminUsername(data.adminUsername || '');
        }
        if (authRes.ok) {
          const users = await authRes.json();
          setAuthUsers(users);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const token = localStorage.getItem('admin_token');
      const clean = adminUsername.replace(/^@/, '').trim();
      const res = await fetch('/api/settings/admin', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adminUsername: clean })
      });
      if (!res.ok) throw new Error('Save failed');
      setMessage('Saqlangan');
    } catch (e) {
      setMessage("Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Administrator Sozlamalari</h3>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Admin Telegram username</label>
          <input
            type="text"
            placeholder="masalan: your_admin"
            value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500">@ belgisisiz kiritishingiz mumkin. Bot xabarlarda @ qo'shib ko'rsatadi.</p>
          <button
            onClick={save}
            disabled={saving}
            className="mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
          {message && <div className="text-sm mt-2">{message}</div>}
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Telegram Ruxsatlari</h3>
        <p className="text-sm text-gray-600 mb-4">Faqat quyidagi Telegram ID'lar botdan foydalanishi mumkin.</p>

        {/* Add new authorized user */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telegram ID</label>
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="123456789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ism (ixtiyoriy)</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ali Valiyev"
            />
          </div>
          <div>
            <button
              onClick={async () => {
                const token = localStorage.getItem('admin_token');
                if (!newId.trim()) return;
                const res = await fetch('/api/settings/auth-users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ telegramId: newId.trim(), displayName: newName.trim() || null })
                });
                if (res.ok) {
                  const saved = await res.json();
                  setAuthUsers((prev) => {
                    const other = prev.filter(u => u.telegram_id !== saved.telegram_id);
                    return [...other, saved].sort((a,b) => (a.display_name||'').localeCompare(b.display_name||''));
                  });
                  setNewId('');
                  setNewName('');
                }
              }}
              className="w-full md:w-auto bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            >Qo'shish</button>
          </div>
        </div>

        {/* Authorized users list */}
        <div className="divide-y border rounded-lg">
          {authUsers.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Hozircha ruxsat etilgan foydalanuvchi yo'q</div>
          ) : authUsers.map(u => (
            <div key={u.telegram_id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{u.display_name || 'Nomsiz'}</div>
                <div className="text-xs text-gray-500">ID: {u.telegram_id}</div>
              </div>
              <div className="space-x-2">
                <button
                  onClick={async () => {
                    const token = localStorage.getItem('admin_token');
                    await fetch(`/api/settings/auth-users/${u.telegram_id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                    setAuthUsers((prev) => prev.filter(x => x.telegram_id !== u.telegram_id));
                  }}
                  className="text-red-600 hover:text-red-800 text-sm"
                >O'chirish</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
