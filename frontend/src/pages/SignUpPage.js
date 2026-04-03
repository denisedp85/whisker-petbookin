import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { PawPrint, ArrowLeft, ArrowRight, User, Shield, X } from 'lucide-react';

export default function SignUpPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', name: '',
    owner_bio: '', owner_hobbies: '', owner_interests: '',
    kennel_club: '', kennel_registration: '',
    pet_name: '', pet_species: 'Dog', pet_breed: '', pet_age: '',
    pet_bio: '', pet_weight: '', pet_personality: [],
    pet_activities: [], pet_medical: '', is_breeder: false
  });
  const [traitInput, setTraitInput] = useState('');
  const [activityInput, setActivityInput] = useState('');

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const addTrait = () => {
    if (traitInput.trim() && form.pet_personality.length < 10) {
      update('pet_personality', [...form.pet_personality, traitInput.trim()]);
      setTraitInput('');
    }
  };
  const addActivity = () => {
    if (activityInput.trim() && form.pet_activities.length < 10) {
      update('pet_activities', [...form.pet_activities, activityInput.trim()]);
      setActivityInput('');
    }
  };

  const handleSubmit = async () => {
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register({
        email: form.email, password: form.password, name: form.name,
        owner_bio: form.owner_bio, owner_hobbies: form.owner_hobbies,
        owner_interests: form.owner_interests,
        kennel_club: form.kennel_club, kennel_registration: form.kennel_registration
      });
      // Now create pet
      const API = process.env.REACT_APP_BACKEND_URL + '/api';
      const token = localStorage.getItem('pawbook_token');
      await fetch(`${API}/pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.pet_name, species: form.pet_species, breed: form.pet_breed,
          age: form.pet_age, bio: form.pet_bio, weight: form.pet_weight,
          personality_traits: form.pet_personality, favorite_activities: form.pet_activities,
          medical_info: form.pet_medical, is_breeder_profile: form.is_breeder
        })
      });
      navigate('/feed');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Header */}
      <div className="bg-[#3b5998] py-3 px-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <PawPrint className="w-7 h-7 text-white" />
          <Link to="/" className="text-white text-xl font-bold font-['Archivo_Narrow'] hover:opacity-90">Petbookin</Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Progress */}
          <div className="bg-gray-50 border-b border-gray-200 p-4">
            <h2 className="text-2xl font-bold text-[#1c1e21] font-['Archivo_Narrow']">Sign Up</h2>
            <p className="text-sm text-[#65676b] mt-1">Step {step} of 3</p>
            <div className="flex gap-2 mt-3">
              {[1, 2, 3].map(s => (
                <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-[#4080ff]' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div data-testid="signup-error" className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200 mb-4">
                {error}
              </div>
            )}

            {/* Step 1: Account */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-[#4080ff]" />
                  <h3 className="text-lg font-semibold text-[#1c1e21]">Your Account</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-[#65676b]">Full Name</Label>
                    <Input data-testid="signup-name" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" className="bg-gray-50 border-gray-300" required />
                  </div>
                  <div>
                    <Label className="text-sm text-[#65676b]">Email</Label>
                    <Input data-testid="signup-email" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="Email" className="bg-gray-50 border-gray-300" required />
                  </div>
                  <div>
                    <Label className="text-sm text-[#65676b]">Password</Label>
                    <Input data-testid="signup-password" type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Password" className="bg-gray-50 border-gray-300" required />
                  </div>
                  <div>
                    <Label className="text-sm text-[#65676b]">Confirm Password</Label>
                    <Input data-testid="signup-confirm-password" type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} placeholder="Confirm password" className="bg-gray-50 border-gray-300" required />
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <h4 className="text-base font-medium text-[#1c1e21] mb-3">About You (Owner/Breeder)</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-[#65676b]">Short Bio</Label>
                      <Textarea data-testid="signup-owner-bio" value={form.owner_bio} onChange={e => update('owner_bio', e.target.value)} placeholder="Tell us a bit about yourself..." className="bg-gray-50 border-gray-300 min-h-[80px]" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-[#65676b]">Hobbies</Label>
                        <Input data-testid="signup-hobbies" value={form.owner_hobbies} onChange={e => update('owner_hobbies', e.target.value)} placeholder="Hiking, reading..." className="bg-gray-50 border-gray-300" />
                      </div>
                      <div>
                        <Label className="text-sm text-[#65676b]">Interests</Label>
                        <Input data-testid="signup-interests" value={form.owner_interests} onChange={e => update('owner_interests', e.target.value)} placeholder="Dog training, photography..." className="bg-gray-50 border-gray-300" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button data-testid="google-signup-btn" onClick={loginWithGoogle} variant="outline" className="w-full border-gray-300 hover:bg-gray-50 text-[#1c1e21] gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Sign up with Google instead
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Pet Profile */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <PawPrint className="w-5 h-5 text-[#4080ff]" />
                  <h3 className="text-lg font-semibold text-[#1c1e21]">Your Pet's Profile</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-[#65676b]">Pet Name *</Label>
                    <Input data-testid="signup-pet-name" value={form.pet_name} onChange={e => update('pet_name', e.target.value)} placeholder="Buddy" className="bg-gray-50 border-gray-300" required />
                  </div>
                  <div>
                    <Label className="text-sm text-[#65676b]">Species</Label>
                    <Select value={form.pet_species} onValueChange={v => update('pet_species', v)}>
                      <SelectTrigger data-testid="signup-species" className="bg-gray-50 border-gray-300"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dog">Dog</SelectItem>
                        <SelectItem value="Cat">Cat</SelectItem>
                        <SelectItem value="Bird">Bird</SelectItem>
                        <SelectItem value="Fish">Fish</SelectItem>
                        <SelectItem value="Reptile">Reptile</SelectItem>
                        <SelectItem value="Small Animal">Small Animal</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-[#65676b]">Breed</Label>
                    <Input data-testid="signup-breed" value={form.pet_breed} onChange={e => update('pet_breed', e.target.value)} placeholder="Golden Retriever" className="bg-gray-50 border-gray-300" />
                  </div>
                  <div>
                    <Label className="text-sm text-[#65676b]">Age</Label>
                    <Input data-testid="signup-age" value={form.pet_age} onChange={e => update('pet_age', e.target.value)} placeholder="3 years" className="bg-gray-50 border-gray-300" />
                  </div>
                  <div>
                    <Label className="text-sm text-[#65676b]">Weight</Label>
                    <Input data-testid="signup-weight" value={form.pet_weight} onChange={e => update('pet_weight', e.target.value)} placeholder="30 lbs" className="bg-gray-50 border-gray-300" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-[#65676b]">Bio</Label>
                  <Textarea data-testid="signup-pet-bio" value={form.pet_bio} onChange={e => update('pet_bio', e.target.value)} placeholder="Tell us about your pet..." className="bg-gray-50 border-gray-300 min-h-[80px]" />
                </div>
                <div>
                  <Label className="text-sm text-[#65676b]">Personality Traits</Label>
                  <div className="flex gap-2 mt-1">
                    <Input data-testid="signup-trait-input" value={traitInput} onChange={e => setTraitInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTrait())} placeholder="e.g. Playful" className="bg-gray-50 border-gray-300 flex-1" />
                    <Button data-testid="add-trait-btn" type="button" onClick={addTrait} variant="outline" className="border-gray-300">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.pet_personality.map((t, i) => (
                      <Badge key={`feat-${i}-${Math.random().toString(36).slice(2,6)}`} className="bg-blue-50 text-[#3b5998] border-blue-200 gap-1">
                        {t}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => update('pet_personality', form.pet_personality.filter((_, j) => j !== i))} />
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-[#65676b]">Favorite Activities</Label>
                  <div className="flex gap-2 mt-1">
                    <Input data-testid="signup-activity-input" value={activityInput} onChange={e => setActivityInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addActivity())} placeholder="e.g. Fetch" className="bg-gray-50 border-gray-300 flex-1" />
                    <Button data-testid="add-activity-btn" type="button" onClick={addActivity} variant="outline" className="border-gray-300">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.pet_activities.map((a, i) => (
                      <Badge key={`perk-${i}-${Math.random().toString(36).slice(2,6)}`} className="bg-green-50 text-green-700 border-green-200 gap-1">
                        {a}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => update('pet_activities', form.pet_activities.filter((_, j) => j !== i))} />
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-[#65676b]">Medical Info (optional)</Label>
                  <Textarea data-testid="signup-medical" value={form.pet_medical} onChange={e => update('pet_medical', e.target.value)} placeholder="Allergies, medications, conditions..." className="bg-gray-50 border-gray-300" />
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <input data-testid="signup-breeder-check" type="checkbox" checked={form.is_breeder} onChange={e => update('is_breeder', e.target.checked)} className="rounded border-gray-300 text-[#4080ff]" />
                  <span className="text-sm text-[#1c1e21]">This is a breeder/breeding species profile</span>
                </div>
              </div>
            )}

            {/* Step 3: Kennel Club */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-[#4080ff]" />
                  <h3 className="text-lg font-semibold text-[#1c1e21]">Kennel Club Verification (Optional)</h3>
                </div>
                <p className="text-sm text-[#65676b]">
                  Add your kennel club registration for a verified breeder badge on your profile. This step is completely optional.
                </p>
                <div>
                  <Label className="text-sm text-[#65676b]">Kennel Club</Label>
                  <Select value={form.kennel_club} onValueChange={v => update('kennel_club', v)}>
                    <SelectTrigger data-testid="signup-kennel-club" className="bg-gray-50 border-gray-300"><SelectValue placeholder="Select kennel club" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AKC">American Kennel Club (AKC)</SelectItem>
                      <SelectItem value="CKC">Canadian Kennel Club (CKC)</SelectItem>
                      <SelectItem value="UKC">United Kennel Club (UKC)</SelectItem>
                      <SelectItem value="FCI">Federation Cynologique Internationale (FCI)</SelectItem>
                      <SelectItem value="KC">The Kennel Club (UK)</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-[#65676b]">Registration Number</Label>
                  <Input data-testid="signup-kennel-reg" value={form.kennel_registration} onChange={e => update('kennel_registration', e.target.value)} placeholder="e.g. AKC-123456789" className="bg-gray-50 border-gray-300" />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-[#3b5998]">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Verified breeders get a special badge on their profile, building trust within the Petbookin community.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
              {step > 1 ? (
                <Button data-testid="signup-back-btn" onClick={() => setStep(step - 1)} variant="outline" className="border-gray-300 gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              ) : (
                <Link to="/">
                  <Button variant="outline" className="border-gray-300 gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                  </Button>
                </Link>
              )}
              {step < 3 ? (
                <Button
                  data-testid="signup-next-btn"
                  onClick={() => {
                    if (step === 1 && (!form.name || !form.email || !form.password)) {
                      setError('Please fill in name, email, and password');
                      return;
                    }
                    if (step === 2 && !form.pet_name) {
                      setError('Please enter your pet\'s name');
                      return;
                    }
                    setError('');
                    setStep(step + 1);
                  }}
                  className="bg-[#4080ff] hover:bg-[#3b5998] text-white gap-1"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  data-testid="signup-submit-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-[#42b72a] hover:bg-[#36a420] text-white font-semibold gap-1"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
