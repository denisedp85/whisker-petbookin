import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Heart, MessageCircle, Send, Trash2, Shield, Trophy, Star, PawPrint } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

export default function FeedPage() {
  const { user, pets, authHeaders, API } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedPet, setSelectedPet] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [commentTexts, setCommentTexts] = useState({});
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState({});
  const [petOfWeek, setPetOfWeek] = useState(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/feed/posts`, { headers: authHeaders() });
      setPosts(res.data.posts || []);
    } catch (e) {
      console.error('Failed to load feed', e);
    }
    setLoading(false);
  }, [API, authHeaders]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    const fetchPOTW = async () => {
      try {
        const res = await axios.get(`${API}/feed/pet-of-the-week`, { headers: authHeaders() });
        if (res.data.pet) setPetOfWeek(res.data);
      } catch {}
    };
    fetchPOTW();
  }, [API, authHeaders]);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      await axios.post(`${API}/feed/posts`, {
        content: newPost,
        pet_id: selectedPet || undefined
      }, { headers: authHeaders() });
      setNewPost('');
      setSelectedPet('');
      fetchPosts();
      toast.success('Post shared!');
    } catch (e) {
      toast.error('Failed to post');
    }
    setPosting(false);
  };

  const handleLike = async (postId) => {
    try {
      const res = await axios.post(`${API}/feed/posts/${postId}/like`, {}, { headers: authHeaders() });
      setPosts(prev => prev.map(p => {
        if (p.post_id !== postId) return p;
        const likes = p.likes || [];
        return {
          ...p,
          likes: res.data.liked ? [...likes, user.user_id] : likes.filter(id => id !== user.user_id),
          likes_count: (p.likes_count || 0) + (res.data.liked ? 1 : -1)
        };
      }));
    } catch {}
  };

  const loadComments = async (postId) => {
    try {
      const res = await axios.get(`${API}/feed/posts/${postId}/comments`, { headers: authHeaders() });
      setComments(prev => ({ ...prev, [postId]: res.data }));
    } catch {}
  };

  const toggleComments = (postId) => {
    const isShowing = showComments[postId];
    setShowComments(prev => ({ ...prev, [postId]: !isShowing }));
    if (!isShowing && !comments[postId]) loadComments(postId);
  };

  const handleComment = async (postId) => {
    const text = commentTexts[postId]?.trim();
    if (!text) return;
    try {
      await axios.post(`${API}/feed/posts/${postId}/comments`, { content: text }, { headers: authHeaders() });
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      loadComments(postId);
      setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
    } catch {}
  };

  const handleDelete = async (postId) => {
    try {
      await axios.delete(`${API}/feed/posts/${postId}`, { headers: authHeaders() });
      setPosts(prev => prev.filter(p => p.post_id !== postId));
      toast.success('Post deleted');
    } catch {}
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="feed-page">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Feed</h1>

        {/* Pet of the Week */}
        {petOfWeek && petOfWeek.pet && (
          <div className="rounded-2xl border-2 border-secondary/30 bg-gradient-to-r from-secondary/5 via-card to-primary/5 p-5 animate-fade-in-up" data-testid="pet-of-the-week">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-secondary" />
              <span className="text-xs font-bold tracking-[0.15em] uppercase text-secondary">Pet of the Week</span>
              <Star className="w-3.5 h-3.5 text-secondary fill-secondary" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {petOfWeek.pet.photos?.[0] ? (
                  <img src={petOfWeek.pet.photos[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <PawPrint className="w-8 h-8 text-secondary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg" style={{ fontFamily: 'Outfit' }}>{petOfWeek.pet.name}</h3>
                  {petOfWeek.pet.verified_breeder && (
                    <Badge className="bg-secondary text-secondary-foreground text-[10px] verified-badge">Verified</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{petOfWeek.pet.breed || petOfWeek.pet.species} {petOfWeek.pet.age ? `- ${petOfWeek.pet.age}` : ''}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Owner: {petOfWeek.owner?.name} {petOfWeek.owner?.breeder_info ? '(Breeder)' : ''}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-primary">
                  <Heart className="w-4 h-4 fill-current" />
                  <span className="text-sm font-bold">{petOfWeek.post?.likes_count || 0}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">likes this week</p>
              </div>
            </div>
          </div>
        )}

        {/* Create Post */}
        <div className="rounded-2xl border border-border bg-card p-6" data-testid="create-post">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 overflow-hidden">
              {user?.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> : user?.name?.charAt(0)}
            </div>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="What's your pet up to?"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="rounded-xl border-border resize-none min-h-[80px]"
                data-testid="post-content-input"
              />
              <div className="flex items-center justify-between">
                {pets.length > 0 && (
                  <select
                    value={selectedPet}
                    onChange={(e) => setSelectedPet(e.target.value)}
                    className="text-sm border border-border rounded-xl px-3 py-1.5 bg-background"
                    data-testid="post-pet-select"
                  >
                    <option value="">No pet tag</option>
                    {pets.map(p => <option key={p.pet_id} value={p.pet_id}>{p.name}</option>)}
                  </select>
                )}
                <Button
                  onClick={handlePost}
                  disabled={!newPost.trim() || posting}
                  className="rounded-full bg-primary text-white hover:bg-primary/90 ml-auto"
                  data-testid="post-submit-btn"
                >
                  {posting ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="empty-feed">
            <p className="text-lg font-medium">No posts yet</p>
            <p className="text-sm mt-1">Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.post_id} className="rounded-2xl border border-border bg-card p-6 animate-fade-in-up" data-testid={`post-${post.post_id}`}>
              {/* Post header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm overflow-hidden">
                  {post.author_picture ? <img src={post.author_picture} alt="" className="w-full h-full object-cover" /> : post.author_name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{post.author_name}</span>
                    {post.author_tier && post.author_tier !== 'free' && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{post.author_tier.toUpperCase()}</Badge>
                    )}
                    {post.pet_name && (
                      <span className="text-xs text-muted-foreground">with {post.pet_name}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
                </div>
                {(post.author_id === user?.user_id || user?.is_admin) && (
                  <button onClick={() => handleDelete(post.post_id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" data-testid={`delete-post-${post.post_id}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Content */}
              <p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-3 border-t border-border">
                <button
                  onClick={() => handleLike(post.post_id)}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    post.likes?.includes(user?.user_id) ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                  }`}
                  data-testid={`like-btn-${post.post_id}`}
                >
                  <Heart className={`w-4 h-4 ${post.likes?.includes(user?.user_id) ? 'fill-current' : ''}`} />
                  <span>{post.likes_count || 0}</span>
                </button>
                <button
                  onClick={() => toggleComments(post.post_id)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`comment-btn-${post.post_id}`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.comments_count || 0}</span>
                </button>
              </div>

              {/* Comments */}
              {showComments[post.post_id] && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  {(comments[post.post_id] || []).map((c) => (
                    <div key={c.comment_id} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden">
                        {c.author_picture ? <img src={c.author_picture} alt="" className="w-full h-full object-cover" /> : c.author_name?.charAt(0)}
                      </div>
                      <div className="bg-muted/50 rounded-xl px-3 py-2 text-sm">
                        <span className="font-medium text-xs">{c.author_name}</span>
                        <p className="text-foreground/80">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      placeholder="Write a comment..."
                      value={commentTexts[post.post_id] || ''}
                      onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.post_id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleComment(post.post_id)}
                      className="flex-1 text-sm border border-border rounded-xl px-3 py-2 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      data-testid={`comment-input-${post.post_id}`}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleComment(post.post_id)}
                      className="rounded-xl bg-primary text-white hover:bg-primary/90"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
