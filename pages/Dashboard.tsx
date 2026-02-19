import React, { useState, useEffect } from 'react';
import { Icons } from '../components/IconLibrary.tsx';
import { BusinessDNA, Campaign } from '../types.ts';
import { ref, onValue, push, set } from 'firebase/database';
import { db, auth } from '../firebase.ts';

interface DashboardProps {
  onNavigate: (page: string, data?: any) => void;
  onSignOut: () => void;
  user: any;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onSignOut, user }) => {
  const [dnas, setDnas] = useState<BusinessDNA[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeTab, setActiveTab] = useState<'dnas' | 'campaigns'>('dnas');

  useEffect(() => {
    if (!user) return;

    const dnasRef = ref(db, `users/${user.uid}/dnas`);
    const campaignsRef = ref(db, `users/${user.uid}/campaigns`);

    const unsubDnas = onValue(dnasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
        setDnas(list.sort((a, b) => b.createdAt - a.createdAt));
      }
    });

    const unsubCampaigns = onValue(campaignsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
        setCampaigns(list.sort((a, b) => b.createdAt - a.createdAt));
      }
    });

    return () => {
      unsubDnas();
      unsubCampaigns();
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white">
      <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lime-400/10 rounded-xl flex items-center justify-center">
              <Icons.Layout className="w-5 h-5 text-lime-400" />
            </div>
            <div>
              <h1 className="font-bold italic uppercase tracking-tight">Pomelli</h1>
              <p className="text-xs text-white/40">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.photoURL && (
              <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border-2 border-white/10" />
            )}
            <button
              onClick={onSignOut}
              className="text-white/60 hover:text-white transition-colors text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="mb-8">
          <h2 className="text-3xl md:text-5xl font-serif italic mb-4">Welcome back, {user?.displayName?.split(' ')[0]}!</h2>
          <p className="text-white/60">Manage your brand identities and campaigns</p>
        </div>

        <div className="flex gap-2 mb-8 bg-zinc-800/40 p-2 rounded-2xl w-fit border border-white/10">
          <button
            onClick={() => setActiveTab('dnas')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'dnas' ? 'bg-lime-400 text-black' : 'text-white/60 hover:text-white'}`}
          >
            Business DNA ({dnas.length})
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'campaigns' ? 'bg-lime-400 text-black' : 'text-white/60 hover:text-white'}`}
          >
            Campaigns ({campaigns.length})
          </button>
        </div>

        {activeTab === 'dnas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Your Brand Identities</h3>
              <button
                onClick={() => onNavigate('business-dna')}
                className="bg-lime-400 text-black px-6 py-3 rounded-xl font-bold hover:bg-lime-300 transition-all active:scale-95 flex items-center gap-2"
              >
                <Icons.Plus className="w-5 h-5" />
                New DNA
              </button>
            </div>

            {dnas.length === 0 ? (
              <div className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-12 border border-white/10 text-center">
                <Icons.Sparkles className="w-16 h-16 text-white/10 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Business DNA yet</h3>
                <p className="text-white/60 mb-6">Create your first brand identity to get started</p>
                <button
                  onClick={() => onNavigate('business-dna')}
                  className="bg-lime-400 text-black px-8 py-3 rounded-xl font-bold hover:bg-lime-300 transition-all active:scale-95"
                >
                  Create Business DNA
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {dnas.map((dna) => (
                  <button
                    key={dna.id}
                    onClick={() => onNavigate('dna-detail', dna)}
                    className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-6 border border-white/10 hover:border-lime-400/30 transition-all group text-left"
                  >
                    {dna.logoUrl ? (
                      <div className="w-full aspect-video bg-zinc-900/50 rounded-xl mb-4 overflow-hidden flex items-center justify-center p-4">
                        <img src={dna.logoUrl} alt={dna.brandName} className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-zinc-900/50 rounded-xl mb-4 flex items-center justify-center">
                        <span className="text-5xl">🧬</span>
                      </div>
                    )}
                    <h4 className="font-bold text-lg mb-2 group-hover:text-lime-400 transition-colors">{dna.brandName}</h4>
                    <p className="text-sm text-white/60 mb-3 line-clamp-2">{dna.businessOverview}</p>
                    <div className="flex gap-1">
                      {dna.brandColors.slice(0, 5).map((color, i) => (
                        <div key={i} style={{ backgroundColor: color }} className="w-6 h-6 rounded-lg border border-white/10" />
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-white/40">
                      {new Date(dna.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Your Campaigns</h3>
              <button
                onClick={() => onNavigate('campaign-ideas')}
                className="bg-lime-400 text-black px-6 py-3 rounded-xl font-bold hover:bg-lime-300 transition-all active:scale-95 flex items-center gap-2"
              >
                <Icons.Plus className="w-5 h-5" />
                New Campaign
              </button>
            </div>

            {campaigns.length === 0 ? (
              <div className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-12 border border-white/10 text-center">
                <Icons.Wand2 className="w-16 h-16 text-white/10 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No campaigns yet</h3>
                <p className="text-white/60 mb-6">Create your first campaign to start designing</p>
                <button
                  onClick={() => onNavigate('campaign-ideas')}
                  className="bg-lime-400 text-black px-8 py-3 rounded-xl font-bold hover:bg-lime-300 transition-all active:scale-95"
                >
                  Create Campaign
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    onClick={() => onNavigate('editor', campaign)}
                    className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-6 border border-white/10 hover:border-lime-400/30 transition-all group text-left"
                  >
                    <div className="w-full aspect-video bg-zinc-900/50 rounded-xl mb-4 flex items-center justify-center">
                      <span className="text-5xl">📢</span>
                    </div>
                    <h4 className="font-bold text-lg mb-2 group-hover:text-lime-400 transition-colors">{campaign.name}</h4>
                    <p className="text-sm text-white/60 mb-3 line-clamp-2">{campaign.prompt}</p>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Icons.Layout className="w-4 h-4" />
                      <span>{campaign.pageCount} pages</span>
                    </div>
                    <div className="mt-3 text-xs text-white/40">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate('business-dna')}
            className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-6 hover:bg-teal-500/20 transition-all group"
          >
            <div className="text-4xl mb-3">🧬</div>
            <h3 className="font-bold mb-2 group-hover:text-teal-400 transition-colors">Generate Business DNA</h3>
            <p className="text-sm text-white/60">Analyze a website and extract brand identity</p>
          </button>

          <button
            onClick={() => onNavigate('campaign-ideas')}
            className="bg-lime-400/10 border border-lime-400/20 rounded-2xl p-6 hover:bg-lime-400/20 transition-all group"
          >
            <div className="text-4xl mb-3">📢</div>
            <h3 className="font-bold mb-2 group-hover:text-lime-400 transition-colors">Get Campaign Ideas</h3>
            <p className="text-sm text-white/60">Generate tailored marketing campaigns</p>
          </button>

          <button
            onClick={() => alert('Coming soon!')}
            className="bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-6 hover:bg-yellow-400/20 transition-all group"
          >
            <div className="text-4xl mb-3">✨</div>
            <h3 className="font-bold mb-2 group-hover:text-yellow-400 transition-colors">Generate Creatives</h3>
            <p className="text-sm text-white/60">Create high-quality on-brand visuals</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
