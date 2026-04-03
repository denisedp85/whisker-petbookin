import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PawPrint, Shield, Heart, Users, MapPin, Calendar, Weight, Activity, UserPlus, Check, Clock, Sparkles, Loader2, Music, Volume2, VolumeX, Flag, Ban } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { petId } = useParams();
  const { user, activePet, authHeaders, API } = useAuth();
  const [pet, setPet] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendshipStatus, setFriendshipStatus] = useState({ status: 'none' });
  const [loading, setLoading] = useState(true);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [audioRef] = useState({ current: null });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const isOwner = pet?.owner_id === user?.user_id;

  const fetchProfile = useCallback(async () => {
    try {
      const [petRes, postsRes, friendsRes] = await Promise.all([
        axios.get(`${API}/pets/${petId}`),
        axios.get(`${API}/pets/${petId}/posts`),
        axios.get(`${API}/friends/${petId}`)
      ]);
      setPet(petRes.data);
      setPosts(postsRes.data);
      setFriends(friendsRes.data);
    } catch (e) {
      console.error('Failed to load profile', e);
    }
    setLoading(false);
  }, [petId, API]);

  const fetchFriendshipStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API}/friends/status/${petId}`, { headers: authHeaders() });
      setFriendshipStatus(res.data);
    } catch (e) {
      console.error('Failed to get friendship status', e);
    }
  }, [petId, user, API, authHeaders]);

  useEffect(() => {
    fetchProfile();
    fetchFriendshipStatus();
  }, [fetchProfile, fetchFriendshipStatus]);

  const handleAddFriend = async () => {
    if (!activePet) return;
    try {
      await axios.post(`${API}/friends/request`, {
        requester_pet_id: activePet.pet_id,
        receiver_pet_id: petId
      }, { headers: authHeaders() });
      setFriendshipStatus({ status: 'pending' });
    } catch (e) {
      console.error('Friend request failed', e);
    }
  };

  const handleGenerateBio = async () => {
    if (!pet) return;
    setGeneratingBio(true);
    try {
      const res = await axios.post(`${API}/ai/generate-bio`, {
        pet_name: pet.name,
        species: pet.species,
        breed: pet.breed,
        personality_traits: pet.personality_traits || [],
        favorite_activities: pet.favorite_activities || []
      }, { headers: authHeaders() });
      await axios.put(`${API}/pets/${petId}`, { bio: res.data.bio }, { headers: authHeaders() });
      setPet(prev => ({ ...prev, bio: res.data.bio }));
    } catch (e) {
      console.error('Bio generation failed', e);
    }
    setGeneratingBio(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5]">
        <Navbar />
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-[#4080ff] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen bg-[#f0f2f5]">
        <Navbar />
        <div className="max-w-3xl mx-auto py-16 text-center">
          <PawPrint className="w-16 h-16 text-[#bcc0c4] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#050505]">Pet not found</h2>
        </div>
      </div>
    );
  }

  const owner = pet.owner;
  const ownerTheme = owner?.profile_theme || {};
  const bgImageUrl = ownerTheme.video_bg_url;
  const musicUrl = ownerTheme.music_url;

  const toggleMusic = () => {
    if (!audioRef.current && musicUrl) {
      audioRef.current = new Audio(musicUrl);
      audioRef.current.loop = true;
    }
    if (musicPlaying) {
      audioRef.current?.pause();
      setMusicPlaying(false);
    } else {
      audioRef.current?.play().catch(() => {});
      setMusicPlaying(true);
    }
  };

  const handleBlock = async () => {
    if (!owner?.user_id || owner.user_id === user?.user_id) return;
    if (!window.confirm(`Block ${owner.name}? Their content will be hidden from your feed.`)) return;
    try {
      await axios.post(`${API}/users/block/${owner.user_id}`, {}, { headers: authHeaders() });
      toast.success('User blocked');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to block');
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) { toast.error('Please select a reason'); return; }
    try {
      await axios.post(`${API}/users/report`, {
        report_type: 'user',
        target_id: owner?.user_id,
        reason: reportReason,
      }, { headers: authHeaders() });
      toast.success('Report submitted. Our team will review it.');
      setShowReportModal(false);
      setReportReason('');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to report');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-6" data-testid="profile-header">
          {/* Cover */}
          <div className="h-40 relative overflow-hidden" style={{
            background: bgImageUrl ? undefined : 'linear-gradient(to right, #3b5998, #4080ff)',
          }}>
            {bgImageUrl ? (
              <img src={bgImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1623945514418-15427b33a34c?w=800')",
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }} />
            )}
            {/* Music toggle */}
            {musicUrl && (
              <button
                onClick={toggleMusic}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                data-testid="music-toggle"
              >
                {musicPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}
            {/* Block/Report for non-owners */}
            {!isOwner && owner && (
              <div className="absolute top-3 left-3 flex gap-1.5">
                <button
                  onClick={handleBlock}
                  className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-red-600/80 transition-colors"
                  title="Block user"
                  data-testid="block-user-btn"
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-amber-600/80 transition-colors"
                  title="Report user"
                  data-testid="report-user-btn"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          
          <div className="px-6 pb-4 -mt-12 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Avatar */}
              <div className="w-28 h-28 rounded-lg bg-white border-4 border-white shadow-md flex items-center justify-center overflow-hidden" data-testid="profile-avatar">
                {pet.profile_photo ? (
                  <StorageImage path={pet.profile_photo} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#4080ff]/10 flex items-center justify-center">
                    <PawPrint className="w-12 h-12 text-[#4080ff]" />
                  </div>
                )}
              </div>
              
              {/* Name & Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-[#050505] font-['Archivo_Narrow']">{pet.name}</h1>
                  {pet.is_breeder_profile && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1">
                      <Shield className="w-3 h-3" /> Breeder
                    </Badge>
                  )}
                  {owner?.kennel_club && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1" data-testid="kennel-badge">
                      <Shield className="w-3 h-3" /> {owner.kennel_club}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-[#65676b] mt-0.5">
                  {pet.breed && <span>{pet.breed} &middot; </span>}
                  {pet.species}
                  {pet.age && <span> &middot; {pet.age}</span>}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-[#65676b]">
                  <span><strong className="text-[#050505]">{pet.friends_count || 0}</strong> friends</span>
                  <span><strong className="text-[#050505]">{pet.posts_count || 0}</strong> posts</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {!isOwner && friendshipStatus.status === 'none' && (
                  <Button data-testid="add-friend-btn" onClick={handleAddFriend} className="bg-[#4080ff] hover:bg-[#3b5998] text-white gap-1.5">
                    <UserPlus className="w-4 h-4" /> Add Friend
                  </Button>
                )}
                {!isOwner && friendshipStatus.status === 'pending' && (
                  <Button disabled className="bg-gray-200 text-[#65676b] gap-1.5">
                    <Clock className="w-4 h-4" /> Request Sent
                  </Button>
                )}
                {!isOwner && friendshipStatus.status === 'accepted' && (
                  <Button disabled className="bg-green-50 text-green-700 border-green-200 gap-1.5" variant="outline">
                    <Check className="w-4 h-4" /> Friends
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs defaultValue="about" className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <TabsList className="w-full justify-start border-b border-gray-200 rounded-none bg-transparent h-auto p-0">
              <TabsTrigger value="about" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4080ff] data-[state=active]:bg-transparent data-[state=active]:text-[#4080ff] px-4 py-3 text-sm" data-testid="tab-about">About</TabsTrigger>
              <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4080ff] data-[state=active]:bg-transparent data-[state=active]:text-[#4080ff] px-4 py-3 text-sm" data-testid="tab-posts">Posts</TabsTrigger>
              <TabsTrigger value="friends" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4080ff] data-[state=active]:bg-transparent data-[state=active]:text-[#4080ff] px-4 py-3 text-sm" data-testid="tab-friends">Friends</TabsTrigger>
            </TabsList>
          </div>

          {/* About Tab */}
          <TabsContent value="about">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Pet Info */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="border-b border-gray-100 p-3 bg-gray-50/50 rounded-t-lg">
                  <h3 className="text-sm font-semibold text-[#1c1e21]">Pet Info</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    {pet.bio && (
                      <div>
                        <p className="text-xs text-[#65676b] uppercase tracking-wider mb-1">Bio</p>
                        <p className="text-sm text-[#050505]">{pet.bio}</p>
                      </div>
                    )}
                    {isOwner && (
                      <Button
                        data-testid="generate-bio-btn"
                        variant="outline"
                        onClick={handleGenerateBio}
                        disabled={generatingBio}
                        className="border-gray-300 text-sm gap-1.5 h-8"
                      >
                        {generatingBio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#f7b731]" />}
                        {pet.bio ? 'Regenerate AI Bio' : 'Generate AI Bio'}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-3 mt-3">
                    {pet.species && (
                      <div><p className="text-[#65676b] text-xs uppercase tracking-wider">Species</p><p className="font-medium text-[#050505]">{pet.species}</p></div>
                    )}
                    {pet.breed && (
                      <div><p className="text-[#65676b] text-xs uppercase tracking-wider">Breed</p><p className="font-medium text-[#050505]">{pet.breed}</p></div>
                    )}
                    {pet.age && (
                      <div><p className="text-[#65676b] text-xs uppercase tracking-wider">Age</p><p className="font-medium text-[#050505]">{pet.age}</p></div>
                    )}
                    {pet.weight && (
                      <div><p className="text-[#65676b] text-xs uppercase tracking-wider">Weight</p><p className="font-medium text-[#050505]">{pet.weight}</p></div>
                    )}
                  </div>
                  {pet.personality_traits?.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs text-[#65676b] uppercase tracking-wider mb-2">Personality</p>
                      <div className="flex flex-wrap gap-1.5">
                        {pet.personality_traits.map((t, i) => (
                          <Badge key={i} className="bg-blue-50 text-[#3b5998] border-blue-200 text-xs">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {pet.favorite_activities?.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs text-[#65676b] uppercase tracking-wider mb-2">Favorite Activities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {pet.favorite_activities.map((a, i) => (
                          <Badge key={i} className="bg-green-50 text-green-700 border-green-200 text-xs">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {pet.medical_info && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs text-[#65676b] uppercase tracking-wider mb-1">Medical Info</p>
                      <p className="text-sm text-[#050505]">{pet.medical_info}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Owner Info */}
              {owner && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm" data-testid="owner-info">
                  <div className="border-b border-gray-100 p-3 bg-gray-50/50 rounded-t-lg">
                    <h3 className="text-sm font-semibold text-[#1c1e21]">Owner / Breeder</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {owner.picture ? (
                        <img src={owner.picture} alt={owner.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#4080ff]/10 flex items-center justify-center border border-gray-200">
                          <span className="text-lg font-bold text-[#4080ff]">{owner.name?.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-[#050505]">{owner.name}</p>
                        {owner.kennel_club && (
                          <div className="flex items-center gap-1 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 mt-0.5">
                            <Shield className="w-3 h-3" />
                            {owner.kennel_club} {owner.kennel_registration && `#${owner.kennel_registration}`}
                          </div>
                        )}
                      </div>
                    </div>
                    {owner.owner_bio && (
                      <div>
                        <p className="text-xs text-[#65676b] uppercase tracking-wider mb-1">About</p>
                        <p className="text-sm text-[#050505]">{owner.owner_bio}</p>
                      </div>
                    )}
                    {owner.owner_hobbies && (
                      <div>
                        <p className="text-xs text-[#65676b] uppercase tracking-wider mb-1">Hobbies</p>
                        <p className="text-sm text-[#050505]">{owner.owner_hobbies}</p>
                      </div>
                    )}
                    {owner.owner_interests && (
                      <div>
                        <p className="text-xs text-[#65676b] uppercase tracking-wider mb-1">Interests</p>
                        <p className="text-sm text-[#050505]">{owner.owner_interests}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts">
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
                  <p className="text-sm text-[#65676b]">No posts yet</p>
                </div>
              ) : (
                posts.map(post => <PostCard key={post.post_id} post={post} />)
              )}
            </div>
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="border-b border-gray-100 p-3 bg-gray-50/50 rounded-t-lg">
                <h3 className="text-sm font-semibold text-[#1c1e21]">Friends ({friends.length})</h3>
              </div>
              {friends.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-[#65676b]">No friends yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                  {friends.map(friend => (
                    <Link key={friend.pet_id} to={`/profile/${friend.pet_id}`} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors" data-testid={`friend-${friend.pet_id}`}>
                      <div className="w-10 h-10 rounded-md bg-[#4080ff]/10 flex items-center justify-center border border-gray-200 flex-shrink-0">
                        <PawPrint className="w-5 h-5 text-[#4080ff]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#050505] truncate">{friend.name}</p>
                        <p className="text-xs text-[#65676b] truncate">{friend.breed}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()} data-testid="report-modal">
            <h3 className="font-semibold text-lg mb-4">Report {owner?.name || 'User'}</h3>
            <div className="space-y-2 mb-4">
              {['Spam or fake account', 'Harassment or bullying', 'Inappropriate content', 'Scam or fraud', 'Other'].map(reason => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    reportReason === reason ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                  data-testid={`report-reason-${reason.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowReportModal(false)} className="flex-1 rounded-xl">Cancel</Button>
              <Button onClick={handleReport} className="flex-1 rounded-xl bg-red-500 text-white hover:bg-red-600" data-testid="submit-report-btn">Submit Report</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StorageImage({ path, alt, className }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('pawbook_token');
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/files/${path}?auth=${token}`);
        if (res.ok) {
          const blob = await res.blob();
          setUrl(URL.createObjectURL(blob));
        }
      } catch (e) { console.error(e); }
    };
    if (path) load();
  }, [path]);

  if (!url) return <PawPrint className="w-12 h-12 text-[#4080ff]" />;
  return <img src={url} alt={alt} className={className} />;
}
