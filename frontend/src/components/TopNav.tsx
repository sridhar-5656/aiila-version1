import React, { useState, useEffect, useRef } from 'react';
import { Search, Notification, Close } from '@carbon/icons-react';
import { gsap } from 'gsap';

interface TopNavProps {
  title: string;
  subtitle?: string;
}

const TopNav: React.FC<TopNavProps> = ({ title, subtitle }) => {
  const [time, setTime] = useState<Date>(new Date());
  const [searchVal, setSearchVal] = useState<string>('');
  
  const headerRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // Time Interval
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // GSAP Entrance Animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        y: -50,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out'
      });
      
      gsap.from('.nav-item', {
        opacity: 0,
        y: -10,
        stagger: 0.1,
        delay: 0.4,
        ease: 'power2.out'
      });
    }, headerRef);

    return () => ctx.revert();
  }, []);

  // Search Focus Animation
  const handleFocus = () => {
    gsap.to(searchRef.current, { width: '450px', duration: 0.3, ease: 'sine.inOut' });
  };

  const handleBlur = () => {
    gsap.to(searchRef.current, { width: '400px', duration: 0.3, ease: 'sine.inOut' });
  };

  return (
    <header 
      ref={headerRef}
      style={{
        height: '48px', // Carbon standard height
        background: '#161616', // gray-100
        borderBottom: '1px solid #393939', // gray-80
        display: 'flex',
        alignItems: 'center',
        padding: '0 1rem',
        gap: '2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        color: '#f4f4f4'
      }}
    >
      {/* 1. Brand / Title Section */}
      <div className="nav-item" style={{ display: 'flex', flexDirection: 'column', minWidth: 'fit-content' }}>
        <span style={{ 
          fontSize: '14px', 
          fontWeight: 600, 
          letterSpacing: '0.16px',
          fontFamily: '"IBM Plex Sans", sans-serif' 
        }}>
          {title}
        </span>
        {subtitle && (
          <span style={{ 
            fontSize: '11px', 
            color: '#c6c6c6', 
            fontFamily: '"IBM Plex Mono", monospace',
            textTransform: 'uppercase'
          }}>
            {subtitle}
          </span>
        )}
      </div>

      {/* 2. Search Section */}
      <div 
        ref={searchRef}
        className="nav-item"
        style={{ 
          flex: 1, 
          maxWidth: '400px', 
          position: 'relative', 
          display: 'flex', 
          alignItems: 'center' 
        }}
      >
        <Search 
          size={16} 
          style={{ position: 'absolute', left: '12px', fill: '#c6c6c6' }} 
        />
        <input
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search entities, alerts, IDs..."
          style={{
            width: '100%',
            height: '32px',
            background: '#262626', // gray-90
            border: 'none',
            borderBottom: '1px solid #6f6f6f',
            padding: '0 40px 0 38px',
            fontSize: '14px',
            color: '#fff',
            outline: 'none',
            fontFamily: '"IBM Plex Sans", sans-serif'
          }}
        />
        {searchVal && (
          <Close 
            size={16} 
            style={{ position: 'absolute', right: '12px', cursor: 'pointer', fill: '#f4f4f4' }} 
            onClick={() => setSearchVal('')}
          />
        )}
      </div>

      {/* 3. Right Actions */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '24px' }}>
        
        {/* Threat Indicator */}
        <div className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#8d8d8d', fontWeight: 400 }}>THREAT</span>
          <div style={{
            padding: '2px 8px',
            background: '#fa4d56', // Carbon red-60
            fontSize: '11px',
            fontWeight: 600,
            color: '#ffffff',
          }}>
            HIGH
          </div>
        </div>

        {/* Global Clock */}
        <div className="nav-item" style={{ 
          fontFamily: '"IBM Plex Mono", monospace', 
          fontSize: '12px', 
          color: '#c6c6c6',
          borderLeft: '1px solid #393939',
          paddingLeft: '24px'
        }}>
          {time.toLocaleTimeString('en-IN', { hour12: false })}
          <span style={{ marginLeft: '6px', color: '#6f6f6f' }}>IST</span>
        </div>

        {/* Notification Bell */}
        <div 
          ref={alertRef}
          className="nav-item"
          style={{ position: 'relative', cursor: 'pointer', padding: '4px' }}
          onMouseEnter={() => gsap.to(alertRef.current, { scale: 1.1, duration: 0.2 })}
          onMouseLeave={() => gsap.to(alertRef.current, { scale: 1, duration: 0.2 })}
        >
          <Notification size={20} style={{ fill: '#f4f4f4' }} />
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '14px',
            height: '14px',
            background: '#fa4d56',
            borderRadius: '50%',
            fontSize: '9px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #161616'
          }}>
            5
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;