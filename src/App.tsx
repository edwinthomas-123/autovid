import React, { useState, useEffect, useRef } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import './index.css';

const captionStyles = [
  { id: 'HORMOZI', name: 'Viral Hormozi', example: 'YOU NEED THIS NOW!', bg: '#000000', color: '#bef264' },
  { id: 'MRBEAST', name: 'Mr Beast Style', example: 'WATCH UNTIL THE END!', bg: '#facc15', color: '#000000' },
  { id: 'BOLD', name: 'Bold Yellow', example: 'THE SECRET OF SUCCESS', bg: '#fef9c3', color: '#854d0e' },
  { id: 'DYNAMICS', name: 'Dynamic White', example: 'MODERN & MINIMAL', bg: '#f8fafc', color: '#1e293b' },
  { id: 'GLOW', name: 'Neon Glow', example: 'FUTURE IS NOW', bg: '#000000', color: '#22d3ee' },
  { id: 'MINIMAL', name: 'Minimalist', example: 'Clean and simple captions', bg: '#ffffff', color: '#64748b' }
];

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : 'https://wellvid.tech';

const voices = [
  // --- NATURAL (Edge-TTS) ---
  { id: 'Natural-Guy', name: 'Natural Guy', desc: 'Smooth & Professional (Edge)', preview: '/voices/edge_guy.mp3' },
  { id: 'Natural-Jenny', name: 'Natural Jenny', desc: 'Warm & Friendly (Edge)', preview: '/voices/edge_jenny.mp3' },
  { id: 'Natural-Aria', name: 'Natural Aria', desc: 'Polished Narrator (Edge)', preview: '/voices/edge_aria.mp3' },
  { id: 'Natural-Sonia', name: 'Natural Sonia', desc: 'British Elegance (Edge)', preview: '/voices/edge_sonia.mp3' },
  { id: 'Natural-News', name: 'Natural News', desc: 'Authoritative News (Edge)', preview: '/voices/edge_news.mp3' },

  // --- EXPRESSIVE (Kokoro) ---
  { id: 'Expressive-Sarah', name: 'Expressive Sarah', desc: 'Life-like & Human (Kokoro)', preview: '/voices/kokoro_sarah.mp3' },
  { id: 'Expressive-Adam', name: 'Expressive Adam', desc: 'Deep & Natural (Kokoro)', preview: '/voices/kokoro_adam.mp3' },
  { id: 'Expressive-Bella', name: 'Expressive Bella', desc: 'Clear & Engaging (Kokoro)', preview: '/voices/kokoro_bella.mp3' },
  { id: 'Expressive-Nicole', name: 'Expressive Nicole', desc: 'Soft & Natural (Kokoro)', preview: '/voices/kokoro_nicole.mp3' },
  { id: 'Expressive-Michael', name: 'Expressive Michael', desc: 'Rich Narrative (Kokoro)', preview: '/voices/kokoro_michael.mp3' },

  // --- VIRAL (Piper) ---
  { id: 'US-Female-Viral', name: 'Piper Female', desc: 'Fast & Viral (Free)', preview: '/voices/piper_female.mp3' },
  { id: 'US-Male-Story', name: 'Piper Male', desc: 'Deep Storyteller (Free)', preview: '/voices/piper_male.mp3' },
  { id: 'British-Premium', name: 'Piper British', desc: 'Elegant & Polished (Free)', preview: '/voices/piper_british.mp3' },
  { id: 'Indian-English', name: 'Piper Indian', desc: 'Relatable (Free)', preview: '/voices/piper_indian.mp3' },
  
  // --- PREMIUM (ElevenLabs) ---
  { id: 'Rachel', name: 'Rachel', desc: 'Calm & Clear (API)', preview: '/voices/rachel.mp3' },
  { id: 'Adam', name: 'Adam', desc: 'Deep & Authoritative (API)', preview: '/voices/adam.mp3' },
  { id: 'Bella', name: 'Bella', desc: 'Warm & Friendly (API)', preview: '/voices/bella.mp3' },
  { id: 'Antoni', name: 'Antoni', desc: 'Professional (API)', preview: '/voices/antoni.mp3' },
  { id: 'Elli', name: 'Elli', desc: 'Young & Energetic (API)', preview: '/voices/elli.mp3' },
  { id: 'Josh', name: 'Josh', desc: 'Rich & Deep (API)', preview: '/voices/josh.mp3' },
];

