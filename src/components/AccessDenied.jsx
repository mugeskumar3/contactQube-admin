import React from 'react';
import { ShieldAlert, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFirstAccessibleRoute } from '../utils/permission';

export default function AccessDenied() {
  const navigate = useNavigate();
  const targetRoute = getFirstAccessibleRoute();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '40px 20px',
      textAlign: 'center',
      fontFamily: 'var(--font-sans)',
    }}>
      <div
        className="animate-in fade-in"
        style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          borderRadius: '24px',
          padding: '48px 32px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Icon Container */}
        <div style={{
          background: 'var(--color-brand-50)',
          border: '1px solid var(--color-brand-100)',
          borderRadius: '50%',
          padding: '20px',
          marginBottom: '24px',
          color: 'var(--color-brand-500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ShieldAlert size={48} />
        </div>

        {/* Text Details */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: 'var(--color-slate-800)',
          marginBottom: '12px',
          letterSpacing: '-0.02em',
        }}>
          Access Restricted
        </h2>
        <p style={{
          fontSize: '15px',
          color: 'var(--color-slate-500)',
          lineHeight: '1.6',
          marginBottom: '32px',
        }}>
          You do not have permission to view this module. Please contact your system administrator to request access.
        </p>

        {/* Action Button */}
        {/* <button
          onClick={() => navigate(targetRoute)}
          className="btn btn-primary"
          style={{
            padding: '12px 28px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            border: 'none',
          }}
        >
          <Home size={16} /> Go to Home
        </button> */}
      </div>
    </div>
  );
}
