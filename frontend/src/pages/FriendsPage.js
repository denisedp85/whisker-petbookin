import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PawPrint, Users, UserPlus, Check, Clock } from 'lucide-react';
import axios from 'axios';

export default function FriendsPage() {
  const { activePet, authHeaders, API } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!activePet) return;
    try {
      const [friendsRes, pendingRes] = await Promise.all([
        axios.get(`${API}/friends/${activePet.pet_id}`),
        axios.get(`${API}/friends/requests/pending`, { headers: authHeaders() })
      ]);
      setFriends(friendsRes.data);
      setPending(pendingRes.data);
    } catch (e) {
      console.error('Failed to fetch friends', e);
    }
    setLoading(false);
  }, [activePet, API, authHeaders]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleRespond = async (friendshipId, action) => {
    try {
      await axios.post(`${API}/friends/respond`, { friendship_id: friendshipId, action }, { headers: authHeaders() });
      fetchFriends();
    } catch (e) {
      console.error('Respond failed', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[#050505] font-['Archivo_Narrow'] mb-4">Friends</h1>

        <Tabs defaultValue="all" className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <TabsList className="w-full justify-start border-b border-gray-200 rounded-none bg-transparent h-auto p-0">
              <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4080ff] data-[state=active]:bg-transparent data-[state=active]:text-[#4080ff] px-4 py-3 text-sm" data-testid="friends-tab-all">
                All Friends ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4080ff] data-[state=active]:bg-transparent data-[state=active]:text-[#4080ff] px-4 py-3 text-sm" data-testid="friends-tab-requests">
                Requests ({pending.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-[#4080ff] border-t-transparent rounded-full" />
                </div>
              ) : friends.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-[#bcc0c4] mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-[#050505]">No friends yet</h3>
                  <p className="text-sm text-[#65676b] mt-1 mb-3">Search for other pets to send friend requests!</p>
                  <Link to="/search">
                    <Button className="bg-[#4080ff] hover:bg-[#3b5998] text-white gap-1.5" data-testid="find-friends-btn">
                      <UserPlus className="w-4 h-4" /> Find Friends
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                  {friends.map(friend => (
                    <Link key={friend.pet_id} to={`/profile/${friend.pet_id}`} data-testid={`friend-card-${friend.pet_id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-md bg-[#4080ff]/10 flex items-center justify-center border border-gray-200 flex-shrink-0">
                        <PawPrint className="w-7 h-7 text-[#4080ff]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#050505] truncate">{friend.name}</p>
                        <p className="text-xs text-[#65676b]">{friend.breed || friend.species}</p>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-green-600">
                          <Check className="w-3 h-3" /> Friends
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {pending.length === 0 ? (
                <div className="p-8 text-center">
                  <Clock className="w-12 h-12 text-[#bcc0c4] mx-auto mb-3" />
                  <p className="text-sm text-[#65676b]">No pending friend requests</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pending.map(req => (
                    <div key={req.friendship_id} className="flex items-center gap-3 p-4" data-testid={`pending-${req.friendship_id}`}>
                      <Link to={`/profile/${req.requester_pet?.pet_id}`}>
                        <div className="w-14 h-14 rounded-md bg-[#4080ff]/10 flex items-center justify-center border border-gray-200 flex-shrink-0">
                          <PawPrint className="w-7 h-7 text-[#4080ff]" />
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/profile/${req.requester_pet?.pet_id}`}>
                          <p className="text-sm font-semibold text-[#050505] hover:underline">{req.requester_pet?.name}</p>
                        </Link>
                        <p className="text-xs text-[#65676b]">{req.requester_pet?.breed || req.requester_pet?.species}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button data-testid={`accept-${req.friendship_id}`} onClick={() => handleRespond(req.friendship_id, 'accept')}
                          className="bg-[#4080ff] hover:bg-[#3b5998] text-white h-8 px-3 text-sm">Confirm</Button>
                        <Button data-testid={`reject-${req.friendship_id}`} onClick={() => handleRespond(req.friendship_id, 'reject')}
                          variant="outline" className="border-gray-300 h-8 px-3 text-sm">Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
