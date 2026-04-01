import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Shield, Plus, Award, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const REGISTRIES = ['AKC', 'CKC', 'UKC', 'FCI', 'KC', 'ANKC', 'Other'];

export default function BreederRegistryPage() {
  const { user, authHeaders, API, refreshUser } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showAddCred, setShowAddCred] = useState(false);
  const [showPetbookinCred, setShowPetbookinCred] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regForm, setRegForm] = useState({ kennel_name: '', specializations: '', years_experience: 0 });
  const [credForm, setCredForm] = useState({ registry: 'AKC', registry_id: '', breed_registered: '' });
  const [pbkReason, setPbkReason] = useState('');

  const breeder = user?.breeder_info;
  const isVerified = breeder?.is_verified;

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/breeder/register`, {
        kennel_name: regForm.kennel_name,
        specializations: regForm.specializations.split(',').map(s => s.trim()).filter(Boolean),
        years_experience: parseInt(regForm.years_experience) || 0
      }, { headers: authHeaders() });
      toast.success('Registered as breeder!');
      setShowRegister(false);
      refreshUser();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
    setLoading(false);
  };

  const handleAddCredential = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/breeder/credential/external`, credForm, { headers: authHeaders() });
      toast.success('Credential added!');
      setShowAddCred(false);
      refreshUser();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
    setLoading(false);
  };

  const handlePetbookinCred = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/breeder/credential/petbookin`, { reason: pbkReason }, { headers: authHeaders() });
      toast.success('Petbookin credential issued!');
      setShowPetbookinCred(false);
      refreshUser();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    try {
      const res = await axios.post(`${API}/breeder/verify`, {}, { headers: authHeaders() });
      if (res.data.is_verified) {
        toast.success('You are now a Verified Breeder!');
      } else {
        toast.info(res.data.reasons?.join(', ') || 'Not yet eligible');
      }
      refreshUser();
    } catch (e) {
      toast.error('Verification check failed');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="breeder-registry-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Breeder Registry</h1>
          {!breeder && (
            <Button onClick={() => setShowRegister(true)} className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="register-breeder-btn">
              <Plus className="w-4 h-4 mr-2" /> Register as Breeder
            </Button>
          )}
        </div>

        {/* Not a breeder yet */}
        {!breeder && !showRegister && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center" data-testid="breeder-cta">
            <Shield className="w-16 h-16 text-primary/30 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Outfit' }}>Become a Verified Breeder</h2>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Register as a breeder to add your credentials (AKC, CKC, UKC, etc.) or get official Petbookin credentials. Verified breeders get a special badge and access to VIP events.
            </p>
            <Button onClick={() => setShowRegister(true)} className="rounded-full bg-primary text-white hover:bg-primary/90">
              Get Started
            </Button>
          </div>
        )}

        {/* Registration form */}
        {showRegister && !breeder && (
          <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in-up" data-testid="breeder-register-form">
            <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Outfit' }}>Breeder Registration</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <Input placeholder="Kennel name" value={regForm.kennel_name} onChange={(e) => setRegForm({...regForm, kennel_name: e.target.value})} className="rounded-xl" data-testid="kennel-name-input" />
              <Input placeholder="Specializations (comma-separated breeds)" value={regForm.specializations} onChange={(e) => setRegForm({...regForm, specializations: e.target.value})} className="rounded-xl" data-testid="specializations-input" />
              <Input type="number" placeholder="Years of experience" value={regForm.years_experience} onChange={(e) => setRegForm({...regForm, years_experience: e.target.value})} className="rounded-xl" data-testid="experience-input" />
              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="submit-breeder-reg">
                  {loading ? 'Registering...' : 'Register'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowRegister(false)} className="rounded-full">Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {/* Breeder Dashboard */}
        {breeder && (
          <div className="space-y-6">
            {/* Status card */}
            <div className="rounded-2xl border border-border bg-card p-6" data-testid="breeder-status-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isVerified ? 'bg-secondary/10' : 'bg-muted'}`}>
                    <Shield className={`w-6 h-6 ${isVerified ? 'text-secondary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold" style={{ fontFamily: 'Outfit' }}>{breeder.kennel_name || 'My Breeding Program'}</h2>
                      {isVerified && <Badge className="bg-secondary text-secondary-foreground text-[10px] verified-badge">Verified Breeder</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">ID: {breeder.petbookin_breeder_id}</p>
                  </div>
                </div>
                {!isVerified && (
                  <Button onClick={handleVerify} variant="outline" className="rounded-full text-xs" data-testid="check-verify-btn">
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Check Verification
                  </Button>
                )}
              </div>
              {!isVerified && (
                <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>To get verified, you need an active subscription AND at least one credential (external or Petbookin).</p>
                </div>
              )}
            </div>

            {/* Credentials */}
            <div className="rounded-2xl border border-border bg-card p-6" data-testid="credentials-section">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold" style={{ fontFamily: 'Outfit' }}>Credentials</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowAddCred(true)} className="rounded-full text-xs" data-testid="add-external-cred-btn">
                    <Plus className="w-3 h-3 mr-1" /> External
                  </Button>
                  {!breeder.petbookin_credential && (
                    <Button size="sm" variant="outline" onClick={() => setShowPetbookinCred(true)} className="rounded-full text-xs" data-testid="get-petbookin-cred-btn">
                      <Award className="w-3 h-3 mr-1" /> Petbookin
                    </Button>
                  )}
                </div>
              </div>

              {/* External creds */}
              {(breeder.external_credentials || []).map((c, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                  <Badge variant="outline" className="text-xs">{c.registry}</Badge>
                  <span className="text-sm">{c.registry_id}</span>
                  {c.breed_registered && <span className="text-xs text-muted-foreground">({c.breed_registered})</span>}
                </div>
              ))}

              {/* Petbookin cred */}
              {breeder.petbookin_credential && (
                <div className="flex items-center gap-3 py-3 bg-primary/5 rounded-xl px-3 mt-2">
                  <Award className="w-5 h-5 text-primary" />
                  <div>
                    <span className="text-sm font-medium">Petbookin Official</span>
                    <p className="text-xs text-muted-foreground">{breeder.petbookin_credential.credential_id}</p>
                  </div>
                  <Badge className="ml-auto bg-green-100 text-green-700 text-[10px]">Active</Badge>
                </div>
              )}

              {(breeder.external_credentials || []).length === 0 && !breeder.petbookin_credential && (
                <p className="text-sm text-muted-foreground py-2">No credentials yet. Add your club credentials or get Petbookin credentials.</p>
              )}
            </div>

            {/* Add external credential form */}
            {showAddCred && (
              <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in-up" data-testid="add-cred-form">
                <h3 className="font-semibold mb-4" style={{ fontFamily: 'Outfit' }}>Add External Credential</h3>
                <form onSubmit={handleAddCredential} className="space-y-4">
                  <select value={credForm.registry} onChange={(e) => setCredForm({...credForm, registry: e.target.value})} className="w-full border border-border rounded-xl px-4 py-2.5 bg-background text-sm" data-testid="registry-select">
                    {REGISTRIES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <Input placeholder="Registration ID" value={credForm.registry_id} onChange={(e) => setCredForm({...credForm, registry_id: e.target.value})} required className="rounded-xl" data-testid="registry-id-input" />
                  <Input placeholder="Breed registered (optional)" value={credForm.breed_registered} onChange={(e) => setCredForm({...credForm, breed_registered: e.target.value})} className="rounded-xl" data-testid="breed-registered-input" />
                  <div className="flex gap-3">
                    <Button type="submit" disabled={loading} className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="submit-cred">
                      {loading ? 'Adding...' : 'Add Credential'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddCred(false)} className="rounded-full">Cancel</Button>
                  </div>
                </form>
              </div>
            )}

            {/* Petbookin credential request */}
            {showPetbookinCred && (
              <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in-up" data-testid="petbookin-cred-form">
                <h3 className="font-semibold mb-2" style={{ fontFamily: 'Outfit' }}>Get Petbookin Credentials</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Petbookin credentials are for hobby breeders or those who don't have existing club credentials. This gives you access to VIP events, tournaments, and group gatherings.
                </p>
                <Input
                  placeholder="Why do you want Petbookin credentials? (optional)"
                  value={pbkReason}
                  onChange={(e) => setPbkReason(e.target.value)}
                  className="rounded-xl mb-4"
                  data-testid="petbookin-reason-input"
                />
                <div className="flex gap-3">
                  <Button onClick={handlePetbookinCred} disabled={loading} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90" data-testid="submit-petbookin-cred">
                    {loading ? 'Issuing...' : 'Get Credentials'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowPetbookinCred(false)} className="rounded-full">Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
