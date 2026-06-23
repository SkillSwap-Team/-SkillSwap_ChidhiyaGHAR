import { useState, useEffect, useRef } from 'react';
import { RobotCanvas } from './components/RobotCanvas';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { ProfileBuilder } from './components/ProfileBuilder';
import { Dashboard } from './components/Dashboard';
import { WhiteboardRoom } from './components/WhiteboardRoom';
import { Volume2, VolumeX, Activity, ShieldCheck } from 'lucide-react';
import { api } from './services/api';

type AppView = 'landing' | 'auth' | 'profile' | 'dashboard' | 'whiteboard';

interface UserProfile {
  name: string;
  age: number;
  college: string;
  branch: string;
  course: string;
  teachingSkills: string[];
  learningSkills: string[];
}

function App() {
  const [view, setView] = useState<AppView>('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [audioActive, setAudioActive] = useState(false);
  const cursorRef = useRef<HTMLDivElement | null>(null);

  // Visor states for Three.js robot
  const [visorState, setVisorState] = useState<'eyes' | 'quote' | 'swap' | 'success' | 'camera'>('eyes');

  // Onboarded Profile
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    age: 20,
    college: '',
    branch: '',
    course: '',
    teachingSkills: [],
    learningSkills: [],
  });

  // Whiteboard meet details
  const [activeRoom, setActiveRoom] = useState<{ tutor: string; student: string; skill: string } | null>(null);

  // Monitor page scrolling for mascot tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) {
        setScrollProgress(0);
        return;
      }
      const progress = scrollTop / scrollHeight;
      setScrollProgress(Math.min(1.0, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [view]);

  // Pointer follow cursor
  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const moveCursor = (e: MouseEvent) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    };

    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, []);

  const checkAuthAndSetView = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoggedIn(false);
      return;
    }

    try {
      console.log('[Session Check] Fetching profile from backend...');
      const res = await api.profile.getMyProfile();
      console.log('[Session Check] Profile response received:', res);
      if (res.data) {
        const prof = res.data;
        const teaching = prof.user_skills_offered?.map((s: any) => s.skills?.name).filter(Boolean) || [];
        const learning = prof.user_skills_wanted?.map((s: any) => s.skills?.name).filter(Boolean) || [];
        
        setUserProfile({
          name: prof.full_name || prof.users?.username || 'Cyber Node',
          age: 20,
          college: prof.location || 'Grid Network',
          branch: prof.city || 'General Engineering',
          course: prof.state_code || 'B.Tech',
          teachingSkills: teaching.length ? teaching : ['Python', 'React'],
          learningSkills: learning.length ? learning : ['C Language', 'UI/UX Design'],
        });

        setIsLoggedIn(true);

        const isComplete = prof.is_profile_complete || !!(prof.full_name && prof.location && prof.city);
        console.log('[Session Check] Profile complete:', isComplete, 'Routing to:', isComplete ? 'dashboard' : 'profile');

        if (isComplete) {
          setView('dashboard');
        } else {
          setView('profile');
        }
      } else {
        console.warn('[Session Check] Profile data is null, redirecting to landing...');
        localStorage.removeItem('access_token');
        setIsLoggedIn(false);
        setView('landing');
      }
    } catch (err: any) {
      console.error('[Session Check] Failed to retrieve user profile:', err);
      localStorage.removeItem('access_token');
      setIsLoggedIn(false);
      setView('landing');
    }
  };

  // Handle Supabase Auth Redirect hashes (e.g. email confirmation redirect)
  useEffect(() => {
    const handleHashAuth = async () => {
      const hash = window.location.hash;
      if (!hash) {
        // Normal mount flow
        checkAuthAndSetView();
        return;
      }

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken) {
        console.log('[Auth Callback] Detected access token in URL hash');
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
        
        // Clear the hash from address bar for clean URL
        window.history.replaceState(null, '', window.location.pathname);

        checkAuthAndSetView();
        setVisorState('success');
      }
    };

    handleHashAuth();
  }, []);

  const handleEnterRoom = (roomData: { tutor: string; student: string; skill: string }) => {
    setActiveRoom(roomData);
    setView('whiteboard');
  };

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      setIsLoggedIn(false);
      setVisorState('eyes');
      setView('landing');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <>
      {/* Custom Glowing Pointer Cursor */}
      <div ref={cursorRef} className="glow-cursor" />

      {/* Screen scanlines simulation */}
      <div className="scanlines" />

      {/* HUD Frame Borders */}
      <div className="hud-frame">
        <div className="hud-corner top-left"></div>
        <div className="hud-corner top-right"></div>
        <div className="hud-corner bottom-left"></div>
        <div className="hud-corner bottom-right"></div>
      </div>

      {/* Header bar */}
      <header 
        style={{ 
          height: '70px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 40px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          position: 'sticky',
          top: 0,
          background: 'rgba(7, 7, 9, 0.8)',
          backdropFilter: 'blur(10px)',
          zIndex: 99
        }}
      >
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          onClick={() => { setView('landing'); }}
        >
          <span style={{ fontSize: '1.4rem' }}>🛸</span>
          <span className="font-mono" style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.08em', color: '#fff' }}>
            SKILLSWAP // <span style={{ color: 'var(--color-cyan)' }}>CG</span>
          </span>
        </div>

        {/* Global HUD Stats & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }} className="font-mono">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <Activity size={12} color="var(--color-cyan)" className="pulse-cyan" />
              GRID STATUS: <span style={{ color: 'var(--color-green)' }}>ONLINE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <ShieldCheck size={12} color="var(--color-purple)" />
              VERIFIED_NODE
            </div>
            <button 
              onClick={() => setAudioActive(!audioActive)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              {audioActive ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>

          {isLoggedIn ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              {view !== 'dashboard' && view !== 'whiteboard' && (
                <button 
                  className="cyber-button font-mono" 
                  style={{ padding: '6px 12px', fontSize: '0.7rem', border: '1px solid rgba(0, 240, 255, 0.3)' }}
                  onClick={() => setView('dashboard')}
                >
                  DASHBOARD
                </button>
              )}
              {view !== 'profile' && (
                <button 
                  className="cyber-button font-mono" 
                  style={{ padding: '6px 12px', fontSize: '0.7rem', border: '1px solid rgba(0, 240, 255, 0.3)' }}
                  onClick={() => setView('profile')}
                >
                  PROFILE
                </button>
              )}
              <button 
                className="cyber-button purple font-mono" 
                style={{ padding: '6px 12px', fontSize: '0.7rem', border: '1px solid rgba(189, 0, 255, 0.3)' }}
                onClick={handleLogout}
              >
                LOG OUT
              </button>
            </div>
          ) : (
            view !== 'auth' && (
              <button 
                className="cyber-button font-mono" 
                style={{ padding: '6px 12px', fontSize: '0.7rem', border: '1px solid rgba(0, 240, 255, 0.3)' }}
                onClick={() => setView('auth')}
              >
                ENTER SYSTEM
              </button>
            )
          )}
        </div>
      </header>

      {/* Main View Grid */}
      <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        
        {/* Render Three.js Mascot */}
        <RobotCanvas 
          scrollProgress={scrollProgress} 
          activeSection={view}
          visorState={visorState}
        />

        {/* Dynamic page contents */}
        {view === 'landing' && (
          <LandingPage 
            scrollProgress={scrollProgress} 
            onNavigate={(nextView) => setView(nextView)} 
            setVisorState={setVisorState}
          />
        )}

        {view === 'auth' && (
          <AuthPage 
            onAuthSuccess={() => checkAuthAndSetView()}
            setVisorState={setVisorState}
          />
        )}

        {view === 'profile' && (
          <ProfileBuilder 
            onComplete={handleProfileComplete}
            setVisorState={setVisorState}
          />
        )}

        {view === 'dashboard' && (
          <Dashboard 
            userProfile={userProfile}
            onEnterRoom={handleEnterRoom}
            setVisorState={setVisorState}
          />
        )}

        {view === 'whiteboard' && activeRoom && (
          <WhiteboardRoom 
            roomData={activeRoom}
            onClose={() => setView('dashboard')}
            setVisorState={setVisorState}
          />
        )}

      </main>

      {/* Footer bar */}
      <footer 
        style={{ 
          height: '50px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)'
        }}
      >
        <span>COPYRIGHT © {new Date().getFullYear()} AWARDS_CHIDHIYAGHAR</span>
        <span>NODE // IIT_DELHI // NET_STABLE</span>
      </footer>
    </>
  );
}

export default App;
