import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { MapPin, Search, Stethoscope, Store, Trees, Scissors, Hotel, PawPrint, Phone, Globe, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const PLACE_TYPES = [
  { value: 'vet', label: 'Veterinarians', icon: Stethoscope, color: 'bg-red-100 text-red-600' },
  { value: 'pet_store', label: 'Pet Stores', icon: Store, color: 'bg-blue-100 text-blue-600' },
  { value: 'dog_park', label: 'Dog Parks', icon: Trees, color: 'bg-green-100 text-green-600' },
  { value: 'groomer', label: 'Groomers', icon: Scissors, color: 'bg-purple-100 text-purple-600' },
  { value: 'park', label: 'Parks', icon: Trees, color: 'bg-emerald-100 text-emerald-600' },
  { value: 'pet_friendly', label: 'Pet-Friendly', icon: PawPrint, color: 'bg-orange-100 text-orange-600' },
];

export default function MapPage() {
  const { authHeaders, API } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('vet');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState('');
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  // Initialize map
  useEffect(() => {
    let map = null;
    const initMap = async () => {
      if (!mapRef.current || mapRef.current._leaflet_id) return;

      const L = await import('leaflet');

      // Fix default marker icons
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      map = L.map(mapRef.current).setView([39.8283, -98.5795], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstance.current = map;

      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setCoords({ lat: latitude, lng: longitude });
            map.setView([latitude, longitude], 12);
            setLocationName('Your Location');
          },
          () => {}
        );
      }
    };

    const timer = setTimeout(initMap, 100);

    return () => {
      clearTimeout(timer);
      if (map) {
        map.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const handleGeocode = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/places/geocode?q=${encodeURIComponent(searchQuery)}`, { headers: authHeaders() });
      if (res.data.locations?.length > 0) {
        const loc = res.data.locations[0];
        setCoords({ lat: loc.lat, lng: loc.lng });
        setLocationName(loc.display_name.split(',').slice(0, 2).join(', '));
        if (mapInstance.current) {
          mapInstance.current.setView([loc.lat, loc.lng], 12);
        }
        await searchPlaces(loc.lat, loc.lng, selectedType);
      } else {
        toast.error('Location not found');
      }
    } catch {
      toast.error('Search failed');
    }
    setLoading(false);
  };

  const searchPlaces = async (lat, lng, type, forceRefresh = false) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/places/search?lat=${lat}&lng=${lng}&type=${type}&radius=25000${forceRefresh ? '&refresh=true' : ''}`, { headers: authHeaders() });
      setPlaces(res.data.places || []);
      updateMapMarkers(res.data.places || [], type);
      if (res.data.cached) {
        toast.info(`Showing cached results. Tap Refresh for latest data.`);
      }
      if (res.data.places?.length === 0) {
        toast.info('No places found nearby. Try a larger area or different type.');
      }
    } catch {
      toast.error('Search failed');
    }
    setLoading(false);
  };

  const updateMapMarkers = async (places, type) => {
    const L = await import('leaflet');

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!mapInstance.current) return;

    const typeInfo = PLACE_TYPES.find(t => t.value === type);
    const colorMap = {
      vet: '#EF4444', pet_store: '#3B82F6', dog_park: '#22C55E',
      groomer: '#A855F7', park: '#10B981', pet_friendly: '#F97316',
    };
    const color = colorMap[type] || '#FF7A6A';

    places.forEach(place => {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/></svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([place.lat, place.lng], { icon }).addTo(mapInstance.current);
      marker.bindPopup(`
        <div style="font-family:'Figtree',sans-serif;min-width:180px;">
          <strong style="font-size:14px;">${place.name}</strong>
          ${place.address ? `<br><span style="color:#8C7D76;font-size:12px;">${place.address}${place.city ? ', ' + place.city : ''}</span>` : ''}
          ${place.phone ? `<br><span style="font-size:12px;">Tel: ${place.phone}</span>` : ''}
        </div>
      `);
      markersRef.current.push(marker);
    });

    // Fit bounds
    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng]));
      mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  };

  const handleTypeChange = async (type) => {
    setSelectedType(type);
    if (coords) {
      await searchPlaces(coords.lat, coords.lng, type);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4" data-testid="map-page">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Pet-Friendly Places</h1>

        {/* Search bar */}
        <form onSubmit={handleGeocode} className="flex gap-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Enter city, zip code, or address (USA)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl pl-10"
              data-testid="map-search-input"
            />
          </div>
          <Button type="submit" disabled={loading} className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="map-search-btn">
            <Search className="w-4 h-4 mr-1.5" /> {loading ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {/* Type filters */}
        <div className="flex flex-wrap gap-2">
          {PLACE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleTypeChange(type.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                selectedType === type.value
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted'
              }`}
              data-testid={`map-type-${type.value}`}
            >
              <type.icon className="w-3.5 h-3.5" />
              {type.label}
            </button>
          ))}
        </div>

        {locationName && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Showing results near <span className="font-medium text-foreground">{locationName}</span>
              {places.length > 0 && <Badge variant="outline" className="ml-2 text-[10px]">{places.length} found</Badge>}
            </p>
            {coords && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => searchPlaces(coords.lat, coords.lng, selectedType, true)}
                disabled={loading}
                className="rounded-full text-xs gap-1.5"
                data-testid="map-refresh-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            )}
          </div>
        )}

        {/* Map and results */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-4">
          {/* Map */}
          <div className="rounded-2xl border border-border overflow-hidden bg-muted" style={{ height: '500px' }}>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} data-testid="map-container" />
          </div>

          {/* Results list */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto" data-testid="places-list">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Searching nearby...</p>
              </div>
            ) : places.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Search for a location to find pet-friendly places</p>
                <p className="text-xs mt-1">Enter a city, zip code, or address above</p>
              </div>
            ) : (
              places.map((place, i) => {
                const typeInfo = PLACE_TYPES.find(t => t.value === place.type);
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.03}s` }}
                    onClick={() => {
                      if (mapInstance.current) {
                        mapInstance.current.setView([place.lat, place.lng], 16);
                        markersRef.current[i]?.openPopup();
                      }
                    }}
                    data-testid={`place-${i}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo?.color || 'bg-muted text-muted-foreground'}`}>
                        {typeInfo?.icon ? <typeInfo.icon className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{place.name}</h4>
                        {(place.address || place.city) && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {[place.address, place.city, place.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {place.phone && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Phone className="w-2.5 h-2.5" /> {place.phone}
                            </span>
                          )}
                          {place.opening_hours && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="w-2.5 h-2.5" /> {place.opening_hours}
                            </span>
                          )}
                          {place.website && (
                            <a href={place.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                              <Globe className="w-2.5 h-2.5" /> Website
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
