import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Heart, MessageCircle, Trash2, PawPrint, Flag } from 'lucide-react';
import axios from 'axios';
import CommentSection from './CommentSection';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PostCard({ post, onDelete, onLikeToggle }) {
  const { user, authHeaders, API } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [liked, setLiked] = useState(post.user_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image from storage
  React.useEffect(() => {
    if (post.image_path) {
      const loadImage = async () => {
        try {
          const token = localStorage.getItem('pawbook_token');
          const res = await fetch(`${BACKEND_URL}/api/files/${post.image_path}?auth=${token}`);
          if (res.ok) {
            const blob = await res.blob();
            setImageUrl(URL.createObjectURL(blob));
          }
        } catch (e) {
          console.error('Failed to load image', e);
        }
      };
      loadImage();
    }
  }, [post.image_path]);

  const handleLike = async () => {
    try {
      const res = await axios.post(`${API}/likes/${post.post_id}`, {}, { headers: authHeaders() });
      setLiked(res.data.liked);
      setLikesCount(prev => res.data.liked ? prev + 1 : prev - 1);
      if (onLikeToggle) onLikeToggle(post.post_id, res.data.liked);
    } catch (e) {
      console.error('Like failed', e);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/posts/${post.post_id}`, { headers: authHeaders() });
      if (onDelete) onDelete(post.post_id);
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const pet = post.pet;
  const timeAgo = post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : '';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm" data-testid={`post-card-${post.post_id}`}>
      {/* Post header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2.5">
          <Link to={`/profile/${pet?.pet_id}`} data-testid={`post-pet-link-${post.post_id}`}>
            <div className="w-10 h-10 rounded-md bg-[#4080ff]/10 flex items-center justify-center border border-gray-200">
              {pet?.profile_photo ? (
                <PetAvatar storagePath={pet.profile_photo} name={pet.name} />
              ) : (
                <PawPrint className="w-5 h-5 text-[#4080ff]" />
              )}
            </div>
          </Link>
          <div>
            <Link to={`/profile/${pet?.pet_id}`} className="text-sm font-semibold text-[#050505] hover:underline">
              {pet?.name || 'Unknown Pet'}
            </Link>
            <p className="text-xs text-[#65676b]">
              {pet?.breed && <span>{pet.breed} &middot; </span>}
              {timeAgo}
            </p>
          </div>
        </div>
        {post.owner_id === user?.user_id && (
          <Button
            data-testid={`delete-post-${post.post_id}`}
            variant="ghost"
            onClick={handleDelete}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Post content */}
      <div className="px-3 pb-2">
        <p className="text-sm text-[#050505] leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Post image */}
      {post.image_path && (
        <div className="border-t border-b border-gray-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Post"
              className="w-full max-h-[500px] object-cover"
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
              <div className="animate-pulse text-sm text-[#65676b]">Loading image...</div>
            </div>
          )}
        </div>
      )}

      {/* Counts */}
      {(likesCount > 0 || commentsCount > 0) && (
        <div className="flex items-center justify-between px-3 py-1.5 text-xs text-[#65676b]">
          {likesCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-[#4080ff] flex items-center justify-center">
                <Heart className="w-2.5 h-2.5 text-white fill-white" />
              </span>
              {likesCount}
            </span>
          )}
          {commentsCount > 0 && (
            <button onClick={() => setShowComments(!showComments)} className="hover:underline">
              {commentsCount} comment{commentsCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex border-t border-gray-200 mx-3">
        <Button
          data-testid={`like-btn-${post.post_id}`}
          variant="ghost"
          onClick={handleLike}
          className={`flex-1 h-9 gap-1.5 text-sm font-medium rounded-none ${liked ? 'text-[#4080ff]' : 'text-[#65676b]'} hover:bg-gray-50`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-[#4080ff] text-[#4080ff]' : ''}`} />
          Like
        </Button>
        <Button
          data-testid={`comment-btn-${post.post_id}`}
          variant="ghost"
          onClick={() => setShowComments(!showComments)}
          className="flex-1 h-9 gap-1.5 text-sm font-medium text-[#65676b] hover:bg-gray-50 rounded-none"
        >
          <MessageCircle className="w-4 h-4" /> Comment
        </Button>
        {post.owner_id !== user?.user_id && (
          <Button
            data-testid={`report-btn-${post.post_id}`}
            variant="ghost"
            onClick={() => setShowReportModal(true)}
            className="h-9 gap-1.5 text-sm font-medium text-[#65676b] hover:bg-gray-50 rounded-none px-3"
          >
            <Flag className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          postId={post.post_id}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Comments */}
      {showComments && (
        <CommentSection
          postId={post.post_id}
          onCommentAdded={() => setCommentsCount(prev => prev + 1)}
        />
      )}
    </div>
  );
}

function PetAvatar({ storagePath, name }) {
  const [url, setUrl] = useState(null);
  React.useEffect(() => {
    const loadAvatar = async () => {
      try {
        const token = localStorage.getItem('pawbook_token');
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/files/${storagePath}?auth=${token}`);
        if (res.ok) {
          const blob = await res.blob();
          setUrl(URL.createObjectURL(blob));
        }
      } catch {}
    };
    if (storagePath) loadAvatar();
  }, [storagePath]);

  if (url) return <img src={url} alt={name} className="w-10 h-10 rounded-md object-cover" />;
  return <PawPrint className="w-5 h-5 text-[#4080ff]" />;
}

function ReportModal({ postId, onClose }) {
  const { authHeaders, API } = useAuth();
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { value: 'spam', label: 'Spam', desc: 'Misleading or repetitive content' },
    { value: 'inappropriate', label: 'Inappropriate Content', desc: 'Nudity, violence, or offensive material' },
    { value: 'harassment', label: 'Harassment or Bullying', desc: 'Targeting a person or pet' },
    { value: 'misinformation', label: 'Misinformation', desc: 'False or misleading information' },
    { value: 'animal_abuse', label: 'Animal Abuse', desc: 'Content depicting animal harm or cruelty' },
    { value: 'other', label: 'Other', desc: 'Something else not listed here' },
  ];

  const handleSubmit = async () => {
    if (!category) { toast.error('Please select a reason'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/reports`, {
        target_type: 'post',
        target_id: postId,
        reason: categories.find(c => c.value === category)?.label || category,
        category,
        details
      }, { headers: authHeaders() });
      toast.success('Report submitted. Our team will review it.');
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Report failed');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid="report-modal"
      >
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Flag className="w-4 h-4 text-orange-500" /> Report Post
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">Why are you reporting this post?</p>
          <div className="space-y-2">
            {categories.map(c => (
              <label
                key={c.value}
                data-testid={`report-category-${c.value}`}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  category === c.value
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="report-category"
                  value={c.value}
                  checked={category === c.value}
                  onChange={() => setCategory(c.value)}
                  className="mt-0.5 accent-orange-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.label}</p>
                  <p className="text-xs text-gray-500">{c.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Additional details (optional)</label>
            <textarea
              data-testid="report-details"
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Tell us more about why you're reporting..."
              className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:border-orange-400 focus:ring-orange-300/20 focus:outline-none min-h-[60px] resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} className="border-gray-200 text-sm h-9" data-testid="report-cancel-btn">
              Cancel
            </Button>
            <Button
              data-testid="report-submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !category}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm h-9"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
