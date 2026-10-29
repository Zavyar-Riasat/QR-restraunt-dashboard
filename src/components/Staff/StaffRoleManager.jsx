import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  Crown,
  Briefcase,
  CreditCard,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { authService, ROLE_TIERS, getRoleTierConfig } from '../../services/authService';

const ROLE_CARDS = [
  {
    role: 'owner',
    title: 'Owner',
    cardBorder: 'border-[#F0E4D7] bg-white hover:border-[#F26B1D]/40',
    icon: Crown,
    iconBg: 'bg-[#FFF1E6] text-[#F26B1D] border border-[#FCD8BF]',
  },
  {
    role: 'manager',
    title: 'Manager',
    cardBorder: 'border-[#F0E4D7] bg-white hover:border-[#F26B1D]/40',
    icon: Briefcase,
    iconBg: 'bg-[#F5EFEA] text-[#2B2118] border border-[#E5D9CE]',
  },
  {
    role: 'cashier',
    title: 'Cashier',
    cardBorder: 'border-[#F0E4D7] bg-white hover:border-[#F26B1D]/40',
    icon: CreditCard,
    iconBg: 'bg-[#FEF6E7] text-[#B4690E] border border-[#F7DFB5]',
  },
  {
    role: 'waiter',
    title: 'Waiter',
    cardBorder: 'border-[#F0E4D7] bg-white hover:border-[#F26B1D]/40',
    icon: UtensilsCrossed,
    iconBg: 'bg-[#EEF6F0] text-[#1F7A4C] border border-[#CBE6D2]',
  },
];

