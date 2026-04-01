import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Shield, Users, PawPrint, FileText, Award, Trash2, Crown, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const ROLES = ['user', 'moderator', 'manager'];
const TIERS = ['free', 'prime', 'pro', 'ultra', 'mega'];

export default function AdminPage() {
  const { user, authHeaders, API } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [roleForm, setRoleForm] = useState({ user_id: '', role: 'moderator', role_title: '' });
  const [tierForm, setTierForm] = useState({ user_id: '', tier: 'prime' });

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: authHeaders() }),
        axios.get(`${API}/admin/users`, { headers: authHeaders() })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || []);
    } catch (e) {
      console.error('Admin fetch failed', e);
    }
    setLoading(false);
  }, [API, authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssignRole = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/assign-role`, roleForm, { headers: authHeaders() });
      toast.success('Role assigned!');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const handleAssignTier = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/assign-tier`, tierForm, { headers: authHeaders() });
      toast.success('Tier assigned!');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await axios.delete(`${API}/admin/users/${userId}`, { headers: authHeaders() });
      toast.success('User deleted');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  if (!user?.is_admin) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Admin access required</p>
        </div>
      </AppLayout>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roles', label: 'Roles', icon: UserCog },
  ];

  return (
    <AppLayout>
      <div className="space-y-6" data-testid="admin-page">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Admin Dashboard</h1>

        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
              data-testid={`admin-tab-${t.id}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          <>
            {/* Overview */}
            {activeTab === 'overview' && stats && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="admin-stats">
                {[
                  { label: 'Total Users', value: stats.total_users, icon: Users, color: 'text-primary' },
                  { label: 'Total Pets', value: stats.total_pets, icon: PawPrint, color: 'text-secondary' },
                  { label: 'Total Posts', value: stats.total_posts, icon: FileText, color: 'text-blue-500' },
                  { label: 'Verified Breeders', value: stats.verified_breeders, icon: Award, color: 'text-green-500' },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-card p-6" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                      <span className="text-sm text-muted-foreground">{s.label}</span>
                    </div>
                    <p className="text-3xl font-bold" style={{ fontFamily: 'Outfit' }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Users */}
            {activeTab === 'users' && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden" data-testid="admin-users-table">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tier</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Breeder</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.user_id} className="border-t border-border hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs capitalize">{u.role || 'user'}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs uppercase">{u.membership_tier || 'free'}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            {u.breeder_info ? (
                              <Badge className={`text-[10px] ${u.breeder_info.is_verified ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                {u.breeder_info.is_verified ? 'Verified' : 'Registered'}
                              </Badge>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!u.is_admin && (
                              <button
                                onClick={() => handleDeleteUser(u.user_id)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                data-testid={`delete-user-${u.user_id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Roles */}
            {activeTab === 'roles' && (
              <div className="space-y-6" data-testid="admin-roles">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-4" style={{ fontFamily: 'Outfit' }}>Assign Role</h3>
                  <form onSubmit={handleAssignRole} className="space-y-4">
                    <select
                      value={roleForm.user_id}
                      onChange={(e) => setRoleForm({...roleForm, user_id: e.target.value})}
                      className="w-full border border-border rounded-xl px-4 py-2.5 bg-background text-sm"
                      data-testid="role-user-select"
                    >
                      <option value="">Select user</option>
                      {users.filter(u => !u.is_admin).map(u => (
                        <option key={u.user_id} value={u.user_id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                    <select
                      value={roleForm.role}
                      onChange={(e) => setRoleForm({...roleForm, role: e.target.value})}
                      className="w-full border border-border rounded-xl px-4 py-2.5 bg-background text-sm"
                      data-testid="role-select"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                    <Input placeholder="Custom title (optional)" value={roleForm.role_title} onChange={(e) => setRoleForm({...roleForm, role_title: e.target.value})} className="rounded-xl" data-testid="role-title-input" />
                    <Button type="submit" className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="assign-role-btn">
                      Assign Role
                    </Button>
                  </form>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-4" style={{ fontFamily: 'Outfit' }}>Assign Tier</h3>
                  <form onSubmit={handleAssignTier} className="space-y-4">
                    <select
                      value={tierForm.user_id}
                      onChange={(e) => setTierForm({...tierForm, user_id: e.target.value})}
                      className="w-full border border-border rounded-xl px-4 py-2.5 bg-background text-sm"
                      data-testid="tier-user-select"
                    >
                      <option value="">Select user</option>
                      {users.map(u => (
                        <option key={u.user_id} value={u.user_id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                    <select
                      value={tierForm.tier}
                      onChange={(e) => setTierForm({...tierForm, tier: e.target.value})}
                      className="w-full border border-border rounded-xl px-4 py-2.5 bg-background text-sm"
                      data-testid="tier-select"
                    >
                      {TIERS.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                    <Button type="submit" className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90" data-testid="assign-tier-btn">
                      <Crown className="w-4 h-4 mr-2" /> Assign Tier
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
