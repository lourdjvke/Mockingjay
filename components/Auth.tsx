
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Chrome } from 'lucide-react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

const Auth: React.FC = () => {
  const [phase, setPhase] = useState('initial'); // initial, snapped, moved-up
  const [activeField, setActiveField] = useState<'name' | 'email' | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation Sequence
  useEffect(() => {
    const snapTimer = setTimeout(() => setPhase('snapped'), 100);
    const moveTimer = setTimeout(() => {
      setPhase('moved-up');
      setIsLoaded(true);
    }, 2500);

    return () => {
      clearTimeout(snapTimer);
      clearTimeout(moveTimer);
    };
  }, []);

  const letters = "ockingjay".split("");

  const handleFocus = (field: 'name' | 'email') => setActiveField(field);
  const handleBlur = () => {
    setTimeout(() => {
      if (!['nameInput', 'emailInput'].includes(document.activeElement?.id || '')) {
        setActiveField(null);
      }
    }, 150);
  };

  const handleAuthAction = async () => {
    setError(null);
    if ((!isLogin && !name) || !email || !password) {
        setError("Please fill in all fields.");
        return;
    }
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', ''));
    }
  };

  return (
    <div className="flex justify-center items-end h-screen w-screen bg-white overflow-hidden font-sans select-none">
      <div className="relative w-full max-w-[400px] h-full flex flex-col">
        
        {/* Text Transition Layer */}
        <div 
          className={`absolute flex justify-center items-center transition-all duration-[800ms] ease-[cubic-bezier(0.7,0,0.3,1)] whitespace-nowrap z-10 left-1/2
            ${phase === 'initial' ? 'top-1/2 -translate-x-1/2 -translate-y-1/2 scale-100' : ''}
            ${phase === 'snapped' ? 'top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.4]' : ''}
            ${phase === 'moved-up' ? 'top-[10%] -translate-x-1/2 translate-y-0 scale-[0.4]' : ''}
          `}
        >
          <div className="text-[4rem] font-[900] uppercase flex gap-[0.05em] text-black transition-colors duration-500">
            <span style={{ fontFamily: '"Archivo Black", sans-serif' }}>M</span>
            {letters.map((char, i) => (
              <span 
                key={i} 
                className={`inline-block min-w-[0.6em] text-center transition-all ${!isLoaded ? 'animate-font-cycle' : 'font-sans'}`}
                style={{ 
                  animationDelay: !isLoaded ? `${((i % 4) + 1) * 0.3}s` : '0s',
                  animationIterationCount: 'infinite',
                  animationDuration: '2.4s',
                  animationTimingFunction: 'steps(1)'
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div 
          className={`absolute bottom-10 w-[90%] left-[5%] flex flex-col gap-3 transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]
            ${isLoaded ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}
          `}
        >
          {!isLogin ? (
             <div className="flex gap-2.5 items-center h-12">
                <div className={`relative h-full flex items-center transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${activeField === 'email' ? 'flex-[0_0_48px]' : 'flex-1'}`}>
                  <User 
                    size={20}
                    className={`absolute left-4 transition-all duration-300 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] z-20 ${activeField === 'email' ? 'left-1/2 -translate-x-1/2 scale-125 text-[#906efc] cursor-pointer' : 'text-gray-400'}`}
                    onClick={() => document.getElementById('nameInput')?.focus()}
                  />
                  <input 
                    id="nameInput"
                    type="text" 
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => handleFocus('name')}
                    onBlur={handleBlur}
                    className={`w-full h-full pl-[45px] pr-5 rounded-[50px] border border-gray-200 outline-none text-[0.85rem] bg-white focus:border-[#906efc] transition-opacity duration-300 ${activeField === 'email' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  />
                </div>
                <div className={`relative h-full flex items-center transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${activeField === 'name' ? 'flex-[0_0_48px]' : 'flex-1'}`}>
                  <Mail 
                    size={20}
                    className={`absolute left-4 transition-all duration-300 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] z-20 ${activeField === 'name' ? 'left-1/2 -translate-x-1/2 scale-125 text-[#906efc] cursor-pointer' : 'text-gray-400'}`}
                    onClick={() => document.getElementById('emailInput')?.focus()}
                  />
                  <input 
                    id="emailInput"
                    type="email" 
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => handleFocus('email')}
                    onBlur={handleBlur}
                    className={`w-full h-full pl-[45px] pr-5 rounded-[50px] border border-gray-200 outline-none text-[0.85rem] bg-white focus:border-[#906efc] transition-opacity duration-300 ${activeField === 'name' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  />
                </div>
              </div>
          ) : (
            <div className="relative h-12 flex items-center">
                <Mail size={20} className="absolute left-4 text-gray-400 z-20" />
                <input 
                    type="email" 
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-full pl-[45px] pr-5 rounded-[50px] border border-gray-200 outline-none text-[0.85rem] bg-white focus:border-[#906efc] transition-all"
                />
            </div>
          )}

          <div className="relative flex items-center h-12">
            <Lock size={20} className="absolute left-4 text-gray-400 z-20" />
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuthAction()}
              className="w-full h-full pl-[45px] pr-5 rounded-[50px] border border-gray-200 outline-none text-[0.85rem] bg-white focus:border-[#906efc] transition-all"
            />
          </div>
          
          {error && <p className="text-red-500 text-xs text-center font-semibold px-4">{error}</p>}

          <button onClick={handleAuthAction} className="w-full py-3.5 mt-2 rounded-[50px] font-semibold text-[0.9rem] cursor-pointer border-2 border-[#906efc] text-[#906efc] bg-transparent transition-all duration-400 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] hover:bg-[#906efc] hover:text-white hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_10px_20px_rgba(144,110,252,0.2)] active:scale-[0.92]">
            {isLogin ? 'Login' : 'Sign up'}
          </button>

          <button onClick={handleGoogleSignIn} className="w-full py-3.5 rounded-[50px] font-semibold text-[0.9rem] cursor-pointer border-none text-white bg-[linear-gradient(135deg,#5b86e5_0%,#906efc_100%)] flex items-center justify-center gap-2.5 shadow-[0_4px_10px_rgba(91,134,229,0.15)] transition-all duration-400 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] hover:brightness-[1.08] hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_10px_20px_rgba(91,134,229,0.25)] active:scale-[0.92]">
            <Chrome size={18} />
            Continue with Google
          </button>

          <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-xs text-center text-gray-500 hover:text-black mt-2 font-semibold">
            {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Bebas+Neue&family=Courier+Prime&family=Inter:wght@400;700&family=Playfair+Display&family=Space+Mono&family=Unbounded&display=swap');
        @keyframes font-cycle {
          0% { font-family: 'Inter', sans-serif; }
          14% { font-family: 'Playfair Display', serif; }
          28% { font-family: 'Space Mono', monospace; }
          42% { font-family: 'Unbounded', cursive; }
          56% { font-family: 'Courier Prime', monospace; }
          70% { font-family: 'Bebas Neue', cursive; }
          85% { font-family: 'Archivo Black', sans-serif; }
          100% { font-family: 'Inter', sans-serif; }
        }
        .animate-font-cycle {
          animation: font-cycle 2.4s steps(1) infinite;
        }
      `}} />
    </div>
  );
};

export default Auth;
