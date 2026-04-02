import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ShoppingBag, Plus, Search, MapPin, Eye, MessageSquare, Trash2, X, Tag, Filter } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'pets', label: 'Pets' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'services', label: 'Services' },
  { id: 'food', label: 'Food & Treats' },
];

const CONDITIONS = ['new', 'excellent', 'used'];

export default function MarketplacePage() {
  const { user, authHeaders, API } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [category, setCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedListing, setSelectedListing] = useState(null);
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', price: '', category: 'accessories',
    species: '', breed: '', condition: 'new', location: '', image_url: '',
  });

  const fetchListings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (searchQuery) params.set('search', searchQuery);
      params.set('sort', sortBy);
      const res = await axios.get(`${API}/marketplace/listings?${params}`, { headers: authHeaders() });
      setListings(res.data.listings || []);
    } catch {}
    setLoading(false);
  }, [API, authHeaders, category, searchQuery, sortBy]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.price) { toast.error('Title and price required'); return; }
    try {
      await axios.post(`${API}/marketplace/listings`, {
        ...form, price: parseFloat(form.price),
      }, { headers: authHeaders() });
      toast.success('Listing created!');
      setShowCreate(false);
      setForm({ title: '', description: '', price: '', category: 'accessories', species: '', breed: '', condition: 'new', location: '', image_url: '' });
      fetchListings();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const handleInquiry = async (listingId) => {
    if (!inquiryMsg.trim()) return;
    try {
      await axios.post(`${API}/marketplace/listings/${listingId}/inquire`, { message: inquiryMsg }, { headers: authHeaders() });
      toast.success('Inquiry sent!');
      setInquiryMsg('');
      setSelectedListing(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const handleDelete = async (listingId) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await axios.delete(`${API}/marketplace/listings/${listingId}`, { headers: authHeaders() });
      toast.success('Listing deleted');
      fetchListings();
    } catch {}
  };

  return (
    <AppLayout>
      <div className="space-y-6" data-testid="marketplace-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Marketplace</h1>
          <Button onClick={() => setShowCreate(!showCreate)} className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="create-listing-btn">
            <Plus className="w-4 h-4 mr-2" /> New Listing
          </Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in-up" data-testid="create-listing-form">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ fontFamily: 'Outfit' }}>Create Listing</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="rounded-xl" data-testid="listing-title" />
                <Input placeholder="Price ($)" type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="rounded-xl" data-testid="listing-price" />
              </div>
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="rounded-xl resize-none" data-testid="listing-description" />
              <div className="grid sm:grid-cols-3 gap-4">
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border border-border rounded-xl px-3 py-2 bg-background text-sm" data-testid="listing-category">
                  <option value="pets">Pets</option>
                  <option value="accessories">Accessories</option>
                  <option value="services">Services</option>
                  <option value="food">Food & Treats</option>
                </select>
                <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="border border-border rounded-xl px-3 py-2 bg-background text-sm" data-testid="listing-condition">
                  {CONDITIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
                <Input placeholder="Location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="rounded-xl" />
              </div>
              <Input placeholder="Image URL (optional)" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} className="rounded-xl" />
              <Button type="submit" className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="submit-listing-btn">Post Listing</Button>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 flex-1 max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input placeholder="Search marketplace..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm outline-none flex-1" data-testid="marketplace-search" />
          </div>
          <div className="flex gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === c.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                data-testid={`filter-${c.id || 'all'}`}>
                {c.label}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background" data-testid="marketplace-sort">
            <option value="newest">Newest</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>

        {/* Listings grid */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-marketplace">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No listings yet. Be the first to post!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map(l => (
              <div key={l.listing_id} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-all" data-testid={`listing-${l.listing_id}`}>
                {l.image_url ? (
                  <div className="h-40 bg-muted overflow-hidden">
                    <img src={l.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
                    <Tag className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{l.title}</h3>
                      <p className="text-xl font-bold text-primary mt-1" style={{ fontFamily: 'Outfit' }}>${l.price?.toFixed(2)}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{l.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{l.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                    {l.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{l.location}</span>}
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{l.views}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{l.inquiries_count}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary overflow-hidden">
                      {l.seller_picture ? <img src={l.seller_picture} alt="" className="w-full h-full object-cover" /> : l.seller_name?.charAt(0)}
                    </div>
                    <span className="text-xs text-muted-foreground flex-1">{l.seller_name}</span>
                    {l.seller_id === user?.user_id ? (
                      <button onClick={() => handleDelete(l.listing_id)} className="p-1 text-muted-foreground hover:text-destructive rounded" data-testid={`delete-listing-${l.listing_id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button onClick={() => setSelectedListing(l)} className="text-xs text-primary font-medium hover:underline" data-testid={`inquire-${l.listing_id}`}>
                        Inquire
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inquiry modal */}
        {selectedListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedListing(null)}>
            <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()} data-testid="inquiry-modal">
              <h3 className="font-semibold mb-1" style={{ fontFamily: 'Outfit' }}>Send Inquiry</h3>
              <p className="text-xs text-muted-foreground mb-4">About: {selectedListing.title}</p>
              <Textarea
                placeholder="Your message to the seller..."
                value={inquiryMsg}
                onChange={e => setInquiryMsg(e.target.value)}
                className="rounded-xl resize-none mb-4"
                data-testid="inquiry-message"
              />
              <div className="flex gap-3">
                <Button onClick={() => setSelectedListing(null)} variant="outline" className="rounded-full flex-1">Cancel</Button>
                <Button onClick={() => handleInquiry(selectedListing.listing_id)} className="rounded-full bg-primary text-white hover:bg-primary/90 flex-1" data-testid="send-inquiry-btn">Send</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