export default function StaffRoleManager({ restaurant, currentUser }) {
  const actorRole = currentUser?.role || 'owner';
  const actorRoleConfig = getRoleTierConfig(actorRole);
  const manageableRoles = actorRoleConfig.canManageRoles || [];

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Create / Edit Staff Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState(() => manageableRoles[0] || 'cashier');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const slug = restaurant?.slug || currentUser?.restaurant_slug || 'burgersmoke';
      const list = await authService.getRestaurantStaff(slug);
      const roleOrder = { owner: 1, manager: 2, cashier: 3, waiter: 4 };
      const sorted = [...list].sort(
        (a, b) => (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99)
      );
      setStaffList(sorted);
    } catch (err) {
      console.warn('Failed to load restaurant staff:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurant?.slug, currentUser?.restaurant_slug]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleOpenCreateModal = (defaultRole) => {
    const initialRole =
      defaultRole && manageableRoles.includes(defaultRole)
        ? defaultRole
        : manageableRoles[0] || 'cashier';
    setEditingStaff(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormRole(initialRole);
    setFormError('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (staffMember) => {
    setEditingStaff(staffMember);
    setFormName(staffMember.name || '');
    setFormEmail(staffMember.email || '');
    setFormPhone(staffMember.phone || staffMember.whatsapp_number || '');
    setFormPassword('');
    setFormRole(staffMember.role);
    setFormError('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmitStaff = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Staff member name and email are required.');
      return;
    }

    if (!editingStaff && (!formPassword || formPassword.trim().length < 4)) {
      setFormError('Please enter a password of at least 4 characters.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingStaff) {
        await authService.updateStaffAccount(currentUser, editingStaff.id, {
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          password: formPassword.trim() || undefined,
        });
        showToast(
          `Updated ${ROLE_TIERS[editingStaff.role]?.shortLabel || editingStaff.role} credentials for ${formName.trim()}.`
        );
      } else {
        await authService.createStaffAccount(currentUser, {
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          password: formPassword.trim(),
          role: formRole,
          restaurant,
        });
        showToast(
          `Created ${ROLE_TIERS[formRole]?.shortLabel || formRole} account (${formEmail.trim()}).`
        );
      }
      setIsModalOpen(false);
      await loadStaff();
    } catch (err) {
      setFormError(err.message || 'Could not save staff credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffMember) => {
    if (
      !window.confirm(
        `Remove ${staffMember.name} (${staffMember.email}) from ${
          ROLE_TIERS[staffMember.role]?.shortLabel || staffMember.role
        } access?`
      )
    ) {
      return;
    }
    try {
      await authService.deleteStaffAccount(currentUser, staffMember.id);
      showToast(`Removed ${staffMember.name} (${staffMember.email}).`);
      await loadStaff();
    } catch (err) {
      showToast(err.message || 'Could not remove staff account.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {manageableRoles.includes('manager') && (
          <button
            type="button"
            onClick={() => handleOpenCreateModal('manager')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#F26B1D] to-[#F5A623] hover:from-[#E05A0C] hover:to-[#E59512] text-white text-xs font-extrabold shadow-sm shadow-orange-500/20 transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Manager</span>
          </button>
        )}
        {manageableRoles.includes('cashier') && (
          <button
            type="button"
            onClick={() => handleOpenCreateModal('cashier')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#2B2118] hover:bg-[#3D3024] text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Cashier</span>
          </button>
        )}
        {manageableRoles.includes('waiter') && (
          <button
            type="button"
            onClick={() => handleOpenCreateModal('waiter')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FFF1E6] hover:bg-[#FDE4CF] text-[#D95A12] border border-[#FCD8BF] text-xs font-extrabold shadow-xs transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Waiter</span>
          </button>
        )}
      </div>

      {/* Status Toast */}
      {toast && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-fadeIn ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Accounts Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ROLE_CARDS.map((card) => {
          const IconComponent = card.icon;
          const isCurrentUserRole = actorRole === card.role;
          return (
            <div
              key={card.role}
              className={`rounded-2xl border px-4 py-3.5 flex items-center justify-between gap-3 transition shadow-2xs ${card.cardBorder} ${
                isCurrentUserRole ? 'ring-1 ring-[#F26B1D]/40' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 ${card.iconBg}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-[#2B2118] truncate">{card.title}</div>
                  <div className="text-[11px] font-bold text-[#7A6A5C]">Active Accounts</div>
                </div>
              </div>
              <span className="text-lg font-black text-[#2B2118] px-2.5 py-0.5 rounded-xl bg-white/80 border border-[#F0E4D7] shrink-0">
                {staffList.filter((s) => s.role === card.role).length}
              </span>
            </div>
          );
        })}
      </div>

      {/* Staff Accounts Directory Table */}
      <div className="bg-white rounded-3xl border border-[#F0E4D7] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0E4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FFF9F2]/60">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#F26B1D]" />
            <h3 className="text-sm sm:text-base font-black text-[#2B2118]">
              Active Staff Accounts ({staffList.length})
            </h3>
          </div>
          <span className="text-[11px] text-[#7A6A5C] font-medium">
            {actorRole === 'owner'
              ? 'You have full access to manage credentials for all accounts.'
              : 'You can create, update passwords, or remove Cashier and Waiter accounts.'}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#7A6A5C]">Loading staff credentials...</div>
        ) : (
          <div className="divide-y divide-[#F0E4D7]">
            {staffList.map((staff) => {
              const roleInfo = getRoleTierConfig(staff.role);
              const canManageThisStaff = authService.canActorManageStaffRole(actorRole, staff.role);
              const isWaiterLockedForOwner = staff.role === 'waiter' && actorRole === 'owner';

              return (
                <div
                  key={staff.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FFF9F2]/50 transition"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#FFF1E6] border border-[#FCD8BF] text-[#F26B1D] font-black text-sm flex items-center justify-center shrink-0">
                      {(staff.name || staff.role || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#2B2118] truncate">
                          {staff.name}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${roleInfo.badgeClass}`}
                        >
                          {roleInfo.shortLabel || roleInfo.label}
                        </span>
                        {staff.email === currentUser?.email && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                            You
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#7A6A5C] font-mono">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#9E8E81]" />
                          {staff.email}
                        </span>
                        {staff.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#9E8E81]" />
                            {staff.phone}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <KeyRound className="w-3 h-3" />
                          ••••••••••••
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Credential Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {canManageThisStaff ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(staff)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] text-xs font-bold border border-[#F0E4D7] transition cursor-pointer shadow-2xs"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#F26B1D]" />
                          <span>Manage Credentials</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff)}
                          className="inline-flex items-center justify-center p-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-[#F0E4D7] hover:border-rose-200 transition cursor-pointer"
                          title="Remove Staff Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : isWaiterLockedForOwner ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF9F2] text-[#7A6A5C] border border-[#F0E4D7] text-[11px] font-bold"
                        title="Waiter credentials are managed exclusively by the Manager"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Managed by Manager Only</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-200 text-[11px] font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        <span>Protected Account</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Staff Credentials Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0E4D7]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center font-black">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#2B2118]">
                    {editingStaff ? 'Update Staff Credentials' : 'Create Staff Account'}
                  </h3>
                  <p className="text-[11px] text-[#7A6A5C]">
                    {editingStaff
                      ? `Modify login email or set a new password for ${editingStaff.name}`
                      : 'Assign role and login credentials'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitStaff} className="mt-4 space-y-4">
              {/* Role Selector (when creating) */}
              {!editingStaff && (
                <div>
                  <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider mb-1.5">
                    Select Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {manageableRoles.map((rKey) => {
                      const tCfg = getRoleTierConfig(rKey);
                      const isSelected = formRole === rKey;
                      return (
                        <button
                          key={rKey}
                          type="button"
                          onClick={() => setFormRole(rKey)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#FFF1E6] border-[#F26B1D] ring-1 ring-[#F26B1D]'
                              : 'bg-[#FFF9F2] border-[#F0E4D7] hover:bg-white'
                          }`}
                        >
                          <div className="text-xs font-black text-[#2B2118]">{tCfg.shortLabel || tCfg.label}</div>
                          <div className="text-[10px] text-[#7A6A5C] truncate">{tCfg.title}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider mb-1">
                  Staff Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Hamza Ali (Waiter)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-sm text-[#2B2118] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider mb-1">
                  Login Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. waiter2@burgersmoke.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-sm font-mono text-[#2B2118] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider mb-1">
                  Phone / WhatsApp Number
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="923001234567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-sm font-mono text-[#2B2118] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider mb-1">
                  {editingStaff ? 'New Password (leave blank to keep current)' : 'Login Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingStaff}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingStaff ? 'Enter new password to reset' : 'At least 4 characters'}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-sm font-mono text-[#2B2118] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9E8E81] hover:text-[#2B2118] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#F0E4D7] text-xs font-bold text-[#7A6A5C] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-black shadow-md shadow-orange-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'Saving...'
                    : editingStaff
                    ? 'Save Credentials'
                    : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
