import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PawPrint, Send } from 'lucide-react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

export default function CommentSection({ postId, onCommentAdded }) {
  const { activePet, authHeaders, API } = useAuth();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await axios.get(`${API}/comments/${postId}`);
        setComments(res.data);
      } catch (e) {
        console.error('Failed to load comments', e);
      }
    };
    fetchComments();
  }, [postId, API]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !activePet) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/comments/${postId}`, {
        content: content.trim(),
        pet_id: activePet.pet_id
      }, { headers: authHeaders() });
      setComments(prev => [...prev, res.data]);
      setContent('');
      if (onCommentAdded) onCommentAdded();
    } catch (e) {
      console.error('Comment failed', e);
    }
    setLoading(false);
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50/50" data-testid={`comments-section-${postId}`}>
      {/* Existing comments */}
      <div className="px-3 py-2 space-y-2 max-h-60 overflow-y-auto">
        {comments.map(comment => (
          <div key={comment.comment_id} className="flex gap-2" data-testid={`comment-${comment.comment_id}`}>
            <Link to={`/profile/${comment.pet?.pet_id}`}>
              <div className="w-7 h-7 rounded-md bg-[#4080ff]/10 flex items-center justify-center flex-shrink-0 border border-gray-200">
                <PawPrint className="w-3.5 h-3.5 text-[#4080ff]" />
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-lg px-3 py-1.5 border border-gray-100">
                <Link to={`/profile/${comment.pet?.pet_id}`} className="text-xs font-semibold text-[#050505] hover:underline">
                  {comment.pet?.name || 'Unknown'}
                </Link>
                <p className="text-sm text-[#050505]">{comment.content}</p>
              </div>
              <p className="text-[10px] text-[#65676b] mt-0.5 ml-1">
                {comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Add comment */}
      {activePet && (
        <form onSubmit={handleSubmit} className="flex gap-2 px-3 py-2 border-t border-gray-100">
          <div className="w-7 h-7 rounded-md bg-[#4080ff]/10 flex items-center justify-center flex-shrink-0 border border-gray-200">
            <PawPrint className="w-3.5 h-3.5 text-[#4080ff]" />
          </div>
          <div className="flex-1 flex gap-1.5">
            <Input
              data-testid={`comment-input-${postId}`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Comment as ${activePet.name}...`}
              className="h-8 text-sm bg-white border-gray-200 focus:border-[#4080ff] rounded-full px-3"
            />
            <Button
              data-testid={`comment-submit-${postId}`}
              type="submit"
              disabled={loading || !content.trim()}
              className="h-8 w-8 p-0 bg-[#4080ff] hover:bg-[#3b5998] rounded-full flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
