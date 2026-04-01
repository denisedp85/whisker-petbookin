import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import PetbookinSeal from '../components/PetbookinSeal';
import CertificateDocument from '../components/CertificateDocument';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollText, Plus, Send, FileCheck, ArrowRightLeft, PawPrint, Baby } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const ALL_SPECIES = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bird', label: 'Bird' },
  { value: 'horse', label: 'Horse' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'reptile', label: 'Reptile' },
  { value: 'fish', label: 'Fish' },
  { value: 'hamster', label: 'Hamster' },
  { value: 'ferret', label: 'Ferret' },
  { value: 'guinea_pig', label: 'Guinea Pig' },
  { value: 'exotic', label: 'Exotic' },
  { value: 'other', label: 'Other' },
];

export default function CertificatesPage() {
  const { user, pets, authHeaders, API } = useAuth();
  const [activeTab, setActiveTab] = useState('my-certs');
  const [certs, setCerts] = useState([]);
  const [litters, setLitters] = useState([]);
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showLitter, setShowLitter] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showCertView, setShowCertView] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [certForm, setCertForm] = useState({
    pet_id: '', pet_name: '', breed: '', species: 'dog', dob: '', gender: '',
    color_markings: '', microchip_id: '',
    sire_name: '', sire_breed: '', sire_cert_id: '',
    dam_name: '', dam_breed: '', dam_cert_id: '',
  });

  const [litterForm, setLitterForm] = useState({
    breed: '', species: 'dog', whelp_date: '', puppy_count: 0,
    sire_name: '', sire_breed: '', sire_cert_id: '',
    dam_name: '', dam_breed: '', dam_cert_id: '',
  });

  const [transferForm, setTransferForm] = useState({ certificate_id: '', new_owner_email: '' });

  const fetchData = useCallback(async () => {
    try {
      const [certsRes, littersRes, feesRes] = await Promise.all([
        axios.get(`${API}/certificates/mine`, { headers: authHeaders() }),
        axios.get(`${API}/certificates/litters`, { headers: authHeaders() }),
        axios.get(`${API}/certificates/fees`, { headers: authHeaders() }),
      ]);
      setCerts(certsRes.data || []);
      setLitters(littersRes.data || []);
      setFees(feesRes.data);
    } catch (e) {
      console.error('Failed to load certificates', e);
    }
    setLoading(false);
  }, [API, authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRegisterPet = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/certificates/register-pet`, certForm, { headers: authHeaders() });
      toast.success(`Certificate issued: ${res.data.certificate_id}`);
      setShowRegister(false);
      setCertForm({ pet_id: '', pet_name: '', breed: '', species: 'dog', dob: '', gender: '', color_markings: '', microchip_id: '', sire_name: '', sire_breed: '', sire_cert_id: '', dam_name: '', dam_breed: '', dam_cert_id: '' });
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Registration failed');
    }
    setSubmitting(false);
  };

  const handleRegisterLitter = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/certificates/register-litter`, litterForm, { headers: authHeaders() });
      toast.success(`Litter registered: ${res.data.litter_id}`);
      setShowLitter(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Registration failed');
    }
    setSubmitting(false);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/certificates/transfer`, transferForm, { headers: authHeaders() });
      toast.success('Certificate transferred!');
      setShowTransfer(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Transfer failed');
    }
    setSubmitting(false);
  };

  const isBreeder = !!user?.breeder_info;
  const tabs = [
    { id: 'my-certs', label: 'My Certificates', icon: ScrollText },
    { id: 'litters', label: 'Litters', icon: Baby },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="certificates-page">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Petbookin Certification</h1>
          {isBreeder && (
            <div className="flex gap-2">
              <Button onClick={() => setShowRegister(true)} className="rounded-full bg-primary text-white hover:bg-primary/90 text-sm" data-testid="register-pet-cert-btn">
                <Plus className="w-4 h-4 mr-1.5" /> Register Pet
              </Button>
              <Button onClick={() => setShowLitter(true)} variant="outline" className="rounded-full text-sm" data-testid="register-litter-btn">
                <Baby className="w-4 h-4 mr-1.5" /> Register Litter
              </Button>
              <Button onClick={() => setShowTransfer(true)} variant="outline" className="rounded-full text-sm" data-testid="transfer-cert-btn">
                <ArrowRightLeft className="w-4 h-4 mr-1.5" /> Transfer
              </Button>
            </div>
          )}
        </div>

        {/* Fees info */}
        {fees && (
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-4 text-sm" data-testid="cert-fees-info">
            <span className="text-muted-foreground font-medium">Certification Fees:</span>
            <Badge variant="outline">Pet: {fees.fees.individual === 0 ? 'FREE' : `$${fees.fees.individual}`}</Badge>
            <Badge variant="outline">Litter: {fees.fees.litter === 0 ? 'FREE' : `$${fees.fees.litter}`}</Badge>
            <Badge variant="outline">Transfer: {fees.fees.transfer === 0 ? 'FREE' : `$${fees.fees.transfer}`}</Badge>
            {fees.tier === 'mega' && <Badge className="bg-secondary text-secondary-foreground text-[10px]">MEGA = All Free</Badge>}
          </div>
        )}

        {/* Not a breeder */}
        {!isBreeder && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center" data-testid="cert-breeder-required">
            <PetbookinSeal size={120} />
            <h2 className="text-xl font-bold mt-4 mb-2" style={{ fontFamily: 'Outfit' }}>Breeder Registration Required</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Only registered breeders can issue Petbookin certificates. Register as a breeder first in the Breeder Registry.
            </p>
          </div>
        )}

        {isBreeder && (
          <>
            {/* Tabs */}
            <div className="flex gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                  }`}
                  data-testid={`cert-tab-${t.id}`}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-12"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
            ) : (
              <>
                {/* Certificates list */}
                {activeTab === 'my-certs' && (
                  <div className="space-y-4" data-testid="cert-list">
                    {certs.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No certificates yet. Register your first pet!</p>
                      </div>
                    ) : (
                      certs.map((cert) => (
                        <div key={cert.certificate_id} className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowCertView(cert)} data-testid={`cert-${cert.certificate_id}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                              <FileCheck className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold" style={{ fontFamily: 'Outfit' }}>{cert.pet_info?.name}</h3>
                                <Badge className="bg-green-100 text-green-700 text-[10px]">{cert.status}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{cert.certificate_id} | {cert.pet_info?.breed} | {cert.pet_info?.species}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(cert.issued_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Litters */}
                {activeTab === 'litters' && (
                  <div className="space-y-4" data-testid="litter-list">
                    {litters.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Baby className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No litters registered yet.</p>
                      </div>
                    ) : (
                      litters.map((litter) => (
                        <div key={litter.litter_id} className="rounded-2xl border border-border bg-card p-5" data-testid={`litter-${litter.litter_id}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                              <Baby className="w-6 h-6 text-secondary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold" style={{ fontFamily: 'Outfit' }}>{litter.breed} Litter</h3>
                              <p className="text-xs text-muted-foreground">{litter.litter_id} | {litter.puppy_count} puppies | Whelped: {litter.whelp_date || 'N/A'}</p>
                              <div className="flex gap-2 mt-1">
                                {litter.sire?.name && <Badge variant="outline" className="text-[10px]">Sire: {litter.sire.name}</Badge>}
                                {litter.dam?.name && <Badge variant="outline" className="text-[10px]">Dam: {litter.dam.name}</Badge>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Register Pet Certificate Form */}
        {showRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowRegister(false)}>
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()} data-testid="cert-register-modal">
              <div className="flex items-center gap-3 mb-6">
                <PetbookinSeal size={50} />
                <div>
                  <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit' }}>Register Pet Certificate</h2>
                  <p className="text-sm text-muted-foreground">Official Petbookin registration papers</p>
                </div>
              </div>
              <form onSubmit={handleRegisterPet} className="space-y-5">
                {/* Link existing pet */}
                {pets.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Link to Existing Pet (optional)</label>
                    <select value={certForm.pet_id} onChange={(e) => {
                      const pet = pets.find(p => p.pet_id === e.target.value);
                      if (pet) {
                        setCertForm({...certForm, pet_id: pet.pet_id, pet_name: pet.name, breed: pet.breed || '', species: pet.species || 'dog', gender: pet.gender || ''});
                      } else {
                        setCertForm({...certForm, pet_id: ''});
                      }
                    }} className="w-full border border-border rounded-xl px-4 py-2.5 bg-background text-sm" data-testid="cert-pet-select">
                      <option value="">Enter manually</option>
                      {pets.map(p => <option key={p.pet_id} value={p.pet_id}>{p.name} ({p.breed || p.species})</option>)}
                    </select>
                  </div>
                )}

                {/* Pet Info */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Pet Information</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input placeholder="Pet Name *" value={certForm.pet_name} onChange={(e) => setCertForm({...certForm, pet_name: e.target.value})} required className="rounded-xl" data-testid="cert-pet-name" />
                    <Input placeholder="Breed *" value={certForm.breed} onChange={(e) => setCertForm({...certForm, breed: e.target.value})} required className="rounded-xl" data-testid="cert-breed" />
                    <select value={certForm.species} onChange={(e) => setCertForm({...certForm, species: e.target.value})} className="border border-border rounded-xl px-4 py-2.5 bg-background text-sm" data-testid="cert-species">
                      {ALL_SPECIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <Input type="date" placeholder="Date of Birth" value={certForm.dob} onChange={(e) => setCertForm({...certForm, dob: e.target.value})} className="rounded-xl" data-testid="cert-dob" />
                    <select value={certForm.gender} onChange={(e) => setCertForm({...certForm, gender: e.target.value})} className="border border-border rounded-xl px-4 py-2.5 bg-background text-sm" data-testid="cert-gender">
                      <option value="">Gender</option><option value="male">Male</option><option value="female">Female</option>
                    </select>
                    <Input placeholder="Color/Markings" value={certForm.color_markings} onChange={(e) => setCertForm({...certForm, color_markings: e.target.value})} className="rounded-xl" data-testid="cert-color" />
                    <Input placeholder="Microchip ID (optional)" value={certForm.microchip_id} onChange={(e) => setCertForm({...certForm, microchip_id: e.target.value})} className="rounded-xl sm:col-span-2" data-testid="cert-microchip" />
                  </div>
                </div>

                {/* Pedigree */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Pedigree (Parents)</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Sire (Father)</p>
                      <Input placeholder="Sire Name" value={certForm.sire_name} onChange={(e) => setCertForm({...certForm, sire_name: e.target.value})} className="rounded-xl" data-testid="cert-sire-name" />
                      <Input placeholder="Sire Breed" value={certForm.sire_breed} onChange={(e) => setCertForm({...certForm, sire_breed: e.target.value})} className="rounded-xl" data-testid="cert-sire-breed" />
                      <Input placeholder="Sire Cert ID (optional)" value={certForm.sire_cert_id} onChange={(e) => setCertForm({...certForm, sire_cert_id: e.target.value})} className="rounded-xl" data-testid="cert-sire-cert" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Dam (Mother)</p>
                      <Input placeholder="Dam Name" value={certForm.dam_name} onChange={(e) => setCertForm({...certForm, dam_name: e.target.value})} className="rounded-xl" data-testid="cert-dam-name" />
                      <Input placeholder="Dam Breed" value={certForm.dam_breed} onChange={(e) => setCertForm({...certForm, dam_breed: e.target.value})} className="rounded-xl" data-testid="cert-dam-breed" />
                      <Input placeholder="Dam Cert ID (optional)" value={certForm.dam_cert_id} onChange={(e) => setCertForm({...certForm, dam_cert_id: e.target.value})} className="rounded-xl" data-testid="cert-dam-cert" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={submitting} className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="cert-submit-btn">
                    {submitting ? 'Registering...' : `Register Certificate ${fees?.fees?.individual === 0 ? '(FREE)' : `($${fees?.fees?.individual})`}`}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowRegister(false)} className="rounded-full">Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Register Litter Form */}
        {showLitter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowLitter(false)}>
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()} data-testid="litter-register-modal">
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit' }}>Register Litter</h2>
              <form onSubmit={handleRegisterLitter} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Breed *" value={litterForm.breed} onChange={(e) => setLitterForm({...litterForm, breed: e.target.value})} required className="rounded-xl" data-testid="litter-breed" />
                  <select value={litterForm.species} onChange={(e) => setLitterForm({...litterForm, species: e.target.value})} className="border border-border rounded-xl px-4 py-2.5 bg-background text-sm">
                    {ALL_SPECIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <Input type="date" placeholder="Whelp Date" value={litterForm.whelp_date} onChange={(e) => setLitterForm({...litterForm, whelp_date: e.target.value})} className="rounded-xl" data-testid="litter-whelp" />
                  <Input type="number" placeholder="Number of puppies" value={litterForm.puppy_count} onChange={(e) => setLitterForm({...litterForm, puppy_count: parseInt(e.target.value) || 0})} className="rounded-xl" data-testid="litter-count" />
                </div>
                <Input placeholder="Sire Name" value={litterForm.sire_name} onChange={(e) => setLitterForm({...litterForm, sire_name: e.target.value})} className="rounded-xl" />
                <Input placeholder="Dam Name" value={litterForm.dam_name} onChange={(e) => setLitterForm({...litterForm, dam_name: e.target.value})} className="rounded-xl" />
                <div className="flex gap-3">
                  <Button type="submit" disabled={submitting} className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="litter-submit-btn">
                    {submitting ? 'Registering...' : `Register Litter ${fees?.fees?.litter === 0 ? '(FREE)' : `($${fees?.fees?.litter})`}`}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowLitter(false)} className="rounded-full">Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transfer Form */}
        {showTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowTransfer(false)}>
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()} data-testid="transfer-modal">
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Outfit' }}>Transfer Certificate</h2>
              <p className="text-sm text-muted-foreground mb-4">Transfer ownership of a registered pet to another Petbookin user (like when selling a puppy).</p>
              <form onSubmit={handleTransfer} className="space-y-4">
                <select value={transferForm.certificate_id} onChange={(e) => setTransferForm({...transferForm, certificate_id: e.target.value})} className="w-full border border-border rounded-xl px-4 py-2.5 bg-background text-sm" required data-testid="transfer-cert-select">
                  <option value="">Select certificate</option>
                  {certs.filter(c => c.status === 'active').map(c => (
                    <option key={c.certificate_id} value={c.certificate_id}>{c.pet_info?.name} - {c.certificate_id}</option>
                  ))}
                </select>
                <Input type="email" placeholder="New owner's email" value={transferForm.new_owner_email} onChange={(e) => setTransferForm({...transferForm, new_owner_email: e.target.value})} required className="rounded-xl" data-testid="transfer-email" />
                <div className="flex gap-3">
                  <Button type="submit" disabled={submitting} className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="transfer-submit-btn">
                    {submitting ? 'Transferring...' : `Transfer ${fees?.fees?.transfer === 0 ? '(FREE)' : `($${fees?.fees?.transfer})`}`}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowTransfer(false)} className="rounded-full">Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Certificate View */}
        {showCertView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCertView(null)}>
            <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()} data-testid="cert-view-modal">
              <CertificateDocument cert={showCertView} />
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => setShowCertView(null)} className="rounded-full bg-white/90 backdrop-blur">Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
