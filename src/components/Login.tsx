import React, { useState } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Lock, Mail, ServerCrash, Cpu } from 'lucide-react';

const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
    <path
      fill="#EA4335"
      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3A11.966 11.966 0 0 0 12 .5C6.463.5 1.767 4.148.291 9.205l4.975.56z"
    />
    <path
      fill="#34A853"
      d="M16.04 15.34C14.945 16.29 13.522 16.9 12 16.9c-2.95 0-5.5-1.928-6.386-4.59L.577 12.83A11.965 11.965 0 0 0 12 23.5c3.086 0 5.922-1.077 8.082-2.914l-4.04-3.246z"
    />
    <path
      fill="#4285F4"
      d="M23.49 12.277c0-.796-.064-1.636-.21-2.409H12v4.577h6.495a5.545 5.545 0 0 1-2.41 3.655l4.04 3.245c2.368-2.182 3.365-5.386 3.365-8.914z"
    />
    <path
      fill="#FBBC05"
      d="M5.614 12.31a6.973 6.973 0 0 1 0-2.545L.64 9.205a11.936 11.936 0 0 0 0 6.64l4.974-.56a7.03 7.03 0 0 1 0-2.975z"
    />
  </svg>
);

interface LoginProps {
  onBypass: () => void;
}

export const Login: React.FC<LoginProps> = ({ onBypass }) => {
  const { isFirebase, login, register } = useFirebase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign‑In handler
  const handleGoogleLogin = async () => {
    if (!isFirebase || !auth) {
      setError('Firebase not configured.');
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Google sign‑in failed.');
    }
  };


  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Cpu size={40} className="text-primary" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1>Apex Portal</h1>
          <p>Operational Dashboard & Invoice Compiler</p>
        </div>

        {isFirebase ? (
          <>
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="auth-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-ops-muted)' }} />
                  <input
                    type="email"
                    id="email"
                    required
                    className="form-input"
                    style={{ paddingLeft: '32px', width: '100%' }}
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-ops-muted)' }} />
                  <input
                    type="password"
                    id="password"
                    required
                    className="form-input"
                    style={{ paddingLeft: '32px', width: '100%' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                {loading ? 'Processing...' : isRegistering ? 'Create Freelancer Account' : 'Authenticate Console'}
              </button>
            </form>
            <button onClick={handleGoogleLogin} className="btn-primary" style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GoogleIcon style={{ marginRight: '8px' }} />
              Sign in with Google
            </button>

            <div className="auth-toggle">
              {isRegistering ? (
                <span>
                  Already registered?
                  <button onClick={() => setIsRegistering(false)}>Login</button>
                </span>
              ) : (
                <span>
                  New freelancer?
                  <button onClick={() => setIsRegistering(true)}>Create Account</button>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-ops)' }}></div>
              <span style={{ padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--text-ops-muted)' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-ops)' }}></div>
            </div>

            <button onClick={onBypass} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Enter Offline Workspace
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div className="offline-notice" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
              <ServerCrash size={24} style={{ color: 'var(--color-warning)', marginBottom: '0.5rem' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-ops-primary)' }}>Offline Sandbox Active</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Firebase settings not detected. Your clients and billing records will save locally to this device.
              </p>
            </div>
            <button onClick={onBypass} className="btn-primary" style={{ width: '100%' }}>
              Launch Control Center
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
