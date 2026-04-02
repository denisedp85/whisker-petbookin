import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import EmojiPicker from '../components/EmojiPicker';
import {
  Video, VideoOff, Mic, MicOff, Radio, Eye, Heart, MessageCircle,
  Send, X, Clock, Crown, Zap, Play, Users, Loader2, Lock,
  ShoppingBag, Star, StopCircle, Settings
} from 'lucide-react';
import { toast } from 'sonner';

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function LivePage() {
  const { user, API, authHeaders } = useAuth();
  const [tab, setTab] = useState('browse');
  const [eligibility, setEligibility] = useState(null);
  const [activeStreams, setActiveStreams] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Broadcast state
  const [broadcasting, setBroadcasting] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamCategory, setStreamCategory] = useState('feed');
  const [startingStream, setStartingStream] = useState(false);

  // Viewer state
  const [watchingStream, setWatchingStream] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [eligRes, activeRes, recRes] = await Promise.all([
        fetch(`${API}/live/eligibility`, { headers: authHeaders() }),
        fetch(`${API}/live/active`, { headers: authHeaders() }),
        fetch(`${API}/live/recordings?limit=12`, { headers: authHeaders() }),
      ]);
      setEligibility(await eligRes.json());
      setActiveStreams((await activeRes.json()).streams || []);
      setRecordings((await recRes.json()).recordings || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [API, authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh active streams periodically
  useEffect(() => {
    if (tab !== 'browse' || broadcasting) return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`${API}/live/active`, { headers: authHeaders() });
        setActiveStreams((await res.json()).streams || []);
      } catch {}
    }, 8000);
    return () => clearInterval(iv);
  }, [tab, broadcasting, API, authHeaders]);

  const handleStartStream = async () => {
    if (!streamTitle.trim()) { toast.error('Enter a title for your stream'); return; }
    setStartingStream(true);
    try {
      const res = await fetch(`${API}/live/start`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: streamTitle, category: streamCategory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start stream');
      setStreamData(data);
      setBroadcasting(true);
      setTab('broadcasting');
      toast.success('You are now LIVE!');
    } catch (err) { toast.error(err.message); }
    setStartingStream(false);
  };

  const handlePurchasePoints = async (minutes) => {
    try {
      const res = await fetch(`${API}/live/purchase-time-points`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      toast.success(data.message);
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  const handlePurchaseCard = async (packId) => {
    try {
      const res = await fetch(`${API}/stripe/purchase-pack`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId, origin_url: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      if (data.url) window.location.href = data.url;
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return (
    <AppLayout>
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="live-page">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Outfit' }}>
                Petbookin <span className="text-red-500">Live</span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">Go live, watch streams, and connect in real-time</p>
          </div>

          {eligibility?.eligible && !broadcasting && (
            <Button
              onClick={() => setTab('setup')}
              className="rounded-full bg-red-500 hover:bg-red-600 text-white gap-2"
              data-testid="go-live-btn"
            >
              <Radio className="w-4 h-4" /> Go Live
            </Button>
          )}
        </div>

        {/* Tabs */}
        {!broadcasting && !watchingStream && (
          <div className="flex gap-1.5 border-b border-border pb-2">
            {['browse', 'recordings', 'my-streams'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`live-tab-${t}`}
              >
                {t === 'browse' ? 'Live Now' : t === 'recordings' ? 'Recordings' : 'My Streams'}
              </button>
            ))}
          </div>
        )}

        {/* Eligibility banner for non-eligible */}
        {!eligibility?.eligible && tab === 'browse' && (
          <EligibilityBanner eligibility={eligibility} onPurchasePoints={handlePurchasePoints} onPurchaseCard={handlePurchaseCard} />
        )}

        {/* Setup new stream */}
        {tab === 'setup' && !broadcasting && (
          <StreamSetup
            title={streamTitle}
            setTitle={setStreamTitle}
            category={streamCategory}
            setCategory={setStreamCategory}
            eligibility={eligibility}
            starting={startingStream}
            onStart={handleStartStream}
            onCancel={() => setTab('browse')}
          />
        )}

        {/* Broadcasting */}
        {broadcasting && streamData && (
          <BroadcasterView
            stream={streamData}
            user={user}
            API={API}
            authHeaders={authHeaders}
            onEnd={() => {
              setBroadcasting(false);
              setStreamData(null);
              setTab('browse');
              fetchData();
            }}
          />
        )}

        {/* Watching a stream */}
        {watchingStream && (
          <ViewerView
            stream={watchingStream}
            user={user}
            API={API}
            authHeaders={authHeaders}
            onClose={() => { setWatchingStream(null); fetchData(); }}
          />
        )}

        {/* Browse live streams */}
        {tab === 'browse' && !broadcasting && !watchingStream && (
          <div className="space-y-4">
            {activeStreams.length === 0 ? (
              <div className="text-center py-16" data-testid="no-live-streams">
                <Radio className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-lg font-medium">No one is live right now</p>
                <p className="text-sm text-muted-foreground mt-1">Be the first to go live!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeStreams.map((s) => (
                  <StreamCard key={s.stream_id} stream={s} onWatch={() => setWatchingStream(s)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recordings */}
        {tab === 'recordings' && !broadcasting && !watchingStream && (
          <div className="space-y-4">
            {recordings.length === 0 ? (
              <div className="text-center py-16" data-testid="no-recordings">
                <Play className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-lg font-medium">No recordings yet</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recordings.map((r) => (
                  <RecordingCard key={r.stream_id} recording={r} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* My streams */}
        {tab === 'my-streams' && !broadcasting && !watchingStream && (
          <MyStreams API={API} authHeaders={authHeaders} />
        )}
      </div>
    </AppLayout>
  );
}


// ─── Eligibility Banner ───
function EligibilityBanner({ eligibility, onPurchasePoints, onPurchaseCard }) {
  if (!eligibility) return null;
  const e = eligibility;
  return (
    <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 p-6 space-y-4" data-testid="eligibility-banner">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <Lock className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold">Unlock Live Streaming</p>
          <p className="text-xs text-muted-foreground">
            Earn {e.likes_threshold} likes & {e.points_threshold} points, or subscribe to any plan
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-white/60 p-3">
          <p className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>{e.total_likes}<span className="text-sm text-muted-foreground">/{e.likes_threshold}</span></p>
          <p className="text-xs text-muted-foreground">Likes Received</p>
        </div>
        <div className="rounded-xl bg-white/60 p-3">
          <p className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>{e.points}<span className="text-sm text-muted-foreground">/{e.points_threshold}</span></p>
          <p className="text-xs text-muted-foreground">Points</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="rounded-full text-xs" onClick={() => window.location.href = '/membership'} data-testid="live-upgrade-btn">
          <Crown className="w-3.5 h-3.5 mr-1" /> Subscribe to Unlock
        </Button>
      </div>
    </div>
  );
}


// ─── Stream Setup ───
function StreamSetup({ title, setTitle, category, setCategory, eligibility, starting, onStart, onCancel }) {
  return (
    <div className="max-w-lg mx-auto space-y-6" data-testid="stream-setup">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Radio className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit' }}>Set Up Your Stream</h2>
        <p className="text-sm text-muted-foreground mt-1">
          You have <span className="font-bold text-primary">{eligibility?.total_minutes || 0} minutes</span> of streaming time
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Stream Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's your stream about?"
            className="rounded-xl"
            data-testid="stream-title-input"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Category</label>
          <div className="flex gap-2">
            {[
              { id: 'feed', label: 'General Feed', icon: Video },
              { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                  category === c.id ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
                data-testid={`category-${c.id}`}
              >
                <c.icon className="w-4 h-4" /> {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 rounded-full"
        >
          Cancel
        </Button>
        <Button
          onClick={onStart}
          disabled={starting || !title.trim()}
          className="flex-1 rounded-full bg-red-500 hover:bg-red-600 text-white gap-2"
          data-testid="start-stream-btn"
        >
          {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
          Go Live
        </Button>
      </div>
    </div>
  );
}


// ─── Broadcaster View ───
function BroadcasterView({ stream, user, API, authHeaders, onEnd }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const wsRef = useRef(null);
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(stream.max_duration_mins * 60);
  const [ending, setEnding] = useState(false);
  const chatEndRef = useRef(null);
  const token = localStorage.getItem('petbookin_session') || '';

  // Start camera and WebSocket
  useEffect(() => {
    let localStream;
    const init = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = localStream;
        if (videoRef.current) videoRef.current.srcObject = localStream;

        // Start recording
        const mr = new MediaRecorder(localStream, { mimeType: 'video/webm;codecs=vp9,opus' });
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.current.push(e.data); };
        mr.start(1000);
      } catch (err) {
        console.error('Camera error:', err);
        toast.error('Camera access denied. Please allow camera access.');
      }

      // WebSocket
      const wsUrl = API.replace('https://', 'wss://').replace('http://', 'ws://');
      const ws = new WebSocket(`${wsUrl}/ws/live/${stream.stream_id}?token=${token}&role=broadcaster`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'viewer_joined') {
          setViewerCount(msg.viewer_count || 0);
          setChatMessages(prev => [...prev, { sender_name: 'System', message: `${msg.viewer_name} joined the stream`, system: true }]);
        } else if (msg.type === 'viewer_left') {
          setViewerCount(msg.viewer_count || 0);
          // Clean up peer connection
          if (peerConnections.current[msg.viewer_id]) {
            peerConnections.current[msg.viewer_id].close();
            delete peerConnections.current[msg.viewer_id];
          }
        } else if (msg.type === 'create_offer' && localStreamRef.current) {
          createOffer(msg.target, ws);
        } else if (msg.type === 'answer') {
          handleAnswer(msg);
        } else if (msg.type === 'ice_candidate') {
          handleIceCandidate(msg);
        } else if (msg.type === 'chat') {
          setChatMessages(prev => [...prev, msg]);
        }
      };

      ws.onerror = (err) => console.error('WS error:', err);
    };

    init();

    return () => {
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (wsRef.current) wsRef.current.close();
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [API, stream.stream_id, token]);

  // Timer
  useEffect(() => {
    const iv = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleEndStream(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const createOffer = async (viewerId, ws) => {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    peerConnections.current[viewerId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'ice_candidate', target: viewerId, candidate: e.candidate }));
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'offer', target: viewerId, sdp: offer }));
  };

  const handleAnswer = async (msg) => {
    const pc = peerConnections.current[msg.sender];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    }
  };

  const handleIceCandidate = async (msg) => {
    const pc = peerConnections.current[msg.sender];
    if (pc && msg.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setCameraOn(prev => !prev);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setMicOn(prev => !prev);
    }
  };

  const handleEndStream = async () => {
    if (ending) return;
    setEnding(true);

    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());

    // Upload recording
    let recordingUrl = null;
    if (recordedChunks.current.length > 0) {
      try {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        const formData = new FormData();
        formData.append('file', blob, `stream_${stream.stream_id}.webm`);
        const uploadRes = await fetch(`${API}/uploads/upload`, {
          method: 'POST',
          headers: { ...authHeaders() },
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          recordingUrl = uploadData.url || uploadData.file_url;
        }
      } catch (e) {
        console.error('Upload error:', e);
      }
    }

    // End stream
    try {
      await fetch(`${API}/live/end/${stream.stream_id}`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ recording_url: recordingUrl }),
      });
    } catch (e) { console.error(e); }

    if (wsRef.current) wsRef.current.close();
    Object.values(peerConnections.current).forEach(pc => pc.close());
    toast.success('Stream ended' + (recordingUrl ? ' — Recording saved!' : ''));
    onEnd();
  };

  const sendChat = () => {
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ type: 'chat', message: chatInput }));
    setChatInput('');
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isLow = timeLeft < 300;

  return (
    <div className="space-y-4" data-testid="broadcaster-view">
      {/* Live header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Badge className="bg-red-500 text-white animate-pulse gap-1.5">
            <div className="w-2 h-2 bg-white rounded-full" /> LIVE
          </Badge>
          <span className="font-bold text-sm" style={{ fontFamily: 'Outfit' }}>{stream.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <Eye className="w-3 h-3" /> {viewerCount}
          </Badge>
          <Badge variant="outline" className={`gap-1 ${isLow ? 'text-red-500 border-red-300' : ''}`}>
            <Clock className="w-3 h-3" /> {mins}:{secs.toString().padStart(2, '0')}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Video */}
        <div className="lg:col-span-2">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" data-testid="broadcaster-video" />
            {/* Controls overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <button
                onClick={toggleCamera}
                className={`p-3 rounded-full ${cameraOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500'} text-white transition-all`}
                data-testid="toggle-camera-btn"
              >
                {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleMic}
                className={`p-3 rounded-full ${micOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500'} text-white transition-all`}
                data-testid="toggle-mic-btn"
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                onClick={handleEndStream}
                disabled={ending}
                className="px-6 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium text-sm flex items-center gap-2 transition-all"
                data-testid="end-stream-btn"
              >
                {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-5 h-5" />}
                End Stream
              </button>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="rounded-2xl border border-border bg-card flex flex-col h-[400px] lg:h-auto">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Live Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {chatMessages.map((m, i) => (
              <div key={i} className={`text-xs ${m.system ? 'text-muted-foreground italic text-center' : ''}`}>
                {!m.system && <span className="font-semibold text-primary mr-1">{m.sender_name}:</span>}
                {m.message}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border">
            <EmojiPicker onSelect={(emoji) => setChatInput(prev => prev + emoji)} compact />
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Chat..."
              className="flex-1 text-xs bg-muted rounded-full px-3 py-2 outline-none"
              data-testid="broadcast-chat-input"
            />
            <button onClick={sendChat} className="p-2 text-primary hover:bg-primary/10 rounded-full">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Viewer View ───
function ViewerView({ stream, user, API, authHeaders, onClose }) {
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [viewerCount, setViewerCount] = useState(stream.viewer_count || 0);
  const [liked, setLiked] = useState(false);
  const [ended, setEnded] = useState(false);
  const chatEndRef = useRef(null);
  const token = localStorage.getItem('petbookin_session') || '';

  useEffect(() => {
    const wsUrl = API.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/ws/live/${stream.stream_id}?token=${token}&role=viewer`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'request_offers' }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'offer') {
        handleOffer(msg, ws);
      } else if (msg.type === 'ice_candidate') {
        if (pcRef.current && msg.candidate) {
          pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
        }
      } else if (msg.type === 'chat') {
        setChatMessages(prev => [...prev, msg]);
      } else if (msg.type === 'viewer_joined' || msg.type === 'viewer_left') {
        setViewerCount(msg.viewer_count || 0);
        setChatMessages(prev => [...prev, { sender_name: 'System', message: msg.type === 'viewer_joined' ? `${msg.viewer_name} joined` : 'A viewer left', system: true }]);
      } else if (msg.type === 'stream_ended') {
        setEnded(true);
      }
    };

    ws.onerror = (err) => console.error('WS viewer error:', err);

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pcRef.current) pcRef.current.close();
    };
  }, [API, stream.stream_id, token]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleOffer = async (msg, ws) => {
    if (pcRef.current) pcRef.current.close();
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'ice_candidate', target: 'broadcaster', candidate: e.candidate }));
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: 'answer', target: 'broadcaster', sdp: answer }));
  };

  const handleLike = async () => {
    try {
      const res = await fetch(`${API}/live/like/${stream.stream_id}`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await res.json();
      setLiked(data.liked);
    } catch {}
  };

  const sendChat = () => {
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ type: 'chat', message: chatInput }));
    setChatInput('');
  };

  return (
    <div className="space-y-4" data-testid="viewer-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-red-500 text-white animate-pulse gap-1.5">
            <div className="w-2 h-2 bg-white rounded-full" /> LIVE
          </Badge>
          <span className="font-bold text-sm">{stream.title}</span>
          <span className="text-xs text-muted-foreground">by {stream.broadcaster_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1"><Eye className="w-3 h-3" /> {viewerCount}</Badge>
          <Button size="sm" variant="ghost" onClick={onClose} data-testid="close-viewer-btn">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {ended && (
        <div className="p-4 rounded-xl bg-muted text-center" data-testid="stream-ended-msg">
          <p className="font-medium">This stream has ended</p>
          <Button onClick={onClose} className="mt-2 rounded-full" size="sm">Back to Browse</Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" data-testid="viewer-video" />
            <div className="absolute bottom-4 right-4">
              <button
                onClick={handleLike}
                className={`p-3 rounded-full transition-all ${liked ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                data-testid="like-stream-btn"
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="rounded-2xl border border-border bg-card flex flex-col h-[400px] lg:h-auto">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Live Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {chatMessages.map((m, i) => (
              <div key={i} className={`text-xs ${m.system ? 'text-muted-foreground italic text-center' : ''}`}>
                {!m.system && <span className="font-semibold text-primary mr-1">{m.sender_name}:</span>}
                {m.message}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border">
            <EmojiPicker onSelect={(emoji) => setChatInput(prev => prev + emoji)} compact />
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Chat..."
              className="flex-1 text-xs bg-muted rounded-full px-3 py-2 outline-none"
              data-testid="viewer-chat-input"
            />
            <button onClick={sendChat} className="p-2 text-primary hover:bg-primary/10 rounded-full">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Stream Card ───
function StreamCard({ stream, onWatch }) {
  const since = stream.started_at ? Math.floor((Date.now() - new Date(stream.started_at)) / 60000) : 0;
  return (
    <div
      className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={onWatch}
      data-testid={`stream-card-${stream.stream_id}`}
    >
      <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <Radio className="w-12 h-12 text-red-400/30" />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Badge className="bg-red-500 text-white text-[10px] gap-1 animate-pulse">
            <div className="w-1.5 h-1.5 bg-white rounded-full" /> LIVE
          </Badge>
          {stream.category === 'marketplace' && (
            <Badge className="bg-amber-500 text-white text-[10px]">
              <ShoppingBag className="w-2.5 h-2.5 mr-0.5" /> Market
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 right-3">
          <Badge variant="outline" className="bg-black/50 text-white border-white/20 text-[10px] gap-1">
            <Eye className="w-2.5 h-2.5" /> {stream.viewer_count}
          </Badge>
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-12 h-12 text-white" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm truncate" style={{ fontFamily: 'Outfit' }}>{stream.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{stream.broadcaster_name} &middot; {since}m ago</p>
      </div>
    </div>
  );
}


// ─── Recording Card ───
function RecordingCard({ recording }) {
  const duration = recording.started_at && recording.ended_at
    ? Math.floor((new Date(recording.ended_at) - new Date(recording.started_at)) / 60000)
    : 0;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-all" data-testid={`recording-${recording.stream_id}`}>
      <div className="relative aspect-video bg-gray-100">
        {recording.recording_url ? (
          <video src={recording.recording_url} className="w-full h-full object-cover" preload="metadata" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Play className="w-12 h-12 opacity-20" />
          </div>
        )}
        <div className="absolute bottom-3 right-3">
          <Badge variant="outline" className="bg-black/50 text-white border-white/20 text-[10px]">
            {duration}m
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm truncate">{recording.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {recording.broadcaster_name} &middot; {recording.likes_count || 0} likes &middot; {recording.peak_viewers || 0} peak viewers
        </p>
        {recording.recording_url && (
          <a
            href={recording.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
          >
            <Play className="w-3 h-3" /> Watch Recording
          </a>
        )}
      </div>
    </div>
  );
}


// ─── My Streams ───
function MyStreams({ API, authHeaders }) {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API}/live/my-streams`, { headers: authHeaders() });
        setStreams((await res.json()).streams || []);
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, [API, authHeaders]);

  if (loading) return <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>;

  if (streams.length === 0) return (
    <div className="text-center py-16" data-testid="no-my-streams">
      <Video className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
      <p className="text-lg font-medium">You haven't streamed yet</p>
    </div>
  );

  return (
    <div className="space-y-3" data-testid="my-streams-list">
      {streams.map((s) => (
        <div key={s.stream_id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.status === 'live' ? 'bg-red-500/10' : 'bg-muted'}`}>
            {s.status === 'live' ? <Radio className="w-5 h-5 text-red-500" /> : <Play className="w-5 h-5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{s.title}</p>
            <p className="text-xs text-muted-foreground">
              {s.status === 'live' ? 'Currently Live' : new Date(s.started_at).toLocaleDateString()} &middot; {s.peak_viewers || 0} peak viewers &middot; {s.likes_count || 0} likes
            </p>
          </div>
          {s.recording_url && (
            <a href={s.recording_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              Watch
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
