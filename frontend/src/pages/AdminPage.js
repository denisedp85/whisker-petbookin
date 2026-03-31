import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  LayoutDashboard, Users, FileText, Shield, Flag, UserPlus, Ban,
  Trash2, Check, X, Search, ChevronLeft, ChevronRight, Eye,
  TrendingUp, PawPrint, Heart, MessageCircle, UserCheck, AlertTriangle, Loader2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function AdminPage() {
  const { user, authHeaders, API } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-[#f0f2f5]">
        <Navbar />
        <div className="max-w-lg mx-auto py-16 text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 font-['Archivo_Narrow']">Admin Access Required</h2>
          <p className="text-sm text-gray-500 mt-2">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar />
      {/* Admin header bar */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-semibold font-['Archivo_Narrow'] tracking-wide">PETBOOKIN ADMIN PANEL</span>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs ml-2">Admin</Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
            <TabsList className="w-full justify-start border-b border-gray-200 rounded-none bg-transparent h-auto p-0 flex-nowrap">
              <TabsTrigger value="dashboard" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-amber-700 px-4 py-3 text-sm gap-1.5 whitespace-nowrap" data-testid="admin-tab-dashboard">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="users" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-amber-700 px-4 py-3 text-sm gap-1.5 whitespace-nowrap" data-testid="admin-tab-users">
                <Users className="w-4 h-4" /> Users
              </TabsTrigger>
              <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-amber-700 px-4 py-3 text-sm gap-1.5 whitespace-nowrap" data-testid="admin-tab-posts">
                <FileText className="w-4 h-4" /> Posts
              </TabsTrigger>
              <TabsTrigger value="verifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-amber-700 px-4 py-3 text-sm gap-1.5 whitespace-nowrap" data-testid="admin-tab-verifications">
                <Shield className="w-4 h-4" /> Verifications
              </TabsTrigger>
              <TabsTrigger value="reports" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-amber-700 px-4 py-3 text-sm gap-1.5 whitespace-nowrap" data-testid="admin-tab-reports">
                <Flag className="w-4 h-4" /> Reports
              </TabsTrigger>
              <TabsTrigger value="admins" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-amber-700 px-4 py-3 text-sm gap-1.5 whitespace-nowrap" data-testid="admin-tab-admins">
                <UserCheck className="w-4 h-4" /> Manage Admins
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="posts"><PostsTab /></TabsContent>
          <TabsContent value="verifications"><VerificationsTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
          <TabsContent value="admins"><AdminsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ===== DASHBOARD TAB ===== */
function DashboardTab() {
  const { authHeaders, API } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/admin/dashboard`, { headers: authHeaders() });
        setStats(res.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, [API, authHeaders]);

  if (loading) return <LoadingSpinner />;

  const cards = [
    { label: 'Total Users', value: stats?.total_users, icon: Users, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-200/50' },
    { label: 'Total Pets', value: stats?.total_pets, icon: PawPrint, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-200/50' },
    { label: 'Total Posts', value: stats?.total_posts, icon: FileText, color: 'from-rose-500 to-pink-500', shadow: 'shadow-rose-200/50' },
    { label: 'Comments', value: stats?.total_comments, icon: MessageCircle, color: 'from-teal-500 to-emerald-500', shadow: 'shadow-teal-200/50' },
    { label: 'Likes', value: stats?.total_likes, icon: Heart, color: 'from-red-500 to-rose-500', shadow: 'shadow-red-200/50' },
    { label: 'Friendships', value: stats?.total_friendships, icon: UserCheck, color: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-200/50' },
  ];

  const alerts = [
    { label: 'Banned Users', value: stats?.banned_users, icon: Ban, color: 'text-red-600 bg-red-50 border-red-200' },
    { label: 'Pending Verifications', value: stats?.pending_verifications, icon: Shield, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Pending Reports', value: stats?.pending_reports, icon: Flag, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  ];

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`bg-white rounded-xl border border-gray-100 p-4 shadow-lg ${c.shadow} hover:-translate-y-0.5 transition-transform`}>
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center text-white shadow-md mb-2`}>
              <c.icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Growth + Alerts */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Last 7 Days
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
              <p className="text-xl font-bold text-emerald-700">{stats?.recent_users_7d ?? 0}</p>
              <p className="text-xs text-emerald-600">New Users</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="text-xl font-bold text-blue-700">{stats?.recent_posts_7d ?? 0}</p>
              <p className="text-xs text-blue-600">New Posts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Attention Needed
          </h3>
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.label} className={`flex items-center justify-between rounded-lg p-2.5 border ${a.color}`}>
                <div className="flex items-center gap-2">
                  <a.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{a.label}</span>
                </div>
                <span className="text-lg font-bold">{a.value ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== USERS TAB ===== */
function UsersTab() {
  const { authHeaders, API } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/users?page=${page}&q=${search}`, { headers: authHeaders() });
      setUsers(res.data.users);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, API, authHeaders]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleBan = async (userId) => {
    try {
      const res = await axios.put(`${API}/admin/users/${userId}/ban`, {}, { headers: authHeaders() });
      toast.success(res.data.is_banned ? 'User banned' : 'User unbanned');
      fetchUsers();
    } catch (e) { toast.error('Action failed'); }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user and ALL their data? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/admin/users/${userId}`, { headers: authHeaders() });
      toast.success('User deleted');
      fetchUsers();
    } catch (e) { toast.error(e.response?.data?.detail || 'Delete failed'); }
  };

  return (
    <div className="space-y-4" data-testid="admin-users">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Users ({total})</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              data-testid="admin-user-search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search users..."
              className="pl-9 h-9 text-sm border-gray-200 rounded-lg"
            />
          </div>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div className="divide-y divide-gray-50">
            {users.map(u => (
              <div key={u.user_id} className="flex items-center gap-3 p-4 hover:bg-gray-50/50" data-testid={`admin-user-${u.user_id}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-sm font-bold text-blue-600 flex-shrink-0">
                  {u.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                    {u.is_admin && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Admin</Badge>}
                    {u.is_banned && <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Banned</Badge>}
                    {u.kennel_club && <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] gap-0.5"><Shield className="w-2.5 h-2.5" />{u.kennel_club}</Badge>}
                    {u.kennel_verified && <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Verified</Badge>}
                  </div>
                  <p className="text-xs text-gray-500">{u.email} &middot; {u.pet_count} pets &middot; {u.post_count} posts &middot; {u.auth_type}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button
                    data-testid={`ban-user-${u.user_id}`}
                    variant="outline"
                    onClick={() => handleBan(u.user_id)}
                    className={`h-8 px-2.5 text-xs gap-1 ${u.is_banned ? 'border-green-300 text-green-600 hover:bg-green-50' : 'border-orange-300 text-orange-600 hover:bg-orange-50'}`}
                  >
                    <Ban className="w-3.5 h-3.5" /> {u.is_banned ? 'Unban' : 'Ban'}
                  </Button>
                  {!u.is_admin && (
                    <Button
                      data-testid={`delete-user-${u.user_id}`}
                      variant="outline"
                      onClick={() => handleDelete(u.user_id)}
                      className="h-8 px-2.5 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 border-t border-gray-100">
            <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 px-2"><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm text-gray-600">Page {page} of {pages}</span>
            <Button variant="outline" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="h-8 px-2"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== POSTS TAB ===== */
function PostsTab() {
  const { authHeaders, API } = useAuth();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/posts?page=${page}`, { headers: authHeaders() });
      setPosts(res.data.posts);
      setPages(res.data.pages);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, API, authHeaders]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await axios.delete(`${API}/admin/posts/${postId}`, { headers: authHeaders() });
      toast.success('Post deleted');
      fetchPosts();
    } catch (e) { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-4" data-testid="admin-posts">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">All Posts</h3>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div className="divide-y divide-gray-50">
            {posts.map(p => (
              <div key={p.post_id} className="p-4 hover:bg-gray-50/50" data-testid={`admin-post-${p.post_id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <PawPrint className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-gray-900">{p.pet?.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-400">by {p.owner?.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-400">{p.created_at ? formatDistanceToNow(new Date(p.created_at), { addSuffix: true }) : ''}</span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{p.content}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      <span>{p.likes_count || 0} likes</span>
                      <span>{p.comments_count || 0} comments</span>
                      {p.image_path && <span className="text-blue-500">Has image</span>}
                    </div>
                  </div>
                  <Button
                    data-testid={`admin-delete-post-${p.post_id}`}
                    variant="outline"
                    onClick={() => handleDelete(p.post_id)}
                    className="h-8 px-2.5 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </Button>
                </div>
              </div>
            ))}
            {posts.length === 0 && <div className="p-8 text-center text-sm text-gray-500">No posts yet</div>}
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 border-t border-gray-100">
            <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 px-2"><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm text-gray-600">Page {page} of {pages}</span>
            <Button variant="outline" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="h-8 px-2"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== VERIFICATIONS TAB ===== */
function VerificationsTab() {
  const { authHeaders, API } = useAuth();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/verifications`, { headers: authHeaders() });
      setVerifications(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [API, authHeaders]);

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  const handleVerify = async (userId, action) => {
    try {
      await axios.put(`${API}/admin/verifications/${userId}`, { action }, { headers: authHeaders() });
      toast.success(action === 'approve' ? 'Verification approved!' : 'Verification rejected');
      fetchVerifications();
    } catch (e) { toast.error('Action failed'); }
  };

  return (
    <div className="space-y-4" data-testid="admin-verifications">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Pending Kennel Club Verifications</h3>
        </div>
        {loading ? <LoadingSpinner /> : verifications.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No pending verifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {verifications.map(v => (
              <div key={v.user_id} className="p-4 hover:bg-gray-50/50" data-testid={`verification-${v.user_id}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{v.name}</p>
                    <p className="text-xs text-gray-500">{v.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs gap-0.5">
                        <Shield className="w-2.5 h-2.5" /> {v.kennel_club}
                      </Badge>
                      <span className="text-xs text-gray-600">Registration: {v.kennel_registration || 'Not provided'}</span>
                      <span className="text-xs text-gray-400">{v.pet_count} pets</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      data-testid={`approve-verification-${v.user_id}`}
                      onClick={() => handleVerify(v.user_id, 'approve')}
                      className="h-8 px-3 text-xs bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button
                      data-testid={`reject-verification-${v.user_id}`}
                      variant="outline"
                      onClick={() => handleVerify(v.user_id, 'reject')}
                      className="h-8 px-3 text-xs border-red-300 text-red-600 hover:bg-red-50 gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== REPORTS TAB ===== */
function ReportsTab() {
  const { authHeaders, API } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/reports?status=${filter}`, { headers: authHeaders() });
      setReports(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filter, API, authHeaders]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleResolve = async (reportId, action) => {
    try {
      await axios.put(`${API}/admin/reports/${reportId}`, { action }, { headers: authHeaders() });
      toast.success(`Report ${action}d`);
      fetchReports();
    } catch (e) { toast.error('Action failed'); }
  };

  return (
    <div className="space-y-4" data-testid="admin-reports">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Content Reports</h3>
          <div className="flex gap-1">
            {['pending', 'resolved', 'dismissed', 'all'].map(f => (
              <Button key={f} variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}
                className={`h-7 px-2.5 text-xs capitalize ${filter === f ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'border-gray-200'}`}
              >{f}</Button>
            ))}
          </div>
        </div>
        {loading ? <LoadingSpinner /> : reports.length === 0 ? (
          <div className="p-8 text-center">
            <Flag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No {filter} reports</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reports.map(r => (
              <div key={r.report_id} className="p-4 hover:bg-gray-50/50" data-testid={`report-${r.report_id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs capitalize">{r.target_type}</Badge>
                      {r.category && <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs capitalize">{r.category}</Badge>}
                      <span className="text-xs text-gray-400">{r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : ''}</span>
                    </div>
                    <p className="text-sm text-gray-700">{r.reason || 'No reason provided'}</p>
                    {r.details && <p className="text-xs text-gray-500 mt-0.5 italic">"{r.details}"</p>}
                    <p className="text-xs text-gray-500 mt-0.5">Reported by: {r.reporter?.name || 'Unknown'}</p>
                    {r.target_type === 'post' && r.target && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">Post: "{r.target.content}"</p>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button onClick={() => handleResolve(r.report_id, 'resolve')} className="h-8 px-2.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                        <Check className="w-3.5 h-3.5" /> Resolve
                      </Button>
                      <Button variant="outline" onClick={() => handleResolve(r.report_id, 'dismiss')} className="h-8 px-2.5 text-xs border-gray-300 gap-1">
                        <X className="w-3.5 h-3.5" /> Dismiss
                      </Button>
                    </div>
                  )}
                  {r.status !== 'pending' && (
                    <Badge className={`text-xs ${r.status === 'resolved' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {r.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== ADMINS TAB ===== */
function AdminsTab() {
  const { authHeaders, API } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/admins`, { headers: authHeaders() });
      setAdmins(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [API, authHeaders]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      await axios.post(`${API}/admin/add-admin`, { email: newEmail.trim() }, { headers: authHeaders() });
      toast.success(`${newEmail} is now an admin!`);
      setNewEmail('');
      fetchAdmins();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to add admin'); }
    setAdding(false);
  };

  const handleRemove = async (email) => {
    if (!window.confirm(`Remove ${email} as admin?`)) return;
    try {
      await axios.post(`${API}/admin/remove-admin`, { email }, { headers: authHeaders() });
      toast.success(`${email} removed as admin`);
      fetchAdmins();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="space-y-4" data-testid="admin-manage-admins">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Manage Admins (Max 3)</h3>
          <p className="text-xs text-gray-500 mt-0.5">Current: {admins.length}/3 admin slots used</p>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div className="divide-y divide-gray-50">
            {admins.map(a => (
              <div key={a.user_id} className="flex items-center justify-between p-4" data-testid={`admin-slot-${a.user_id}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-sm font-bold text-amber-700">
                    {a.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-500">{a.email}</p>
                  </div>
                </div>
                <Button
                  data-testid={`remove-admin-${a.user_id}`}
                  variant="outline"
                  onClick={() => handleRemove(a.email)}
                  className="h-8 px-2.5 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <X className="w-3.5 h-3.5" /> Remove
                </Button>
              </div>
            ))}
          </div>
        )}
        {admins.length < 3 && (
          <div className="p-4 border-t border-gray-100 flex gap-2">
            <Input
              data-testid="add-admin-email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter user email to add as admin"
              className="flex-1 h-9 text-sm border-gray-200"
            />
            <Button
              data-testid="add-admin-btn"
              onClick={handleAdd}
              disabled={adding || !newEmail.trim()}
              className="h-9 bg-amber-500 hover:bg-amber-600 text-white gap-1.5 text-sm"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add Admin
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="animate-spin w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full" />
    </div>
  );
}
