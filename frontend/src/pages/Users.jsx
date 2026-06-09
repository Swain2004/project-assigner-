import { useEffect, useState } from 'react';
import { Users as UsersIcon, Plus, Search, Edit2, UserX, UserCheck, Shield, User } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../components/Modal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const ROLE_STYLE = { admin: 'bg-purple-100 text-purple-700', employee: 'bg-blue-100 text-blue-600' };

function CreateUserModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'employee', department:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!open) { setForm({ name:'', email:'', password:'', role:'employee', department:'' }); setError(''); } }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/users', form);
      onCreated(res.data.user); onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally { setLoading(false); }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Create User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label">Full Name *</label><input className="input-field" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Full name" required /></div>
        <div><label className="label">Email *</label><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="email@company.com" required /></div>
        <div><label className="label">Password *</label><input type="password" className="input-field" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="Min. 6 characters" minLength={6} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Role</label><select className="input-field" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}><option value="employee">Employee</option><option value="admin">Admin</option></select></div>
          <div><label className="label">Department</label><input className="input-field" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} placeholder="e.g. Engineering" /></div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-1"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Creating...' : 'Create User'}</button></div>
      </form>
    </Modal>
  );
}

function EditUserModal({ open, onClose, user: targetUser, onUpdated }) {
  const [form, setForm] = useState({ name:'', email:'', role:'employee', department:'', is_active:true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (targetUser) setForm({ name: targetUser.name, email: targetUser.email, role: targetUser.role, department: targetUser.department || '', is_active: targetUser.is_active });
    if (!open) setError('');
  }, [targetUser, open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.put(`/users/${targetUser.id}`, form);
      onUpdated(res.data.user); onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally { setLoading(false); }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Edit User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label">Full Name</label><input className="input-field" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
        <div><label className="label">Email</label><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Role</label><select className="input-field" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}><option value="employee">Employee</option><option value="admin">Admin</option></select></div>
          <div><label className="label">Department</label><input className="input-field" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} /></div>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-ios">
          <div>
            <p className="text-sm font-semibold text-gray-800">Account Status</p>
            <p className="text-xs text-gray-500">{form.is_active ? 'Active — user can sign in' : 'Deactivated — user cannot sign in'}</p>
          </div>
          <div onClick={() => setForm({...form, is_active: !form.is_active})}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-1"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save Changes'}</button></div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const res = await api.get('/users');
    setUsers(res.data.users);
    setLoading(false);
  }

  const filtered = users.filter((u) => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    return true;
  });

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} total · {activeCount} active · {adminCount} admins</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} strokeWidth={2.5} /> Add User
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-ios">
          {['all','admin','employee'].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-all capitalize ${roleFilter === r ? 'bg-white text-gray-900 shadow-apple-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-ios" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-center">
          <UsersIcon size={40} className="text-gray-200 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-500">No users found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtered.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${u.is_active ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  {u.avatar_url ? <img src={u.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" /> : <span className="text-white font-bold text-sm">{u.name.charAt(0)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{u.name}</p>
                    {u.id === currentUser?.id && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-semibold">You</span>}
                    {!u.is_active && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-semibold">Inactive</span>}
                  </div>
                  <p className="text-xs text-gray-500">{u.email}{u.department ? ` · ${u.department}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge capitalize ${ROLE_STYLE[u.role]}`}>
                    {u.role === 'admin' ? <Shield size={10} className="inline mr-1" /> : <User size={10} className="inline mr-1" />}
                    {u.role}
                  </span>
                  <span className="text-xs text-gray-400 hidden sm:block">Joined {format(new Date(u.created_at), 'MMM yyyy')}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => setEditTarget(u)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all">
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateUserModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={(u) => setUsers((p) => [u, ...p])} />
      {editTarget && (
        <EditUserModal open={!!editTarget} onClose={() => setEditTarget(null)} user={editTarget}
          onUpdated={(updated) => { setUsers((p) => p.map((u) => u.id === updated.id ? updated : u)); setEditTarget(null); }} />
      )}
    </div>
  );
}
