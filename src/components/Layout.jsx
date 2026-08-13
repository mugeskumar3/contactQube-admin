import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="layout-wrapper">
      {/* Top Navigation Bar (brand + links + bell + profile) */}
      <Sidebar />

      {/* Main Page Content */}
      <div className="main-content-wrapper">
        {/* Page Content */}
        <main className="main-content">
          <div className="container-7xl animate-in fade-in">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer style={{
          padding: '10px 24px',
          // borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          fontSize: '13px',
          color: '#64748b',
          fontWeight: '500',
          background: '#f6f3eb',
          fontFamily: 'var(--font-sans)'
        }}>
          &copy; {new Date().getFullYear()} ContactQube. Developed & Maintained by <a
            href="https://www.oceansoftwares.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#b70805',
              textDecoration: 'none'
            }}
          >
            Oceans Softwares Private Limited
          </a>
        </footer>
      </div>
    </div>
  );
}
