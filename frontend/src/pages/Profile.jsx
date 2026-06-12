import { useState } from 'react';
import { User, Lock, Check, AlertCircle, Briefcase, Mail, Building2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

function Section({ title, children }) {
  return (
    <div className="card p-6">
      <h3 className="text-base font-bold text-gray-900 mb-5">{title}</h3>
      {children}
    </div>
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', department: user?.department || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null);
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileLoading(true); setProfileStatus(null);
    try {
      const res = await api.put('/auth/profile', profileForm);
      updateUser(res.data.user);
      setProfileStatus({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
      setProfileStatus({ success: false, message: err.response?.data?.message || 'Failed to update profile' });
    } finally { setProfileLoading(false); }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return setPasswordStatus({ success: false, message: 'New passwords do not match' });
    }
    if (passwordForm.newPassword.length < 6) {
      return setPasswordStatus({ success: false, message: 'Password must be at least 6 characters' });
    }
    setPasswordLoading(true); setPasswordStatus(null);
    try {
      await api.put('/auth/change-password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      setPasswordStatus({ success: true, message: 'Password changed successfully' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordStatus({ success: false, message: err.response?.data?.message || 'Failed to change password' });
    } finally { setPasswordLoading(false); }
  }

  const passwordsMatch = passwordForm.confirmPassword.length > 0 && passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.newPassword.length >= 6;
  const passwordsDontMatch = passwordForm.confirmPassword.length > 0 && passwordForm.newPassword !== passwordForm.confirmPassword;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h2 className="page-title">Profile</h2>
        <p className="text-sm text-gray-400 mt-0.5">Manage your account settings</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{user?.name?.charAt(0)?.toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`badge capitalize ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-600'}`}>{user?.role}</span>
              {user?.department && <span className="badge bg-gray-100 text-gray-600">{user?.department}</span>}
            </div>
          </div>
        </div>
      </div>

      <Section title="Personal Information">
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-10" value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} placeholder="Your full name" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-10 bg-gray-50 cursor-not-allowed" value={user?.email} disabled readOnly />
            </div>
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed from here</p>
          </div>
          <div>
            <label className="label">Department</label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-10" value={profileForm.department} onChange={(e) => setProfileForm({...profileForm, department: e.target.value})} placeholder="e.g. Engineering, Design, Marketing" />
            </div>
          </div>
          {profileStatus && (
            <div className={`flex items-center gap-2 p-3 rounded-ios text-sm font-medium ${profileStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {profileStatus.success ? <Check size={15} /> : <AlertCircle size={15} />}
              {profileStatus.message}
            </div>
          )}
          <button type="submit" disabled={profileLoading} className="btn-primary">
            {profileLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Section>

      <Section title="Change Password">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={showCurrentPassword ? 'text' : 'password'} className="input-field pl-10 pr-11" value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})} placeholder="Enter current password" required />
              <button type="button" onClick={() => setShowCurrentPassword(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={showNewPassword ? 'text' : 'password'} className="input-field pl-10 pr-11" value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} placeholder="At least 6 characters" minLength={6} required />
              <button type="button" onClick={() => setShowNewPassword(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={showConfirmPassword ? 'text' : 'password'} className="input-field pl-10 pr-11" value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} placeholder="Repeat new password" required />
              <button type="button" onClick={() => setShowConfirmPassword(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordsMatch && (
              <div className="flex items-center gap-1.5 mt-2">
                <CheckCircle size={14} className="text-green-500" />
                <p className="text-xs text-green-600 font-semibold">Passwords match</p>
              </div>
            )}
            {passwordsDontMatch && (
              <p className="text-xs text-red-500 font-semibold mt-2">Passwords don't match</p>
            )}
          </div>
          {passwordStatus && (
            <div className={`flex items-center gap-2 p-3 rounded-ios text-sm font-medium ${passwordStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {passwordStatus.success ? <Check size={15} /> : <AlertCircle size={15} />}
              {passwordStatus.message}
            </div>
          )}
          <button type="submit" disabled={passwordLoading} className="btn-primary">
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </Section>

      <div className="card p-6">
        <h3 className="text-base font-bold text-gray-900 mb-2">Account Details</h3>
        <div className="space-y-3">
          {[
            { label: 'Role', value: user?.role, capitalize: true },
            { label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '' },
          ].map(({ label, value, capitalize }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-b-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className={`text-sm font-semibold text-gray-800 ${capitalize ? 'capitalize' : ''}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
