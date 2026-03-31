import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PawPrint, User, Shield, Save, Plus, X, Upload, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, pets, updateProfile, fetchPets, authHeaders, API } = useAuth();
  const [saving, setSaving] = useState(false);

  // Owner form
  const [ownerForm, setOwnerForm] = useState({
    name: user?.name || '',
    owner_bio: user?.owner_bio || '',
    owner_hobbies: user?.owner_hobbies || '',
    owner_interests: user?.owner_interests || '',
    kennel_club: user?.kennel_club || '',
    kennel_registration: user?.kennel_registration || ''
  });

  const updateOwner = (field, val) => setOwnerForm(prev => ({ ...prev, [field]: val }));

  const handleSaveOwner = async () => {
    setSaving(true);
    try {
      await updateProfile(ownerForm);
      toast.success('Profile updated!');
    } catch (e) {
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[#050505] font-['Archivo_Narrow'] mb-4">Settings</h1>

        <Tabs defaultValue="owner" className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <TabsList className="w-full justify-start border-b border-gray-200 rounded-none bg-transparent h-auto p-0">
              <TabsTrigger value="owner" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4080ff] data-[state=active]:bg-transparent data-[state=active]:text-[#4080ff] px-4 py-3 text-sm" data-testid="settings-tab-owner">
                <User className="w-4 h-4 mr-1.5" /> Owner Profile
              </TabsTrigger>
              <TabsTrigger value="pets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4080ff] data-[state=active]:bg-transparent data-[state=active]:text-[#4080ff] px-4 py-3 text-sm" data-testid="settings-tab-pets">
                <PawPrint className="w-4 h-4 mr-1.5" /> My Pets
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Owner Tab */}
          <TabsContent value="owner">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="border-b border-gray-100 p-4 bg-gray-50/50 rounded-t-lg">
                <h3 className="text-base font-semibold text-[#1c1e21]">Owner / Breeder Info</h3>
                <p className="text-xs text-[#65676b]">This info shows on your pet's profile</p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-sm text-[#65676b]">Display Name</Label>
                  <Input data-testid="settings-name" value={ownerForm.name} onChange={e => updateOwner('name', e.target.value)} className="bg-gray-50 border-gray-300" />
                </div>
                <div>
                  <Label className="text-sm text-[#65676b]">Bio</Label>
                  <Textarea data-testid="settings-bio" value={ownerForm.owner_bio} onChange={e => updateOwner('owner_bio', e.target.value)} placeholder="About you..." className="bg-gray-50 border-gray-300 min-h-[80px]" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-[#65676b]">Hobbies</Label>
                    <Input data-testid="settings-hobbies" value={ownerForm.owner_hobbies} onChange={e => updateOwner('owner_hobbies', e.target.value)} className="bg-gray-50 border-gray-300" />
                  </div>
                  <div>
                    <Label className="text-sm text-[#65676b]">Interests</Label>
                    <Input data-testid="settings-interests" value={ownerForm.owner_interests} onChange={e => updateOwner('owner_interests', e.target.value)} className="bg-gray-50 border-gray-300" />
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-medium text-[#1c1e21] mb-3 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-500" /> Petbookin Breeder Registry
                  </h4>
                  {user?.petbookin_breeder_id ? (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Your Breeder ID:</span>
                        <Badge className="bg-amber-500 text-white font-mono text-xs px-3 py-1">
                          {user.petbookin_breeder_id}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Use this ID to register for events, tournaments, and receive official certificates.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-3">
                        Don't have a kennel club membership? Get your official Petbookin Breeder ID to participate in events and tournaments!
                      </p>
                      <Button
                        onClick={async () => {
                          try {
                            // Request breeder ID - will be auto-assigned when creating breeder pet
                            toast.info('Create a breeder pet profile to get your Petbookin Breeder ID!');
                          } catch (e) {
                            toast.error('Failed to request ID');
                          }
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-sm"
                      >
                        Learn More
                      </Button>
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-medium text-[#1c1e21] mb-3 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-[#4080ff]" /> Kennel Club Verification
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-[#65676b]">Kennel Club</Label>
                      <Select value={ownerForm.kennel_club} onValueChange={v => updateOwner('kennel_club', v)}>
                        <SelectTrigger data-testid="settings-kennel-club" className="bg-gray-50 border-gray-300"><SelectValue placeholder="Select club" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AKC">AKC</SelectItem>
                          <SelectItem value="CKC">CKC</SelectItem>
                          <SelectItem value="UKC">UKC</SelectItem>
                          <SelectItem value="FCI">FCI</SelectItem>
                          <SelectItem value="KC">KC (UK)</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm text-[#65676b]">Registration #</Label>
                      <Input data-testid="settings-kennel-reg" value={ownerForm.kennel_registration} onChange={e => updateOwner('kennel_registration', e.target.value)} className="bg-gray-50 border-gray-300" />
                    </div>
                  </div>
                </div>
                <Button data-testid="save-owner-btn" onClick={handleSaveOwner} disabled={saving} className="bg-[#4080ff] hover:bg-[#3b5998] text-white gap-1.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Pets Tab */}
          <TabsContent value="pets">
            <div className="space-y-4">
              {pets.map(pet => (
                <PetEditor key={pet.pet_id} pet={pet} onUpdated={fetchPets} authHeaders={authHeaders} API={API} />
              ))}
              <NewPetForm authHeaders={authHeaders} API={API} onCreated={fetchPets} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PetEditor({ pet, onUpdated, authHeaders, API }) {
  const [form, setForm] = useState({ ...pet });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/pets/${pet.pet_id}`, {
        name: form.name, species: form.species, breed: form.breed,
        age: form.age, bio: form.bio, weight: form.weight,
        personality_traits: form.personality_traits,
        favorite_activities: form.favorite_activities,
        medical_info: form.medical_info
      }, { headers: authHeaders() });
      toast.success(`${form.name}'s profile updated!`);
      if (onUpdated) onUpdated();
    } catch (e) {
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await axios.put(`${API}/pets/${pet.pet_id}/photo`, formData, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Photo uploaded!');
      if (onUpdated) onUpdated();
    } catch (e) {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm" data-testid={`pet-editor-${pet.pet_id}`}>
      <div className="border-b border-gray-100 p-4 bg-gray-50/50 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PawPrint className="w-5 h-5 text-[#4080ff]" />
          <h3 className="text-base font-semibold text-[#1c1e21]">{pet.name}</h3>
          {pet.is_breeder_profile && <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Breeder</Badge>}
        </div>
        <div>
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          <Button data-testid={`upload-photo-${pet.pet_id}`} variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="border-gray-300 h-8 text-xs gap-1">
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Photo
          </Button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-sm text-[#65676b]">Name</Label>
            <Input value={form.name || ''} onChange={e => update('name', e.target.value)} className="bg-gray-50 border-gray-300" />
          </div>
          <div>
            <Label className="text-sm text-[#65676b]">Breed</Label>
            <Input value={form.breed || ''} onChange={e => update('breed', e.target.value)} className="bg-gray-50 border-gray-300" />
          </div>
          <div>
            <Label className="text-sm text-[#65676b]">Age</Label>
            <Input value={form.age || ''} onChange={e => update('age', e.target.value)} className="bg-gray-50 border-gray-300" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-sm text-[#65676b]">Weight</Label>
            <Input value={form.weight || ''} onChange={e => update('weight', e.target.value)} className="bg-gray-50 border-gray-300" />
          </div>
          <div>
            <Label className="text-sm text-[#65676b]">Species</Label>
            <Input value={form.species || ''} onChange={e => update('species', e.target.value)} className="bg-gray-50 border-gray-300" />
          </div>
        </div>
        <div>
          <Label className="text-sm text-[#65676b]">Bio</Label>
          <Textarea value={form.bio || ''} onChange={e => update('bio', e.target.value)} className="bg-gray-50 border-gray-300 min-h-[60px]" />
        </div>
        <div>
          <Label className="text-sm text-[#65676b]">Medical Info</Label>
          <Textarea value={form.medical_info || ''} onChange={e => update('medical_info', e.target.value)} className="bg-gray-50 border-gray-300" />
        </div>
        <Button data-testid={`save-pet-${pet.pet_id}`} onClick={handleSave} disabled={saving} className="bg-[#4080ff] hover:bg-[#3b5998] text-white gap-1.5 h-8 text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </Button>
      </div>
    </div>
  );
}

function NewPetForm({ authHeaders, API, onCreated }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    name: '', species: 'Dog', breed: '', age: '', bio: '', weight: '',
    personality_traits: [], favorite_activities: [], medical_info: '', is_breeder_profile: false
  });
  const [saving, setSaving] = useState(false);
  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleCreate = async () => {
    if (!form.name) { toast.error('Pet name is required'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/pets`, form, { headers: authHeaders() });
      toast.success(`${form.name} added!`);
      setShow(false);
      setForm({ name: '', species: 'Dog', breed: '', age: '', bio: '', weight: '', personality_traits: [], favorite_activities: [], medical_info: '', is_breeder_profile: false });
      if (onCreated) onCreated();
    } catch (e) {
      toast.error('Failed to create');
    }
    setSaving(false);
  };

  if (!show) {
    return (
      <Button data-testid="add-new-pet-btn" onClick={() => setShow(true)} variant="outline" className="w-full border-dashed border-gray-300 text-[#65676b] gap-1.5 h-12">
        <Plus className="w-4 h-4" /> Add Another Pet
      </Button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm" data-testid="new-pet-form">
      <div className="border-b border-gray-100 p-4 bg-gray-50/50 rounded-t-lg flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#1c1e21] flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#4080ff]" /> New Pet Profile
        </h3>
        <Button variant="ghost" onClick={() => setShow(false)} className="h-8 w-8 p-0"><X className="w-4 h-4" /></Button>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-sm text-[#65676b]">Name *</Label>
            <Input data-testid="new-pet-name" value={form.name} onChange={e => update('name', e.target.value)} className="bg-gray-50 border-gray-300" />
          </div>
          <div>
            <Label className="text-sm text-[#65676b]">Species</Label>
            <Select value={form.species} onValueChange={v => update('species', v)}>
              <SelectTrigger className="bg-gray-50 border-gray-300"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Dog">Dog</SelectItem>
                <SelectItem value="Cat">Cat</SelectItem>
                <SelectItem value="Bird">Bird</SelectItem>
                <SelectItem value="Fish">Fish</SelectItem>
                <SelectItem value="Reptile">Reptile</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-[#65676b]">Breed</Label>
            <Input value={form.breed} onChange={e => update('breed', e.target.value)} className="bg-gray-50 border-gray-300" />
          </div>
          <div>
            <Label className="text-sm text-[#65676b]">Age</Label>
            <Input value={form.age} onChange={e => update('age', e.target.value)} className="bg-gray-50 border-gray-300" />
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
          <input type="checkbox" checked={form.is_breeder_profile} onChange={e => update('is_breeder_profile', e.target.checked)} className="rounded border-gray-300" />
          <span className="text-sm text-[#1c1e21]">Breeder profile</span>
        </div>
        <div className="flex gap-2">
          <Button data-testid="create-new-pet-btn" onClick={handleCreate} disabled={saving} className="bg-[#42b72a] hover:bg-[#36a420] text-white gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PawPrint className="w-4 h-4" />} Create Pet
          </Button>
          <Button variant="outline" onClick={() => setShow(false)} className="border-gray-300">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
