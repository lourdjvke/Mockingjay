import React, { useState, useEffect } from 'react';
import { Icons } from '../components/IconLibrary.tsx';

interface HomeProps {
  onNavigate: (page: 'business-dna' | 'campaign-ideas' | 'dashboard') => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const cards = [
    {
      id: 1,
      title: 'Generate Business DNA',
      description: 'Enter your website and we\'ll analyze your brand and business.',
      icon: '🧬',
      color: 'bg-teal-500/20',
      action: () => onNavigate('business-dna')
    },
    {
      id: 2,
      title: 'Get campaign ideas',
      description: 'We\'ll use your Business DNA to create tailored marketing ideas.',
      icon: '📢',
      color: 'bg-lime-400/20',
      action: () => onNavigate('campaign-ideas')
    },
    {
      id: 3,
      title: 'Generate creatives',
      description: 'We\'ll generate high quality, on-brand creatives that are ready to share.',
      icon: '✨',
      color: 'bg-yellow-400/20',
      action: () => alert('Coming soon!')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white flex flex-col items-center justify-center p-4 md:p-8">
      <div className="max-w-6xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-lime-400/10 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">🧪</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif italic tracking-tight">
            Welcome to Pomelli
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto">
            Easily generate on brand social media campaigns
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {cards.map((card, index) => (
            <div
              key={card.id}
              onClick={card.action}
              className={`
                bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/5
                hover:border-white/20 transition-all duration-500 cursor-pointer group
                transform hover:scale-105 active:scale-95
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
              `}
              style={{
                transitionDelay: `${index * 150}ms`
              }}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 text-2xl bg-zinc-700/30 rounded-2xl flex items-center justify-center mb-2">
                  {card.id}
                </div>

                <div className={`w-20 h-20 ${card.color} rounded-3xl flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-300`}>
                  {card.icon}
                </div>

                <h3 className="text-lg md:text-xl font-semibold italic">
                  {card.title}
                </h3>

                <p className="text-sm text-white/50 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="bg-lime-400 text-black px-12 py-4 rounded-full font-bold text-lg hover:bg-lime-300 transition-all active:scale-95 shadow-[0_10px_40px_rgba(163,230,53,0.3)] uppercase tracking-tight italic"
          >
            Let's go!
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
