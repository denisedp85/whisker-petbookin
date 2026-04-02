import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Heart, MessageCircle, Send, Trash2, Trophy, Star, PawPrint, Video, Music, Type, Lock } from 'lucide-react';
import { toast } from 'sonner';
import EmojiPicker from '../components/EmojiPicker';
import axios from 'axios';

const TIER_ORDER = ['free', 'prime', 'pro', 'ultra', 'mega'];

function canCreateType(tier, type) {
  const t = tier || 'free';
  if (type === 'video') return ['ultra', 'mega'].includes(t);
  if (type === 'audio') return ['pro', 'ultra', 'mega'].includes(t);
  return true;
}

function extractVideoEmbed(url) {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: 'youtube', id: ytMatch[1] };
  // TikTok - just show as link
  if (url.includes('tiktok.com')) return { type: 'tiktok', url };
  // Direct video URL
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) return { type: 'direct', url };
  return { type: 'link', url };
}

function VideoEmbed({ url }) {
  const embed = extractVideoEmbed(url);
  if (!embed) return null;
  if (embed.type === 'youtube') {
    return (
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video mt-3">
        <iframe
          src={`https://www.youtube.com/embed/${embed.id}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video"
        />
      </div>
    );
  }
  if (embed.type === 'direct') {
    return (
      <video controls className="w-full rounded-xl mt-3 max-h-[400px] bg-black">
        <source src={embed.url} />
      </video>
    );
  }
  return (
    <a href={embed.url} target="_blank" rel="noopener noreferrer" className="block mt-3 p-3 rounded-xl bg-muted/50 border border-border text-sm text-primary hover:underline truncate">
      {embed.url}
    </a>
  );
}

function AudioEmbed({ url }) {
  if (!url) return null;
  return (
    <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/50">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Music className="w-5 h-5 text-purple-500" />
        </div>
        <span className="text-sm font-medium text-purple-700">Audio Clip</span>
      </div>
      <audio controls className="w-full" preload="metadata">
        <source src={url} />
      </audio>
    </div>
  );
}

export default function FeedPage() {
  const { user, pets, authHeaders, API } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedPet, setSelectedPet] = useState('');
  const [postType, setPostType] = useState('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [uploading, setUploading] = useState(false);
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
    if (postType !== 'text' && !mediaUrl.trim() && !mediaFile) {
      toast.error(`Please provide a ${postType} URL or upload a file`);
      return;
    }
    setPosting(true);

    let finalMediaUrl = mediaUrl;

    // Upload file if selected
    if (mediaFile && postType !== 'text') {
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', mediaFile);
        const uploadRes = await axios.post(`${API}/uploads/file`, formData, {
          headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
        });
        // Use the storage path as the media URL (will be served by our backend)
        finalMediaUrl = `${API}/uploads/files/${uploadRes.data.storage_path}`;
        setUploading(false);
      } catch (e) {
        setUploading(false);
        toast.error('File upload failed');
        setPosting(false);
        return;
      }
    }

    try {
      await axios.post(`${API}/feed/posts`, {
        content: newPost,
        pet_id: selectedPet || undefined,
        post_type: postType,
        media_url: postType !== 'text' ? finalMediaUrl : undefined,
      }, { headers: authHeaders() });
      setNewPost('');
      setSelectedPet('');
      setMediaUrl('');
      setMediaFile(null);
      setPostType('text');
      fetchPosts();
      toast.success('Post shared!');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to post');
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

  const postTypes = [
    { id: 'text', icon: Type, label: 'Text', tier: null },
    { id: 'video', icon: Video, label: 'Video', tier: 'Ultra+' },
    { id: 'audio', icon: Music, label: 'Audio', tier: 'Pro+' },
  ];

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
                </div>
                <p className="text-sm text-muted-foreground">{petOfWeek.pet.breed || petOfWeek.pet.species}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Owner: {petOfWeek.owner?.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-primary">
                  <Heart className="w-4 h-4 fill-current" />
                  <span className="text-sm font-bold">{petOfWeek.post?.likes_count || 0}</span>
                </div>
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
              {/* Post type selector */}
              <div className="flex gap-1.5">
                {postTypes.map((pt) => {
                  const allowed = canCreateType(user?.membership_tier, pt.id);
                  return (
                    <button
                      key={pt.id}
                      onClick={() => allowed && setPostType(pt.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        postType === pt.id
                          ? 'bg-primary/10 text-primary'
                          : allowed
                            ? 'text-muted-foreground hover:bg-muted'
                            : 'text-muted-foreground/40 cursor-not-allowed'
                      }`}
                      data-testid={`post-type-${pt.id}`}
                      disabled={!allowed}
                    >
                      <pt.icon className="w-3.5 h-3.5" />
                      {pt.label}
                      {!allowed && <Lock className="w-3 h-3" />}
                      {pt.tier && <span className="text-[9px] opacity-60">{pt.tier}</span>}
                    </button>
                  );
                })}
              </div>

              <Textarea
                placeholder={postType === 'text' ? "What's your pet up to?" : postType === 'video' ? "Describe your video..." : "What's this audio about?"}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="rounded-xl border-border resize-none min-h-[80px]"
                data-testid="post-content-input"
              />

              {postType !== 'text' && (
                <div className="space-y-2">
                  <input
                    type="url"
                    placeholder={postType === 'video' ? "Paste video URL (YouTube, TikTok, .mp4)" : "Paste audio URL (.mp3, SoundCloud)"}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="w-full border border-border rounded-xl px-4 py-2.5 bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    data-testid="media-url-input"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">or</span>
                    <label className="text-xs text-primary font-medium cursor-pointer hover:underline">
                      Upload {postType} file
                      <input
                        type="file"
                        accept={postType === 'video' ? 'video/mp4,video/webm' : 'audio/mpeg,audio/wav,audio/mp3'}
                        onChange={(e) => { setMediaFile(e.target.files[0]); setMediaUrl(''); }}
                        className="hidden"
                        data-testid="media-file-input"
                      />
                    </label>
                    {mediaFile && <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{mediaFile.name}</span>}
                  </div>
                </div>
              )}

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
                <div className="flex items-center gap-2 ml-auto">
                  <EmojiPicker onSelect={(emoji) => setNewPost(prev => prev + emoji)} compact />
                  <Button
                    onClick={handlePost}
                    disabled={!newPost.trim() || posting}
                    className="rounded-full bg-primary text-white hover:bg-primary/90"
                    data-testid="post-submit-btn"
                  >
                    {posting ? (uploading ? 'Uploading...' : 'Posting...') : 'Post'}
                  </Button>
                </div>
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
                    {post.post_type && post.post_type !== 'text' && (
                      <Badge className={`text-[10px] px-1.5 py-0 ${post.post_type === 'video' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {post.post_type === 'video' ? <Video className="w-3 h-3 mr-0.5 inline" /> : <Music className="w-3 h-3 mr-0.5 inline" />}
                        {post.post_type.charAt(0).toUpperCase() + post.post_type.slice(1)}
                      </Badge>
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
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

              {/* Media embed */}
              {post.post_type === 'video' && post.media_url && <VideoEmbed url={post.media_url} />}
              {post.post_type === 'audio' && post.media_url && <AudioEmbed url={post.media_url} />}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-3 mt-4 border-t border-border">
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
