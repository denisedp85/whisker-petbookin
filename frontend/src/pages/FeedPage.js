import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import { Button } from '../components/ui/button';
import { PawPrint, Users, UserPlus, Camera, Heart, Shield } from 'lucide-react';
import axios from 'axios';

export default function FeedPage() {
  const { user, pets, activePet, authHeaders, API } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pendingRequests, setPendingRequests] = useState([]);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/posts/feed?page=${page}`, { headers: authHeaders() });
      if (page === 1) {
        setPosts(res.data);
      } else {
        setPosts(prev => [...prev, ...res.data]);
      }
    } catch (e) {
      console.error('Feed fetch failed', e);
    }
    setLoading(false);
  }, [page, API, authHeaders]);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/friends/requests/pending`, { headers: authHeaders() });
      setPendingRequests(res.data);
    } catch (e) {
      console.error('Failed to fetch pending requests', e);
    }
  }, [API, authHeaders]);

  useEffect(() => {
    fetchFeed();
    fetchPendingRequests();
  }, [fetchFeed, fetchPendingRequests]);

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p.post_id !== postId));
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="hidden md:block md:col-span-3 space-y-4">
            {/* My Profile Card */}
            {activePet && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm" data-testid="sidebar-profile">
                <div className="p-4">
                  <Link to={`/profile/${activePet.pet_id}`} className="flex items-center gap-3 hover:opacity-90">
                    <div className="w-12 h-12 rounded-md bg-[#4080ff]/10 flex items-center justify-center border border-gray-200">
                      <PawPrint className="w-6 h-6 text-[#4080ff]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#050505]">{activePet.name}</p>
                      <p className="text-xs text-[#65676b]">{activePet.breed || activePet.species}</p>
                    </div>
                  </Link>
                  <div className="grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-3 mt-3">
                    <div>
                      <p className="text-[#65676b] text-xs uppercase tracking-wider">Friends</p>
                      <p className="font-medium text-[#050505]">{activePet.friends_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-[#65676b] text-xs uppercase tracking-wider">Posts</p>
                      <p className="font-medium text-[#050505]">{activePet.posts_count || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="border-b border-gray-100 p-3 bg-gray-50/50 rounded-t-lg">
                <h3 className="text-xs font-semibold text-[#65676b] uppercase tracking-wider">Quick Links</h3>
              </div>
              <div className="p-2">
                <Link to="/feed" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 text-sm text-[#050505]" data-testid="sidebar-feed-link">
                  <Heart className="w-4 h-4 text-[#4080ff]" /> News Feed
                </Link>
                <Link to="/friends" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 text-sm text-[#050505]" data-testid="sidebar-friends-link">
                  <Users className="w-4 h-4 text-[#4080ff]" /> Friends
                </Link>
                <Link to="/search" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 text-sm text-[#050505]" data-testid="sidebar-search-link">
                  <Camera className="w-4 h-4 text-[#4080ff]" /> Explore Pets
                </Link>
              </div>
            </div>

            {/* Owner info */}
            {user && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="border-b border-gray-100 p-3 bg-gray-50/50 rounded-t-lg">
                  <h3 className="text-xs font-semibold text-[#65676b] uppercase tracking-wider">Owner / Breeder</h3>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium text-[#050505]">{user.name}</p>
                  {user.owner_bio && <p className="text-xs text-[#65676b]">{user.owner_bio}</p>}
                  {user.kennel_club && (
                    <div className="flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-md px-2 py-1 text-xs">
                      <Shield className="w-3 h-3" />
                      {user.kennel_club} {user.kennel_registration && `- ${user.kennel_registration}`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Feed */}
          <div className="col-span-1 md:col-span-6 space-y-4" data-testid="main-feed">
            {/* Setup prompt for new users */}
            {pets.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
                <PawPrint className="w-12 h-12 text-[#4080ff] mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-[#050505] font-['Archivo_Narrow']">Welcome to Petbookin!</h2>
                <p className="text-sm text-[#65676b] mt-1 mb-4">Create your first pet profile to start posting and connecting.</p>
                <Link to="/settings">
                  <Button className="bg-[#4080ff] hover:bg-[#3b5998] text-white" data-testid="create-first-pet-btn">
                    <PawPrint className="w-4 h-4 mr-2" /> Create Pet Profile
                  </Button>
                </Link>
              </div>
            )}

            {pets.length > 0 && <CreatePost onPostCreated={handlePostCreated} />}

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-[#4080ff] border-t-transparent rounded-full" />
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
                <Camera className="w-10 h-10 text-[#bcc0c4] mx-auto mb-3" />
                <h3 className="text-base font-semibold text-[#050505]">No posts yet</h3>
                <p className="text-sm text-[#65676b] mt-1">Start by creating a post or finding friends!</p>
              </div>
            ) : (
              posts.map(post => (
                <PostCard key={post.post_id} post={post} onDelete={handlePostDeleted} />
              ))
            )}

            {posts.length >= 20 && (
              <div className="text-center py-4">
                <Button
                  data-testid="load-more-btn"
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  className="border-gray-300 text-[#65676b]"
                >
                  Load More
                </Button>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block lg:col-span-3 space-y-4">
            {/* Friend Requests */}
            {pendingRequests.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm" data-testid="pending-requests">
                <div className="border-b border-gray-100 p-3 bg-gray-50/50 rounded-t-lg">
                  <h3 className="text-xs font-semibold text-[#65676b] uppercase tracking-wider">
                    Friend Requests ({pendingRequests.length})
                  </h3>
                </div>
                <div className="p-2 space-y-2">
                  {pendingRequests.slice(0, 5).map(req => (
                    <FriendRequestCard key={req.friendship_id} request={req} onResponded={fetchPendingRequests} />
                  ))}
                </div>
              </div>
            )}

            {/* Suggested - My Other Pets */}
            {pets.length > 1 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="border-b border-gray-100 p-3 bg-gray-50/50 rounded-t-lg">
                  <h3 className="text-xs font-semibold text-[#65676b] uppercase tracking-wider">My Pets</h3>
                </div>
                <div className="p-2">
                  {pets.map(pet => (
                    <Link key={pet.pet_id} to={`/profile/${pet.pet_id}`} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50">
                      <div className="w-8 h-8 rounded-md bg-[#4080ff]/10 flex items-center justify-center border border-gray-200">
                        <PawPrint className="w-4 h-4 text-[#4080ff]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#050505]">{pet.name}</p>
                        <p className="text-xs text-[#65676b]">{pet.breed}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-xs text-[#bcc0c4] px-2 space-y-1">
              <p>Petbookin &middot; The Pet Social Network</p>
              <p>Connect your pets with the world</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FriendRequestCard({ request, onResponded }) {
  const { authHeaders, API } = useAuth();
  const [responding, setResponding] = useState(false);

  const respond = async (action) => {
    setResponding(true);
    try {
      await axios.post(`${API}/friends/respond`, {
        friendship_id: request.friendship_id,
        action
      }, { headers: authHeaders() });
      if (onResponded) onResponded();
    } catch (e) {
      console.error('Respond failed', e);
    }
    setResponding(false);
  };

  const pet = request.requester_pet;
  return (
    <div className="flex items-center gap-2 p-2 rounded-md" data-testid={`friend-request-${request.friendship_id}`}>
      <Link to={`/profile/${pet?.pet_id}`}>
        <div className="w-10 h-10 rounded-md bg-[#4080ff]/10 flex items-center justify-center border border-gray-200">
          <PawPrint className="w-5 h-5 text-[#4080ff]" />
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#050505] truncate">{pet?.name}</p>
        <p className="text-xs text-[#65676b]">{pet?.breed}</p>
        <div className="flex gap-1 mt-1">
          <Button
            data-testid={`accept-request-${request.friendship_id}`}
            onClick={() => respond('accept')}
            disabled={responding}
            className="h-6 px-2 text-xs bg-[#4080ff] hover:bg-[#3b5998] text-white"
          >
            Confirm
          </Button>
          <Button
            data-testid={`reject-request-${request.friendship_id}`}
            onClick={() => respond('reject')}
            disabled={responding}
            variant="outline"
            className="h-6 px-2 text-xs border-gray-300"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
