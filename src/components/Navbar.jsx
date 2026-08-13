import React from 'react';
import { Search } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="navbar">
      {/* Search Bar only */}
      <div className="search-wrapper">
        <Search size={15} className="input-icon-search" />
        <input
          type="text"
          placeholder="Search anything..."
          className="search-input"
        />
      </div>
    </header>
  );
}
