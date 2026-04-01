import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Badge } from '../components/ui/badge';
import { Shield, MapPin, Award } from 'lucide-react';
import axios from 'axios';

export default function BreederDirectoryPage() {
  const { authHeaders, API } = useAuth();
  const [breeders, setBreeders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/breeder/directory`, { headers: authHeaders() });
        setBreeders(res.data.breeders || []);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, [API, authHeaders]);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="breeder-directory-page">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Breeder Directory</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : breeders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium">No breeders yet</p>
            <p className="text-sm mt-1">Be the first to register!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {breeders.map((b) => (
              <div key={b.user_id} className="rounded-2xl border border-border bg-card p-6 hover:shadow-md transition-shadow" data-testid={`breeder-${b.user_id}`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
                    {b.picture ? <img src={b.picture} alt="" className="w-full h-full object-cover" /> : <Shield className="w-7 h-7 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold" style={{ fontFamily: 'Outfit' }}>{b.name}</h3>
                      {b.breeder_info?.is_verified && (
                        <Badge className="bg-secondary text-secondary-foreground text-[10px] verified-badge">Verified</Badge>
                      )}
                      {b.membership_tier !== 'free' && (
                        <Badge variant="outline" className="text-[10px]">{b.membership_tier?.toUpperCase()}</Badge>
                      )}
                    </div>
                    {b.breeder_info?.kennel_name && (
                      <p className="text-sm text-muted-foreground">{b.breeder_info.kennel_name}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(b.breeder_info?.specializations || []).map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                      {(b.breeder_info?.external_credentials || []).map((c, i) => (
                        <Badge key={`cred-${i}`} className="bg-muted text-muted-foreground text-[10px]">
                          <Award className="w-2.5 h-2.5 mr-1" /> {c.registry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
