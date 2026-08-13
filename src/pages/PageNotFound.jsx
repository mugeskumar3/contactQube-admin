import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

export default function PageNotFound() {
  const navigate = useNavigate();
  const [backHover, setBackHover] = useState(false);
  const [homeHover, setHomeHover] = useState(false);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      width: '100%',
      padding: '24px',
      textAlign: 'center',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #f1f5f9',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        padding: '40px 32px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '120px',
          height: '120px',
          backgroundColor: '#543A2E',
          opacity: 0.12,
          borderRadius: '50%',
          filter: 'blur(30px)',
          pointerEvents: 'none'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-40px',
          left: '-40px',
          width: '120px',
          height: '120px',
          backgroundColor: '#4f46e5',
          opacity: 0.08,
          borderRadius: '50%',
          filter: 'blur(30px)',
          pointerEvents: 'none'
        }}></div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Warning Icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '64px',
            width: '64px',
            borderRadius: '50%',
            backgroundColor: '#fff7ed',
            border: '1px solid #ffedd5',
            color: '#D0653B',
            marginBottom: '24px'
          }}>
            <AlertTriangle size={32} />
          </div>

          <h1 style={{
            fontSize: '64px',
            fontWeight: '800',
            fontFamily: 'Outfit, sans-serif',
            color: '#1e293b',
            lineHeight: 1,
            margin: '0 0 12px 0',
            letterSpacing: '-0.02em'
          }}>
            404
          </h1>

          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            fontFamily: 'Outfit, sans-serif',
            color: '#334155',
            margin: '0 0 8px 0',
            letterSpacing: '-0.01em'
          }}>
            Page Not Found
          </h2>

          <p style={{
            fontSize: '14px',
            color: '#64748b',
            fontWeight: '500',
            maxWidth: '320px',
            margin: '0 0 32px 0',
            lineHeight: '1.5'
          }}>
            Oops! The page you are looking for does not exist or has been moved to another location.
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
            width: '100%',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => navigate(-1)}
              onMouseEnter={() => setBackHover(true)}
              onMouseLeave={() => setBackHover(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 20px',
                fontWeight: '600',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: backHover ? '#f8fafc' : '#ffffff',
                borderColor: backHover ? '#cbd5e1' : '#e2e8f0',
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '50%'
              }}
            >
              <ArrowLeft size={16} /> Go Back
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              onMouseEnter={() => setHomeHover(true)}
              onMouseLeave={() => setHomeHover(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 20px',
                fontWeight: '600',
                fontSize: '14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: homeHover ? '#b8542e' : '#D0653B',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '50%',
                boxShadow: '0 4px 6px -1px rgba(208, 101, 59, 0.2), 0 2px 4px -1px rgba(208, 101, 59, 0.1)'
              }}
            >
              <Home size={16} /> Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
