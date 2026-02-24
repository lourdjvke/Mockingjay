import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Chrome } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

const Auth: React.FC = () => {
  const [phase, setPhase] = useState('initial'); // initial, snapped, moved-up
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleFocus = (field: string) => setActiveField(field);
  const handleBlur = () => {
      if (!['nameInput', 'emailInput'].includes(document.activeElement?.id || '')) {
        setActiveField(null);
      }
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
      // No onLogin call needed. App.tsx listener will handle the user state change.
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // No onLogin call needed.
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
          <div className="text-[4rem] font-[900] uppercase flex gap-[0.05em] text-black transition-colors duration-500" style={{fontFamily: '''"Archivo Black", sans-serif'''}}>
            <span>M</span>
            {letters.map((char, i) => (
              <span 
                key={i} 
                className={`inline-block min-w-[0.6em] text-center transition-all ${!isLoaded ? 'animate-font-cycle' : ''}`}
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
          {!isLogin && (
            <div className={`relative h-12 flex items-center transition-all duration-300 ease-in-out`}>
              <User size={20} className="absolute left-4 text-gray-400 z-10" />
              <input 
                id="nameInput"
                type="text" 
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => handleFocus('name')}
                onBlur={handleBlur}
                className="w-full h-full pl-12 pr-5 rounded-full border border-gray-200 outline-none text-sm bg-white focus:border-lime-500 transition-colors"
              />
            </div>
          )}

          <div className={`relative h-12 flex items-center transition-all duration-300 ease-in-out`}>
            <Mail size={20} className="absolute left-4 text-gray-400 z-10" />
            <input 
              id="emailInput"
              type="email" 
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => handleFocus('email')}
              onBlur={handleBlur}
              className="w-full h-full pl-12 pr-5 rounded-full border border-gray-200 outline-none text-sm bg-white focus:border-lime-500 transition-colors"
            />
          </div>

          <div className="relative flex items-center h-12">
            <Lock size={20} className="absolute left-4 text-gray-400 z-10" />
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuthAction()}
              className="w-full h-full pl-12 pr-5 rounded-full border border-gray-200 outline-none text-sm bg-white focus:border-lime-500 transition-colors"
            />
          </div>
            
          {error && <p className="text-red-500 text-xs text-center font-semibold px-4">{error}</p>}

          <button onClick={handleAuthAction} className="w-full mt-2 py-3.5 rounded-full font-bold text-sm cursor-pointer text-white bg-gray-800 transition-all duration-300 ease-in-out hover:bg-gray-900 active:scale-95 transform">
            {isLogin ? 'Continue' : 'Create Account'}
          </button>

          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs font-semibold text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <button onClick={handleGoogleSignIn} className="w-full py-3 rounded-full font-semibold text-sm cursor-pointer border border-gray-200 text-gray-700 bg-white flex items-center justify-center gap-2.5 transition-all duration-300 ease-in-out hover:bg-gray-50 active:scale-95 transform">
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
