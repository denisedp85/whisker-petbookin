import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  ShoppingBag, Plus, Search, MapPin, Eye, MessageSquare, Trash2, X, Tag, CreditCard,
  DollarSign, CheckCircle2, AlertCircle, Loader2, BarChart3, TrendingUp
} from 'lucide-react';
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

function SellerSetupBanner({ API, authHeaders, connectStatus, onRefresh }) {
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/marketplace/connect/setup`, {}, { headers: authHeaders() });
      toast.success("You're now set up as a seller!");
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to set up');
    }
    setLoading(false);
  };

  if (connectStatus?.connected) return null;

  return (
    <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-5" data-testid="seller-setup-banner">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm" style={{ fontFamily: 'Outfit' }}>Start Selling & Get Paid</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Activate your seller account to receive payments when someone buys your listing. You keep 90% of each sale.
          </p>
        </div>
        <Button
          onClick={handleSetup}
          disabled={loading}
          className="rounded-full bg-primary text-white hover:bg-primary/90 text-xs flex-shrink-0"
          data-testid="setup-payments-btn"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Selling'}
        </Button>
      </div>
    </div>
  );
}

function SellerDashboard({ API, authHeaders, connectStatus }) {
  const [sales, setSales] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/marketplace/connect/sales`, { headers: authHeaders() });
        setSales(res.data);
      } catch {}
      setLoading(false);
    })();
  }, [API, authHeaders]);

  if (!connectStatus?.connected) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5" data-testid="seller-dashboard">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm" style={{ fontFamily: 'Outfit' }}>Seller Dashboard</h3>
          <Badge className="bg-green-100 text-green-700 text-[10px]">Active</Badge>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
      ) : sales ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <p className="text-lg font-bold text-primary" style={{ fontFamily: 'Outfit' }}>{sales.total_sales}</p>
            <p className="text-[10px] text-muted-foreground">Total Sales</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <p className="text-lg font-bold text-green-600" style={{ fontFamily: 'Outfit' }}>${sales.total_earnings.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Your Earnings (90%)</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <p className="text-lg font-bold text-amber-600" style={{ fontFamily: 'Outfit' }}>${sales.current_balance.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Balance</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PurchaseSuccessModal({ sessionId, API, authHeaders, onClose }) {
  const [status, setStatus] = useState('checking');
  const [data, setData] = useState(null);

  useEffect(() => {
    let attempts = 0;
    const poll = async () => {
      if (attempts >= 5) { setStatus('timeout'); return; }
      attempts++;
      try {
        const res = await axios.get(`${API}/marketplace/buy/status/${sessionId}`, { headers: authHeaders() });
        if (res.data.payment_status === 'paid') {
          setStatus('success');
          setData(res.data);
        } else if (res.data.payment_status === 'expired') {
          setStatus('expired');
        } else {
          setTimeout(poll, 2000);
        }
      } catch {
        setTimeout(poll, 2000);
      }
    };
    poll();
  }, [sessionId, API, authHeaders]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border p-8 max-w-md w-full mx-4 shadow-2xl text-center" onClick={e => e.stopPropagation()} data-testid="purchase-status-modal">
        {status === 'checking' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4" />
            <h3 className="font-bold text-lg" style={{ fontFamily: 'Outfit' }}>Processing Payment...</h3>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we confirm your purchase.</p>
          </>
        )}
        {status === 'success' && data && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-bold text-lg" style={{ fontFamily: 'Outfit' }}>Purchase Complete!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              You bought <strong>{data.listing_title}</strong> for <strong>${data.amount?.toFixed(2)}</strong>
            </p>
            <Button onClick={onClose} className="rounded-full mt-4 bg-primary text-white hover:bg-primary/90" data-testid="purchase-close-btn">Done</Button>
          </>
        )}
        {status === 'expired' && (
          <>
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h3 className="font-bold text-lg" style={{ fontFamily: 'Outfit' }}>Payment Expired</h3>
            <p className="text-sm text-muted-foreground mt-2">The payment session expired. Please try again.</p>
            <Button onClick={onClose} variant="outline" className="rounded-full mt-4">Close</Button>
          </>
        )}
        {status === 'timeout' && (
          <>
            <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h3 className="font-bold text-lg" style={{ fontFamily: 'Outfit' }}>Still Processing</h3>
            <p className="text-sm text-muted-foreground mt-2">Payment is still being processed. Check your notifications for confirmation.</p>
            <Button onClick={onClose} variant="outline" className="rounded-full mt-4">Close</Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const { user, authHeaders, API } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [category, setCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedListing, setSelectedListing] = useState(null);
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [connectStatus, setConnectStatus] = useState(null);
  const [buyingListing, setBuyingListing] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', price: '', category: 'accessories',
    species: '', breed: '', condition: 'new', location: '', image_url: '',
  });

  // Check for purchase return
  const purchaseSessionId = searchParams.get('session_id');
  const purchaseStatus = searchParams.get('purchase');

  const fetchConnectStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/marketplace/connect/status`, { headers: authHeaders() });
      setConnectStatus(res.data);
    } catch {}
  }, [API, authHeaders]);

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

  useEffect(() => { fetchListings(); fetchConnectStatus(); }, [fetchListings, fetchConnectStatus]);

  // Handle connect return
  useEffect(() => {
    const connect = searchParams.get('connect');
    if (connect === 'success') {
      toast.success('Payment setup complete!');
      fetchConnectStatus();
      searchParams.delete('connect');
      setSearchParams(searchParams);
    } else if (connect === 'refresh') {
      toast.info('Please complete your payment setup.');
      searchParams.delete('connect');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, fetchConnectStatus]);

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

  const handleBuy = async (listing) => {
    setBuyingListing(listing.listing_id);
    try {
      const res = await axios.post(`${API}/marketplace/buy/${listing.listing_id}`, {
        origin_url: window.location.origin,
      }, { headers: authHeaders() });
      window.location.href = res.data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to start purchase');
      setBuyingListing(null);
    }
  };

  const closePurchaseModal = () => {
    searchParams.delete('session_id');
    searchParams.delete('purchase');
    setSearchParams(searchParams);
    fetchListings();
  };

  return (
    <AppLayout>
      <div className="space-y-6" data-testid="marketplace-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Marketplace</h1>
          <div className="flex items-center gap-2">
            {connectStatus?.connected && (
              <Button variant="outline" onClick={() => setShowDashboard(!showDashboard)} className="rounded-full text-xs" data-testid="toggle-seller-dashboard">
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> Seller
              </Button>
            )}
            <Button onClick={() => setShowCreate(!showCreate)} className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="create-listing-btn">
              <Plus className="w-4 h-4 mr-2" /> New Listing
            </Button>
          </div>
        </div>

        {/* Seller Setup / Dashboard */}
        <SellerSetupBanner API={API} authHeaders={authHeaders} connectStatus={connectStatus} onRefresh={fetchConnectStatus} />
        {showDashboard && <SellerDashboard API={API} authHeaders={authHeaders} connectStatus={connectStatus} />}

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
              {!connectStatus?.connected && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Set up payments above to enable Buy Now for your listings.
                </p>
              )}
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
            {listings.map(l => {
              const isOwn = l.seller_id === user?.user_id;
              const isSold = l.status === 'sold';

              return (
                <div key={l.listing_id} className={`rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-all ${isSold ? 'opacity-60' : ''}`} data-testid={`listing-${l.listing_id}`}>
                  {l.image_url ? (
                    <div className="h-40 bg-muted overflow-hidden relative">
                      <img src={l.image_url} alt="" className="w-full h-full object-cover" />
                      {isSold && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Badge className="bg-red-500 text-white text-sm px-4 py-1">SOLD</Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center relative">
                      <Tag className="w-8 h-8 text-muted-foreground/30" />
                      {isSold && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Badge className="bg-red-500 text-white text-sm px-4 py-1">SOLD</Badge>
                        </div>
                      )}
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
                      {isOwn ? (
                        <button onClick={() => handleDelete(l.listing_id)} className="p-1 text-muted-foreground hover:text-destructive rounded" data-testid={`delete-listing-${l.listing_id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : !isSold ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setSelectedListing(l)} className="text-xs text-muted-foreground hover:text-primary font-medium" data-testid={`inquire-${l.listing_id}`}>
                            Inquire
                          </button>
                          <Button
                            size="sm"
                            onClick={() => handleBuy(l)}
                            disabled={buyingListing === l.listing_id}
                            className="rounded-full bg-green-600 text-white hover:bg-green-700 text-[11px] h-7 px-3"
                            data-testid={`buy-${l.listing_id}`}
                          >
                            {buyingListing === l.listing_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <><DollarSign className="w-3 h-3 mr-0.5" /> Buy Now</>
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
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

        {/* Purchase status modal */}
        {purchaseStatus === 'success' && purchaseSessionId && (
          <PurchaseSuccessModal
            sessionId={purchaseSessionId}
            API={API}
            authHeaders={authHeaders}
            onClose={closePurchaseModal}
          />
        )}
      </div>
    </AppLayout>
  );
}