function VoiceSelector({ selectedVoice, onSelect }: { selectedVoice: string, onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const playVoice = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(err => {
      console.error('Playback failed:', err);
    });
  };

  const filteredVoices = voices.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    v.desc.toLowerCase().includes(search.toLowerCase()) ||
    v.id.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [
    { title: 'Natural (Cloud)', items: filteredVoices.filter(v => v.id.startsWith('Natural-')) },
    { title: 'Expressive (Local)', items: filteredVoices.filter(v => v.id.startsWith('Expressive-')) },
    { title: 'Viral (Local)', items: filteredVoices.filter(v => v.id.startsWith('US-Female-Viral') || v.id.startsWith('US-Male-Story') || v.id.includes('British-Premium') || v.id.includes('Indian-English')) },
    { title: 'Premium (API)', items: filteredVoices.filter(v => !v.id.startsWith('Natural-') && !v.id.startsWith('Expressive-') && !v.id.startsWith('US-') && !v.id.includes('British-Premium') && !v.id.includes('Indian-English')) }
  ].filter(c => c.items.length > 0);

  return (
    <div>
      <div style={{marginBottom: '1rem', position: 'relative'}}>
        <input 
          type="text" 
          placeholder="Search voices..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-color)',
            fontSize: '0.9rem',
            outline: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        />
      </div>
      <div style={{
        maxHeight: '400px',
        overflowY: 'auto',
        padding: '0.5rem',
        border: '1px solid var(--border-color)',
        borderRadius: '0.75rem',
        background: 'rgba(248, 250, 252, 0.5)'
      }}>
        {categories.map(cat => (
          <div key={cat.title} style={{marginBottom: '1.5rem'}}>
            <div style={{fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.25rem', borderLeft: '3px solid var(--primary)'}}>
              {cat.title}
            </div>
            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))',
              gap:'0.75rem'
            }}>
              {cat.items.map(v => (
                <div
                  key={v.id}
                  onClick={() => onSelect(v.id)}
                  className={`grid-item ${selectedVoice === v.id ? 'selected' : ''}`}
                  style={{
                    padding:'0.75rem', 
                    textAlign:'center', 
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <div style={{fontWeight: 700, color: 'var(--dark)', fontSize: '0.75rem', marginBottom: '0.15rem'}}>{v.name}</div>
                  <div style={{fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '0.5rem', height: '1.5rem', overflow: 'hidden'}}>{v.desc}</div>
                  <button 
                    onClick={(e) => playVoice(e, v.preview)}
                    style={{
                      background: selectedVoice === v.id ? 'var(--primary)' : '#f1f5f9',
                      color: selectedVoice === v.id ? 'white' : 'var(--dark)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      cursor: 'pointer'
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem'}}>
            No voices found matching "{search}"
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [currentView, setCurrentView] = useState(() => localStorage.getItem('userEmail') ? 'DASHBOARD' : 'LANDING'); // LANDING, DASHBOARD, or AUTH
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [activeMenu, setActiveMenu] = useState('CREATE_SERIES');
  const [creationMode, setCreationMode] = useState<'SERIES' | 'AUTOMATION'>('SERIES');
  const [activeParent, setActiveParent] = useState('TOOLS');
  const [accountExpanded, setAccountExpanded] = useState(false);

  // Social media accounts state
  const [socialAccounts, setSocialAccounts] = useState<Record<string, { connected: boolean; accounts: { id: string; username: string; avatar: string; email?: string }[] }>>({
    youtube: { connected: false, accounts: [] },
    instagram: { connected: false, accounts: [] },
    facebook: { connected: false, accounts: [] },
    tiktok: { connected: false, accounts: [] },
    pinterest: { connected: false, accounts: [] },
    twitter: { connected: false, accounts: [] },
    linkedin: { connected: false, accounts: [] },
    snapchat: { connected: false, accounts: [] },
  });

  // Drive Automator State
  const [driveFolderId, setDriveFolderId] = useState('');
  const [dailyFrequency, setDailyFrequency] = useState(2);
  const [isAutomatorActive, setIsAutomatorActive] = useState(false);

  // Global Jobs Tracking
  const [activeJobs, setActiveJobs] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('activeJobs');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    // We only persist activeJobs for the sidebar task tracking
    localStorage.setItem('activeJobs', JSON.stringify(activeJobs));
  }, [activeJobs]);

  const fetchSocialStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/social/tokens`);
      const data = await res.json();
      setSocialAccounts(prev => {
        const next = { ...prev };
        Object.keys(data).forEach(plat => {
          next[plat] = { 
            connected: data[plat].length > 0, 
            accounts: data[plat].map((t: any) => ({ 
              id: t.id, 
              username: t.username || t.email, 
              avatar: t.avatar,
              email: t.email
            })) 
          };
        });
        return next;
      });
    } catch (e) {
      console.error('Failed to fetch social status');
    }
  };

  useEffect(() => {
    fetchSocialStatus();
    const interval = setInterval(fetchSocialStatus, 10000); // Sync every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const jobIds = Object.keys(activeJobs).filter(id => activeJobs[id].status === 'processing');
    if (jobIds.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/jobs`);
        const allJobs = await res.json();
        
        setActiveJobs(prev => {
          const next = { ...prev };
          let changed = false;
          Object.keys(next).forEach(id => {
            if (next[id].status === 'processing') {
              if (allJobs[id]) {
                if (JSON.stringify(allJobs[id]) !== JSON.stringify(next[id])) {
                  next[id] = allJobs[id];
                  changed = true;
                }
              } else {
                // Job vanished from server (likely server restart)
                next[id] = { ...next[id], status: 'failed', error: 'Server restarted or job lost' };
                changed = true;
              }
            }
          });
          return changed ? next : prev;
        });
      } catch (e) {
        console.error('Failed to poll jobs');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJobs]);

  const addJob = (jobId: string, type: string) => {
    setActiveJobs(prev => ({
      ...prev,
      [jobId]: { id: jobId, status: 'processing', progress: 0, stage: 'Starting...', type }
    }));
    setLastJobIds(prev => ({ ...prev, [type]: jobId }));
  };

  const clearJob = (type: string) => {
    setLastJobIds(prev => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  };

  // Job IDs are no longer persisted across sessions to ensure a fresh start on reopen
  const [lastJobIds, setLastJobIds] = useState<Record<string, string>>({});

  // Removed useEffect for lastJobIds localStorage persistence

  // Centralized API keys
  const [openAiKey, setOpenAiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [pexelsKey, setPexelsKey] = useState('');
  const [creatomateKey, setCreatomateKey] = useState('');

  // Free trial gate
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [userPicture, setUserPicture] = useState(() => localStorage.getItem('userPicture') || '');
  const [freeTrialsUsed, setFreeTrialsUsed] = useState<number>(() => {
    return parseInt(localStorage.getItem('freeTrialsUsed') || '0', 10);
  });
  const FREE_TRIAL_LIMIT = 1;

  useEffect(() => {
    localStorage.setItem('userEmail', userEmail);
    localStorage.setItem('userPicture', userPicture);
  }, [userEmail, userPicture]);

  useEffect(() => {
    // If a YouTube account is connected, sync its identity info
    if (socialAccounts.youtube?.connected && socialAccounts.youtube.accounts?.[0]) {
      const acc = socialAccounts.youtube.accounts[0];
      if (acc.email) setUserEmail(acc.email);
      else if (acc.username && !userEmail) setUserEmail(acc.username);
      if (acc.avatar) setUserPicture(acc.avatar);
    }
  }, [socialAccounts.youtube]);

  const checkAndGateGeneration = (): boolean => {
    if (userEmail === 'edwinmoothedan2006@gmail.com') {
      console.log('Edwin bypass active: Unlimited access granted.');
      return true; // Unlimited for Edwin
    }
    if (freeTrialsUsed >= FREE_TRIAL_LIMIT) {
      setActiveMenu('PRICING');
      return false; // blocked
    }
    const newCount = freeTrialsUsed + 1;
    setFreeTrialsUsed(newCount);
    localStorage.setItem('freeTrialsUsed', newCount.toString());
    return true; // allowed
  };
  
  // Email Configuration State
  const [emailService, setEmailService] = useState('gmail');
  const [emailUser, setEmailUser] = useState('');
  const [emailPass, setEmailPass] = useState('');
  const [emailReceiver, setEmailReceiver] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  
  // Persistent Series Creation State
  const [activeStyle, setActiveStyle] = useState(() => localStorage.getItem('activeStyle') || 'LEGO');
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('activeTheme') || 'Cinematic');
  const [activeNiche, setActiveNiche] = useState(() => localStorage.getItem('activeNiche') || 'Motivation');
  const [videoEngine, setVideoEngine] = useState(() => localStorage.getItem('videoEngine') || 'Veo 3');

  const [isKeysLoaded, setIsKeysLoaded] = useState(false);

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/config/keys`);
        const data = await res.json();
        if (data.openAiKey) setOpenAiKey(data.openAiKey);
        if (data.geminiKey) setGeminiKey(data.geminiKey);
        if (data.elevenLabsKey) setElevenLabsKey(data.elevenLabsKey);
        if (data.pexelsKey) setPexelsKey(data.pexelsKey);
        if (data.creatomateKey) setCreatomateKey(data.creatomateKey);
        if (data.emailService) setEmailService(data.emailService);
        if (data.emailUser) setEmailUser(data.emailUser);
        if (data.emailPass) setEmailPass(data.emailPass);
        if (data.emailReceiver) setEmailReceiver(data.emailReceiver);
        if (data.emailEnabled !== undefined) setEmailEnabled(data.emailEnabled);
        setIsKeysLoaded(true);
      } catch (e) {
        console.error('Failed to load keys from server');
        setIsKeysLoaded(true); // Still set to true so user changes can be saved
      }
    };
    fetchKeys();
  }, []);

  useEffect(() => {
    localStorage.setItem('activeStyle', activeStyle);
    localStorage.setItem('activeTheme', activeTheme);
    localStorage.setItem('activeNiche', activeNiche);
    localStorage.setItem('videoEngine', videoEngine);
  }, [activeStyle, activeTheme, activeNiche, videoEngine]);

  useEffect(() => {
    if (!isKeysLoaded) return;
    const saveKeys = async () => {
      try {
        await fetch(`${API_BASE_URL}/api/config/keys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            openAiKey, geminiKey, elevenLabsKey, pexelsKey, creatomateKey,
            emailService, emailUser, emailPass, emailReceiver, emailEnabled
          }),
        });
      } catch (e) {
        console.error('Failed to sync keys to server');
      }
    };
    saveKeys();
  }, [openAiKey, geminiKey, elevenLabsKey, pexelsKey, creatomateKey, emailService, emailUser, emailPass, emailReceiver, emailEnabled, isKeysLoaded]);

  const stylesList = [
    { name: 'AUTOSHORTS', img: '/styles/autoshorts.png' },
    { name: 'LEGO', img: '/styles/lego.png' },
    { name: 'COMIC BOOK', img: '/styles/comic.png' },
    { name: 'DISNEY TOON', img: '/styles/disney.png' },
    { name: 'STUDIO GHIBLI', img: '/styles/ghibli.png' },
    { name: 'PHOTO REALISM', img: '/styles/photorealism.png' },
    { name: 'MINECRAFT', img: '/styles/minecraft.png' },
    { name: 'WATERCOLOR', img: '/styles/watercolor.png' },
    { name: 'EXPRESSIONISM', img: '/styles/expressionism.png' },
    { name: 'PIXELATED', img: '/styles/pixelated.png' },
    { name: 'CREEPY TOON', img: '/styles/creepy_toon.png' },
    { name: 'CHILDRENS BOOK', img: '/styles/childrens_book.png' },
    { name: 'CHARCOAL', img: '/styles/charcoal.png' },
    { name: 'GTAV', img: '/styles/gtav.png' },
    { name: 'ANIME', img: '/styles/anime.png' },
    { name: 'AUTOSHORTS V2', img: '/styles/autoshorts_v2.png' },
    { name: 'FILM NOIR', img: '/styles/film_noir.png' },
    { name: '3D TOON', img: '/styles/3d_toon.png' }
  ];

  if (currentView === 'LANDING') {
    return <LandingPage 
      onNavigate={(view, mode) => {
        setCurrentView(view);
        if (mode) setAuthMode(mode);
      }} 
      styles={stylesList} 
    />;
  }



  if (currentView === 'AUTH') {
    return <AuthPage 
      mode={authMode} 
      setMode={setAuthMode} 
      userEmail={userEmail}
      setUserEmail={setUserEmail}
      onSuccess={() => setCurrentView('DASHBOARD')}
      onBack={() => setCurrentView('LANDING')}
    />;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo-container" style={{cursor: 'pointer'}} onClick={() => setCurrentView('LANDING')}>
          Auto Vid
        </div>
        <nav className="nav-menu">
          <div className="nav-group-label">Tools</div>
          <div 
            className={`nav-item ${activeMenu === 'AI_AVATAR' ? 'active' : ''}`}
            onClick={() => setActiveMenu('AI_AVATAR')}
          >
            AI Avatar
          </div>
          <div 
            className={`nav-item ${activeMenu === 'CLIPPER' ? 'active' : ''}`}
            onClick={() => setActiveMenu('CLIPPER')}
          >
            Clipper
          </div>
          <div 
            className={`nav-item ${activeMenu === 'SHORT_VIDEO' ? 'active' : ''}`}
            onClick={() => setActiveMenu('SHORT_VIDEO')}
          >
            Short Videos
          </div>
          <div 
            className={`nav-item ${activeMenu === 'LONG_VIDEO' ? 'active' : ''}`}
            onClick={() => setActiveMenu('LONG_VIDEO')}
          >
            Long Videos
          </div>

          <div 
            className={`nav-item ${activeMenu === 'AI_SCOUT' ? 'active' : ''}`}
            onClick={() => setActiveMenu('AI_SCOUT')}
          >
            AI Scout Bot
          </div>
          <div 
            className={`nav-item ${activeMenu === 'CREATE_SERIES' ? 'active' : ''}`}
            onClick={() => setActiveMenu('CREATE_SERIES')}
          >
            Create Series
          </div>
          <div 
            className={`nav-item ${activeMenu === 'CREATE_AUTOMATION' ? 'active' : ''}`}
            onClick={() => setActiveMenu('CREATE_AUTOMATION')}
          >
            Create Automation ✨
          </div>
          <div 
            className={`nav-item ${activeMenu === 'VIEW' ? 'active' : ''}`}
            onClick={() => setActiveMenu('VIEW')}
          >
            Manage Automation
          </div>

          {Object.keys(activeJobs).some(id => activeJobs[id].status === 'processing') && (
            <>
              <div className="nav-group-label" style={{marginTop: '2rem', color: 'var(--primary)'}}>Active Tasks</div>
              <div style={{padding: '0 1.25rem'}}>
                {Object.keys(activeJobs).filter(id => activeJobs[id].status === 'processing').map(id => (
                  <div key={id} style={{marginBottom: '1rem', background: 'rgba(99, 102, 241, 0.05)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(99, 102, 241, 0.1)'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.4rem'}}>
                      <span style={{textTransform: 'uppercase'}}>{activeJobs[id].type?.replace('_', ' ') || 'Task'}</span>
                      <span>{activeJobs[id].progress}%</span>
                    </div>
                    <div style={{width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.4rem'}}>
                      <div style={{width: `${activeJobs[id].progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s'}}></div>
                    </div>
                    <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {activeJobs[id].stage}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="nav-group-label">Account</div>

          <div className={`nav-item ${activeMenu === 'PRICING' ? 'active' : ''}`} onClick={() => setActiveMenu('PRICING')}>Billing</div>
          <div 
            className={`nav-item ${activeMenu === 'ACCOUNTS' ? 'active' : ''}`}
            onClick={() => setActiveMenu('ACCOUNTS')}
          >
            Social Accounts
          </div>
          <div 
            className={`nav-item ${activeMenu === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setActiveMenu('HISTORY')}
          >
            History
          </div>

          {/* Admin Settings Removed */}


          <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid #f1f5f9' }}>
            {userEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1.25rem', marginBottom: '1rem' }}>
                {userPicture ? (
                  <img src={userPicture} alt="User" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.8rem' }}>
                    {userEmail[0].toUpperCase()}
                  </div>
                )}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userEmail.split('@')[0]}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userEmail}
                  </div>
                </div>
              </div>
            )}
            <div 
              className="nav-item" 
              style={{ color: '#ef4444', fontWeight: 700 }} 
              onClick={() => {
                setUserEmail('');
                setUserPicture('');
                setCurrentView('LANDING');
              }}
            >
              Logout
            </div>
          </div>
        </nav>
      </aside>

      <div className="main-wrapper">
        <header className="top-navbar">
          <button className="btn btn-primary" style={{fontSize: '0.75rem'}} onClick={() => setActiveMenu('PRICING')}>
            Upgrade Plan
          </button>
          <div className="top-nav-link" onClick={() => setActiveMenu('CREATE_SERIES')}>Dashboard</div>
          <div className="top-nav-link">Affiliates</div>
        </header>

        <main className="main-content">
          {activeMenu === 'CREATE_SERIES' && (
            <>
              <div className="page-header">
                <h1 className="page-title">CREATE A SERIES</h1>
                <p className="page-subtitle">Schedule a series of Faceless Videos to post on auto-pilot.</p>
              </div>

              <CreateSeries 
                styles={stylesList} 
                activeStyle={activeStyle} setActiveStyle={setActiveStyle}
                activeTheme={activeTheme} setActiveTheme={setActiveTheme}
                activeNiche={activeNiche} setActiveNiche={setActiveNiche}
                videoEngine={videoEngine} setVideoEngine={setVideoEngine}
                socialAccounts={socialAccounts}
              />
            </>
          )}

          {activeMenu === 'CREATE_AUTOMATION' && (
            <>
              <div className="page-header">
                <h1 className="page-title">CREATE AUTOMATION</h1>
                <p className="page-subtitle">Create a fully automated, scheduled content machine for multiple channels.</p>
              </div>

              <CreateAutomation 
                socialAccounts={socialAccounts}
                activeNiche={activeNiche}
                styles={stylesList}
              />
            </>
          )}
          {activeMenu === 'AI_AVATAR' && <AIAvatar checkGate={checkAndGateGeneration} />}
          {activeMenu === 'CLIPPER' && <Clipper activeJobs={activeJobs} addJob={(id) => addJob(id, 'CLIPPER')} clearJob={() => clearJob('CLIPPER')} lastJobId={lastJobIds['CLIPPER']} socialAccounts={socialAccounts} checkGate={checkAndGateGeneration} />}
           {activeMenu === 'SHORT_VIDEO' && (
            <ShortVideo 
              openAiKey={openAiKey} 
              geminiKey={geminiKey} 
              elevenLabsKey={elevenLabsKey} 
              pexelsKey={pexelsKey} 
              onGoToKeys={() => setActiveMenu('API_KEYS')}
              activeStyle={activeStyle}
              activeTheme={activeTheme}
              activeNiche={activeNiche}
              videoEngine={videoEngine}
              activeJobs={activeJobs}
              addJob={(id) => addJob(id, 'SHORT_VIDEO')}
              clearJob={() => clearJob('SHORT_VIDEO')}
              lastJobId={lastJobIds['SHORT_VIDEO']}
              socialAccounts={socialAccounts}
              checkGate={checkAndGateGeneration}
            />
          )}
           {activeMenu === 'LONG_VIDEO' && (
            <LongVideo 
              openAiKey={openAiKey} 
              geminiKey={geminiKey} 
              elevenLabsKey={elevenLabsKey} 
              pexelsKey={pexelsKey} 
              onGoToKeys={() => setActiveMenu('API_KEYS')}
              activeStyle={activeStyle}
              activeTheme={activeTheme}
              activeNiche={activeNiche}
              videoEngine={videoEngine}
              activeJobs={activeJobs}
              addJob={(id) => addJob(id, 'LONG_VIDEO')}
              clearJob={() => clearJob('LONG_VIDEO')}
              lastJobId={lastJobIds['LONG_VIDEO']}
              socialAccounts={socialAccounts}
              checkGate={checkAndGateGeneration}
            />
          )}
          {activeMenu === 'VIEW' && <ManageAutomation />}
          {activeMenu === 'HISTORY' && <History socialAccounts={socialAccounts} />}
          {activeMenu === 'ACCOUNTS' && <SocialAccounts accounts={socialAccounts} setAccounts={setSocialAccounts} onConnect={() => {}} />}
          {activeMenu === 'API_KEYS' && (
            <APIKeys 
              socialAccounts={socialAccounts}
              openAiKey={openAiKey} setOpenAiKey={setOpenAiKey} 
              geminiKey={geminiKey} setGeminiKey={setGeminiKey} 
              elevenLabsKey={elevenLabsKey} setElevenLabsKey={setElevenLabsKey} 
              pexelsKey={pexelsKey} setPexelsKey={setPexelsKey} 
              creatomateKey={creatomateKey} setCreatomateKey={setCreatomateKey}
              activeTheme={activeTheme} setActiveTheme={setActiveTheme}
              activeNiche={activeNiche} setActiveNiche={setActiveNiche}
              emailService={emailService} setEmailService={setEmailService}
              emailUser={emailUser} setEmailUser={setEmailUser}
              emailPass={emailPass} setEmailPass={setEmailPass}
              emailReceiver={emailReceiver} setEmailReceiver={setEmailReceiver}
              emailEnabled={emailEnabled} setEmailEnabled={setEmailEnabled}
            />
          )}
          {activeMenu === 'AI_SCOUT' && (
            <AIScout 
              geminiKey={geminiKey}
              elevenLabsKey={elevenLabsKey}
              onGoToKeys={() => setActiveMenu('API_KEYS')}
              activeJobs={activeJobs}
              addJob={(id) => addJob(id, 'AI_SCOUT')}
              clearJob={() => clearJob('AI_SCOUT')}
              lastJobId={lastJobIds['AI_SCOUT']}
              socialAccounts={socialAccounts}
            />
          )}
          {activeMenu === 'PRICING' && <PricingPage userEmail={userEmail} freeTrialsUsed={freeTrialsUsed} freeTrialLimit={FREE_TRIAL_LIMIT} />}
        </main>
      </div>
    </div>
  );
}

function LandingPage({ onNavigate, styles }: { onNavigate: (view: string, mode?: 'login' | 'signup') => void, styles: any[] }) {
  return (
    <div style={{backgroundColor: 'white', minHeight: '100vh', fontFamily: 'Outfit, sans-serif'}}>
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', position: 'sticky', top: 0, background: 'white', zIndex: 100, borderBottom: '1px solid var(--border-color)'}}>
        <div style={{fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em'}}>
          AUTO VID
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '3rem'}}>

          <span style={{fontSize: '0.9rem', color: '#64748b', fontWeight: 500, cursor: 'pointer'}}>Pricing</span>
          <span 
            style={{fontSize: '0.9rem', color: '#0f172a', fontWeight: 700, cursor: 'pointer'}} 
            onClick={() => onNavigate('AUTH', 'login')}
          >
            Login
          </span>
          <button 
            className="btn btn-primary" 
            style={{backgroundColor: '#0f172a', padding: '0.75rem 1.5rem'}} 
            onClick={() => onNavigate('AUTH', 'signup')}
          >
            Sign Up
          </button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <h1 className="landing-title">
            The All-in-One <span style={{color: 'var(--primary)'}}>AI Video</span> Production Suite.
          </h1>
          <p className="landing-subtitle">
            Generate viral shorts, long-form content, and AI reviews on auto-pilot. Link your social accounts and let Auto Vid handle the rest.
          </p>
          <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
            <button 
              className="btn btn-primary" 
              style={{padding: '1.2rem 3rem', fontSize: '1.1rem', backgroundColor: '#0f172a'}} 
              onClick={() => onNavigate('AUTH', 'signup')}
            >
              Get Started for Free
            </button>
          </div>
          <div style={{marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b'}}>
            No credit card required • Cancel anytime
          </div>
        </section>


        <div className="niche-section">
          <h1 className="niche-title">
            Diverse niches for every channel.
          </h1>
          
          <div className="niche-grid">
            {styles.map((style, i) => (
              <div key={i} className="niche-card">
                <img src={style.img} className="niche-image" alt={style.name} />
                <div className="niche-label">{style.name}</div>
              </div>
            ))}
          </div>

          <div style={{marginTop: '4rem'}}>
            <button 
              className="btn btn-primary" 
              style={{padding: '1.2rem 3rem', fontSize: '1.1rem', backgroundColor: '#0f172a'}} 
              onClick={() => onNavigate('DASHBOARD')}
            >
              Try Auto Vid for Free
            </button>
            <div style={{marginTop: '1rem', fontSize: '0.875rem', color: '#64748b'}}>
              (No credit card required)
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AuthPage({ mode, setMode, onSuccess, onBack, userEmail, setUserEmail }: { 
  mode: 'login' | 'signup', 
  setMode: (m: 'login' | 'signup') => void, 
  onSuccess: () => void,
  onBack: () => void,
  userEmail: string,
  setUserEmail: (e: string) => void
}) {
  return (
    <div className="auth-container">
      <div 
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundImage: 'url(/auth-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.6)'
        }}
      />
      <div className="auth-overlay" />
      
      <div className="auth-card animate-fade-in">
        <div 
          style={{position: 'absolute', top: '2rem', left: '2.5rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600}}
          onClick={onBack}
        >
          ← Back
        </div>

        <div className="auth-header">
          <h1 className="auth-title">{mode === 'login' ? 'Welcome Back' : 'Join Auto Vid'}</h1>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Login to manage your video empire.' : 'Start your journey to viral automation.'}
          </p>
        </div>



        <div className="auth-form" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              if (credentialResponse.credential) {
                const decoded: any = jwtDecode(credentialResponse.credential);
                localStorage.setItem('userEmail', decoded.email || '');
                localStorage.setItem('userPicture', decoded.picture || '');
                window.location.reload(); // Reload to refresh the whole app state
              }
            }}
            onError={() => {
              console.log('Login Failed');
            }}
            useOneTap
            theme="filled_blue"
            shape="pill"
            width="320"
          />

          <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem'}}>
            <div style={{flex: 1, height: '1px', background: '#e2e8f0'}}></div>
            <span style={{fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600}}>OR</span>
            <div style={{flex: 1, height: '1px', background: '#e2e8f0'}}></div>
          </div>

          {mode === 'signup' && (
            <div className="auth-input-group">
              <label className="auth-label">Full Name</label>
              <input type="text" className="auth-input" placeholder="Enter your name" />
            </div>
          )}
          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <input 
              type="email" 
              className="auth-input" 
              placeholder="name@company.com" 
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
          </div>
          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <input type="password" className="auth-input" placeholder="••••••••" />
          </div>

          <button 
            className="btn btn-primary" 
            style={{padding: '1.25rem', fontSize: '1rem', marginTop: '1rem', background: 'var(--dark)'}}
            onClick={() => {
              if (userEmail.trim()) {
                onSuccess();
              } else {
                alert('Please enter an email address or use Google Sign-in');
              }
            }}
          >
            {mode === 'login' ? 'Login to Dashboard' : 'Create Account'}
          </button>
        </div>

        <div className="auth-footer">
          {mode === 'login' ? (
            <>Don't have an account? <span className="auth-link" onClick={() => setMode('signup')}>Sign up</span></>
          ) : (
            <>Already have an account? <span className="auth-link" onClick={() => setMode('login')}>Login</span></>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateSeries({ 
  styles, 
  activeStyle, setActiveStyle, 
  activeTheme, setActiveTheme, 
  activeNiche, setActiveNiche, 
  videoEngine, setVideoEngine,
  socialAccounts
}: { 
  styles: any[], 
  activeStyle: string, setActiveStyle: (s: string) => void,
  activeTheme: string, setActiveTheme: (s: string) => void,
  activeNiche: string, setActiveNiche: (s: string) => void,
  videoEngine: string, setVideoEngine: (s: string) => void,
  socialAccounts: any
}) {
  const [activeTopic, setActiveTopic] = useState('Life Pro Tips');
  const [activeVoice, setActiveVoice] = useState('US-Female-Viral');
  
  const allAccounts = Object.entries(socialAccounts || {}).flatMap(([plat, data]: [string, any]) => 
    (data.accounts || []).map((acc: any) => ({ ...acc, platform: plat }))
  );

  const [activeAccount, setActiveAccount] = useState(allAccounts[0]?.username || 'Select Account');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  return (
    <>
      <div className="card-container">
        <div className="step-badge">Step 1</div>
        <h2 className="section-title">Destination</h2>
        <p className="section-desc">Select the niche or topic for your video series</p>
        
        <div className="form-group" style={{position: 'relative'}}>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="form-select" 
            style={{
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              cursor: 'pointer',
              background: 'white',
              fontWeight: 600,
              minHeight: '45px'
            }}
          >
            <span>{activeTopic || 'Select Topic'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'}}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>

          {isDropdownOpen && (
            <div className="custom-dropdown animate-fade-in" style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              right: 0,
              background: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              zIndex: 100,
              maxHeight: '400px',
              overflowY: 'auto',
              padding: '0.5rem'
            }}>
              <div style={{padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', borderRadius: '0.5rem', marginBottom: '0.5rem'}}>
                Custom Topic <span style={{fontSize: '0.9rem'}}>✨</span>
              </div>
              <div 
                className="dropdown-item" 
                onClick={() => { setActiveTopic('Custom Prompt'); setIsDropdownOpen(false); }}
                style={{padding: '0.75rem 1rem', cursor: 'pointer', borderRadius: '0.5rem', fontWeight: 500, fontSize: '0.9rem'}}
              >
                Custom Prompt
              </div>

              <div style={{padding: '1.25rem 1rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                Popular Topics <span style={{fontSize: '0.9rem'}}>🔥</span>
              </div>
              
              {[
                { name: 'Bible Stories', isNew: true },
                { name: 'AI Video', isNew: true },
                { name: 'Random AI Story' },
                { name: 'Travel Destinations' },
                { name: 'What If?' },
                { name: 'Scary Stories' },
                { name: 'Bedtime Stories' },
                { name: 'Interesting History' },
                { name: 'Urban Legends' },
                { name: 'Motivational' },
                { name: 'Fun Facts' },
                { name: 'Long Form Jokes' },
                { name: 'Life Pro Tips' },
                { name: 'ELI5' },
                { name: 'Philosophy' },
                { name: 'Product Marketing' },
                { name: 'Fake Text Message' },
                { name: 'Engagement Bait' },
                { name: 'Web Search' }
              ].map((topic) => (
                <div 
                  key={topic.name}
                  className="dropdown-item" 
                  onClick={() => { setActiveTopic(topic.name); setIsDropdownOpen(false); }}
                  style={{
                    padding: '0.75rem 1rem', 
                    cursor: 'pointer', 
                    borderRadius: '0.5rem', 
                    fontWeight: 500, 
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{topic.name}</span>
                  {topic.isNew && (
                    <span style={{
                      background: '#eff6ff', 
                      color: '#2563eb', 
                      fontSize: '0.6rem', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>New!</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>



        <div style={{marginTop: '1.5rem'}}>
          <h2 className="section-title" style={{fontSize: '1rem'}}>Video Engine</h2>
          <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
            {['Pexels Stock', 'Gemini AI', 'Meta AI'].map(engine => (
              <div 
                key={engine}
                onClick={() => setVideoEngine(engine)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${videoEngine === engine ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: videoEngine === engine ? 'var(--bg-light)' : 'white',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
              >
                {engine}
              </div>
            ))}
          </div>
        </div>

        <div style={{marginTop: '3rem'}}>
          <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--dark)', marginBottom: '1.5rem', fontWeight: 700}}>
            Voice Narrator
          </h3>
          <VoiceSelector selectedVoice={activeVoice} onSelect={setActiveVoice} />
        </div>

        <div style={{marginTop: '3rem'}}>
          <div className="step-badge">Step 2</div>
          <h2 className="section-title">Social Account</h2>
          <p className="section-desc">The account where your video series will be posted</p>
          
          <div className="form-group" style={{position: 'relative'}}>
            <div 
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              className="form-select" 
              style={{
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                cursor: 'pointer',
                background: 'white',
                fontWeight: 600,
                minHeight: '45px'
              }}
            >
              <span>{activeAccount}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{transform: isAccountDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'}}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>

            {isAccountDropdownOpen && (
              <div className="custom-dropdown animate-fade-in" style={{
                position: 'absolute',
                top: '110%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid var(--border-color)',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                zIndex: 100,
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '0.5rem'
              }}>
                {allAccounts.length > 0 ? allAccounts.map((acc, i) => (
                  <div 
                    key={i}
                    className="dropdown-item" 
                    onClick={() => { setActiveAccount(acc.username); setIsAccountDropdownOpen(false); }}
                    style={{padding: '0.75rem 1rem', cursor: 'pointer', borderRadius: '0.5rem', fontWeight: 500, fontSize: '0.9rem', display:'flex', alignItems:'center', gap:'0.5rem'}}
                  >
                    <span style={{textTransform:'capitalize', fontSize:'0.7rem', background:'#f1f5f9', padding:'0.2rem 0.4rem', borderRadius:'0.25rem'}}>{acc.platform}</span>
                    {acc.username}
                  </div>
                )) : (
                  <div style={{padding:'1rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.85rem'}}>No accounts linked</div>
                )}
              </div>
            )}
          </div>
        </div>



        <div style={{marginTop: '3rem'}}>
          <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--dark)', marginBottom: '1.5rem', fontWeight: 700}}>
            Art Style
          </h3>
          <div className="scroll-row">
            {styles.map((style) => (
              <div 
                className={`grid-item ${activeStyle === style.name ? 'selected' : ''}`} 
                key={style.name}
                onClick={() => setActiveStyle(style.name)}
                style={{aspectRatio: '9/16', height: 'auto', flex: '0 0 160px', position: 'relative'}}
              >
                <div style={{width: '100%', height: '100%', overflow: 'hidden'}}>
                   <img src={style.img} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt={style.name} />
                </div>
                <div className="grid-item-label" style={{fontWeight: 800, fontSize: '0.75rem', padding: '0.5rem', position: 'absolute', bottom: 0, width: '100%', background: 'rgba(255,255,255,0.9)'}}>{style.name}</div>
                {activeStyle === style.name && (
                  <div style={{
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    background: 'var(--primary)', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: '20px', 
                    height: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    zIndex: 2
                  }}>✓</div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div style={{marginTop: '3rem', textAlign: 'center'}}>
          <button 
            className="btn btn-primary" 
            style={{padding: '1.25rem 3.5rem', fontSize: '1.1rem', background: 'var(--dark)', width: '100%'}}
            onClick={async () => {
              try {
                const res = await fetch(`${API_BASE_URL}/api/series`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    topic: activeTopic,
                    style: activeStyle,
                    theme: 'Cinematic', // Defaulted as selector is removed
                    niche: activeTopic, // Use activeTopic as niche as requested
                    engine: videoEngine,
                    socialAccount: activeAccount,
                    voice: activeVoice
                  })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                  alert(`Series for ${activeTopic} with ${activeStyle} style scheduled!`);
                } else {
                  alert(`Failed to schedule series: ${data.error || 'Unknown error'}`);
                }
              } catch (e: any) {
                alert(`Network error: ${e.message}. Make sure the backend server is running.`);
              }
            }}
          >
            🚀 Start Series Automation
          </button>
          <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem'}}>
            Your series will be generated and posted automatically based on your schedule.
          </p>
        </div>
      </div>
    </>
  );
}

function CreateAutomation({ socialAccounts, activeNiche, styles }: any) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [videoType, setVideoType] = useState('short_video_9_16');
  const [postTime, setPostTime] = useState('09:00');
  const [activeNicheLocal, setActiveNicheLocal] = useState(activeNiche || 'Motivation');
  const [activeVoice, setActiveVoice] = useState('US-Female-Viral');
  const [clipperSource, setClipperSource] = useState('');
  const [avatarId, setAvatarId] = useState(0);
  const [captionSize, setCaptionSize] = useState(38);
  const [captionPosition, setCaptionPosition] = useState('center');

  const allAccounts = Object.entries(socialAccounts || {}).flatMap(([plat, data]: [string, any]) => 
    (data.accounts || []).map((acc: any) => ({ ...acc, platform: plat }))
  );

  const handleCreate = async () => {
    if (selectedChannels.length === 0) {
      alert("Please select at least one channel.");
      return;
    }
    if (videoType === 'clipper_9_16' && !clipperSource) {
      alert("Please provide a source URL for the Clipper.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/scheduled-automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channels: selectedChannels,
          niche: activeNicheLocal,
          videoType,
          postTime,
          clipperSource,
          avatarId,
          captionSize,
          captionPosition
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Automation created successfully!");
      } else {
        alert("Error: " + data.error);
      }
    } catch (e: any) {
      alert("Failed to connect to server: " + e.message);
    }
  };

  return (
    <div className="card-container animate-fade-in" style={{maxWidth: '800px', margin: '0 auto'}}>
      <div style={{display: 'flex', gap: '2rem', flexDirection: 'column'}}>
        {/* Step 1: Destination */}
        <section>
          <div className="step-badge">Step 1</div>
          <h2 className="section-title">Target Channels</h2>
          <p className="section-desc">Select which linked accounts should receive this automation.</p>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem'}}>
            {allAccounts.length > 0 ? allAccounts.map((acc, i) => (
              <div 
                key={i}
                onClick={() => {
                  const id = `${acc.platform}:${acc.username}`;
                  setSelectedChannels(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                }}
                className={`grid-item ${selectedChannels.includes(`${acc.platform}:${acc.username}`) ? 'selected' : ''}`}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  border: '2px solid var(--border-color)',
                  background: 'white',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {acc.avatar ? <img src={acc.avatar} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <span style={{fontSize: '0.7rem', fontWeight: 800}}>{acc.platform[0].toUpperCase()}</span>}
                </div>
                <div>
                  <div style={{fontSize: '0.9rem', fontWeight: 700}}>{acc.username}</div>
                  <div style={{fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6}}>{acc.platform}</div>
                </div>
              </div>
            )) : (
              <div style={{padding: '2rem', background: '#f8fafc', borderRadius: '0.75rem', textAlign: 'center', width: '100%', border: '2px dashed #e2e8f0'}}>
                <p style={{fontSize: '0.9rem', color: '#64748b'}}>No linked accounts found. Go to <strong style={{color: 'var(--primary)', cursor: 'pointer'}}>Social Accounts</strong> to link one.</p>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Content Niche */}
        <section>
          <div className="step-badge">Step 2</div>
          <h2 className="section-title">Content Focus</h2>
          <p className="section-desc">Choose the niche for AI to generate scripts and visuals.</p>
          <select 
            className="form-select" 
            value={activeNicheLocal} 
            onChange={(e) => setActiveNicheLocal(e.target.value)}
            style={{width: '100%', marginTop: '1rem', height: '50px', fontSize: '1rem'}}
          >
            {['Motivation', 'Bible Stories', 'AI Video', 'Random AI Story', 'Travel Destinations', 'Scary Stories', 'Interesting History', 'Life Pro Tips', 'Philosophy', 'Product Marketing'].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </section>

        {/* Step 3: Voice Narrator */}
        <section>
          <div className="step-badge">Step 3</div>
          <h2 className="section-title">Voice Narrator</h2>
          <p className="section-desc">Select the default voice for this automation.</p>
          <div style={{marginTop: '1rem'}}>
            <VoiceSelector selectedVoice={activeVoice} onSelect={setActiveVoice} />
          </div>
        </section>

        {/* Step 4: Video Format */}
        <section>
          <div className="step-badge">Step 3</div>
          <h2 className="section-title">Format & Type</h2>
          <p className="section-desc">Select the visual style and aspect ratio.</p>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1rem'}}>
            {[
              { id: 'short_video_9_16', name: 'Short Video', desc: '9:16 Vertical • Viral Style', icon: '📱' },
              { id: 'long_video_16_9', name: 'Long Video', desc: '16:9 Landscape • YouTube Style', icon: '💻' },
              { id: 'talking_head_9_16', name: 'Talking Head', desc: '9:16 Vertical • Character AI', icon: '👤' },
              { id: 'clipper_9_16', name: 'AI Clipper', desc: '9:16 Vertical • Auto-Clip Viral Content', icon: '✂️' },
              { id: 'ai_scout_16_9', name: 'AI Scout', desc: '16:9 Landscape • Tool Review', icon: '🔍' }
            ].map(type => (
              <div 
                key={type.id}
                onClick={() => setVideoType(type.id)}
                className={`grid-item ${videoType === type.id ? 'selected' : ''}`}
                style={{
                  padding: '1.25rem',
                  borderRadius: '1rem',
                  border: '2px solid var(--border-color)',
                  background: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>{type.icon}</div>
                <div style={{fontWeight: 800, fontSize: '1rem', color: 'var(--dark)'}}>{type.name}</div>
                <div style={{fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem'}}>{type.desc}</div>
                {videoType === type.id && (
                   <div style={{position: 'absolute', top: '10px', right: '10px', color: 'var(--primary)', fontSize: '0.8rem'}}>✨</div>
                )}
              </div>
            ))}
          </div>

          {videoType === 'clipper_9_16' && (
            <div className="animate-fade-in" style={{marginTop: '1.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0'}}>
              <h3 style={{fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span>🔗</span> Source Channel or Playlist
              </h3>
              <input 
                type="text" 
                className="form-input" 
                placeholder="YouTube Channel URL (e.g., https://youtube.com/@MrBeast)"
                value={clipperSource}
                onChange={(e) => setClipperSource(e.target.value)}
                style={{width: '100%', background: 'white'}}
              />
              <p style={{fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem'}}>
                The AI will automatically check this source for new videos and create viral clips from them.
              </p>
            </div>
          )}

          {videoType === 'talking_head_9_16' && (
            <div className="animate-fade-in" style={{marginTop: '1.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0'}}>
              <h3 style={{fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span>👤</span> Select AI Character
              </h3>
              <div style={{display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.75rem', padding: '0.5rem', background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0'}}>
                {[
                  { name: 'Gigachad', img: '/characters/gigachad.png' },
                  { name: 'Sigma Male', img: '/characters/sigma_male.png' },
                  { name: 'Hypebeast', img: '/characters/hypebeast.png' },
                  { name: 'Gamer Girl', img: '/characters/gamer_girl.png' },
                  { name: 'NPC Girl', img: '/characters/npc_girl.png' },
                  { name: 'Soft Girl', img: '/characters/soft_girl.png' },
                  { name: 'Robot', img: '/characters/cartoon_robot.png' },
                  { name: 'Lion', img: '/characters/cartoon_lion.png' },
                  { name: 'Monster', img: '/characters/cartoon_monster.png' },
                  { name: 'Superhero', img: '/characters/cartoon_superhero.png' }
                ].map((char, i) => (
                  <div 
                    key={i}
                    onClick={() => setAvatarId(i)}
                    style={{
                      width: '70px', 
                      height: '70px', 
                      borderRadius: '0.75rem', 
                      background: '#f1f5f9', 
                      flexShrink: 0, 
                      cursor: 'pointer',
                      border: `2px solid ${avatarId === i ? 'var(--primary)' : 'transparent'}`,
                      backgroundImage: `url(${char.img})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      transition: 'all 0.2s',
                      boxShadow: avatarId === i ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                      position: 'relative'
                    }}
                  >
                    <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.5rem', textAlign: 'center', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem', padding: '1px'}}>
                      {char.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Step 4: Schedule */}
        <section>
          <div className="step-badge">Step 4</div>
          <h2 className="section-title">Schedule Time</h2>
          <p className="section-desc">When should this video be posted every day?</p>
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            marginTop: '1rem', 
            background: '#f8fafc', 
            padding: '1rem', 
            borderRadius: '1rem',
            border: '1px solid #e2e8f0'
          }}>
            <span style={{fontSize: '1.5rem'}}>⏰</span>
            <input 
              type="time" 
              className="form-input" 
              value={postTime} 
              onChange={(e) => setPostTime(e.target.value)}
              style={{
                flex: 1, 
                border: 'none', 
                background: 'transparent', 
                fontSize: '1.5rem', 
                fontWeight: 800, 
                color: 'var(--dark)',
                cursor: 'pointer'
              }}
            />
          </div>
        </section>

        <button 
          className="btn btn-primary" 
          style={{
            width: '100%', 
            marginTop: '1rem', 
            padding: '1.5rem', 
            background: 'var(--dark)', 
            fontSize: '1.1rem',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
          }}
          onClick={handleCreate}
        >
          🚀 Launch Automated Machine
        </button>
      </div>
    </div>
  );
}

function AIAvatar({ checkGate }: { checkGate?: () => boolean }) {
  const [text, setText] = useState('Type your message here...');
  const [activeAvatar, setActiveAvatar] = useState(0);
  const [voice, setVoice] = useState('US-Female-Viral');
  const [fontSize, setFontSize] = useState(38);
  
  const avatars = [
    { name: 'Gigachad', img: '/characters/gigachad.png' },
    { name: 'Sigma Male', img: '/characters/sigma_male.png' },
    { name: 'Hypebeast', img: '/characters/hypebeast.png' },
    { name: 'Gamer Girl', img: '/characters/gamer_girl.png' },
    { name: 'NPC Girl', img: '/characters/npc_girl.png' },
    { name: 'Soft Girl', img: '/characters/soft_girl.png' },
    { name: 'Robot', img: '/characters/cartoon_robot.png' },
    { name: 'Lion', img: '/characters/cartoon_lion.png' },
    { name: 'Monster', img: '/characters/cartoon_monster.png' },
    { name: 'Superhero', img: '/characters/cartoon_superhero.png' }
  ];
  
  return (
    <>
      <div className="page-header">
        <div className="nav-group-label" style={{marginBottom: '1rem', display: 'inline-block'}}>Public Release</div>
        <h1 className="page-title">AI AVATAR</h1>
        <p className="page-subtitle">Add text over a realistic AI Avatar to promote your brand or product.<br/>New avatars added daily.</p>
      </div>
      
      <div className="card-container" style={{display: 'flex', gap: '2rem', maxWidth: '1000px'}}>
        <div style={{flex: 1}}>
          <div style={{marginTop: '1.5rem'}}>
            <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem', color: 'var(--dark)', fontWeight: 600}}>
              Font Size: {fontSize}px
            </h3>
            <input 
              type="range" 
              min="16" max="120" 
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              style={{width: '100%', accentColor: 'var(--dark)'}} 
            />
          </div>

          <div style={{marginTop: '1.5rem'}}>
            <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem', color: 'var(--dark)', fontWeight: 600}}>
              Overlay Text
            </h3>
            <textarea 
              className="form-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What should the avatar say?"
              style={{height: '100px'}}
            />
          </div>

          <div style={{marginTop: '3rem'}}>
            <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--dark)', fontWeight: 700}}>
              AI Avatars
            </h3>
            <div className="grid-selection" style={{gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem'}}>
              {avatars.map((avatar, i) => (
                <div 
                  className={`grid-item ${i === activeAvatar ? 'selected' : ''}`} 
                  key={i} 
                  style={{borderRadius: '0.25rem'}}
                  onClick={() => setActiveAvatar(i)}
                >
                  <div style={{
                    height: '80px', 
                    background: '#f1f5f9',
                    backgroundImage: `url(${avatar.img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '0.5rem'
                  }}></div>
                  <div style={{fontSize: '0.6rem', textAlign: 'center', marginTop: '0.25rem', fontWeight: 700}}>{avatar.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{marginTop: '3rem'}}>
            <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--dark)', fontWeight: 700}}>
              Voice Narrator
            </h3>
            <VoiceSelector selectedVoice={voice} onSelect={setVoice} />
          </div>

          <div style={{marginTop: '3rem'}}>
            <button 
              className="btn btn-primary" 
              style={{width: '100%', padding: '1rem', background: 'var(--dark)'}}
              onClick={() => { if (checkGate && !checkGate()) return; alert('Generating AI Avatar Video... This may take a few minutes.'); }}
            >
              🎥 Generate Avatar Video
            </button>
            <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem'}}>
              Uses high-fidelity lip-sync and realistic animation.
            </p>
          </div>
        </div>

        <div style={{flex: 1, display: 'flex', justifyContent: 'center', background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem'}}>
           <div style={{width: '300px', height: '500px', background: '#94a3b8', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'}}>
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                backgroundImage: `url(${avatars[activeAvatar].img})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center bottom'
              }}></div>
              <div style={{
                position: 'absolute', 
                bottom: '20%', 
                fontWeight: 800, 
                color: 'white', 
                textShadow: '2px 2px 4px rgba(0,0,0,0.8), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000', 
                textAlign: 'center', 
                width: '90%', 
                fontSize: `${fontSize * 0.8}px`,
                lineHeight: 1.1,
                padding: '0 1rem'
              }}>
                {text || 'Preview Text'}
              </div>
           </div>
        </div>
      </div>
    </>
  );
}

function Clipper({ activeJobs, addJob, clearJob, lastJobId, socialAccounts, checkGate }: { activeJobs: any, addJob: (id: string, type: string) => void, clearJob: (type: string) => void, lastJobId?: string, socialAccounts: any, checkGate?: () => boolean }) {
  const [url, setUrl] = useState('');
  const [activeCaption, setActiveCaption] = useState('DYNAMICS');
  const [clipCount, setClipCount] = useState(1);
  const [captionSize, setCaptionSize] = useState(38);
  const [captionPosition, setCaptionPosition] = useState('center');
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);

  const activeJob = lastJobId ? activeJobs[lastJobId] : null;
  const isProcessing = activeJob?.status === 'processing';
  const progress = activeJob?.progress || 0;
  const resultVideos = activeJob?.status === 'completed' ? (activeJob.result.videoUrls || [activeJob.result.videoUrl]) : [];
  const error = activeJob?.status === 'failed' ? activeJob.error : null;

  const captionStyles = [
    { id: 'DYNAMICS', name: 'Dynamics', color: '#facc15', example: 'NEVER LAUGHED AT ANYBODY' },
    { id: 'BOLD', name: 'Bold Pop', color: '#ef4444', example: 'HE HAD BEEN IN' },
    { id: 'GLOW', name: 'Glow Wave', color: '#22c55e', example: 'MY VLOGS LIKE WHAT' },
    { id: 'MINIMAL', name: 'Minimalist', color: '#ffffff', example: 'Because it\'s really the' },
    { id: 'MRBEAST', name: 'MrBeast Style', color: '#facc15', example: 'I GAVE AWAY $1,000,000' }
  ];

  const handleGenerate = async () => {
    if (!url) return;
    if (checkGate && !checkGate()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/clip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, style: activeCaption, count: clipCount, captionSize, captionPosition }),
      });
      const data = await response.json();
      if (data.success && data.jobId) {
        addJob(data.jobId, 'CLIPPER');
      } else {
        alert(data.error || 'Failed to start clipping');
      }
    } catch (err: any) {
      alert('Network error: ' + err.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div style={{display: 'inline-block', background: 'var(--primary)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', marginBottom: '1rem', fontWeight: 'bold'}}>BETA</div>
        <h1 className="page-title">AI CLIPPER</h1>
        <p className="page-subtitle">Convert long YouTube videos into viral shorts with smart face tracking and trending word-by-word captions.</p>
      </div>

      <div className="card-container" style={{maxWidth: '1000px'}}>
        {error && (
          <div style={{background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', position: 'relative'}}>
            <div style={{fontWeight: 700, marginBottom: '0.25rem'}}>Renderer Error</div>
            <div style={{paddingRight: '1.5rem'}}>{error}</div>
            <button 
              onClick={() => clearJob('CLIPPER')}
              style={{position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem'}}
            >
              ✕
            </button>
          </div>
        )}


        {resultVideos.length > 0 && (
          <div style={{marginBottom: '2rem', textAlign: 'center'}} className="animate-fade-in">
            <h3 className="section-title">Your {resultVideos.length > 1 ? 'Clips are' : 'Clip is'} Ready</h3>
            <div style={{
              display: 'grid', 
              gridTemplateColumns: resultVideos.length > 1 ? 'repeat(auto-fit, minmax(240px, 1fr))' : '1fr', 
              gap: '2rem', 
              margin: '2rem auto',
              maxWidth: '1000px'
            }}>
              {resultVideos.map((videoUrl: string, idx: number) => (
                <div key={idx} style={{textAlign: 'center'}}>
                  <div style={{width: '240px', height: '426px', margin: '0 auto', background: '#000', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.15)'}}>
                    <video src={videoUrl} controls autoPlay={idx === 0} loop style={{width: '100%', height: '100%'}}></video>
                  </div>
                  <div style={{marginTop: '1rem'}}>
                      <a href={videoUrl} download={`clip_${idx+1}.mp4`} className="btn btn-primary" style={{padding: '0.6rem 1.5rem', fontSize: '0.8rem'}}>
                        Download Clip {idx + 1}
                      </a>
                      <button className="btn" style={{padding: '0.6rem 1.5rem', fontSize: '0.8rem', background: 'var(--dark)', color: 'white', marginTop: '0.5rem'}} onClick={() => setShowUploadModal(videoUrl)}>
                        Upload to Socials
                      </button>
                  </div>
                </div>
              ))}
            </div>
            {showUploadModal && (
                <UploadModal 
                  videoUrl={showUploadModal} 
                  topic="Viral Clip" 
                  script="" 
                  accounts={socialAccounts} 
                  onClose={() => setShowUploadModal(null)} 
                />
            )}
            <div style={{marginTop: '3rem', borderTop: '1px solid #f1f5f9', paddingTop: '2rem'}}>
              <button className="btn" onClick={() => clearJob('CLIPPER')}>
                Create More Clips
              </button>
            </div>
          </div>
        )}

        {resultVideos.length === 0 && (
          <>
            <div style={{marginTop: '1.5rem'}}>
              <div className="step-badge">Step 1</div>
              <h2 className="section-title">Video URL</h2>
              <p className="section-desc">Paste the link to the long-form YouTube video you want to clip</p>
              
              <div className="form-group" style={{marginTop: '1rem'}}>
                <div style={{position: 'relative'}}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="https://www.youtube.com/watch?v=..." 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    style={{
                      paddingLeft: '3rem',
                      fontSize: '1rem',
                      height: '55px',
                      background: 'white',
                      border: '1px solid var(--border-color)',
                      fontWeight: 500
                    }}
                  />
                  <div style={{position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5}}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div style={{marginTop: '3rem'}}>
              <div className="step-badge">Step 2</div>
              <h2 className="section-title">Number of Clips</h2>
              <p className="section-desc">How many shorts should we generate from this video?</p>
              <div style={{display: 'flex', alignItems: 'center', gap: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', marginTop: '1rem'}}>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={clipCount} 
                  onChange={(e) => setClipCount(parseInt(e.target.value))} 
                  style={{flex: 1, accentColor: 'var(--dark)'}}
                />
                <div style={{
                  width: '60px', 
                  height: '60px', 
                  background: 'var(--dark)', 
                  color: 'white', 
                  borderRadius: '0.5rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 800
                }}>
                  {clipCount}
                </div>
              </div>
            </div>

            <div style={{marginTop: '3rem'}}>
              <div className="step-badge">Step 3</div>
              <h2 className="section-title">Caption Style</h2>
              <p className="section-desc">Select a trending "Karaoke-style" caption for your short</p>
              
              <div className="grid-selection" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
                {captionStyles.map((style) => (
                  <div 
                    className={`grid-item ${activeCaption === style.id ? 'selected' : ''}`} 
                    key={style.id}
                    onClick={() => !isProcessing && setActiveCaption(style.id)}
                    style={{height: '180px', display: 'flex', flexDirection: 'column'}}
                  >
                    <div style={{flex: 1, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', textAlign: 'center'}}>
                      <span style={{
                        color: style.color, 
                        fontWeight: 800, 
                        fontSize: '0.8rem',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        lineHeight: 1.2
                      }}>
                        {style.example}
                      </span>
                    </div>
                    <div className="grid-item-label">{style.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{marginTop: '3rem'}}>
              <div className="step-badge">Step 4</div>
              <h2 className="section-title">Caption Customization</h2>
              <p className="section-desc">Adjust size and position for your trending captions</p>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', marginTop: '1rem'}}>
                <div>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                    <span style={{fontSize: '0.85rem', fontWeight: 600}}>Font Size</span>
                    <span style={{fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)'}}>{captionSize}px</span>
                  </div>
                  <input 
                    type="range" min="16" max="64" value={captionSize} 
                    onChange={(e) => setCaptionSize(parseInt(e.target.value))}
                    style={{width: '100%', accentColor: 'var(--dark)'}}
                  />
                </div>
                
                <div>
                   <span style={{fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.75rem'}}>Caption Position</span>
                   <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                      <button 
                        className={`btn ${captionPosition === 'center' ? 'btn-primary' : ''}`}
                        style={{fontSize: '0.75rem', background: captionPosition === 'center' ? '' : 'white', border: '1px solid #e2e8f0'}}
                        onClick={() => setCaptionPosition('center')}
                      >
                        Center
                      </button>
                      <button 
                        className={`btn ${captionPosition === 'center-bottom' ? 'btn-primary' : ''}`}
                        style={{fontSize: '0.75rem', background: captionPosition === 'center-bottom' ? '' : 'white', border: '1px solid #e2e8f0'}}
                        onClick={() => setCaptionPosition('center-bottom')}
                      >
                        Center-Bottom
                      </button>
                   </div>
                </div>
              </div>
            </div>

            <div style={{marginTop: '3rem', textAlign: 'center'}}>
              {!isProcessing ? (
                <button 
                  className="btn btn-primary" 
                  style={{padding: '1rem 3rem', fontSize: '1.2rem', width: '100%', borderRadius: '0.5rem'}}
                  onClick={handleGenerate}
                  disabled={!url}
                >
                  🚀 Generate {clipCount > 1 ? `${clipCount} Viral Clips` : 'Viral Clip'}
                </button>
              ) : (
                <div style={{width: '100%'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 600}}>
                    <span>{activeJob?.stage || 'Processing Video...'}</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden'}}>
                    <div style={{width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s'}}></div>
                  </div>
                  <p style={{marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem'}}>
                    This may take a few minutes depending on the video length and clip count.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card-container" style={{marginTop: '2rem', maxWidth: '900px', background: '#f1f5f9', border: '2px dashed #cbd5e1'}}>
        <div style={{textAlign: 'center', padding: '2rem'}}>
          <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🤖</div>
          <h3 style={{color: 'var(--dark)', marginBottom: '0.5rem'}}>Smart AI Features Enabled</h3>
          <div style={{display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem'}}>
             <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)'}}>
               <span>✅</span> Face Recognition
             </div>
             <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)'}}>
               <span>✅</span> Auto-Crop (9:16)
             </div>
             <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)'}}>
               <span>✅</span> Smart Trimming
             </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ShortVideo({ 
  openAiKey, geminiKey, elevenLabsKey, pexelsKey, onGoToKeys,
  activeStyle, activeTheme, activeNiche, videoEngine,
  activeJobs, addJob, clearJob, lastJobId, socialAccounts, checkGate
}: { 
  openAiKey: string; geminiKey: string; elevenLabsKey: string; pexelsKey: string; onGoToKeys: () => void;
  activeStyle: string; activeTheme: string; activeNiche: string; videoEngine: string;
  activeJobs: any; addJob: (id: string) => void; clearJob: () => void; lastJobId?: string;
  socialAccounts: any; checkGate?: () => boolean;
}) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [voice, setVoice] = useState('Rachel');
  const [captionStyle, setCaptionStyle] = useState('MRBEAST');
  const [isTestMode, setIsTestMode] = useState(false);
  const [videoType, setVideoType] = useState<'NORMAL' | 'TALKING_HEAD'>('NORMAL');
  const [avatarId, setAvatarId] = useState(0);
  const [captionSize, setCaptionSize] = useState(38);
  const [visuals, setVisuals] = useState<any[]>([]);
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const activeJob = lastJobId ? activeJobs[lastJobId] : null;
  const isRendering = activeJob?.status === 'processing';
  const renderProgress = activeJob?.progress || 0;
  const renderStage = activeJob?.stage || '';
  const resultVideo = (activeJob?.status === 'completed' && activeJob.result) ? activeJob.result.videoUrl : null;
  const error = activeJob?.status === 'failed' ? activeJob.error : null;

  const handleGenerateScript = async () => {
    if (!topic) return;
    if (checkGate && !checkGate()) return;
    setIsGeneratingScript(true);
    setScript('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, openAiKey, geminiKey, length: 'short' }),
      });
      const data = await res.json();
      if (data.script) {
        setScript(data.script);
        handleGenerateVisuals(data.script);
      }
      else throw new Error(data.error || 'Script generation failed');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateVisuals = async (targetScript?: string) => {
    const s = targetScript || script;
    if (!s) return;
    setIsGeneratingVisuals(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/talking-head/generate-visuals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          script: s, 
          pexelsKey, 
          geminiKey,
          type: videoType === 'NORMAL' ? 'video' : 'image' 
        }),
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.error(`Visuals Error (${res.status}): ${text.substring(0, 100)}`);
        return;
      }
      
      const data = await res.json();
      if (data.visuals) setVisuals(data.visuals);
    } catch (e) {
      console.error('Failed to generate visuals');
    } finally {
      setIsGeneratingVisuals(false);
    }
  };

  const playVoice = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const audio = new Audio(url);
    audio.play().catch(err => {
      console.error('Playback failed:', err);
      alert('Preview file not found. This feature requires the voice files in the public/voices folder.');
    });
  };

  const handleRender = async () => {
    if (!script) return;
    const endpoint = videoType === 'TALKING_HEAD' ? '/api/talking-head' : '/api/short-video';
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          script, voice, captionStyle, elevenLabsKey, pexelsKey, geminiKey, topic, isTest: isTestMode,
          renderer: 'ffmpeg',
          style: activeStyle,
          theme: activeTheme,
          niche: activeNiche,
          engine: videoEngine,
          visuals: visuals.length > 0 ? visuals : undefined,
          avatarId,
          captionSize,
          refresh: true // Force fresh render when clicking the button
        }),
      });
      const data = await res.json();
      if (data.success && data.jobId) {
        addJob(data.jobId);
      } else throw new Error(data.error || 'Render failed to start');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const steps = ['Script', 'Voice', 'Clips', 'Render'];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Short Video Creator</h1>
        <p className="page-subtitle">Generate viral 9:16 shorts for TikTok, Reels, and YouTube Shorts.</p>
        <div style={{marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
          <div style={{display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.5rem'}}>
            <button 
              className="btn"
              style={{
                fontSize: '0.75rem', padding: '0.4rem 1rem', 
                background: videoType === 'NORMAL' ? 'white' : 'transparent',
                boxShadow: videoType === 'NORMAL' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                fontWeight: 700
              }}
              onClick={() => setVideoType('NORMAL')}
            >
              Normal Short
            </button>
            <button 
              className="btn"
              style={{
                fontSize: '0.75rem', padding: '0.4rem 1rem', 
                background: videoType === 'TALKING_HEAD' ? 'white' : 'transparent',
                boxShadow: videoType === 'TALKING_HEAD' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                fontWeight: 700
              }}
              onClick={() => {
                setVideoType('TALKING_HEAD');
                if (script && visuals.length === 0) handleGenerateVisuals();
              }}
            >
              Talking Head (Overlay)
            </button>
          </div>

          <button 
            className={`btn ${isTestMode ? 'btn-primary' : ''}`}
            style={{fontSize: '0.8rem', padding: '0.5rem 1rem', background: isTestMode ? 'var(--dark)' : '#f1f5f9', color: isTestMode ? 'white' : 'var(--dark)'}}
            onClick={() => {
              setIsTestMode(!isTestMode);
              if (!isTestMode) {
                setTopic('tajmahal');
              } else {
                setTopic('');
              }
            }}
          >
            {isTestMode ? '✨ Testing Mode: ON' : '🧪 Video Testing'}
          </button>
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'center',gap:'0',marginBottom:'3rem'}}>
        {steps.map((s, i) => (
          <div key={i} style={{display:'flex',alignItems:'center'}}>
            <div
              onClick={() => !isRendering && setStep(i + 1)}
              style={{
                width:'32px',height:'32px',borderRadius:'50%',display:'flex',alignItems:'center',
                justifyContent:'center',fontWeight:700,fontSize:'0.8rem',cursor:'pointer',
                background: step > i ? 'var(--dark)' : step === i+1 ? 'var(--dark)' : '#f1f5f9',
                color: step >= i+1 ? 'white' : 'var(--text-muted)',
                transition:'all 0.3s'
              }}
            >{i+1}</div>
            <div style={{fontSize:'0.8rem',color: step >= i+1 ? 'var(--dark)' : 'var(--text-muted)',marginLeft:'0.5rem',marginRight:'1rem',fontWeight:600}}>{s}</div>
            {i < steps.length-1 && <div style={{width:'30px',height:'1px',background:'#e2e8f0',marginRight:'1rem'}}></div>}
          </div>
        ))}
      </div>

      <div className="card-container">
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="step-badge">Step 1</div>
            <h2 className="section-title">AI Short Script <span style={{fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '1rem', marginLeft: '0.5rem'}}>50-60 Seconds</span></h2>
            <p className="section-desc">Define your topic and AI will craft a high-retention short script.</p>


            <div style={{display:'flex',gap:'1rem',marginBottom:'1.5rem'}}>
              <input
                type="text"
                className="form-input"
                placeholder="Topic: e.g. 3 Scary Space Facts"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                disabled={isGeneratingScript}
              />
              <button
                className="btn btn-primary"
                onClick={handleGenerateScript}
                disabled={!topic || isGeneratingScript}
              >
                {isGeneratingScript ? 'Generating...' : 'Generate Script'}
              </button>
            </div>

            <textarea
              className="form-input"
              style={{height:'250px',resize:'vertical',lineHeight:1.6, fontSize: '0.85rem'}}
              placeholder="Your short script will appear here..."
              value={script}
              onChange={e => setScript(e.target.value)}
            />
            
            <div style={{marginTop: '2rem'}}>
              <button
                className="btn btn-primary"
                style={{width:'100%',padding:'1rem'}}
                onClick={() => setStep(2)}
                disabled={!script}
              >
                Continue to Voice
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <div className="step-badge">Step 2</div>
            <h2 className="section-title">Narrator</h2>
            <p className="section-desc">Select a voice for your short.</p>

            <VoiceSelector selectedVoice={voice} onSelect={setVoice} />

            <div style={{display:'flex',gap:'1rem'}}>
              <button className="btn" style={{flex:1}} onClick={() => setStep(1)}>Back</button>
              <button className="btn" style={{flex:1, color: '#ef4444', borderColor: '#fee2e2'}} onClick={() => {
                if (confirm('Restart this short? All progress will be lost.')) {
                  setStep(1); setScript(''); setTopic(''); setVisuals([]);
                }
              }}>Restart</button>
              <button className="btn btn-primary" style={{flex:2}} onClick={() => {
                setStep(3);
                if (visuals.length === 0) handleGenerateVisuals();
              }}>
                Continue to Clips
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <div className="step-badge">Step 3</div>
            <div style={{marginBottom: '3rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <h3 className="section-title" style={{margin: 0, fontSize: '1rem'}}>{videoType === 'TALKING_HEAD' ? 'Image Overlays' : 'Visual Clips'}</h3>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button 
                    className="btn" 
                    style={{fontSize: '0.7rem', color: 'var(--primary)', borderColor: 'var(--primary)'}} 
                    onClick={async (e) => {
                      const btn = e.currentTarget;
                  <button 
                    className="btn" 
                    style={{fontSize: '0.7rem', background: 'var(--dark)', color: 'white'}} 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'video/*';
                      input.onchange = async (e: any) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        
                        const formData = new FormData();
                        for (let i = 0; i < files.length; i++) {
                          formData.append('clips', files[i]);
                        }
                        
                        const btn = e.target;
                        alert('Uploading ' + files.length + ' videos... Please wait.');
                        
                        try {
                          const res = await fetch(`${API_BASE_URL}/api/upload-background`, {
                            method: 'POST',
                            body: formData
                          });
                          const data = await res.json();
                          alert(data.message || 'Upload complete!');
                        } catch (err) {
                          alert('Upload failed. Try smaller files.');
                        }
                      };
                      input.click();
                    }}
                  >
                    📁 Upload Videos
                  </button>
                  <button 
                    className="btn" 
                    style={{fontSize: '0.7rem'}} 
                    onClick={async (e) => {
                      const btn = e.currentTarget;
                      const original = btn.innerText;
                      btn.innerText = 'Syncing...';
                      try {
                        const res = await fetch(`${API_BASE_URL}/api/automation/sync-background`, { method: 'POST' });
                        const data = await res.json();
                        alert(data.message || 'Sync complete!');
                      } catch (err) {
                        alert('Sync failed.');
                      }
                      btn.innerText = original;
                    }}
                  >
                    Sync Drive
                  </button>
                  <button className="btn" style={{fontSize: '0.7rem'}} onClick={() => handleGenerateVisuals()} disabled={isGeneratingVisuals}>
                    {isGeneratingVisuals ? 'Refreshing...' : 'Refresh All Clips'}
                  </button>
                </div>
              </div>

              {videoType === 'TALKING_HEAD' && (
                <div style={{marginBottom: '2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0'}}>
                  <h3 style={{fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <span>👤</span> Select AI Character
                  </h3>
                  <div style={{display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.75rem'}}>
                    {[
                      { name: 'Gigachad', img: '/characters/gigachad.png' },
                      { name: 'Sigma Male', img: '/characters/sigma_male.png' },
                      { name: 'Hypebeast', img: '/characters/hypebeast.png' },
                      { name: 'Gamer Girl', img: '/characters/gamer_girl.png' },
                      { name: 'NPC Girl', img: '/characters/npc_girl.png' },
                      { name: 'Soft Girl', img: '/characters/soft_girl.png' },
                      { name: 'Robot', img: '/characters/cartoon_robot.png' },
                      { name: 'Lion', img: '/characters/cartoon_lion.png' },
                      { name: 'Monster', img: '/characters/cartoon_monster.png' },
                      { name: 'Superhero', img: '/characters/cartoon_superhero.png' }
                    ].map((char, i) => (
                      <div 
                        key={i}
                        onClick={() => setAvatarId(i)}
                        style={{
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '0.75rem', 
                          background: 'white', 
                          flexShrink: 0, 
                          cursor: 'pointer',
                          border: `2px solid ${avatarId === i ? 'var(--primary)' : 'transparent'}`,
                          backgroundImage: `url(${char.img})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          boxShadow: avatarId === i ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
                          position: 'relative'
                        }}
                      >
                         <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.45rem', textAlign: 'center', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem', padding: '1px'}}>
                           {char.name}
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem'}}>
                {visuals.map((vis, idx) => (
                  <div key={idx} style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.5rem'}}>
                    <div style={{aspectRatio: videoType === 'TALKING_HEAD' ? '1/1' : '16/9', background: '#e2e8f0', borderRadius: '0.25rem', overflow: 'hidden', marginBottom: '0.5rem'}}>
                      {vis.url ? (
                        vis.url.toLowerCase().includes('.mp4') ? (
                          <video src={vis.url} style={{width: '100%', height: '100%', objectFit: 'cover'}} muted onMouseOver={e=>e.currentTarget.play()} onMouseOut={e=>e.currentTarget.pause()} />
                        ) : (
                          <img src={vis.url} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                        )
                      ) : (
                        <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem'}}>Loading...</div>
                      )}
                    </div>
                    <div style={{fontSize: '0.7rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.5rem', height: '2.5rem', overflow: 'hidden'}}>
                      {vis.keyword}
                    </div>
                    <div style={{display: 'flex', gap: '0.4rem', marginTop: '0.5rem'}}>
                      <button 
                        className="btn" 
                        style={{
                          flex: 1, 
                          fontSize: '0.65rem', 
                          padding: '0.4rem', 
                          background: '#f1f5f9',
                          borderRadius: '0.4rem',
                          fontWeight: 700,
                          color: '#475569',
                          border: '1px solid #e2e8f0'
                        }}
                        onClick={async () => {
                          const newKeyword = prompt(`Enter new keyword for ${videoType === 'TALKING_HEAD' ? 'image' : 'clip'}:`, vis.keyword);
                          if (newKeyword) {
                            try {
                              const endpoint = videoType === 'TALKING_HEAD' ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(newKeyword)}&per_page=1` : `https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(newKeyword)}&per_page=1`;
                              const res = await fetch(endpoint, {
                                headers: { Authorization: pexelsKey }
                              });
                              const data = await res.json();
                              if (videoType === 'TALKING_HEAD' && data.photos?.length > 0) {
                                const newVisuals = [...visuals];
                                newVisuals[idx] = { ...vis, url: data.photos[0].src.large, keyword: newKeyword };
                                setVisuals(newVisuals);
                              } else if (videoType === 'NORMAL' && data.videos?.length > 0) {
                                const video = data.videos[0];
                                const hdFile = video.video_files.find((f: any) => f.quality === 'hd') || video.video_files[0];
                                const newVisuals = [...visuals];
                                newVisuals[idx] = { ...vis, url: hdFile.link, keyword: newKeyword };
                                setVisuals(newVisuals);
                              }
                            } catch (e) { alert('Failed to find visual'); }
                          }
                        }}
                      >
                        Replace
                      </button>
                      <button 
                        className="btn" 
                        style={{
                          flex: 1, 
                          fontSize: '0.65rem', 
                          padding: '0.4rem', 
                          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                          color: 'white',
                          borderRadius: '0.4rem',
                          fontWeight: 700,
                          border: 'none',
                          boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
                        }}
                        onClick={async (e) => {
                          const btn = e.currentTarget;
                          const originalText = btn.innerText;
                          btn.innerText = '...';
                          btn.disabled = true;
                          
                          const promptText = prompt('Generate with Imagen 3. Enter exact prompt:', vis.keyword) || vis.keyword;
                          
                          try {
                            const res = await fetch(`${API_BASE_URL}/api/generate-image-gemini`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ prompt: promptText, geminiKey })
                            });
                            
                            if (!res.ok) {
                              const text = await res.text();
                              alert(`Error (${res.status}): ${text.substring(0, 100)}`);
                              return;
                            }
                            
                            const data = await res.json();
                            if (data.url) {
                              const newVisuals = [...visuals];
                              newVisuals[idx] = { ...vis, url: data.url, keyword: promptText };
                              setVisuals(newVisuals);
                            } else {
                              alert(data.error || 'Failed to generate AI image');
                            }
                          } catch (err: any) {
                            alert('Error: ' + err.message);
                          } finally {
                            btn.innerText = originalText;
                            btn.disabled = false;
                          }
                        }}
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                ))}
                {visuals.length === 0 && !isGeneratingVisuals && (
                  <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>
                    No clips generated. Try clicking Refresh.
                  </div>
                )}
              </div>
            </div>

            <h2 className="section-title">Caption Style & Size</h2>
            <p className="section-desc">Select a visual style and adjust the size for your captions.</p>

            <div style={{marginBottom: '2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                <span style={{fontSize: '0.85rem', fontWeight: 600}}>Font Size</span>
                <span style={{fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)'}}>{captionSize}px</span>
              </div>
              <input 
                type="range" min="16" max="100" value={captionSize} 
                onChange={(e) => setCaptionSize(parseInt(e.target.value))}
                style={{width: '100%', accentColor: 'var(--dark)'}}
              />
            </div>

            <div className="grid-selection" style={{gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'2rem'}}>
              {captionStyles.map(cs => (
                <div
                  key={cs.id}
                  onClick={() => setCaptionStyle(cs.id)}
                  className={`grid-item ${captionStyle === cs.id ? 'selected' : ''}`}
                >
                  <div style={{background:cs.bg,height:'100px',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',textAlign:'center'}}>
                    <span style={{color:cs.color,fontWeight:800,fontSize:'0.7rem',lineHeight:1.2}}>{cs.example}</span>
                  </div>
                  <div className="grid-item-label">{cs.name}</div>
                </div>
              ))}
            </div>

            <div style={{display:'flex',gap:'1rem'}}>
              <button className="btn" style={{flex:1} } onClick={() => setStep(2)}>Back</button>
              <button className="btn" style={{flex:1, color: '#ef4444', borderColor: '#fee2e2'}} onClick={() => {
                if (confirm('Restart this short? All progress will be lost.')) {
                  clearJob(); setStep(1); setScript(''); setTopic(''); setVisuals([]);
                }
              }}>Restart</button>
              <button className="btn btn-primary" style={{flex:2}} onClick={() => setStep(4)}>
                Continue to Render
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in">
            <div className="step-badge">Step 4</div>
            <h2 className="section-title">Final Review</h2>

            {error && (
              <div style={{background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', position: 'relative'}}>
                <div style={{fontWeight: 700, marginBottom: '0.25rem'}}>Renderer Error</div>
                <div style={{paddingRight: '1.5rem'}}>{error}</div>
                <button 
                  onClick={() => clearJob()}
                  style={{position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem'}}
                >
                  ✕
                </button>
              </div>
            )}

            {resultVideo ? (
              <div style={{textAlign:'center'}}>
                <h3 style={{color:'var(--dark)',fontWeight:700,marginBottom:'1.5rem'}}>Short Ready!</h3>
                <div style={{width:'280px',aspectRatio:'9/16',background:'#000',borderRadius:'1rem',overflow:'hidden',marginBottom:'2rem', margin:'0 auto'}}>
                  <video src={resultVideo} controls style={{width:'100%',height:'100%'}} />
                </div>
                <button className="btn btn-primary" style={{width: '100%', marginBottom: '1rem'}} onClick={() => setShowUploadModal(true)}>Upload to Socials</button>
              </div>
            ) : (
              <div>
                <div style={{background:'#fcfdfe',border:'1px solid var(--border-color)',borderRadius:'1rem',padding:'2rem',marginBottom:'2rem'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',fontSize:'0.85rem'}}>
                    <div>
                      <div style={{color:'var(--text-muted)',fontSize:'0.7rem',fontWeight:700, textTransform:'uppercase'}}>Voice</div>
                      <div style={{fontWeight:600,color:'var(--dark)'}}>{voice}</div>
                    </div>
                    <div>
                      <div style={{color:'var(--text-muted)',fontSize:'0.7rem',fontWeight:700, textTransform:'uppercase'}}>Format</div>
                      <div style={{fontWeight:600,color:'var(--dark)'}}>9:16 (Vertical)</div>
                    </div>
                  </div>
                </div>

                {isRendering ? (
                  <div style={{textAlign:'center', padding: '2rem'}}>
                    <div style={{fontSize:'0.9rem',fontWeight:600,color:'var(--dark)',marginBottom:'1.5rem'}}>{renderStage}</div>
                    <div style={{width:'100%',height:'8px',background:'#f1f5f9',borderRadius:'4px',overflow:'hidden',marginBottom:'1rem'}}>
                      <div style={{width:`${renderProgress}%`,height:'100%',background:'var(--dark)',transition:'width 0.8s ease'}} />
                    </div>
                    <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{renderProgress}% Processing...</div>
                  </div>
                ) : (
                  <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                    <button className="btn btn-primary" style={{width:'100%', padding:'1rem'}} onClick={handleRender}>
                      Render Short Video
                    </button>
                    <button className="btn" style={{width:'100%'}} onClick={() => setStep(3)}>Back</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {showUploadModal && resultVideo && (
        <UploadModal 
          videoUrl={resultVideo} 
          topic={topic} 
          script={script} 
          accounts={socialAccounts} 
          onClose={() => setShowUploadModal(false)} 
        />
      )}
    </>
  );
}

function LongVideo({ 
  openAiKey, geminiKey, elevenLabsKey, pexelsKey, onGoToKeys,
  activeStyle, activeTheme, activeNiche, videoEngine,
  activeJobs, addJob, clearJob, lastJobId, socialAccounts, checkGate
}: { 
  openAiKey: string; geminiKey: string; elevenLabsKey: string; pexelsKey: string; onGoToKeys: () => void;
  activeStyle: string; activeTheme: string; activeNiche: string; videoEngine: string;
  activeJobs: any; addJob: (id: string) => void; clearJob: () => void; lastJobId?: string;
  socialAccounts: any; checkGate?: () => boolean;
}) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [voice, setVoice] = useState('Rachel');
  const [captionStyle, setCaptionStyle] = useState('MRBEAST');

  const activeJob = lastJobId ? activeJobs[lastJobId] : null;
  const [visuals, setVisuals] = useState<any[]>([]);
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
  const isRendering = activeJob?.status === 'processing';
  const renderProgress = activeJob?.progress || 0;
  const renderStage = activeJob?.stage || '';
  const resultVideo = (activeJob?.status === 'completed' && activeJob.result) ? activeJob.result.videoUrl : null;
  const error = activeJob?.status === 'failed' ? activeJob.error : null;
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleGenerateScript = async () => {
    if (!topic) return;
    if (checkGate && !checkGate()) return;
    setIsGeneratingScript(true);
    setScript('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, openAiKey, geminiKey }),
      });
      const data = await res.json();
      if (data.script) {
        setScript(data.script);
        handleGenerateVisuals(data.script);
      }
      else throw new Error(data.error || 'Script generation failed');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateVisuals = async (targetScript?: string) => {
    const s = targetScript || script;
    if (!s) return;
    setIsGeneratingVisuals(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/talking-head/generate-visuals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: s, pexelsKey, geminiKey }),
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.error(`Visuals Error (${res.status}): ${text.substring(0, 100)}`);
        return;
      }
      
      const data = await res.json();
      if (data.visuals) setVisuals(data.visuals);
    } catch (e) {
      console.error('Failed to generate visuals');
    } finally {
      setIsGeneratingVisuals(false);
    }
  };

  const playVoice = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const audio = new Audio(url);
    audio.play().catch(err => {
      console.error('Playback failed:', err);
      alert('Preview file not found.');
    });
  };

  const handleRender = async () => {
    if (!script) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/long-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          script, voice, captionStyle, elevenLabsKey, pexelsKey, geminiKey,
          renderer: 'ffmpeg',
          style: activeStyle,
          theme: activeTheme,
          niche: activeNiche,
          engine: videoEngine,
          visuals: visuals.length > 0 ? visuals : undefined,
          refresh: true // Force fresh render
        }),
      });
      const data = await res.json();
      if (data.success && data.jobId) {
        addJob(data.jobId);
      } else throw new Error(data.error || 'Render failed to start');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const steps = ['Script', 'Voice', 'Clips', 'Render'];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Long Video Creator</h1>
        <p className="page-subtitle">Generate long-form content with AI scripts, professional voices, and high-quality B-roll.</p>
      </div>

      <div style={{display:'flex',justifyContent:'center',gap:'0',marginBottom:'3rem'}}>
        {steps.map((s, i) => (
          <div key={i} style={{display:'flex',alignItems:'center'}}>
            <div
              onClick={() => !isRendering && setStep(i + 1)}
              style={{
                width:'32px',height:'32px',borderRadius:'50%',display:'flex',alignItems:'center',
                justifyContent:'center',fontWeight:700,fontSize:'0.8rem',cursor:'pointer',
                background: step > i ? 'var(--dark)' : step === i+1 ? 'var(--dark)' : '#f1f5f9',
                color: step >= i+1 ? 'white' : 'var(--text-muted)',
                transition:'all 0.3s'
              }}
            >{i+1}</div>
            <div style={{fontSize:'0.8rem',color: step >= i+1 ? 'var(--dark)' : 'var(--text-muted)',marginLeft:'0.5rem',marginRight:'1rem',fontWeight:600}}>{s}</div>
            {i < steps.length-1 && <div style={{width:'30px',height:'1px',background:'#e2e8f0',marginRight:'1rem'}}></div>}
          </div>
        ))}
      </div>

      <div className="card-container">
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="step-badge">Step 1</div>
            <h2 className="section-title">AI Script Generator</h2>
            <p className="section-desc">Define your topic and AI will craft a professional narration script.</p>


            <div style={{display:'flex',gap:'1rem',marginBottom:'1.5rem'}}>
              <input
                type="text"
                className="form-input"
                placeholder="Topic: e.g. The future of AI in 2025"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                disabled={isGeneratingScript}
              />
              <button
                className="btn btn-primary"
                onClick={handleGenerateScript}
                disabled={!topic || isGeneratingScript}
              >
                {isGeneratingScript ? 'Generating...' : 'Generate Script'}
              </button>
            </div>

            <textarea
              className="form-input"
              style={{height:'350px',resize:'vertical',lineHeight:1.6, fontSize: '0.85rem'}}
              placeholder="Your script will appear here..."
              value={script}
              onChange={e => setScript(e.target.value)}
            />
            
            <div style={{marginTop: '2rem'}}>
              <button
                className="btn btn-primary"
                style={{width:'100%',padding:'1rem'}}
                onClick={() => setStep(2)}
                disabled={!script}
              >
                Continue to Voice
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <div className="step-badge">Step 2</div>
            <h2 className="section-title">Narrator Selection</h2>
            <p className="section-desc">Select a premium AI voice for your video.</p>

            <VoiceSelector selectedVoice={voice} onSelect={setVoice} />

            <div style={{display:'flex',gap:'1rem'}}>
              <button className="btn" style={{flex:1}} onClick={() => setStep(1)}>Back</button>
              <button className="btn" style={{flex:1, color: '#ef4444', borderColor: '#fee2e2'}} onClick={() => {
                if (confirm('Restart this short? All progress will be lost.')) {
                  clearJob(); setStep(1); setScript(''); setTopic(''); setVisuals([]);
                }
              }}>Restart</button>
              <button className="btn btn-primary" style={{flex:2}} onClick={() => {
                setStep(3);
                if (visuals.length === 0) handleGenerateVisuals();
              }}>
                Continue to Clips
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <div className="step-badge">Step 3</div>
            
            <div style={{marginBottom: '3rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <h3 className="section-title" style={{margin: 0, fontSize: '1rem'}}>Visual Clips</h3>
                <button className="btn" style={{fontSize: '0.7rem'}} onClick={() => handleGenerateVisuals()} disabled={isGeneratingVisuals}>
                  {isGeneratingVisuals ? 'Refreshing...' : 'Refresh All Clips'}
                </button>
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem'}}>
                {visuals.map((vis, idx) => (
                  <div key={idx} style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.5rem'}}>
                    <div style={{aspectRatio: '16/9', background: '#e2e8f0', borderRadius: '0.25rem', overflow: 'hidden', marginBottom: '0.5rem'}}>
                      {vis.url ? (
                        vis.url.endsWith('.mp4') ? (
                          <video src={vis.url} style={{width: '100%', height: '100%', objectFit: 'cover'}} muted onMouseOver={e=>e.currentTarget.play()} onMouseOut={e=>e.currentTarget.pause()} />
                        ) : (
                          <img src={vis.url} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                        )
                      ) : (
                        <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem'}}>Loading...</div>
                      )}
                    </div>
                    <div style={{fontSize: '0.7rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.5rem', height: '2.5rem', overflow: 'hidden'}}>
                      {vis.keyword}
                    </div>
                    <div style={{display: 'flex', gap: '0.4rem', marginTop: '0.5rem'}}>
                      <button 
                        className="btn" 
                        style={{
                          flex: 1, 
                          fontSize: '0.65rem', 
                          padding: '0.4rem', 
                          background: '#f1f5f9',
                          borderRadius: '0.4rem',
                          fontWeight: 700,
                          color: '#475569',
                          border: '1px solid #e2e8f0'
                        }}
                        onClick={async () => {
                          const newKeyword = prompt('Enter new keyword for clip:', vis.keyword);
                          if (newKeyword) {
                            try {
                              const res = await fetch(`https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(newKeyword)}&per_page=1`, {
                                headers: { Authorization: pexelsKey }
                              });
                              const data = await res.json();
                              if (data.videos?.length > 0) {
                                const video = data.videos[0];
                                const hdFile = video.video_files.find((f: any) => f.quality === 'hd') || video.video_files[0];
                                const newVisuals = [...visuals];
                                newVisuals[idx] = { ...vis, url: hdFile.link, keyword: newKeyword };
                                setVisuals(newVisuals);
                              }
                            } catch (e) { alert('Failed to find video clip'); }
                          }
                        }}
                      >
                        Replace
                      </button>
                      <button 
                        className="btn" 
                        style={{
                          flex: 1, 
                          fontSize: '0.65rem', 
                          padding: '0.4rem', 
                          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                          color: 'white',
                          borderRadius: '0.4rem',
                          fontWeight: 700,
                          border: 'none',
                          boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
                        }}
                        onClick={async (e) => {
                          const btn = e.currentTarget;
                          const originalText = btn.innerText;
                          btn.innerText = '...';
                          btn.disabled = true;
                          
                          const promptText = prompt('Generate with Imagen 3. Enter exact prompt:', vis.keyword) || vis.keyword;
                          
                          try {
                            const res = await fetch(`${API_BASE_URL}/api/generate-image-gemini`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ prompt: promptText, geminiKey })
                            });
                            
                            if (!res.ok) {
                              const text = await res.text();
                              alert(`Error (${res.status}): ${text.substring(0, 100)}`);
                              return;
                            }
                            
                            const data = await res.json();
                            if (data.url) {
                              const newVisuals = [...visuals];
                              newVisuals[idx] = { ...vis, url: data.url, keyword: promptText };
                              setVisuals(newVisuals);
                            } else {
                              alert(data.error || 'Failed to generate AI image');
                            }
                          } catch (err: any) {
                            alert('Error: ' + err.message);
                          } finally {
                            btn.innerText = originalText;
                            btn.disabled = false;
                          }
                        }}
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h2 className="section-title">Caption Style</h2>
            <p className="section-desc">Select a visual style for your captions.</p>

            <div className="grid-selection" style={{gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'2rem'}}>
              {captionStyles.map(cs => (
                <div
                  key={cs.id}
                  onClick={() => setCaptionStyle(cs.id)}
                  className={`grid-item ${captionStyle === cs.id ? 'selected' : ''}`}
                >
                  <div style={{background:cs.bg,height:'100px',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',textAlign:'center'}}>
                    <span style={{color:cs.color,fontWeight:800,fontSize:'0.7rem',lineHeight:1.2}}>{cs.example}</span>
                  </div>
                  <div className="grid-item-label">{cs.name}</div>
                </div>
              ))}
            </div>

            <div style={{display:'flex',gap:'1rem'}}>
              <button className="btn" style={{flex:1}} onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" style={{flex:2}} onClick={() => setStep(4)}>
                Continue to Render
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in">
            <div className="step-badge">Step 4</div>
            <h2 className="section-title">Final Review</h2>

            {error && (
              <div style={{background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', position: 'relative'}}>
                <div style={{fontWeight: 700, marginBottom: '0.25rem'}}>Renderer Error</div>
                <div style={{paddingRight: '1.5rem'}}>{error}</div>
                <button 
                  onClick={() => clearJob()}
                  style={{position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem'}}
                >
                  ✕
                </button>
              </div>
            )}

            {resultVideo ? (
              <div style={{textAlign:'center'}}>
                <h3 style={{color:'var(--dark)',fontWeight:700,marginBottom:'1.5rem'}}>Processing Complete</h3>
                <div style={{width:'100%',aspectRatio:'16/9',background:'#000',borderRadius:'1rem',overflow:'hidden',marginBottom:'2rem'}}>
                  <video src={resultVideo} controls style={{width:'100%',height:'100%'}} />
                </div>
                <button className="btn btn-primary" style={{width: '100%', marginBottom: '1rem'}} onClick={() => setShowUploadModal(true)}>Upload to Socials</button>
                <div style={{display:'flex',gap:'1rem',justifyContent:'center'}}>
                  <a href={resultVideo} download className="btn">Download Video</a>
                  <button className="btn" onClick={() => { 
                    clearJob(); 
                    setStep(1); 
                    setScript(''); 
                    setTopic(''); 
                    setVisuals([]);
                  }}>New Project</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{background:'#fcfdfe',border:'1px solid var(--border-color)',borderRadius:'1rem',padding:'2rem',marginBottom:'2rem'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',fontSize:'0.85rem'}}>
                    <div>
                      <div style={{color:'var(--text-muted)',fontSize:'0.7rem',fontWeight:700, textTransform:'uppercase'}}>Voice</div>
                      <div style={{fontWeight:600,color:'var(--dark)'}}>{voice}</div>
                    </div>
                    <div>
                      <div style={{color:'var(--text-muted)',fontSize:'0.7rem',fontWeight:700, textTransform:'uppercase'}}>Style</div>
                      <div style={{fontWeight:600,color:'var(--dark)'}}>{captionStyles.find(c=>c.id===captionStyle)?.name}</div>
                    </div>
                  </div>
                </div>

                {isRendering ? (
                  <div style={{textAlign:'center', padding: '2rem'}}>
                    <div style={{fontSize:'0.9rem',fontWeight:600,color:'var(--dark)',marginBottom:'1.5rem'}}>{renderStage}</div>
                    <div style={{width:'100%',height:'8px',background:'#f1f5f9',borderRadius:'4px',overflow:'hidden',marginBottom:'1rem'}}>
                      <div style={{width:`${renderProgress}%`,height:'100%',background:'var(--dark)',transition:'width 0.8s ease'}} />
                    </div>
                    <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{renderProgress}% Processing...</div>
                  </div>
                ) : (
                  <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                    <button className="btn btn-primary" style={{width:'100%', padding:'1rem'}} onClick={handleRender}>
                      Start Rendering
                    </button>
                    <button className="btn" style={{width:'100%'}} onClick={() => setStep(3)}>Back</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {showUploadModal && resultVideo && (
        <UploadModal 
          videoUrl={resultVideo} 
          topic={topic} 
          script={script} 
          accounts={socialAccounts} 
          onClose={() => setShowUploadModal(false)} 
        />
      )}
    </>
  );
}

function TokenUsageChart({ balances }: { balances: any }) {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const usageData = [
    { 
      name: 'ElevenLabs', 
      usage: balances?.elevenLabs?.usage || 0, 
      total: balances?.elevenLabs?.total || 1, 
      color: 'linear-gradient(135deg, #f97316, #ea580c)', 
      icon: '🗣️',
      unit: 'Chars'
    },
    { 
      name: 'Gemini (Google)', 
      usage: 0, 
      total: 100, 
      color: 'linear-gradient(135deg, #4285F4, #9b51e0)', 
      icon: '✨',
      unit: 'Tokens',
      isPlaceholder: true
    },
    { 
      name: 'OpenAI', 
      usage: 0, 
      total: 100, 
      color: 'linear-gradient(135deg, #10a37f, #057a5e)', 
      icon: '🤖',
      unit: 'Tokens',
      isPlaceholder: true
    }
  ];

  return (
    <div className="card-container" style={{ maxWidth: '700px', marginBottom: '2rem', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--dark)', margin: 0 }}>Usage Analytics</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#f0fdf4', padding: '0.2rem 0.5rem', borderRadius: '1rem', border: '1px solid #dcfce7' }}>
              <div style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Live</span>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated token consumption across all services</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>66.5K</div>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Tokens</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {usageData.map((item) => {
          const percentage = (item.usage / item.total) * 100;
          return (
            <div key={item.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{item.name}</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {item.isPlaceholder ? 'API Pending' : `${item.usage.toLocaleString()} / ${item.total.toLocaleString()} ${item.unit || ''}`}
                </div>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: animated ? `${percentage}%` : '0%', 
                    height: '100%', 
                    background: item.color, 
                    borderRadius: '4px',
                    transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }} 
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        background: '#f8fafc', 
        borderRadius: '0.75rem', 
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{ fontSize: '1.2rem' }}>💡</div>
        <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
          <strong>Tip:</strong> Gemini Flash is the most token-efficient for script generation. Switch to Flash in settings to save up to 80% on costs.
        </p>
      </div>
    </div>
  );
}

function APIKeys({ 
  socialAccounts,
  openAiKey, setOpenAiKey, 
  geminiKey, setGeminiKey, 
  elevenLabsKey, setElevenLabsKey, 
  pexelsKey, setPexelsKey,
  creatomateKey, setCreatomateKey,
  activeTheme, setActiveTheme,
  activeNiche, setActiveNiche,
  emailService, setEmailService,
  emailUser, setEmailUser,
  emailPass, setEmailPass,
  emailReceiver, setEmailReceiver,
  emailEnabled, setEmailEnabled
}: {
  socialAccounts: any;
  openAiKey: string; setOpenAiKey: (v: string) => void;
  geminiKey: string; setGeminiKey: (v: string) => void;
  elevenLabsKey: string; setElevenLabsKey: (v: string) => void;
  pexelsKey: string; setPexelsKey: (v: string) => void;
  creatomateKey: string; setCreatomateKey: (v: string) => void;
  activeTheme: string; setActiveTheme: (v: string) => void;
  activeNiche: string; setActiveNiche: (v: string) => void;
  emailService: string; setEmailService: (v: string) => void;
  emailUser: string; setEmailUser: (v: string) => void;
  emailPass: string; setEmailPass: (v: string) => void;
  emailReceiver: string; setEmailReceiver: (v: string) => void;
  emailEnabled: boolean; setEmailEnabled: (v: boolean) => void;
}) {
  const [balances, setBalances] = useState<any>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const fetchBalances = async () => {
    setLoadingBalances(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/config/balances`);
      const data = await res.json();
      setBalances(data);
    } catch (e) {
      console.error('Failed to fetch balances');
    } finally {
      setLoadingBalances(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);
  const keys = [
    { label: 'Gemini (Google)', value: geminiKey, setter: setGeminiKey, placeholder: 'AIza...', hint: 'Used for AI script generation (Flash/Pro)', link: 'https://aistudio.google.com/app/apikey' },
    { label: 'OpenAI', value: openAiKey, setter: setOpenAiKey, placeholder: 'sk-...', hint: 'Alternative for AI script generation', link: 'https://platform.openai.com/api-keys' },
    { label: 'ElevenLabs', value: elevenLabsKey, setter: setElevenLabsKey, placeholder: 'Your ElevenLabs API key', hint: 'Used for AI voiceover narration', link: 'https://elevenlabs.io/app/settings/api-keys' },
    { label: 'Pexels', value: pexelsKey, setter: setPexelsKey, placeholder: 'Your Pexels API key', hint: 'Used for royalty-free B-roll video clips (free)', link: 'https://www.pexels.com/api/new/' },
    { label: 'Creatomate', value: creatomateKey, setter: setCreatomateKey, placeholder: 'Your Creatomate API key', hint: 'Used for advanced cloud video rendering', link: 'https://creatomate.com/app/settings/api-keys' },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">API Configuration</h1>
        <p className="page-subtitle">Manage your credentials securely. These keys are stored locally in your browser.</p>
      </div>

      <div className="card-container" style={{maxWidth:'700px'}}>
        <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'-2.5rem', position:'relative', zIndex: 10}}>
          <button 
            className="btn" 
            style={{fontSize:'0.65rem', padding:'0.3rem 0.6rem', background:'white', border:'1px solid #e2e8f0', fontWeight:700}}
            onClick={fetchBalances}
            disabled={loadingBalances}
          >
            {loadingBalances ? 'Syncing...' : '🔄 Refresh Balances'}
          </button>
        </div>
        <TokenUsageChart balances={balances} />
        
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--dark)', marginBottom: '0.5rem' }}>Active Credentials</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enter your API keys below to enable AI features.</p>
        </div>

        {/* Google One-Click Connection */}
        <div style={{
          marginBottom: '2.5rem', padding: '1.5rem', borderRadius: '1rem',
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.05) 0%, rgba(52, 168, 83, 0.05) 100%)',
          border: '1px solid rgba(66, 133, 244, 0.1)', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <div style={{fontWeight:800, color:'var(--dark)', fontSize:'1.1rem', marginBottom:'0.25rem'}}>Google Workspace</div>
              <p style={{fontSize:'0.75rem', color:'var(--text-muted)', margin:0}}>One-click connection for YouTube & Google Drive</p>
            </div>
            <button 
              className="btn btn-primary" 
              style={{
                background: socialAccounts.youtube?.connected ? '#10b981' : '#4285F4',
                padding: '0.6rem 1.2rem', fontSize: '0.8rem', border: 'none'
              }}
              onClick={() => window.location.href = `${API_BASE_URL}/api/auth/google`}
            >
              {socialAccounts.youtube?.connected ? '✓ Connected' : 'Connect Account'}
            </button>
          </div>
          {socialAccounts.youtube?.accounts?.[0] && (
            <div style={{marginTop:'1rem', display:'flex', alignItems:'center', gap:'0.75rem', fontSize:'0.85rem', color:'var(--dark)', fontWeight:600}}>
              {socialAccounts.youtube.accounts[0].picture ? (
                <img src={socialAccounts.youtube.accounts[0].picture} alt="Channel Profile" style={{width:'32px', height:'32px', borderRadius:'50%', objectFit: 'cover'}} />
              ) : (
                <span style={{width:'8px', height:'8px', borderRadius:'50%', background:'#10b981'}}></span>
              )}
              <div>
                <div>Linked to: {socialAccounts.youtube.accounts[0].username}</div>
                <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400}}>{socialAccounts.youtube.accounts[0].email}</div>
              </div>
            </div>
          )}
        </div>

        {keys.map((k) => (
          <div key={k.label} style={{marginBottom:'2.5rem'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.75rem'}}>
              <div>
                <div style={{fontWeight:700,color:'var(--dark)',fontSize:'0.9rem'}}>{k.label}</div>
                <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{k.hint}</div>
              </div>
              <div style={{
                width:'20px',height:'20px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                background: k.value ? '#10b981' : '#ef4444',
                color: 'white', fontSize:'0.6rem',fontWeight:800
              }}>
                {k.value ? 'OK' : '!'}
              </div>
            </div>
            <input
              type="password"
              className="form-input"
              placeholder={k.placeholder}
              value={k.value}
              onChange={e => k.setter(e.target.value)}
              style={{marginBottom:'0.5rem'}}
            />
            <a href={k.link} target="_blank" rel="noopener noreferrer" style={{fontSize:'0.75rem',color:'var(--dark)',fontWeight:600}}>
              Get Credentials →
            </a>
          </div>
        ))}

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #f1f5f9' }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--dark)', margin: 0 }}>Email Notifications</h2>
            <div 
              style={{
                width: '44px', height: '22px', background: emailEnabled ? 'var(--dark)' : '#e2e8f0', 
                borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
              }}
              onClick={() => setEmailEnabled(!emailEnabled)}
            >
              <div style={{
                width: '16px', height: '16px', background: 'white', borderRadius: '50%',
                position: 'absolute', top: '3px', left: emailEnabled ? '25px' : '3px',
                transition: 'all 0.3s'
              }} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Automatically email your generated videos to you when they are ready.
          </p>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem'}}>
            <div>
              <label style={{fontWeight:700,color:'var(--dark)',fontSize:'0.85rem', display:'block', marginBottom:'0.5rem'}}>SMTP Service</label>
              <select className="form-select" value={emailService} onChange={(e) => setEmailService(e.target.value)}>
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="yahoo">Yahoo</option>
                <option value="hotmail">Hotmail</option>
                <option value="icloud">iCloud</option>
              </select>
            </div>
            <div>
              <label style={{fontWeight:700,color:'var(--dark)',fontSize:'0.85rem', display:'block', marginBottom:'0.5rem'}}>Receiver Email</label>
              <input 
                type="email" className="form-input" placeholder="Where to send videos" 
                value={emailReceiver} onChange={(e) => setEmailReceiver(e.target.value)} 
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
            <div>
              <label style={{fontWeight:700,color:'var(--dark)',fontSize:'0.85rem', display:'block', marginBottom:'0.5rem'}}>SMTP User (Your Email)</label>
              <input 
                type="email" className="form-input" placeholder="e.g. yourname@gmail.com" 
                value={emailUser} onChange={(e) => setEmailUser(e.target.value)} 
              />
            </div>
            <div>
              <label style={{fontWeight:700,color:'var(--dark)',fontSize:'0.85rem', display:'block', marginBottom:'0.5rem'}}>SMTP Password / App Password</label>
              <input 
                type="password" className="form-input" placeholder="••••••••" 
                value={emailPass} onChange={(e) => setEmailPass(e.target.value)} 
              />
            </div>
          </div>
          
          <div style={{marginTop: '1.5rem'}}>
            <button 
              className="btn" 
              style={{fontSize: '0.75rem', fontWeight: 700, background: '#f1f5f9'}}
              onClick={async () => {
                if (!emailUser || !emailPass || !emailReceiver) {
                  alert('Please fill in all email fields first.');
                  return;
                }
                try {
                  const res = await fetch(`${API_BASE_URL}/api/config/test-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emailService, emailUser, emailPass, emailReceiver }),
                  });
                  const data = await res.json();
                  if (data.success) alert('Test email sent! Check your inbox.');
                  else alert('Failed to send test email: ' + data.error);
                } catch (e) {
                  alert('Network error testing email.');
                }
              }}
            >
              📧 Send Test Email
            </button>
            <p style={{fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
              <strong>Gmail Tip:</strong> You must use an "App Password" if you have 2FA enabled.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--dark)', marginBottom: '1.5rem' }}>Global Series Defaults</h2>
          
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
            <div>
              <label style={{fontWeight:700,color:'var(--dark)',fontSize:'0.85rem', display:'block', marginBottom:'0.5rem'}}>Default Theme</label>
              <select className="form-select" value={activeTheme} onChange={(e) => setActiveTheme(e.target.value)}>
                <option>Cinematic</option>
                <option>Documentary</option>
                <option>Vlog</option>
                <option>Storytelling</option>
                <option>Educational</option>
              </select>
            </div>
            <div>
              <label style={{fontWeight:700,color:'var(--dark)',fontSize:'0.85rem', display:'block', marginBottom:'0.5rem'}}>Default Niche</label>
              <select className="form-select" value={activeNiche} onChange={(e) => setActiveNiche(e.target.value)}>
                <option>Motivation</option>
                <option>Finance</option>
                <option>Health</option>
                <option>Technology</option>
                <option>History</option>
                <option>AI & Future</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DriveAutomator({ folderId, setFolderId, frequency, setFrequency, isActive, setIsActive }: {
  folderId: string; setFolderId: (v: string) => void;
  frequency: number; setFrequency: (v: number) => void;
  isActive: boolean; setIsActive: (v: boolean) => void;
}) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/automation/status`);
      const data = await res.json();
      if (data.folderId !== undefined) setFolderId(data.folderId);
      if (data.spreadsheetId !== undefined) setSpreadsheetId(data.spreadsheetId);
      setFrequency(data.frequency || 2);
      setIsActive(data.isActive || false);
      setLogs(data.logs || []);
    } catch (e) {
      console.error('Failed to fetch automation status');
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/automation/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, spreadsheetId, frequency, isActive }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Automation configuration saved!');
        fetchStatus();
      }
    } catch (e) {
      alert('Failed to save configuration');
    }
  };

  const handleToggleActive = async () => {
    const nextActive = !isActive;
    setIsActive(nextActive);
    // Persist immediately
    try {
      await fetch(`${API_BASE_URL}/api/automation/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
    } catch (e) {
      console.error('Failed to toggle automation');
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTest = async () => {
    setIsTesting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/automation/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, spreadsheetId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Connection successful');
        fetchStatus();
      } else {
        setError(data.error || 'Failed to connect');
      }
    } catch (e) {
      setError('Network error: Could not reach the automation server');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Drive Automator</h1>
        <p className="page-subtitle">Schedule automatic posting from Google Drive and Spreadsheets.</p>
      </div>

      <div style={{maxWidth: '900px', margin: '0 auto'}}>
        <div className="card-container">
          {error && (
            <div style={{background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', border: '1px solid #fecaca'}} className="animate-fade-in">
              <strong>Connection Failed:</strong> {error}
            </div>
          )}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2.5rem'}}>
            <h2 className="section-title" style={{margin:0}}>Automation Logic</h2>
            <div 
              style={{
                width: '44px', height: '22px', background: isActive ? 'var(--dark)' : '#e2e8f0', 
                borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
              }}
              onClick={handleToggleActive}
            >
              <div style={{
                width: '16px', height: '16px', background: 'white', borderRadius: '50%',
                position: 'absolute', top: '3px', left: isActive ? '25px' : '3px',
                transition: 'all 0.3s'
              }} />
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem', marginBottom:'2rem'}}>
            <div className="form-group">
              <label style={{fontWeight:700, color:'var(--dark)', display:'block', marginBottom:'0.5rem', fontSize:'0.85rem'}}>
                Google Drive Folder ID
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Paste folder ID from URL" 
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              />
              <span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>The folder containing your .mp4 files</span>
            </div>
            <div className="form-group">
              <label style={{fontWeight:700, color:'var(--dark)', display:'block', marginBottom:'0.5rem', fontSize:'0.85rem'}}>
                Google Spreadsheet ID (Optional)
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Paste spreadsheet ID from URL" 
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
              />
              <span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>Used for scheduling and captions</span>
            </div>
          </div>


          <div style={{marginTop:'3rem'}}>
            <label style={{fontWeight:700, color:'var(--dark)', display:'block', marginBottom:'1rem'}}>
              Daily Posting Frequency: <span style={{color:'var(--primary)'}}>{frequency} Reels / Day</span>
            </label>
            <input 
              type="range" min="1" max="10" 
              style={{width:'100%', accentColor:'var(--primary)'}}
              value={frequency}
              onChange={(e) => setFrequency(parseInt(e.target.value))}
            />
            <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.5rem'}}>
              <span>1 (Chill)</span>
              <span>5 (Aggressive)</span>
              <span>10 (Spammy)</span>
            </div>
          </div>

          <div style={{marginTop:'3rem'}}>
            <h3 className="section-title" style={{fontSize:'1rem'}}>Target Channels</h3>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:'1rem', marginTop:'1rem'}}>
              {['YouTube Shorts', 'Instagram Reels', 'TikTok', 'Facebook Reels'].map(channel => (
                <div key={channel} style={{
                  padding:'1rem', borderRadius:'0.5rem', border:'1.5px solid #e2e8f0',
                  display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer',
                  background: '#f8fafc'
                }}>
                  <input type="checkbox" defaultChecked />
                  <span style={{fontWeight:600, fontSize:'0.85rem'}}>{channel}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{marginTop:'2rem', display:'flex', gap:'1rem'}}>
            <button 
              className="btn" 
              style={{flex:1, padding:'1rem', border:'1.5px solid var(--primary)', color:'var(--primary)', fontWeight:700}}
              onClick={handleTest}
              disabled={isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button 
              className="btn btn-primary" 
              style={{flex:2, padding:'1rem', fontSize:'1.1rem'}}
              onClick={handleSave}
            >
              Save & Sync Automation
            </button>
          </div>
        </div>

        <div>
          <div className="card-container" style={{margin: 0, padding: '1.5rem'}}>
            <h3 style={{fontWeight:800, color:'var(--dark)', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'0.5rem'}}>
              Activity Log
            </h3>
            <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
              {logs.length > 0 ? logs.map((log, i) => (
                <div key={i} style={{paddingBottom:'1rem', borderBottom: i < logs.length-1 ? '1px solid #f1f5f9' : 'none'}}>
                  <div style={{fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:600}}>{log.time}</div>
                  <div style={{fontSize:'0.85rem', color:'#1e293b', marginTop:'0.2rem', lineHeight:1.4}}>
                    {log.event}
                  </div>
                </div>
              )) : (
                <div style={{textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:'0.85rem'}}>
                  No activity recorded yet.
                </div>
              )}
            </div>
          </div>
            <button className="btn" style={{width:'100%', marginTop:'1rem', fontSize:'0.75rem', fontWeight:700}}>
              View All Logs
            </button>

          <div className="card-container" style={{marginTop: '1.5rem', padding: '1.5rem', background: 'var(--dark)', color:'white'}}>
            <h3 style={{fontWeight:800, marginBottom:'1rem'}}>Pro Tip</h3>
            <p style={{fontSize:'0.8rem', opacity:0.8, lineHeight:1.6}}>
              Use descriptive filenames like <br/>
              <code>Amazing_Life_Hack.mp4</code><br/>
              The automator will automatically extract titles and metadata from the filename.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function SocialAccounts({ accounts, setAccounts, onConnect }: {
  accounts: Record<string, { connected: boolean; accounts: { id: string; username: string; avatar: string; email?: string }[] }>;
  setAccounts: React.Dispatch<React.SetStateAction<Record<string, { connected: boolean; accounts: { id: string; username: string; avatar: string; email?: string }[] }>>>;
  onConnect: () => void;
}) {
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, { clientId: string; clientSecret: string; redirectUri: string }>>({});
  const [platformConfigs, setPlatformConfigs] = useState<Record<string, { clientId: string; redirectUri: string }>>({});

  const updateConfigValue = (platform: string, key: 'clientId' | 'clientSecret' | 'redirectUri', value: string) => {
    setConfigValues(prev => ({
      ...prev,
      [platform]: {
        ...(prev[platform] || { clientId: '', clientSecret: '', redirectUri: '' }),
        [key]: value
      }
    }));
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/accounts`);
      const data = await res.json();
      setAccounts(prev => ({ ...prev, ...data }));
    } catch (e) {
      console.error('Failed to fetch social accounts');
    }
  };

  const fetchConfigs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/configs`);
      const data = await res.json();
      setPlatformConfigs(data);
    } catch (e) {
      console.error('Failed to fetch platform configs');
    }
  };

  // Fetch real accounts on load
  useEffect(() => {
    fetchAccounts();
    fetchConfigs();

    // Listen for auth success from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'AUTH_SUCCESS') {
        fetchAccounts();
        setConnectingId(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setAccounts]);

  const platformConfig = (platformId: string) => {
    return {
      clientId: configValues[platformId]?.clientId ?? platformConfigs[platformId]?.clientId ?? '',
      clientSecret: configValues[platformId]?.clientSecret ?? '',
      redirectUri: configValues[platformId]?.redirectUri ?? platformConfigs[platformId]?.redirectUri ?? `${window.location.origin.replace(':3000', ':3001')}/api/auth/callback/${platformId}`
    };
  };

  const platforms = [
    {
      id: 'youtube',
      name: 'YouTube',
      icon: <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
      color: '#FF0000',
      gradient: 'linear-gradient(135deg, #FF0000, #CC0000)',
      bg: '#fff1f1',
      border: '#fecaca',
      desc: 'Upload Shorts & Long Videos',
      features: ['Auto-upload videos', 'Schedule publishing', 'Set titles & descriptions'],
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
      color: '#E1306C',
      gradient: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)',
      bg: '#fdf2f8',
      border: '#fbcfe8',
      desc: 'Post Reels & Stories',
      features: ['Auto-post Reels', 'Story sharing', 'Hashtag optimization'],
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
      color: '#1877F2',
      gradient: 'linear-gradient(135deg, #1877F2, #0C5DC7)',
      bg: '#eff6ff',
      border: '#bfdbfe',
      desc: 'Share to Pages & Reels',
      features: ['Page posting', 'Facebook Reels', 'Group sharing'],
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
      color: '#000000',
      gradient: 'linear-gradient(135deg, #25F4EE, #FE2C55, #000000)',
      bg: '#f0fdfa',
      border: '#99f6e4',
      desc: 'Post Short-Form Videos',
      features: ['Direct posting', 'Trending sounds', 'Duet-ready uploads'],
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      icon: <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>,
      color: '#E60023',
      gradient: 'linear-gradient(135deg, #E60023, #BD081C)',
      bg: '#fef2f2',
      border: '#fecaca',
      desc: 'Create Video Pins',
      features: ['Video Pins', 'Board organization', 'Rich pin support'],
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
      color: '#000000',
      gradient: 'linear-gradient(135deg, #14171A, #657786)',
      bg: '#f8fafc',
      border: '#e2e8f0',
      desc: 'Post Video Tweets',
      features: ['Video tweets', 'Thread posting', 'Auto-engagement'],
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
      color: '#0A66C2',
      gradient: 'linear-gradient(135deg, #0A66C2, #004182)',
      bg: '#eff6ff',
      border: '#bfdbfe',
      desc: 'Share Professional Video',
      features: ['Company page posts', 'Professional reach', 'Article integration'],
    },
    {
      id: 'snapchat',
      name: 'Snapchat',
      icon: <svg viewBox="0 0 24 24" width="28" height="28" fill="white"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.32.32 0 0 1 .114-.027.35.35 0 0 1 .209.063c.255.136.405.391.405.651 0 .331-.18.585-.587.755a4.678 4.678 0 0 1-.879.27c-.112.024-.232.052-.345.09-.299.104-.495.312-.585.636-.013.052-.025.104-.036.155a.37.37 0 0 1-.027.078c0 .003-.004.015-.004.015-.039.12-.09.255-.195.36-.375.389-1.23.675-2.546.888-.12.029-.225.06-.315.12-.135.09-.18.27-.225.42-.045.12-.075.24-.135.36-.075.15-.24.27-.504.27-.06 0-.135-.015-.225-.045a3.42 3.42 0 0 0-.435-.12 5.807 5.807 0 0 0-1.065-.105c-.3 0-.63.03-.93.105-.179.044-.327.088-.468.123l-.009.003c-.162.042-.309.09-.495.09h-.045c-.27 0-.42-.12-.495-.27-.06-.12-.09-.24-.135-.36-.045-.15-.09-.33-.225-.42-.09-.06-.195-.09-.315-.12-1.035-.165-2.025-.405-2.55-.87-.105-.12-.165-.24-.2-.39-.004-.018-.008-.033-.012-.048a.78.78 0 0 1-.024-.078c-.015-.06-.024-.12-.036-.165-.09-.33-.285-.54-.585-.645-.105-.03-.225-.06-.345-.09a4.673 4.673 0 0 1-.885-.27C.181 12.065 0 11.812 0 11.478a.67.67 0 0 1 .405-.66.35.35 0 0 1 .114-.024.35.35 0 0 1 .21.06c.374.18.735.301 1.035.301.2 0 .33-.045.401-.09a5.44 5.44 0 0 1-.033-.51l-.003-.06c-.105-1.628-.23-3.654.3-4.847C4.056 1.07 7.412.793 8.401.793h.12z"/></svg>,
      color: '#FFFC00',
      gradient: 'linear-gradient(135deg, #FFFC00, #FFE600)',
      bg: '#fefce8',
      border: '#fef08a',
      desc: 'Post to Spotlight',
      features: ['Spotlight videos', 'Story sharing', 'Public profile posts'],
    },
  ];

  const connectedCount = Object.values(accounts).filter(a => a.connected).length;

  const handleSaveConfig = async (platformId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId, config: platformConfig(platformId) }),
      });
      if (res.ok) {
        setShowConfig(null);
        fetchConfigs();
        alert(`${platformId} developer credentials saved!`);
      }
    } catch (e) {
      alert('Error saving configuration.');
    }
  };

  const handleConnect = async (platformId: string) => {
    if (platformId === 'youtube') {
      window.location.href = `${API_BASE_URL}/api/auth/google`;
      return;
    }
    setConnectingId(platformId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/url/${platformId}`);
      const data = await res.json();
      if (data.url) {
        // Open OAuth popup
        const width = 600, height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(data.url, 'SocialAuth', `width=${width},height=${height},left=${left},top=${top}`);
      } else {
        if (data.error?.includes('Client ID not configured')) {
            setShowConfig(platformId);
            alert(`Configuration Missing: Please enter your ${platformId} Developer Client ID and Secret in the settings panel below.`);
        } else {
            alert(data.error || 'Authentication error');
        }
        setConnectingId(null);
      }
    } catch (e) {
      alert('Failed to connect to authentication server');
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (platformId: string, accountId?: string) => {
      if (accountId) {
          // In a real app, you'd call a DELETE /api/auth/accounts/:platform/:id endpoint
          // For now, we'll just update the local state
          setAccounts(prev => {
              const platform = prev[platformId];
              const remainingAccounts = platform.accounts.filter(a => a.id !== accountId);
              return {
                  ...prev,
                  [platformId]: {
                      ...platform,
                      connected: remainingAccounts.length > 0,
                      accounts: remainingAccounts
                  }
              };
          });
          alert('Account disconnected locally. To fully revoke access, please visit the platform settings.');
      } else {
          setAccounts(prev => ({ ...prev, [platformId]: { ...prev[platformId], connected: false, accounts: [] } }));
      }
  };


  return (
    <>
      <div className="page-header">
        <h1 className="page-title">SOCIAL ACCOUNTS</h1>
        <p className="page-subtitle">Link your social media to auto-post videos directly from Auto Vid.</p>
      </div>

      <div className="card-container" style={{maxWidth:'820px'}}>
        {/* Status Summary */}
        <div style={{
          background: connectedCount > 0 ? '#f8fafc' : '#fffcf0',
          border: `1px solid ${connectedCount > 0 ? 'var(--border-color)' : '#fde68a'}`,
          padding: '1.5rem',
          borderRadius: '1rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
            <div>
              <div style={{fontWeight:700,color: 'var(--dark)',fontSize:'0.95rem'}}>
                {connectedCount > 0 ? `${connectedCount} Platform${connectedCount > 1 ? 's' : ''} Connected` : 'No platforms connected'}
              </div>
              <div style={{fontSize:'0.8rem',color: 'var(--text-muted)', marginTop: '0.25rem'}}>
                {connectedCount > 0 ? 'Your videos will auto-post to linked accounts' : 'Connect a platform to start auto-posting'}
              </div>
            </div>
          </div>
          <div style={{
            background: 'var(--dark)',
            color: 'white',
            padding: '0.3rem 0.8rem',
            borderRadius: '1rem',
            fontSize: '0.7rem',
            fontWeight: 700
          }}>
            {connectedCount}/{platforms.length}
          </div>
        </div>

        {/* Platform Cards */}
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          {platforms.map(platform => {
            const acct = accounts[platform.id];
            const isConnecting = connectingId === platform.id;
            const isConnected = acct?.connected;

            return (
              <div
                key={platform.id}
                style={{
                  border: `1.5px solid ${isConnected ? platform.border : '#e2e8f0'}`,
                  borderRadius: '1rem',
                  padding: '1.25rem 1.5rem',
                  background: isConnected ? platform.bg : 'white',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Subtle gradient accent on left */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px',
                  background: platform.gradient,
                  borderRadius: '1rem 0 0 1rem'
                }} />

                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem'}}>
                  {/* Left: Icon + Info */}
                  <div style={{display:'flex',alignItems:'center',gap:'1rem',flex:1}}>
                    <div style={{
                      width:'52px',height:'52px',borderRadius:'0.75rem',
                      background: platform.gradient,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:'1.5rem',
                      boxShadow: `0 4px 12px ${platform.color}30`,
                      flexShrink: 0
                    }}>
                      {platform.icon}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.15rem'}}>
                        <span style={{fontWeight:800,color:'#1e1b4b',fontSize:'1.05rem'}}>{platform.name}</span>
                        {isConnected && (
                          <span style={{
                            background: 'var(--dark)', color: 'white', fontSize: '0.65rem',
                            fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '1rem'
                          }}>LINKED</span>
                        )}
                        {platform.id !== 'youtube' && (
                          <button 
                              onClick={(e) => { e.stopPropagation(); setShowConfig(showConfig === platform.id ? null : platform.id); }}
                              style={{
                                  background: 'none', 
                                  border: 'none', 
                                  cursor: 'pointer', 
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  opacity: showConfig === platform.id ? 1 : 0.6,
                                  color: showConfig === platform.id ? 'var(--primary)' : 'inherit',
                                  transition: 'all 0.2s'
                              }}
                          >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                              </svg>
                              <span style={{fontSize:'0.7rem', fontWeight: 800}}>SETTINGS</span>
                          </button>
                        )}
                      </div>
                      {isConnected ? (
                        <div style={{marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                          {acct.accounts.map((acc, idx) => (
                            <div key={acc.id || idx} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              background: 'white', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                              border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                {acc.avatar ? (
                                  <img src={acc.avatar} alt="" style={{width:'24px', height:'24px', borderRadius:'50%'}} />
                                ) : (
                                  <div style={{width:'24px', height:'24px', borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:800}}>
                                    {acc.username?.charAt(0)}
                                  </div>
                                )}
                                <span style={{fontSize:'0.85rem', color:'#374151', fontWeight:600}}>{acc.username}</span>
                              </div>
                              <button
                                onClick={() => handleDisconnect(platform.id, acc.id)}
                                style={{
                                  background:'none', border:'none', color:'#ef4444', 
                                  fontSize:'0.7rem', fontWeight:700, cursor:'pointer',
                                  padding: '2px 6px', borderRadius: '4px'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                REMOVE
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{fontSize:'0.85rem',color:'#64748b'}}>{platform.desc}</div>
                      )}
                      
                      {/* Developer Config Panel (Hidden for YouTube Managed Auth) */}
                      {showConfig === platform.id && platform.id !== 'youtube' && (
                        <div style={{marginTop:'1rem', padding:'1rem', background:'#f8fafc', borderRadius:'0.5rem', border:'1px solid #e2e8f0'}}>
                            <div style={{fontSize:'0.75rem', fontWeight:700, marginBottom:'0.5rem'}}>DEV API CONFIG</div>
                            <input 
                                className="form-select" 
                                style={{fontSize:'0.8rem', marginBottom:'0.5rem'}} 
                                placeholder="Client ID" 
                                value={platformConfig(platform.id).clientId}
                                onChange={e => updateConfigValue(platform.id, 'clientId', e.target.value)}
                            />
                            <input 
                                className="form-select" 
                                style={{fontSize:'0.8rem', marginBottom:'0.5rem'}} 
                                placeholder="Client Secret" 
                                type="password"
                                value={platformConfig(platform.id).clientSecret}
                                onChange={e => updateConfigValue(platform.id, 'clientSecret', e.target.value)}
                            />
                            <input 
                                className="form-select" 
                                style={{fontSize:'0.8rem', marginBottom:'0.5rem'}} 
                                placeholder="Redirect URI" 
                                value={platformConfig(platform.id).redirectUri}
                                onChange={e => updateConfigValue(platform.id, 'redirectUri', e.target.value)}
                            />
                            <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '1rem', padding: '0 0.5rem'}}>
                                Must match exactly what you entered in the {platform.name} Developer Console.
                            </div>
                            <button 
                                className="btn btn-primary" 
                                style={{width:'100%', fontSize:'0.8rem'}}
                                onClick={() => handleSaveConfig(platform.id)}
                            >Save Credentials</button>
                        </div>
                      )}

                      {/* Feature tags */}
                      {!isConnected && !showConfig && (
                        <div style={{display:'flex',gap:'0.4rem',marginTop:'0.4rem',flexWrap:'wrap'}}>
                          {platform.features.map((f, i) => (
                            <span key={i} style={{
                              fontSize:'0.65rem',background:'#f1f5f9',color:'#475569',
                              padding:'0.15rem 0.5rem',borderRadius:'1rem',fontWeight:500
                            }}>{f}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div style={{flexShrink:0}}>
                    {isConnecting ? (
                      <div style={{
                        display:'flex',alignItems:'center',gap:'0.5rem',
                        padding:'0.6rem 1.5rem',borderRadius:'0.5rem',
                        background:'#f1f5f9',color:'#64748b',fontWeight:600,fontSize:'0.875rem'
                      }}>
                        Connecting...
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform.id)}
                        style={{
                          padding:'0.6rem 1.5rem',borderRadius:'0.5rem',
                          background: isConnected ? 'white' : 'var(--dark)',
                          color: isConnected ? 'var(--dark)' : 'white',
                          fontWeight:700,fontSize:'0.875rem',
                          border: isConnected ? '1.5px solid var(--border-color)' : 'none',
                          cursor:'pointer',
                          transition:'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; if(isConnected) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; if(isConnected) e.currentTarget.style.background = 'white'; }}
                      >
                        {isConnected ? '+ Add Account' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Banner */}
        <div style={{
          marginTop:'2rem',
          background:'#f8fafc',
          border:'1px solid var(--border-color)',
          borderRadius:'0.75rem',
          padding:'1.25rem',
          textAlign:'center'
        }}>
          <div style={{fontWeight:700,color:'var(--dark)',marginBottom:'0.4rem',fontSize:'0.85rem'}}>Local Encryption</div>
          <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Your keys are stored securely in your browser and are never sent to our servers.</div>
        </div>
      </div>

      {/* How It Works */}
      <div className="card-container" style={{maxWidth:'820px',marginTop:'0',background:'white',border:'1px solid var(--border-color)'}}>
        <div style={{textAlign:'center',padding:'1rem'}}>
          <h3 style={{color:'var(--dark)',marginBottom:'2rem',fontWeight:800, fontSize: '1.2rem'}}>Automatic Workflow</h3>
          <div style={{display:'flex',justifyContent:'center',gap:'2rem',flexWrap:'wrap'}}>
            {[
              { title: 'Create Video', desc: 'Generate your video using any tool' },
              { title: 'Select Accounts', desc: 'Choose which platforms to target' },
              { title: 'Auto-Post', desc: 'Videos publish on your schedule' },
            ].map((step, i) => (
              <div key={i} style={{flex:'1',minWidth:'150px',maxWidth:'200px'}}>
                <div style={{fontWeight:700,color:'var(--dark)',marginBottom:'0.5rem', fontSize: '0.9rem'}}>{step.title}</div>
                <div style={{fontSize:'0.8rem',color:'var(--text-muted)', lineHeight: 1.5}}>{step.desc}</div>
                {i < 2 && <div style={{color:'var(--border-color)',fontSize:'1rem',marginTop:'1rem'}}>—</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function UploadModal({ videoUrl, topic, script, accounts, onClose }: { 
    videoUrl: string; 
    topic: string; 
    script: string; 
    accounts: Record<string, { connected: boolean; accounts: { id: string; username: string; avatar: string; email?: string }[] }>;
    onClose: () => void;
}) {
    const [platform, setPlatform] = useState('youtube');
    const [accountId, setAccountId] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadJobId, setUploadJobId] = useState<string | null>(null);
    const [uploadStatus, setUploadStatus] = useState<any>(null);

    const platformAccounts = accounts[platform]?.accounts || [];

    useEffect(() => {
        if (platformAccounts.length > 0 && !accountId) {
            setAccountId(platformAccounts[0].id);
        }
    }, [platform, platformAccounts]);

    useEffect(() => {
        if (!uploadJobId) return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/jobs/${uploadJobId}`);
                const job = await res.json();
                setUploadStatus(job);
                if (job.status === 'completed' || job.status === 'failed') {
                    clearInterval(interval);
                    setIsUploading(false);
                }
            } catch (e) { console.error('Failed to poll upload job'); }
        }, 2000);
        return () => clearInterval(interval);
    }, [uploadJobId]);

    const handleUpload = async () => {
        if (!accountId) return alert('Please select an account');
        setIsUploading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoUrl, platform, accountId, topic, script })
            });
            const data = await res.json();
            if (data.jobId) setUploadJobId(data.jobId);
            else throw new Error(data.error || 'Upload failed to start');
        } catch (e: any) {
            alert(e.message);
            setIsUploading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={onClose}>
            <div style={{
                background: 'white', padding: '2rem', borderRadius: '1.5rem', width: '100%', maxWidth: '500px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative'
            }} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} style={{position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem'}}>✕</button>
                <h2 style={{fontWeight: 800, color: 'var(--dark)', marginBottom: '0.5rem'}}>Upload Video</h2>
                <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem'}}>Select platform and channel to publish your video.</p>

                {uploadStatus?.status === 'completed' ? (
                    <div style={{textAlign: 'center', padding: '2rem'}}>
                        <div style={{fontSize: '3rem', marginBottom: '1rem'}}>✅</div>
                        <h3 style={{fontWeight: 800, color: 'var(--dark)'}}>Upload Success!</h3>
                        <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '1rem'}}>
                            Your video has been published with an AI-generated caption.
                        </p>
                        <div style={{marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', textAlign: 'left'}}>
                            <div style={{fontWeight: 700, fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase'}}>AI Caption</div>
                            <div style={{fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem'}}>{uploadStatus.result?.caption?.title}</div>
                            <div style={{fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem'}}>{uploadStatus.result?.caption?.description}</div>
                        </div>

                        {uploadStatus.result?.url && (
                            <a 
                                href={uploadStatus.result.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn" 
                                style={{
                                    marginTop: '1.5rem', width: '100%', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', gap: '0.5rem', background: 'var(--dark)', color: 'white',
                                    textDecoration: 'none', fontWeight: 700
                                }}
                            >
                                <span>📺</span> View Video on {uploadStatus.result.platform === 'youtube' ? 'YouTube' : 'Platform'}
                            </a>
                        )}

                        <button className="btn" style={{marginTop: '1rem', width: '100%', fontWeight: 700}} onClick={onClose}>Close</button>
                    </div>
                ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                        <div className="form-group">
                            <label className="auth-label">Platform</label>
                            <select className="form-select" value={platform} onChange={e => { setPlatform(e.target.value); setAccountId(''); }}>
                                <option value="youtube">YouTube</option>
                                <option value="tiktok">TikTok</option>
                                <option value="facebook">Facebook</option>
                                <option value="instagram">Instagram</option>
                                <option value="twitter">X (Twitter)</option>
                                <option value="linkedin">LinkedIn</option>
                                <option value="pinterest">Pinterest</option>
                                <option value="snapchat">Snapchat</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="auth-label">Channel Name</label>
                            {platformAccounts.length > 0 ? (
                                <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)}>
                                    {platformAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.username}</option>
                                    ))}
                                </select>
                            ) : (
                                <div style={{fontSize: '0.85rem', color: '#ef4444', padding: '0.5rem', border: '1px dashed #fee2e2', borderRadius: '0.5rem', background: '#fef2f2'}}>
                                    No {platform} accounts connected.
                                </div>
                            )}
                        </div>

                        {isUploading ? (
                            <div style={{padding: '1rem', textAlign: 'center'}}>
                                <div style={{fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem'}}>{uploadStatus?.stage || 'Preparing upload...'}</div>
                                <div style={{width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden'}}>
                                    <div style={{width: `${uploadStatus?.progress || 0}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s'}} />
                                </div>
                            </div>
                        ) : (
                            <button 
                                className="btn btn-primary" 
                                style={{padding: '1rem', fontWeight: 800, fontSize: '1rem'}}
                                onClick={handleUpload}
                                disabled={!accountId}
                            >
                                ✨ Upload with AI Caption
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function History({ socialAccounts }: { socialAccounts: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [showUploadModal, setShowUploadModal] = useState<any>(null);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/configs`);
      const data = await res.json();
      if (data.youtube?.spreadsheetId) setSpreadsheetId(data.youtube.spreadsheetId);
    } catch (e) { console.error('Failed to fetch configs in history'); }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/history`);
      const data = await res.json();
      setItems(data);
    } catch (e) {
      console.error('Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchUploadHistory();
    fetchConfigs();
  }, []);

  const fetchUploadHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/upload-history`);
      const data = await res.json();
      setUploadHistory(data);
    } catch (e) {
      console.error('Failed to fetch upload history');
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === 'ALL') return true;
    return item.type === filter;
  });

  const categories = [
    { id: 'ALL', name: 'All Videos' },
    { id: 'CLIPPER', name: 'AI Clipper' },
    { id: 'SHORT_VIDEO', name: 'Short Videos' },
    { id: 'LONG_VIDEO', name: 'Long Videos' },
    { id: 'TALKING_HEAD', name: 'Talking Head' },
    { id: 'UPLOAD_HISTORY', name: 'Upload History' }
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Video History</h1>
        <p className="page-subtitle">Manage all your generated content in one place.</p>
        
        <div style={{display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap'}}>
          {categories.map(cat => (
            <button 
              key={cat.id}
              className={`btn ${filter === cat.id ? 'btn-primary' : ''}`}
              style={{fontSize: '0.75rem', background: filter === cat.id ? '' : 'white', border: '1px solid #e2e8f0'}}
              onClick={() => setFilter(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'4rem'}}>Loading history...</div>
      ) : filter === 'UPLOAD_HISTORY' ? (
        <div className="card-container" style={{padding: '1rem', overflowX: 'auto'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 1rem'}}>
            <h3 style={{fontSize: '1rem', fontWeight: 800, color: 'var(--dark)', margin: 0}}>Upload Logs</h3>
            {spreadsheetId ? (
              <a 
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ecfdf5', color: '#059669', 
                  padding: '0.5rem 1rem', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
                  border: '1px solid #10b981'
                }}
              >
                <span>📊</span> Open Google Sheets
              </a>
            ) : (
              <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                <span>ℹ️</span> Connect YouTube to sync with Google Sheets
              </div>
            )}
          </div>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem'}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--border-color)', textAlign: 'left'}}>
                <th style={{padding: '1rem', color: 'var(--text-muted)'}}>Video Title</th>
                <th style={{padding: '1rem', color: 'var(--text-muted)'}}>Channel Name</th>
                <th style={{padding: '1rem', color: 'var(--text-muted)'}}>Platform</th>
                <th style={{padding: '1rem', color: 'var(--text-muted)'}}>Video Link</th>
                <th style={{padding: '1rem', color: 'var(--text-muted)'}}>Date</th>
              </tr>
            </thead>
            <tbody>
              {uploadHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{padding: '3rem', textAlign: 'center', color: 'var(--text-muted)'}}>No upload history found</td>
                </tr>
              ) : (
                uploadHistory.map((upload, i) => (
                  <tr key={i} style={{borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s'}} className="hover-row">
                    <td style={{padding: '1rem', fontWeight: 600, color: 'var(--dark)'}}>{upload.title}</td>
                    <td style={{padding: '1rem'}}>{upload.channelName}</td>
                    <td style={{padding: '1rem'}}>
                      <span style={{
                        background: '#eff6ff', color: '#2563eb', padding: '0.25rem 0.5rem', 
                        borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                      }}>
                        {upload.platform}
                      </span>
                    </td>
                    <td style={{padding: '1rem'}}>
                      <a href={upload.videoLink} target="_blank" rel="noopener noreferrer" style={{color: 'var(--primary)', textDecoration: 'none', fontWeight: 600}}>
                        View Video ↗
                      </a>
                    </td>
                    <td style={{padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem'}}>
                      {new Date(upload.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card-container" style={{textAlign:'center', padding:'4rem'}}>
          <div style={{fontSize:'3rem', marginBottom:'1rem'}}>🎬</div>
          <h3 style={{color:'var(--dark)', marginBottom:'0.5rem'}}>No history found</h3>
          <p style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>Try generating some videos first!</p>
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'1.5rem'}}>
          {filteredItems.map((item) => {
            const result = item.result;
            const isClipper = item.type === 'CLIPPER';
            const videoUrls = result?.videoUrls || (result?.videoUrl ? [result.videoUrl] : []);
            
            return (
              <div key={item.id} className="card-container" style={{margin:0, display:'flex', flexDirection:'column', gap:'1rem'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div>
                    <div style={{
                      fontSize:'0.6rem', fontWeight:800, color:'white', background:'var(--primary)',
                      padding:'0.1rem 0.5rem', borderRadius:'1rem', display:'inline-block', marginBottom:'0.5rem'
                    }}>
                      {item.type}
                    </div>
                    <h3 style={{fontSize:'0.9rem', fontWeight:700, color:'var(--dark)', marginBottom:'0.25rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'200px'}}>
                      {item.metadata?.topic || item.metadata?.url || 'Generated Video'}
                    </h3>
                    <div style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>{new Date(item.startTime).toLocaleString()}</div>
                  </div>
                  <div style={{fontSize: '0.7rem', fontWeight: 700, color: item.status === 'completed' ? '#22c55e' : item.status === 'failed' ? '#ef4444' : '#6366f1'}}>
                    {item.status.toUpperCase()}
                  </div>
                </div>

                {videoUrls.length > 0 && (
                  <div style={{display: 'grid', gridTemplateColumns: videoUrls.length > 1 ? '1fr 1fr' : '1fr', gap: '0.5rem'}}>
                    {videoUrls.slice(0, 4).map((url: string, idx: number) => (
                      <div key={idx} style={{
                        aspectRatio: isClipper ? '9/16' : '16/9', background:'#000', borderRadius:'0.5rem', 
                        overflow:'hidden', cursor:'pointer', position:'relative'
                      }} onClick={() => setSelectedVideo(url)}>
                         <video src={url} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                         <div style={{
                           position:'absolute', top:0, left:0, width:'100%', height:'100%', 
                           display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.2)'
                         }}>
                           <div style={{width:'30px', height:'30px', borderRadius:'50%', background:'rgba(255,255,255,0.9)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                             <div style={{width:0, height:0, borderTop:'6px solid transparent', borderBottom:'6px solid transparent', borderLeft:'9px solid black', marginLeft:'3px'}}></div>
                           </div>
                         </div>
                      </div>
                    ))}
                    {videoUrls.length > 4 && (
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                        +{videoUrls.length - 4} more
                      </div>
                    )}
                  </div>
                )}

                {item.status === 'failed' && (
                  <div style={{fontSize: '0.75rem', color: '#ef4444', background: '#fef2f2', padding: '0.5rem', borderRadius: '0.5rem'}}>
                    {item.error}
                  </div>
                )}

                <div style={{display:'flex', gap:'0.5rem', marginTop:'auto'}}>
                  {videoUrls[0] && (
                    <button className="btn btn-primary" style={{flex:1, fontSize:'0.75rem'}} onClick={() => setSelectedVideo(videoUrls[0])}>
                      {videoUrls.length > 1 ? 'Play First' : 'Play Video'}
                    </button>
                  )}
                  {videoUrls[0] && (
                    <button className="btn" style={{flex:1, fontSize:'0.75rem', background: 'var(--dark)', color: 'white'}} onClick={() => setShowUploadModal({ url: videoUrls[0], topic: item.metadata?.topic || 'History Video', script: item.metadata?.script || '' })}>
                      Upload
                    </button>
                  )}
                  {item.metadata?.script && (
                    <button className="btn" style={{flex:1, fontSize:'0.75rem'}} onClick={() => alert(item.metadata.script)}>
                      Script
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedVideo && (
        <div style={{
          position:'fixed', top:0, left:0, width:'100%', height:'100%', 
          background:'rgba(0,0,0,0.9)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center',
          padding:'2rem'
        }} onClick={() => setSelectedVideo(null)}>
          <div style={{maxWidth:'1000px', width: selectedVideo.includes('clip') ? '350px' : '90%', position:'relative'}} onClick={e => e.stopPropagation()}>
            <video src={selectedVideo} controls autoPlay style={{width:'100%', borderRadius:'1rem', maxHeight: '80vh'}} />
            <button 
              onClick={() => setSelectedVideo(null)}
              style={{
                position:'absolute', top:'-40px', right:0, color:'white', background:'none', 
                border:'none', fontSize:'1.5rem', cursor:'pointer'
              }}
            >✕</button>
          </div>
        </div>
      )}

      {showUploadModal && (
        <UploadModal 
          videoUrl={showUploadModal.url} 
          topic={showUploadModal.topic} 
          script={showUploadModal.script} 
          accounts={socialAccounts} 
          onClose={() => setShowUploadModal(null)} 
        />
      )}
    </>
  );
}

function AIScout({ geminiKey, elevenLabsKey, onGoToKeys, activeJobs, addJob, clearJob, lastJobId, socialAccounts }: { geminiKey: string, elevenLabsKey: string, onGoToKeys: () => void, activeJobs: any, addJob: (id: string) => void, clearJob: () => void, lastJobId?: string, socialAccounts: any }) {
  const [url, setUrl] = useState('');
  const [tools, setTools] = useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
  const [voice, setVoice] = useState('US-Female-Viral');

  const activeJob = lastJobId ? activeJobs[lastJobId] : null;
  const isProcessing = activeJob?.status === 'processing';
  const progress = activeJob?.progress || 0;
  const stage = activeJob?.stage || '';
  const result = activeJob?.status === 'completed' ? activeJob.result : null;
  const error = activeJob?.status === 'failed' ? activeJob.error : null;

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/scout/tools`);
      const data = await res.json();
      setTools(data);
    } catch (e) {
      console.error('Failed to fetch tools', e);
    }
  };

  const handleDiscover = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/scout/discover`);
      const data = await res.json();
      if (data.tools) setTools(data.tools);
    } catch (e) {
      console.error('Discovery failed', e);
    }
  };

  const handleRun = async (targetUrl?: string) => {
    const finalUrl = targetUrl || url;
    if (!finalUrl) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/scout/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl, geminiKey, elevenLabsKey, voice })
      });
      const data = await res.json();
      if (data.success && data.jobId) {
        addJob(data.jobId);
      } else {
        alert(data.error || 'Pipeline failed to start');
      }
    } catch (err: any) {
      alert('Network error: ' + err.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div style={{display: 'inline-block', background: 'var(--primary)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', marginBottom: '1rem', fontWeight: 'bold'}}>ADVANCED BOT</div>
        <h1 className="page-title">AI SCOUT BOT</h1>
        <p className="page-subtitle">Automatically discover, analyze, and create video reviews for the latest AI tools.</p>
      </div>

      <div className="card-container" style={{maxWidth: '900px'}}>


        {error && (
          <div style={{background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', position: 'relative'}}>
            <div style={{fontWeight: 700, marginBottom: '0.25rem'}}>Renderer Error</div>
            <div style={{paddingRight: '1.5rem'}}>{error}</div>
            <button 
              onClick={() => clearJob()}
              style={{position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem'}}
            >
              ✕
            </button>
          </div>
        )}

        {result && (
          <div className="animate-fade-in" style={{marginBottom: '2rem'}}>
             <div style={{display: 'flex', gap: '2rem', alignItems: 'flex-start'}}>
                <div style={{flex: 1}}>
                  <h3 style={{fontSize: '1.5rem', fontWeight: 800, color: 'var(--dark)', marginBottom: '1rem'}}>{result.analysis.toolName}</h3>
                  <p style={{color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem'}}>{result.analysis.voiceover}</p>
                  <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                    {result.analysis.features.map((f: string, i: number) => (
                      <span key={i} style={{background: '#f1f5f9', padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600}}>
                        ✨ {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{width: '300px'}}>
                   <div style={{aspectRatio: '16/9', background: '#000', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}>
                      <video src={result.videoUrl} controls style={{width: '100%', height: '100%'}} />
                   </div>
                    <button className="btn btn-primary" style={{width: '100%', marginTop: '1rem', textAlign: 'center'}} onClick={() => setShowUploadModal(result.videoUrl)}>
                       Upload to Socials
                    </button>
                    <a href={result.videoUrl} download className="btn" style={{width: '100%', marginTop: '0.5rem', textAlign: 'center'}}>
                       Download Video
                    </a>
                 </div>
              </div>
              {showUploadModal && (
                <UploadModal 
                  videoUrl={showUploadModal} 
                  topic={result.analysis.toolName} 
                  script={result.analysis.voiceover} 
                  accounts={socialAccounts} 
                  onClose={() => setShowUploadModal(null)} 
                />
              )}
             <button className="btn" style={{marginTop: '2rem'}} onClick={() => clearJob()}>Scout Another</button>
          </div>
        )}

        {!result && (
          <>
            <div style={{marginBottom: '2rem'}}>
              <h3 className="section-title" style={{fontSize: '1rem'}}>Voice Narrator</h3>
              <VoiceSelector selectedVoice={voice} onSelect={setVoice} />
            </div>

            <div style={{display: 'flex', gap: '1rem', marginBottom: '3rem'}}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter AI Tool URL (e.g. https://krea.ai)" 
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={isProcessing}
              />
              <button 
                className="btn btn-primary" 
                onClick={() => handleRun()}
                disabled={!url || isProcessing}
              >
                {isProcessing ? 'Scouting...' : 'Start Scouting'}
              </button>
            </div>

            {isProcessing && (
              <div style={{marginBottom: '3rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 600}}>
                  <span>{stage}</span>
                  <span>{progress}%</span>
                </div>
                <div style={{width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden'}}>
                  <div style={{width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s'}} />
                </div>
              </div>
            )}

            <div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <h3 className="section-title" style={{margin: 0}}>Trending AI Tools</h3>
                <button className="btn" style={{fontSize: '0.75rem'}} onClick={handleDiscover}>Refresh List</button>
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem'}}>
                {tools.map((tool, i) => (
                  <div key={i} className="grid-item" style={{textAlign: 'left', padding: '1.5rem'}}>
                    <div style={{fontWeight: 800, color: 'var(--dark)', marginBottom: '0.5rem'}}>{tool.name}</div>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', height: '3rem', overflow: 'hidden'}}>{tool.description}</div>
                    <button 
                      className="btn" 
                      style={{width: '100%', fontSize: '0.75rem', fontWeight: 700}}
                      onClick={() => handleRun(tool.url)}
                      disabled={isProcessing}
                    >
                      Analyze & Review
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function ManageAutomation() {
  const [series, setSeries] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [seriesRes, autoRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/series`),
        fetch(`${API_BASE_URL}/api/scheduled-automations`)
      ]);
      const seriesData = await seriesRes.json();
      const autoData = await autoRes.json();
      setSeries(seriesData);
      setAutomations(autoData);
    } catch (e) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string, type: 'series' | 'automation') => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      const endpoint = type === 'series' ? `/api/series/${id}` : `/api/scheduled-automations/${id}`;
      await fetch(`${API_BASE_URL}${endpoint}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean, type: 'series' | 'automation') => {
    try {
      const endpoint = type === 'series' ? `/api/series/${id}` : `/api/scheduled-automations/${id}`;
      await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      fetchData();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const handleManualGenerate = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/series/${id}/generate`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Generation started! Please wait a minute and refresh.');
      }
    } catch (e) {
      alert('Failed to start generation');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      const { id, type, ...data } = editingItem;
      const endpoint = type === 'series' ? `/api/series/${id}` : `/api/scheduled-automations/${id}`;
      await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      setEditingItem(null);
      fetchData();
    } catch (e) {
      alert('Failed to save changes');
    }
  };

  const renderItem = (item: any, type: 'series' | 'automation') => (
    <div key={item.id} style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
      <div className="card-container" style={{margin:0, display:'flex', justifyContent:'space-between', alignItems:'center', borderLeft: `4px solid ${type === 'series' ? 'var(--primary)' : 'var(--dark)'}`}}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.5rem'}}>
            <h3 style={{fontSize:'1.1rem', fontWeight:800, color:'var(--dark)', margin:0}}>{type === 'series' ? item.topic : item.niche}</h3>
            <span style={{
              fontSize:'0.65rem', fontWeight:800, color:'white', background: type === 'series' ? 'var(--primary)' : 'var(--dark)',
              padding:'0.2rem 0.6rem', borderRadius:'1rem', textTransform: 'uppercase'
            }}>
              {type}
            </span>
            <span style={{
              fontSize:'0.65rem', fontWeight:800, color: 'var(--dark)', background: '#f1f5f9',
              padding:'0.2rem 0.6rem', borderRadius:'1rem'
            }}>
              {type === 'series' ? item.style : item.videoType?.replace(/_/g, ' ')}
            </span>
          </div>
          <div style={{display:'flex', gap:'1.5rem', fontSize:'0.85rem', color:'var(--text-muted)', flexWrap: 'wrap'}}>
            {type === 'series' ? (
              <>
                <div>Theme: <span style={{fontWeight:600, color:'var(--dark)'}}>{item.theme || 'Cinematic'}</span></div>
                <div>Niche: <span style={{fontWeight:600, color:'var(--dark)'}}>{item.niche || 'General'}</span></div>
                <div>Posting to: <span style={{fontWeight:600, color:'var(--primary)'}}>{item.socialAccount}</span></div>
              </>
            ) : (
              <>
                <div>Channels: <span style={{fontWeight:600, color:'var(--primary)'}}>{item.channels?.join(', ')}</span></div>
                <div>Time: <span style={{fontWeight:600, color:'var(--dark)'}}>Every day at {item.postTime}</span></div>
              </>
            )}
            <div>Last Run: <span style={{fontWeight:600}}>{item.lastRun ? new Date(item.lastRun).toLocaleString() : 'Never'}</span></div>
          </div>
        </div>

        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
          <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <span style={{fontSize:'0.75rem', fontWeight:700, color: item.isActive ? '#10b981' : '#64748b'}}>
              {item.isActive ? 'ACTIVE' : 'PAUSED'}
            </span>
            <div 
              onClick={() => handleToggle(item.id, item.isActive, type)}
              style={{
                width: '40px', height: '20px', background: item.isActive ? 'var(--dark)' : '#e2e8f0', 
                borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
              }}
            >
              <div style={{
                width: '14px', height: '14px', background: 'white', borderRadius: '50%',
                position: 'absolute', top: '3px', left: item.isActive ? '23px' : '3px',
                transition: 'all 0.3s'
              }} />
            </div>
          </div>
          <button 
            onClick={() => setEditingItem({ ...item, type })}
            style={{background:'#f1f5f9', border:'none', color:'var(--dark)', cursor:'pointer', fontSize:'0.75rem', fontWeight:800, padding:'0.5rem 1rem', borderRadius:'0.5rem'}}
          >
            Edit
          </button>
          {type === 'series' && (
            <button 
              onClick={() => handleManualGenerate(item.id)}
              style={{background:'var(--primary)', border:'none', color:'white', cursor:'pointer', fontSize:'0.75rem', fontWeight:800, padding:'0.5rem 1rem', borderRadius:'0.5rem'}}
            >
              Generate Now
            </button>
          )}
          <button 
            onClick={() => handleDelete(item.id, type)}
            style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'0.85rem', fontWeight:700}}
          >
            Remove
          </button>
        </div>
      </div>
      
      {item.history && item.history.length > 0 && (
        <div style={{background: 'rgba(255,255,255,0.5)', borderRadius: '1rem', padding: '1rem', border: '1px solid #f1f5f9', marginLeft: '1rem'}}>
          <div style={{fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em'}}>Recent Activity</div>
          <div style={{display: 'flex', flexWrap: 'nowrap', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem'}}>
            {item.history.map((run: any, idx: number) => (
              <div key={idx} style={{flex: '0 0 140px'}}>
                <div style={{
                  width: '140px', aspectRatio: '9/16', background: '#000', borderRadius: '0.5rem', 
                  overflow: 'hidden', position: 'relative', border: '1px solid #e2e8f0'
                }}>
                  {run.videoUrl ? (
                    <video src={run.videoUrl} style={{width: '100%', height: '100%', objectFit: 'cover'}} muted />
                  ) : (
                    <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.6rem'}}>Processing...</div>
                  )}
                  <div style={{position: 'absolute', top: '5px', right: '5px', background: run.status === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: '0.2rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.5rem', fontWeight: 800}}>
                    {run.status === 'success' ? 'READY' : 'FAILED'}
                  </div>
                </div>
                <div style={{fontSize: '0.65rem', marginTop: '0.5rem', fontWeight: 700, color: 'var(--dark)'}}>
                  {new Date(run.date).toLocaleDateString()}
                </div>
                {run.videoUrl && (
                  <a href={run.videoUrl} target="_blank" rel="noopener noreferrer" style={{fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none'}}>View Result →</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">MANAGE AUTOMATION</h1>
        <p className="page-subtitle">Monitor and edit all your active video automations and series.</p>
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'4rem'}}>Loading automations...</div>
      ) : (series.length === 0 && automations.length === 0) ? (
        <div className="card-container" style={{textAlign:'center', padding:'4rem'}}>
          <div style={{fontSize:'3rem', marginBottom:'1rem'}}>🤖</div>
          <h3 style={{color:'var(--dark)', marginBottom:'0.5rem'}}>No active automations</h3>
          <p style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>Create a series or a scheduled automation to see them here.</p>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'2rem'}}>
          {automations.length > 0 && (
            <section>
              <h2 className="section-title" style={{fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span>✨</span> Scheduled Automations
              </h2>
              <div style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
                {automations.map(a => renderItem(a, 'automation'))}
              </div>
            </section>
          )}

          {series.length > 0 && (
            <section>
              <h2 className="section-title" style={{fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <span>📅</span> Quick Series
              </h2>
              <div style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
                {series.map(s => renderItem(s, 'series'))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000}}>
          <div className="card-container" style={{width:'500px', maxWidth:'90%', background:'white', padding:'2rem'}}>
            <h2 className="section-title">Edit {editingItem.type === 'series' ? 'Series' : 'Automation'}</h2>
            
            <div style={{marginTop:'1.5rem'}}>
              <label style={{fontSize:'0.8rem', fontWeight:700, color:'var(--dark)'}}>
                {editingItem.type === 'series' ? 'Topic' : 'Niche'}
              </label>
              <input 
                type="text" 
                className="form-input"
                value={editingItem.type === 'series' ? editingItem.topic : editingItem.niche}
                onChange={(e) => setEditingItem({ ...editingItem, [editingItem.type === 'series' ? 'topic' : 'niche']: e.target.value })}
                style={{marginTop:'0.5rem'}}
              />
            </div>

            {editingItem.type === 'automation' && (
              <div style={{marginTop:'1rem'}}>
                <label style={{fontSize:'0.8rem', fontWeight:700, color:'var(--dark)'}}>Post Time</label>
                <input 
                  type="time" 
                  className="form-input"
                  value={editingItem.postTime}
                  onChange={(e) => setEditingItem({ ...editingItem, postTime: e.target.value })}
                  style={{marginTop:'0.5rem'}}
                />
              </div>
            )}

            <div style={{marginTop:'1rem'}}>
              <label style={{fontSize:'0.8rem', fontWeight:700, color:'var(--dark)'}}>Voice Narrator</label>
              <select 
                className="form-select"
                value={editingItem.voice || 'US-Female-Viral'}
                onChange={(e) => setEditingItem({ ...editingItem, voice: e.target.value })}
                style={{marginTop:'0.5rem', width: '100%', height: '40px', fontSize: '0.9rem'}}
              >
                {voices.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div style={{marginTop:'2rem', display:'flex', gap:'1rem'}}>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveEdit}
                style={{flex:1}}
              >
                Save Changes
              </button>
              <button 
                className="btn" 
                onClick={() => setEditingItem(null)}
                style={{flex:1, background:'#f1f5f9'}}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;

function PricingPage({ userEmail, freeTrialsUsed, freeTrialLimit }: { userEmail: string; freeTrialsUsed: number; freeTrialLimit: number }) {
  const isEdwin = userEmail === 'edwinmoothedan2006@gmail.com';
  const trialsLeft = Math.max(0, freeTrialLimit - freeTrialsUsed);

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'Try before you buy',
      color: '#64748b',
      gradient: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      features: [
        isEdwin ? 'Unlimited free generations' : `${freeTrialLimit} free video generation`,
        'All video types unlocked',
        'Basic AI voices',
        'Watermarked output',
        'Community support',
      ],
      cta: isEdwin ? 'Active (Admin Bypass)' : (trialsLeft > 0 ? `${trialsLeft} trial left` : 'Trial used'),
      ctaDisabled: !isEdwin && trialsLeft === 0,
      highlight: isEdwin,
    },
    {
      name: 'Pro',
      price: '$19',
      period: '/month',
      desc: 'For serious creators',
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      features: [
        'Unlimited video generations',
        'All video types (Short, Long, Avatar)',
        'Premium AI voices (ElevenLabs)',
        'No watermarks',
        'YouTube auto-upload',
        'AI Scout Bot',
        'Priority support',
      ],
      cta: 'Get Pro →',
      ctaDisabled: false,
      highlight: true,
    },
    {
      name: 'Business',
      price: '$49',
      period: '/month',
      desc: 'Scale your content empire',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      features: [
        'Everything in Pro',
        'Unlimited automation workflows',
        'Multiple YouTube channels',
        'Google Drive integration',
        'Series scheduler',
        'Google Sheets sync',
        'Dedicated support',
        'Custom branding',
      ],
      cta: 'Get Business →',
      ctaDisabled: false,
      highlight: false,
    },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--dark)', letterSpacing: '-0.03em', margin: 0 }}>
          Simple, Transparent Pricing
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '0.75rem' }}>
          Start free, scale as you grow. Cancel anytime.
        </p>

        {/* Free trial indicator */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
          marginTop: '1.5rem', padding: '0.75rem 1.5rem',
          background: trialsLeft > 0 ? 'rgba(99, 102, 241, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1px solid ${trialsLeft > 0 ? 'rgba(99,102,241,0.2)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius: '100px',
        }}>
          <span style={{ fontSize: '1.2rem' }}>{trialsLeft > 0 ? '✨' : '🔒'}</span>
          <span style={{
            fontSize: '0.9rem', fontWeight: 700,
            color: trialsLeft > 0 ? '#6366f1' : '#ef4444'
          }}>
            {trialsLeft > 0
              ? `You have ${trialsLeft} free video generation remaining`
              : 'Your free trial has been used — upgrade to keep creating!'}
          </span>
        </div>
      </div>

      {/* Pricing cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {plans.map((plan) => (
          <div
            key={plan.name}
            style={{
              borderRadius: '1.5rem',
              overflow: 'hidden',
              border: plan.highlight ? `2px solid ${plan.color}` : '1px solid var(--border-color)',
              boxShadow: plan.highlight ? `0 20px 60px rgba(99,102,241,0.2)` : '0 4px 20px rgba(0,0,0,0.06)',
              transform: plan.highlight ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              background: 'white',
              position: 'relative',
            }}
          >
            {plan.highlight && (
              <div style={{
                position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
                background: plan.gradient, color: 'white', fontSize: '0.7rem', fontWeight: 800,
                padding: '0.3rem 1.2rem', borderRadius: '0 0 0.75rem 0.75rem',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>
                ⭐ Most Popular
              </div>
            )}

            {/* Card header */}
            <div style={{ background: plan.gradient, padding: '2rem', color: plan.highlight ? 'white' : 'var(--dark)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8, marginBottom: '0.5rem' }}>
                {plan.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem' }}>
                <span style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>{plan.price}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, opacity: 0.7, paddingBottom: '0.5rem' }}>{plan.period}</span>
              </div>
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', opacity: 0.8 }}>{plan.desc}</p>
            </div>

            {/* Features */}
            <div style={{ padding: '1.75rem 2rem' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
                {plan.features.map((feature, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--dark)' }}>
                    <span style={{ color: plan.color, fontWeight: 900, fontSize: '1rem', flexShrink: 0 }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (!plan.ctaDisabled) {
                    alert(`🚀 ${plan.name} plan coming soon! Contact us to get early access.`);
                  }
                }}
                disabled={plan.ctaDisabled}
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: plan.ctaDisabled ? '#e2e8f0' : plan.highlight ? plan.gradient : `${plan.color}15`,
                  color: plan.ctaDisabled ? '#94a3b8' : plan.highlight ? 'white' : plan.color,
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: plan.ctaDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  letterSpacing: '0.02em',
                }}
              >
                {plan.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ marginTop: '4rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dark)', marginBottom: '2rem' }}>Frequently Asked Questions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', textAlign: 'left' }}>
          {[
            { q: 'What counts as a "video generation"?', a: 'Any time you click the generate/render button for a Short Video, Long Video, AI Avatar, or Clipper — that uses one generation.' },
            { q: 'Can I cancel anytime?', a: 'Yes. There are no long-term contracts. You can cancel your subscription at any time and you will retain access until the end of your billing period.' },
            { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, Mastercard, Amex) and PayPal through our secure payment gateway.' },
            { q: 'Is there a free trial for Pro?', a: 'The Free plan gives you 1 video generation to test the full quality. If you love it, upgrade to Pro for unlimited generations.' },
          ].map((faq, i) => (
            <div key={i} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.5rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--dark)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{faq.q}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
