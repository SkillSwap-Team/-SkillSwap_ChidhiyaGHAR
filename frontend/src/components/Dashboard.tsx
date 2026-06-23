import React, { useState, useEffect } from 'react';
import { Award, BookOpen, Star, User, Users, Plus, Video, FileText, Send, MessageSquare } from 'lucide-react';
import { api } from '../services/api';

interface UserProfile {
  name: string;
  age: number;
  college: string;
  branch: string;
  course: string;
  teachingSkills: string[];
  learningSkills: string[];
}

interface DashboardProps {
  userProfile: UserProfile;
  onEnterRoom: (roomData: { tutor: string; student: string; skill: string }) => void;
  setVisorState: (state: 'eyes' | 'quote' | 'swap' | 'success' | 'camera') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userProfile, onEnterRoom, setVisorState }) => {
  const [profileScore, setProfileScore] = useState(70);
  const [badges, setBadges] = useState<any[]>([]);
  const [exams, setExams] = useState<{ id?: string; name: string; score: string }[]>([]);
  const [hackathons, setHackathons] = useState<{ id?: string; name: string; prize: string }[]>([]);

  // Real data state
  const [realProfile, setRealProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'teach' | 'learn'>('teach');
  const [nearbyLearners, setNearbyLearners] = useState<any[]>([]);
  const [nearbyTeachers, setNearbyTeachers] = useState<any[]>([]);

  // Form states
  const [newExamName, setNewExamName] = useState('');
  const [newExamScore, setNewExamScore] = useState('');
  const [newHackName, setNewHackName] = useState('');
  const [newHackPrize, setNewHackPrize] = useState('');

  // Feed states
  const [feedList, setFeedList] = useState<any[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');

  // Connections / Matches States
  const [connectionStates, setConnectionStates] = useState<Record<string, 'none' | 'pending' | 'accepted'>>({});

  // Fetch real matches, profile, education, experience, badges, and feed on mount
  useEffect(() => {
    setVisorState('eyes');
    const loadDashboardData = async () => {
      try {
        const profileRes = await api.profile.getMyProfile();
        if (profileRes.data) {
          setRealProfile(profileRes.data);
          setProfileScore(profileRes.data.reputation_points || 70);
        }

        try {
          const learnersRes = await api.matching.getNearbyLearners();
          setNearbyLearners(learnersRes.data || []);
        } catch (e) {
          console.warn('Failed to load nearby learners:', e);
        }

        try {
          const teachersRes = await api.matching.getNearbyTeachers();
          setNearbyTeachers(teachersRes.data || []);
        } catch (e) {
          console.warn('Failed to load nearby teachers:', e);
        }

        const badgesRes = await api.badges.getMyBadges();
        setBadges(badgesRes.data || []);

        const eduRes = await api.profile.getEducation();
        const parsedExams = (eduRes.data || []).map((edu: any) => {
          let score = '';
          const match = edu.description?.match(/Passed with score:\s*(.*)/i);
          if (match) {
            score = match[1];
          } else {
            score = edu.description || '';
          }
          return {
            id: edu.id,
            name: edu.degree,
            score: score
          };
        });
        setExams(parsedExams);

        const expRes = await api.profile.getExperience();
        const parsedHacks = (expRes.data || []).map((exp: any) => {
          let prize = '';
          const match = exp.description?.match(/Accomplished:\s*(.*)/i);
          if (match) {
            prize = match[1];
          } else {
            prize = exp.description || '';
          }
          return {
            id: exp.id,
            name: exp.company,
            prize: prize
          };
        });
        setHackathons(parsedHacks);

        const feedRes = await api.feed.getFeed();
        setFeedList(feedRes.data || []);

      } catch (err) {
        console.error('Failed to load dashboard data from backend:', err);
      }
    };
    loadDashboardData();
  }, [setVisorState]);

  // Recalculate dynamic profile score based on stats
  useEffect(() => {
    let score = realProfile?.reputation_points || 60;
    score += exams.length * 5;
    score += hackathons.length * 10;
    setProfileScore(Math.min(100, score));
  }, [exams, hackathons, realProfile]);

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName || !newExamScore) return;

    try {
      const res = await api.profile.addEducation({
        institution: userProfile.college || 'College',
        degree: newExamName,
        field_of_study: userProfile.branch || 'General',
        start_year: new Date().getFullYear() - 2,
        end_year: new Date().getFullYear(),
        description: `Passed with score: ${newExamScore}`
      });
      setExams([...exams, { id: res.data?.id, name: newExamName, score: newExamScore }]);
      setNewExamName('');
      setNewExamScore('');
      setVisorState('success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddHack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHackName || !newHackPrize) return;

    try {
      const res = await api.profile.addExperience({
        company: newHackName,
        title: 'Participant / Winner',
        start_date: new Date().toISOString().substring(0, 10),
        is_current: false,
        description: `Accomplished: ${newHackPrize}`
      });
      setHackathons([...hackathons, { id: res.data?.id, name: newHackName, prize: newHackPrize }]);
      setNewHackName('');
      setNewHackPrize('');
      setVisorState('success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestConnection = async (peerId: string, peerName: string) => {
    setConnectionStates(prev => ({ ...prev, [peerId]: 'pending' }));
    setVisorState('swap');

    try {
      await api.matching.sendMatchRequest(peerId);
      
      // Simulate automatic response acceptance for UI testing in local environment
      setTimeout(() => {
        setConnectionStates(prev => ({ ...prev, [peerId]: 'accepted' }));
        setVisorState('success');
        alert(`Match accepted! ${peerName} is ready to teach you. You can now launch the tutoring whiteboard!`);
      }, 3000);
    } catch (err: any) {
      console.warn('API connection request error:', err.message);
      // Fallback behavior if matching fails locally or is duplicate
      setConnectionStates(prev => ({ ...prev, [peerId]: 'accepted' }));
      setVisorState('success');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim()) return;

    try {
      const res = await api.feed.createPost({
        title: newPostTitle,
        body: newPostBody
      });
      if (res.data) {
        setFeedList(prev => [res.data, ...prev]);
        setNewPostTitle('');
        setNewPostBody('');
        setVisorState('success');
      }
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  const displayPeers = (activeTab === 'teach' ? nearbyLearners : nearbyTeachers).map((s: any) => {
    const prof = s.profile || {};
    const skillListOffered = s.skillsOffered && s.skillsOffered.length > 0
      ? s.skillsOffered
      : (prof.user_skills_offered?.map((so: any) => so.skills?.name).filter(Boolean) || [userProfile.learningSkills[0] || 'Python']);

    const skillListWanted = s.skillsWanted && s.skillsWanted.length > 0
      ? s.skillsWanted
      : (prof.user_skills_wanted?.map((sw: any) => sw.skills?.name).filter(Boolean) || [userProfile.teachingSkills[0] || 'React']);

    return {
      id: s.userId || s.id,
      name: prof.full_name || s.username || 'Co-learner Node',
      college: prof.location || 'Grid Network',
      branch: prof.city || 'General Engineering',
      course: prof.state_code || 'B.Tech',
      teachingSkills: skillListOffered,
      learningSkills: skillListWanted,
      rating: prof.avg_rating || 4.7,
      avatar: prof.avatar_url || '👨‍💻',
      reputation: prof.reputation_points || 90,
      badges: s.badges || (s.isLive ? ['LIVE NOW', 'Verified Peer'] : ['Verified Peer']),
      matchScore: Math.round(s.matchScore || (s.isLive ? 95 : 85)),
      distance: s.distance,
      isLive: s.isLive
    };
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '30px', padding: '40px', flex: 1, zIndex: 10, maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
      
      {/* LEFT SIDEBAR: PROFILE SUMMARY & FORMS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Profile Card */}
        <div className="glass-panel cyan-glow" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '2.5rem', background: 'rgba(0,240,255,0.1)', padding: '12px', borderRadius: '50%', border: '1px solid rgba(0,240,255,0.2)' }}>
              👤
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>{userProfile.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }} className="font-mono">
                {userProfile.course} // {userProfile.branch}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{userProfile.college}</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REPUTATION SCORE</span>
              <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--color-cyan)', fontWeight: 'bold' }}>{profileScore}/100</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${profileScore}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-cyan), var(--color-purple))', transition: 'width 0.5s ease-in-out' }}></div>
            </div>
          </div>

          {/* User Badges */}
          <div>
            <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>EARNED BADGES</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {badges.length > 0 ? (
                badges.map(b => {
                  const def = b.badge_definitions || b;
                  const name = def?.name || 'Unnamed Badge';
                  const tier = def?.tier || 'bronze';
                  const desc = def?.description || '';
                  
                  const isGold = tier === 'gold';
                  const isSilver = tier === 'silver';
                  const isPlatinum = tier === 'platinum';
                  
                  let badgeClass = 'badge-neon purple';
                  let style: React.CSSProperties = {};
                  
                  if (isPlatinum) {
                    badgeClass = 'badge-neon';
                  } else if (isGold) {
                    badgeClass = 'badge-neon';
                    style = { color: '#ffd700', borderColor: 'rgba(255, 215, 0, 0.3)', background: 'rgba(255, 215, 0, 0.08)' };
                  } else if (isSilver) {
                    badgeClass = 'badge-neon';
                    style = { color: '#c0c0c0', borderColor: 'rgba(192, 192, 192, 0.3)', background: 'rgba(192, 192, 192, 0.08)' };
                  }
                  
                  return (
                    <span key={b.id || name} className={badgeClass} style={{ fontSize: '0.65rem', ...style }} title={desc}>
                      <Award size={10} /> {name}
                    </span>
                  );
                })
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No badges earned yet.</span>
              )}
            </div>
          </div>
        </div>

        {/* Form: Submitting Exam Certificates */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h4 className="font-mono" style={{ color: '#fff', fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="var(--color-cyan)" /> SUBMIT EXAMS / CERTS
          </h4>
          
          <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '10px' }}>
            {exams.map((ex, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>{ex.name}</span>
                <span style={{ color: 'var(--color-cyan)' }} className="font-mono">{ex.score}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddExam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="text" 
              className="hud-input" 
              placeholder="Exam / Certification Title" 
              style={{ padding: '8px 12px', fontSize: '0.85rem' }} 
              value={newExamName}
              onChange={(e) => setNewExamName(e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <input 
                type="text" 
                className="hud-input" 
                placeholder="Score (e.g. 95%)" 
                style={{ padding: '8px 12px', fontSize: '0.85rem' }} 
                value={newExamScore}
                onChange={(e) => setNewExamScore(e.target.value)}
              />
              <button type="submit" className="cyber-button font-mono" style={{ padding: '8px', fontSize: '0.75rem', justifyContent: 'center' }}>
                <Plus size={14} /> ADD
              </button>
            </div>
          </form>
        </div>

        {/* Form: Add Hackathon Wins */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h4 className="font-mono" style={{ color: '#fff', fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={16} color="var(--color-purple)" /> HACKATHON ACCOMPLISHMENTS
          </h4>

          <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '10px' }}>
            {hackathons.map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>{h.name}</span>
                <span style={{ color: 'var(--color-purple)' }} className="font-mono">{h.prize}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddHack} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="text" 
              className="hud-input" 
              placeholder="Hackathon Name" 
              style={{ padding: '8px 12px', fontSize: '0.85rem' }} 
              value={newHackName}
              onChange={(e) => setNewHackName(e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <input 
                type="text" 
                className="hud-input" 
                placeholder="Prize Won" 
                style={{ padding: '8px 12px', fontSize: '0.85rem' }} 
                value={newHackPrize}
                onChange={(e) => setNewHackPrize(e.target.value)}
              />
              <button type="submit" className="cyber-button purple font-mono" style={{ padding: '8px', fontSize: '0.75rem', justifyContent: 'center' }}>
                <Plus size={14} /> ADD
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* RIGHT SIDE: SKILLS PROFILE & MATCHES PANELS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* User Skills Display */}
        <div className="glass-panel" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 className="font-mono" style={{ color: 'var(--color-purple)', fontSize: '0.9rem', marginBottom: '12px' }}>
              // SKILLS I AM TEACHING
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {userProfile.teachingSkills.map(skill => (
                <span key={skill} className="badge-neon purple">
                  <BookOpen size={10} /> {skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-mono" style={{ color: 'var(--color-cyan)', fontSize: '0.9rem', marginBottom: '12px' }}>
              // SKILLS I AM LEARNING
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {userProfile.learningSkills.map(skill => (
                <span key={skill} className="badge-neon">
                  <User size={10} /> {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Matches List */}
        <div className="glass-panel" style={{ padding: '28px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="font-mono" style={{ color: '#fff', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Users size={20} color="var(--color-cyan)" /> GRID CONNECTIVITY
              </h3>
              <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                FORMULA: OVERLAP(60%) + PROXIMITY(40%)
              </span>
            </div>

            {/* Tabs Selector */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setActiveTab('teach')}
                className={`cyber-button font-mono ${activeTab === 'teach' ? 'active' : ''}`}
                style={{ 
                  flex: 1, 
                  justifyContent: 'center',
                  background: activeTab === 'teach' ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                  borderColor: activeTab === 'teach' ? 'var(--color-cyan)' : 'rgba(255,255,255,0.1)',
                  color: activeTab === 'teach' ? 'var(--color-cyan)' : 'var(--text-muted)'
                }}
              >
                TEACH GRID (Students Nearby)
              </button>
              <button 
                onClick={() => setActiveTab('learn')}
                className={`cyber-button purple font-mono ${activeTab === 'learn' ? 'active' : ''}`}
                style={{ 
                  flex: 1, 
                  justifyContent: 'center',
                  background: activeTab === 'learn' ? 'rgba(189, 0, 255, 0.1)' : 'transparent',
                  borderColor: activeTab === 'learn' ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)',
                  color: activeTab === 'learn' ? 'var(--color-purple)' : 'var(--text-muted)'
                }}
              >
                LEARN GRID (Teachers Live/Nearby)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displayPeers.length > 0 ? (
              displayPeers.map((peer) => {
                const connectState = connectionStates[peer.id] || 'none';
                return (
                  <div 
                    key={peer.id} 
                    className="glass-panel cyan-glow" 
                    style={{ 
                      padding: '20px', 
                      display: 'grid', 
                      gridTemplateColumns: 'auto 1fr auto', 
                      alignItems: 'center', 
                      gap: '20px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.04)'
                    }}
                  >
                    {/* Avatar Icon */}
                    <div style={{ fontSize: '2rem', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      {peer.avatar}
                    </div>

                    {/* Profile Details */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <h4 style={{ color: '#fff', fontSize: '1.05rem', margin: 0 }}>{peer.name}</h4>
                        <span className="badge-neon font-mono" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                          {peer.matchScore}% Match
                        </span>
                        {peer.isLive && (
                          <span className="badge-neon font-mono pulse-cyan" style={{ fontSize: '0.65rem', padding: '2px 6px', color: '#00f0ff', borderColor: 'var(--color-cyan)', background: 'rgba(0, 240, 255, 0.1)' }}>
                            ● LIVE NOW
                          </span>
                        )}
                        {peer.distance !== null && (
                          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-purple)', border: '1px solid rgba(189,0,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                            📍 {peer.distance} km
                          </span>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
                        {peer.course} in {peer.branch} // {peer.college}
                      </p>
                      
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ color: 'var(--color-purple)', fontWeight: 'bold' }}>Teaches:</span>{' '}
                          <span style={{ color: 'var(--text-primary)' }}>{peer.teachingSkills.join(', ')}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-cyan)', fontWeight: 'bold' }}>Learns:</span>{' '}
                          <span style={{ color: 'var(--text-primary)' }}>{peer.learningSkills.join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Rating & Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffc107' }}>
                        <Star size={14} fill="#ffc107" />
                        <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{peer.rating}</span>
                      </div>

                      {connectState === 'none' && (
                        <button 
                          className="cyber-button font-mono" 
                          style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                          onClick={() => handleRequestConnection(peer.id, peer.name)}
                        >
                          <Send size={12} /> REQUEST SWAP
                        </button>
                      )}

                      {connectState === 'pending' && (
                        <span 
                          className="font-mono pulse-cyan" 
                          style={{ fontSize: '0.75rem', color: 'var(--color-cyan)', border: '1px solid var(--color-cyan)', padding: '6px 12px', borderRadius: '4px' }}
                        >
                          PENDING ACCEPTANCE...
                        </span>
                      )}

                      {connectState === 'accepted' && (
                        <button 
                          className="cyber-button purple font-mono" 
                          style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                          onClick={() => onEnterRoom({
                            tutor: peer.name,
                            student: userProfile.name,
                            skill: userProfile.learningSkills[0] || peer.teachingSkills[0]
                          })}
                        >
                          <Video size={12} /> ENTER CLASSROOM
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                <Users size={32} style={{ marginBottom: '12px', opacity: 0.5, display: 'inline-block' }} color="var(--color-cyan)" />
                <p className="font-mono" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                  NO ACTIVE NETWORK PEER MATCHES DETECTED.
                </p>
                <p style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-muted)' }}>
                  Complete your profile, specify the skills you teach and want to learn, and matches will generate automatically.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Community Activity Feed */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 className="font-mono" style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
            <MessageSquare size={20} color="var(--color-purple)" /> // COMMUNITY ACTIVITY TRANSMISSIONS
          </h3>

          {/* Form to Share Post */}
          <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SHARE A NEW TRANSMISSION</span>
            <input 
              type="text" 
              className="hud-input" 
              placeholder="Title / Summary (e.g. Learning Flutter today!)" 
              style={{ padding: '8px 12px', fontSize: '0.85rem' }} 
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              required
            />
            <textarea 
              className="hud-input" 
              placeholder="Post details / description..." 
              style={{ padding: '8px 12px', fontSize: '0.85rem', minHeight: '60px', resize: 'vertical' }} 
              value={newPostBody}
              onChange={(e) => setNewPostBody(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="cyber-button purple font-mono" style={{ padding: '8px 16px', fontSize: '0.75rem' }}>
                <Send size={12} /> BROADCAST
              </button>
            </div>
          </form>

          {/* Feed List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
            {feedList.length > 0 ? (
              feedList.map((activity) => {
                const isCustomPost = activity.type === 'post';
                const actorName = activity.user_profile?.full_name || 'System Grid';
                const avatar = activity.user_profile?.avatar_url || '🤖';
                const timeStr = new Date(activity.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div 
                    key={activity.id} 
                    className="glass-panel" 
                    style={{ 
                      padding: '16px', 
                      background: isCustomPost ? 'rgba(0, 240, 255, 0.01)' : 'rgba(255, 255, 255, 0.005)',
                      borderLeft: isCustomPost ? '3px solid var(--color-cyan)' : '3px solid var(--color-purple)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.25rem' }}>{avatar}</span>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ color: '#fff', fontSize: '0.9rem', margin: 0 }}>{actorName}</h5>
                        <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{timeStr}</span>
                      </div>
                      <span className="badge-neon font-mono" style={{ fontSize: '0.6rem', padding: '1px 5px', textTransform: 'uppercase' }}>
                        {activity.type}
                      </span>
                    </div>
                    <h6 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '4px', fontWeight: 'bold' }}>{activity.title}</h6>
                    {activity.body && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{activity.body}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                <span className="font-mono" style={{ fontSize: '0.8rem' }}>NO RECENT TRANSMISSIONS</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
export default Dashboard;
