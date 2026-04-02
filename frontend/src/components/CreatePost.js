import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Image, Send, Sparkles, X, Loader2 } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import axios from 'axios';

export default function CreatePost({ onPostCreated }) {
  const { activePet, authHeaders, API } = useAuth();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const fileRef = useRef();
  const textRef = useRef();

  const handleEmojiSelect = (emoji) => {
    const el = textRef.current?.querySelector('textarea');
    if (el) {
      const start = el.selectionStart || content.length;
      const end = el.selectionEnd || content.length;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + emoji.length;
        el.focus();
      }, 0);
    } else {
      setContent(prev => prev + emoji);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGenerateBio = async () => {
    if (!activePet) return;
    setGeneratingBio(true);
    try {
      const res = await axios.post(`${API}/ai/generate-bio`, {
        pet_name: activePet.name,
        species: activePet.species,
        breed: activePet.breed,
        personality_traits: activePet.personality_traits || [],
        favorite_activities: activePet.favorite_activities || []
      }, { headers: authHeaders() });
      setContent(res.data.bio);
    } catch (err) {
      console.error('Bio generation failed', err);
    }
    setGeneratingBio(false);
  };

  const handleSubmit = async () => {
    if (!content.trim() || !activePet) return;
    setLoading(true);
    try {
      let imagePath = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadRes = await axios.post(`${API}/upload`, formData, {
          headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' }
        });
        imagePath = uploadRes.data.path;
      }
      const res = await axios.post(`${API}/posts`, {
        content: content.trim(),
        pet_id: activePet.pet_id,
        image_path: imagePath
      }, { headers: authHeaders() });
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      if (onPostCreated) onPostCreated(res.data);
    } catch (err) {
      console.error('Post failed', err);
    }
    setLoading(false);
  };

  if (!activePet) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm" data-testid="create-post">
      <div className="border-b border-gray-100 p-3 bg-gray-50/50 rounded-t-lg">
        <h3 className="text-sm font-semibold text-[#1c1e21]">Create Post</h3>
        <p className="text-xs text-[#65676b]">Posting as {activePet.name}</p>
      </div>
      <div className="p-4 space-y-3">
        <div ref={textRef}>
          <Textarea
            data-testid="post-content-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's ${activePet.name} up to?`}
            className="bg-gray-50 border-gray-200 min-h-[80px] text-sm resize-none focus:border-[#4080ff]"
          />
        </div>
        {imagePreview && (
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-md border border-gray-200" />
            <button
              data-testid="remove-image-btn"
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              className="absolute -top-2 -right-2 bg-white rounded-full shadow-md p-0.5 border border-gray-200"
            >
              <X className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="flex gap-1">
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
            <Button
              data-testid="add-photo-btn"
              variant="ghost"
              onClick={() => fileRef.current?.click()}
              className="text-[#65676b] hover:bg-gray-100 gap-1.5 h-8 text-xs"
            >
              <Image className="w-4 h-4 text-green-600" /> Photo
            </Button>
            <Button
              data-testid="ai-bio-btn"
              variant="ghost"
              onClick={handleGenerateBio}
              disabled={generatingBio}
              className="text-[#65676b] hover:bg-gray-100 gap-1.5 h-8 text-xs"
            >
              {generatingBio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#f7b731]" />}
              AI Write
            </Button>
            <EmojiPicker onSelect={handleEmojiSelect} compact />
          </div>
          <Button
            data-testid="submit-post-btn"
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            className="bg-[#4080ff] hover:bg-[#3b5998] text-white h-8 px-4 text-sm gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
