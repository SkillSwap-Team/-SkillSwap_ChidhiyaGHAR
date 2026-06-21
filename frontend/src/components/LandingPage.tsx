import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, BookOpen, Users, Compass } from 'lucide-react';

interface LandingPageProps {
  scrollProgress: number;
  onNavigate: (section: 'auth') => void;
  setVisorState: (state: 'eyes' | 'quote' | 'swap' | 'success' | 'camera') => void;
}

// Custom hook to trigger text scramble effect
const useTextScramble = (text: string, trigger: boolean = true) => {
  const [displayText, setDisplayText] = useState(text);
  const chars = '!@#$%^&*()_+1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  useEffect(() => {
    if (!trigger) return;
    let iteration = 0;
    let interval: any = null;

    interval = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((char, index) => {
            if (index < iteration) {
              return text[index];
            }
            if (char === ' ') return ' ';
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );

      if (iteration >= text.length) {
        clearInterval(interval);
      }
      iteration += 1 / 3;
    }, 30);

    return () => clearInterval(interval);
  }, [text, trigger]);

  return displayText;
};

export const LandingPage: React.FC<LandingPageProps> = ({
  scrollProgress,
  onNavigate,
  setVisorState,
}) => {
  // Scramble headings
  const title = useTextScramble("COLLABORATIVE SKILL BARTER", true);
  const subtitle = useTextScramble("Learn Python. Teach UI Design. Zero Tuition. Strict Bidirectional Match.", true);

  // Dynamically change the visorState of the robot as the user scrolls
  useEffect(() => {
    if (scrollProgress < 0.3) {
      setVisorState('eyes');
    } else if (scrollProgress >= 0.3 && scrollProgress < 0.65) {
      setVisorState('swap');
    } else {
      setVisorState('quote');
    }
  }, [scrollProgress, setVisorState]);

  // Calculate section opacities with proper fade-in and fade-out so they never overlap
  let opacityHero = 0;
  let opacityFeatures = 0;
  let opacityTestimonials = 0;

  if (scrollProgress < 0.2) {
    opacityHero = 1;
  } else if (scrollProgress >= 0.2 && scrollProgress < 0.35) {
    opacityHero = 1 - (scrollProgress - 0.2) / 0.15;
  }

  if (scrollProgress >= 0.25 && scrollProgress < 0.38) {
    opacityFeatures = (scrollProgress - 0.25) / 0.13;
  } else if (scrollProgress >= 0.38 && scrollProgress < 0.6) {
    opacityFeatures = 1;
  } else if (scrollProgress >= 0.6 && scrollProgress < 0.72) {
    opacityFeatures = 1 - (scrollProgress - 0.6) / 0.12;
  }

  if (scrollProgress >= 0.65 && scrollProgress < 0.78) {
    opacityTestimonials = (scrollProgress - 0.65) / 0.13;
  } else if (scrollProgress >= 0.78) {
    opacityTestimonials = 1;
  }

  return (
    <div className="landing-container" style={{ position: 'relative', width: '100%', minHeight: '300vh' }}>
      
      {/* SECTION 1: HERO */}
      <section 
        style={{ 
          position: 'fixed', 
          top: '0', 
          left: 0, 
          width: '100%', 
          height: '100vh',
          opacity: opacityHero,
          pointerEvents: opacityHero > 0.1 ? 'all' : 'none',
          zIndex: 10
        }}
      >
        {/* Left column */}
        <div style={{ position: 'absolute', left: '80px', top: '20vh', width: '38%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
          <div className="badge-neon pulse-cyan" style={{ marginBottom: '20px' }}>
            <Sparkles size={12} /> Live Peer Matching Active
          </div>
          
          <h1 
            className="font-mono"
            style={{ 
              fontSize: '3rem', 
              fontWeight: 800, 
              letterSpacing: '0.05em',
              marginBottom: '28px',
              color: '#fff',
              lineHeight: '1.2',
              textShadow: '0 0 20px rgba(0, 240, 255, 0.3)'
            }}
          >
            {title}
          </h1>

          <button 
            className="cyber-button"
            onClick={() => onNavigate('auth')}
            style={{ padding: '16px 36px', fontSize: '1rem' }}
          >
            Enter the Grid <ArrowRight size={16} />
          </button>
        </div>

        {/* Right column */}
        <div style={{ position: 'absolute', right: '80px', top: '24vh', width: '38%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
          <p 
            style={{ 
              fontSize: '1.15rem', 
              color: 'var(--text-muted)', 
              marginBottom: '40px',
              lineHeight: 1.7,
            }}
          >
            {subtitle}
          </p>

          <div style={{ marginTop: '80px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.8rem' }} className="pulse-cyan">
            [ SCROLL DOWN TO INITIALIZE ROBOT OVERVIEW ]
          </div>
        </div>
      </section>

      {/* SECTION 2: FEATURES */}
      <section 
        style={{ 
          position: 'fixed', 
          top: '0', 
          left: 0, 
          width: '100%', 
          height: '100vh',
          opacity: opacityFeatures,
          pointerEvents: opacityFeatures > 0.1 ? 'all' : 'none',
          zIndex: 10
        }}
      >
        {/* Left column */}
        <div style={{ position: 'absolute', left: '80px', top: '15vh', width: '38%', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          <div>
            <h2 className="font-mono" style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '8px', textShadow: '0 0 15px rgba(0, 240, 255, 0.2)' }}>
              02 // THE CO-LEARN ENGINE
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>
              An immersive swap platform built for student mutual growth.
            </p>
          </div>

          <div className="glass-panel cyan-glow" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--color-cyan)', marginBottom: '12px' }}>
              <Users size={24} />
            </div>
            <h3 style={{ marginBottom: '8px', color: '#fff', fontSize: '1.1rem' }} className="font-mono">Bidirectional Matches</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.4 }}>
              Our matching algorithm strictly pairs you with peers whose teaching skills match your learning desires and vice-versa.
            </p>
          </div>

          <div className="glass-panel cyan-glow" style={{ padding: '20px' }}>
            <div style={{ color: 'var(--color-cyan)', marginBottom: '12px' }}>
              <Compass size={24} />
            </div>
            <h3 style={{ marginBottom: '8px', color: '#fff', fontSize: '1.1rem' }} className="font-mono">Reputation Score</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.4 }}>
              Complete exchanges, upload hackathon certificates, and earn verified skill badges to build your college portfolio.
            </p>
          </div>
        </div>

        {/* Right column */}
        <div style={{ position: 'absolute', right: '80px', top: '22vh', width: '38%', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          <div className="glass-panel purple-glow" style={{ padding: '24px' }}>
            <div style={{ color: 'var(--color-purple)', marginBottom: '16px' }}>
              <BookOpen size={32} />
            </div>
            <h3 style={{ marginBottom: '10px', color: '#fff', fontSize: '1.25rem' }} className="font-mono">Interactive Board</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
              A live vector whiteboard featuring shared canvas tools and voice connection to explain complex problems step-by-step.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: TESTIMONIALS / QUOTES */}
      <section 
        style={{ 
          position: 'fixed', 
          top: '0', 
          left: 0, 
          width: '100%', 
          height: '100vh',
          opacity: opacityTestimonials,
          pointerEvents: opacityTestimonials > 0.1 ? 'all' : 'none',
          zIndex: 10
        }}
      >
        {/* Left column */}
        <div style={{ position: 'absolute', left: '80px', top: '18vh', width: '38%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
          <h2 className="font-mono" style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '8px', textShadow: '0 0 15px rgba(189, 0, 255, 0.2)' }}>
            03 // USER TRANSMISSIONS
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.9rem' }}>
            What peer co-learners are broadcasting across the network.
          </p>

          <div style={{ marginBottom: '30px' }}>
            <p style={{ fontSize: '1.1rem', fontStyle: 'italic', lineHeight: 1.5, color: '#fff', marginBottom: '16px' }}>
              "SkillSwap solved my biggest challenge. I wanted to learn Flutter but bootcamps were too expensive. I matched with a senior who wanted to learn UI Design, and we exchanged skills!"
            </p>
            <div className="font-mono" style={{ color: 'var(--color-cyan)', fontSize: '0.85rem' }}>
              // DEPT_OF_COMPUTER_SCIENCE_STUDENT
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Sanjay Kumar, Year 3
            </div>
          </div>

          <button 
            className="cyber-button purple"
            onClick={() => onNavigate('auth')}
            style={{ padding: '16px 36px' }}
          >
            JOIN THE EXCHANGE NOW
          </button>
        </div>

        {/* Right column */}
        <div style={{ position: 'absolute', right: '80px', top: '24vh', width: '38%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
          <div style={{ marginTop: '40px' }}>
            <p style={{ fontSize: '1.1rem', fontStyle: 'italic', lineHeight: 1.5, color: '#fff', marginBottom: '16px' }}>
              "I taught Python scripting to 3 freshers and in return got expert tutorials on Git and Docker setup. The whiteboard with real-time video feed made it feel like a real tutoring hub."
            </p>
            <div className="font-mono" style={{ color: 'var(--color-purple)', fontSize: '0.85rem' }}>
              // DEPT_OF_ELECTRICAL_ENG
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Sneha Reddy, Year 4
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
export default LandingPage;
