import React, { useState } from 'react';
import { Icons } from './IconLibrary.tsx';
import { signInWithGoogle } from '../firebase.ts';

interface LoginPageProps {
  onSignedIn: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSignedIn }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      onSignedIn();
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Icons.Layout className="w-10 h-10 text-lime-400" />
          </div>
          <h1 className="text-4xl font-bold italic tracking-tight uppercase text-white mb-3">Mockingjay</h1>
          <p className="text-white/30 text-sm">Professional design editor powered by AI</p>
        </div>

        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-6">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white text-black h-14 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </button>
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        </div>

        <p className="text-white/15 text-[10px] text-center mt-8 uppercase tracking-widest">
          By signing in you agree to save your designs securely
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
