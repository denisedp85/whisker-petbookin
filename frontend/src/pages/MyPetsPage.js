import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { PawPrint, Plus, Pencil, Trash2, Sparkles, Camera } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

export default function MyPetsPage() {
  const { user, pets, fetchPets, authHeaders, API } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [form, setForm] = useState({ name: '', species: 'dog', breed: '', age: '', gender: '', bio: '' });
  const [loading, setLoading] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingPet) {
        await axios.put(`${API}/pets/${editingPet.pet_id}`, form, { headers: authHeaders() });
        toast.success('Pet updated!');
      } else {
        await axios.post(`${API}/pets`, form, { headers: authHeaders() });
        toast.success('Pet added!');
      }
      setShowAdd(false);
      setEditingPet(null);
      setForm({ name: '', species: 'dog', breed: '', age: '', gender: '', bio: '' });
      fetchPets();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
    setLoading(false);
  };

  const handleDelete = async (petId) => {
    if (!window.confirm('Delete this pet profile?')) return;
    try {
      await axios.delete(`${API}/pets/${petId}`, { headers: authHeaders() });
      toast.success('Pet removed');
      fetchPets();
    } catch (e) { console.error(e); }
  };

  const handleGenerateBio = async (petId) => {
    setGeneratingBio(petId);
    try {
      const res = await axios.post(`${API}/ai/generate-bio`, { pet_id: petId, style: 'friendly' }, { headers: authHeaders() });
      toast.success('Bio generated!');
      fetchPets();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'AI generation failed');
    }
    setGeneratingBio(null);
  };

  const startEdit = (pet) => {
    setEditingPet(pet);
    setForm({
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      age: pet.age || '',
      gender: pet.gender || '',
      bio: pet.bio || ''
    });
    setShowAdd(true);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="my-pets-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>My Pets</h1>
          <Button
            onClick={() => { setShowAdd(true); setEditingPet(null); setForm({ name: '', species: 'dog', breed: '', age: '', gender: '', bio: '' }); }}
            className="rounded-full bg-primary text-white hover:bg-primary/90"
            data-testid="add-pet-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Pet
          </Button>
        </div>

        {/* Add/Edit form */}
        {showAdd && (
          <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in-up" data-testid="pet-form">
            <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Outfit' }}>
              {editingPet ? 'Edit Pet' : 'Add New Pet'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="Pet name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="rounded-xl" data-testid="pet-name-input" />
                <select value={form.species} onChange={(e) => setForm({...form, species: e.target.value})} className="border border-border rounded-xl px-4 py-2.5 bg-background text-sm" data-testid="pet-species-select">
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                  <option value="bird">Bird</option>
                  <option value="horse">Horse</option>
                  <option value="rabbit">Rabbit</option>
                  <option value="fish">Fish</option>
                  <option value="reptile">Reptile</option>
                  <option value="hamster">Hamster</option>
                  <option value="ferret">Ferret</option>
                  <option value="guinea_pig">Guinea Pig</option>
                  <option value="exotic">Exotic</option>
                  <option value="other">Other</option>
                </select>
                <Input placeholder="Breed" value={form.breed} onChange={(e) => setForm({...form, breed: e.target.value})} className="rounded-xl" data-testid="pet-breed-input" />
                <Input placeholder="Age (e.g., 3 years)" value={form.age} onChange={(e) => setForm({...form, age: e.target.value})} className="rounded-xl" data-testid="pet-age-input" />
                <select value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})} className="border border-border rounded-xl px-4 py-2.5 bg-background text-sm" data-testid="pet-gender-select">
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="pet-submit-btn">
                  {loading ? 'Saving...' : editingPet ? 'Update' : 'Add Pet'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setEditingPet(null); }} className="rounded-full">Cancel</Button>
              </div>
            </form>
          </div>
        )}

        {/* Pet cards */}
        {pets.length === 0 ? (
          <div className="text-center py-16" data-testid="no-pets">
            <PawPrint className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No pets yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first pet to get started!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {pets.map((pet) => (
              <div key={pet.pet_id} className="rounded-2xl border border-border bg-card p-6 hover:shadow-md transition-shadow" data-testid={`pet-card-${pet.pet_id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <PawPrint className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold" style={{ fontFamily: 'Outfit' }}>{pet.name}</h3>
                        {pet.verified_breeder && (
                          <Badge className="bg-secondary text-secondary-foreground text-[10px] verified-badge">Verified</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{pet.breed || pet.species} {pet.age ? `- ${pet.age}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(pet)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" data-testid={`edit-pet-${pet.pet_id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(pet.pet_id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" data-testid={`delete-pet-${pet.pet_id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {pet.bio && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">{pet.bio}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateBio(pet.pet_id)}
                  disabled={generatingBio === pet.pet_id}
                  className="rounded-full text-xs"
                  data-testid={`ai-bio-btn-${pet.pet_id}`}
                >
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  {generatingBio === pet.pet_id ? 'Generating...' : 'AI Bio'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
