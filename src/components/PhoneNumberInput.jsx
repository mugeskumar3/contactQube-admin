import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getCountries, getCountryCallingCode } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import { isValidPhoneNumber, parsePhoneNumberFromString, getExampleNumber } from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';

// ============================================================================
// PURE UTILITY FUNCTIONS (Declared outside component to prevent re-creation)
// ============================================================================

/**
 * Safely fetches the dial code for a given country code.
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code.
 * @returns {string} E.164 dial code prefix.
 */
const safeGetDialCode = (countryCode) => {
  if (!countryCode) return '';
  try {
    return `+${getCountryCallingCode(countryCode)}`;
  } catch (_) {
    return '';
  }
};

/**
 * Normalize local text values, stripping non-numeric and formatting chars.
 * @param {string} val - Input raw string.
 * @returns {string} Stripped numeric value.
 */
const cleanPhoneNumberString = (val) => val.replace(/[^\d\s\-()]/g, '');

/**
 * Helper to parse a raw string value and resolve the country and national number.
 * @param {string} value - The input phone value.
 * @returns {{ country: string, nationalNumber: string }} Resolved phone components.
 */
const resolvePhoneDetails = (value) => {
  if (!value) return { country: 'IN', nationalNumber: '' };
  try {
    const normalized = value.startsWith('+') ? value : `+${value}`;
    const parsed = parsePhoneNumberFromString(normalized);
    if (parsed && parsed.country === 'IN') {
      return {
        country: 'IN',
        nationalNumber: parsed.nationalNumber || '',
      };
    }
    return {
      country: 'IN',
      nationalNumber: value.replace(/^\+91\s*/, ''),
    };
  } catch (_) {
    return {
      country: 'IN',
      nationalNumber: value,
    };
  }
};

// ============================================================================
// STYLES CONSTANTS (Declared static to optimize render allocations)
// ============================================================================

const staticStyles = {
  selectorButton: {
    borderTopLeftRadius: 'inherit',
    borderBottomLeftRadius: 'inherit',
    border: 'none',
    borderRight: '1.5px solid #e2e8f0',
    background: 'transparent',
    outline: 'none',
    boxShadow: 'none',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '14px',
    paddingRight: '12px',
  },
  dropdownMenu: {
    position: 'absolute',
    left: 0,
    top: '100%',
    marginTop: '4px',
    width: '280px',
    maxWidth: '90vw',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 9999,
    overflow: 'hidden',
    display: 'block',
  },
  searchWrapper: {
    padding: '8px',
    borderBottom: '1px solid #f1f5f9',
    backgroundColor: '#f8fafc',
  },
  searchInput: {
    width: '100%',
    padding: '6px 12px',
    fontSize: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },
  listContainer: {
    maxHeight: '240px',
    overflowY: 'auto',
    padding: '4px 0',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  flagStyle: {
    width: '20px',
    height: '14px',
    borderRadius: '1.5px',
    objectFit: 'cover',
    display: 'inline-block',
  },
  textInput: {
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    background: 'transparent',
    padding: '8px 14px',
    width: '100%',
    height: '100%',
    fontSize: '14.5px',
    fontWeight: '500',
    boxSizing: 'border-box',
  },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * SVG Flag renderer supporting all operating systems and devices.
 */
const CountryFlag = React.memo(({ countryCode }) => {
  const Flag = flags[countryCode];
  if (Flag) {
    return <Flag style={staticStyles.flagStyle} />;
  }
  return <span>🏳️</span>;
});

CountryFlag.displayName = 'CountryFlag';

/**
 * Clean, searchable, and fully accessible country code dropdown.
 */
const CountrySelector = React.memo(({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Lazy initialize and sort list of supported countries
  const countries = useMemo(() => {
    const list = getCountries().map((code) => ({
      code,
      name: (() => {
        try {
          return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
        } catch (_) {
          return code;
        }
      })(),
      dialCode: safeGetDialCode(code),
    }));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Filter list on search query changes
  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query) ||
        c.dialCode.includes(query)
    );
  }, [search, countries]);

  const currentDialCode = useMemo(() => safeGetDialCode(value), [value]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setHighlightedIndex(0);
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Scroll active elements into viewport
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-highlighted="true"]');
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  // Keyboard accessibility mappings
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;

      if (!isOpen) {
        if (['Enter', ' ', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredCountries.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCountries[highlightedIndex]) {
            onChange(filteredCountries[highlightedIndex].code);
            setIsOpen(false);
          }
          break;
        case 'Escape':
        case 'Tab':
          setIsOpen(false);
          break;
        default:
          break;
      }
    },
    [isOpen, filteredCountries, highlightedIndex, disabled, onChange]
  );

  const toggleDropdown = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <div className="relative inline-block h-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className="flex items-center justify-between gap-2 h-full text-slate-700 enabled:hover:bg-[#f5efe6] cursor-pointer disabled:cursor-default disabled:opacity-50 transition-colors font-medium text-sm focus:outline-none"
        style={staticStyles.selectorButton}
      >
        <span className="flex items-center">
          <CountryFlag countryCode={value} />
        </span>
        <span className="text-slate-800 text-xs font-semibold">{currentDialCode}</span>
        {!disabled && <span className="text-[8px] text-slate-400 select-none">▼</span>}
      </button>

      {isOpen && (
        <div style={staticStyles.dropdownMenu} onKeyDown={handleKeyDown}>
          <div style={staticStyles.searchWrapper}>
            <input
              ref={searchInputRef}
              type="text"
              style={staticStyles.searchInput}
              placeholder="Search by country or code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
            />
          </div>

          <div ref={listRef} style={staticStyles.listContainer}>
            {filteredCountries.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                No countries found
              </div>
            ) : (
              filteredCountries.map((country, index) => {
                const isSelected = country.code === value;
                const isHighlighted = index === highlightedIndex;

                const itemStyle = {
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  border: 'none',
                  background: isSelected ? '#f1f5f9' : isHighlighted ? '#f8fafc' : 'transparent',
                  color: isSelected ? '#0f172a' : '#334155',
                  fontWeight: isSelected ? '600' : '500',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  transition: 'background-color 0.15s ease',
                };

                return (
                  <button
                    key={country.code}
                    type="button"
                    data-highlighted={isHighlighted ? 'true' : 'false'}
                    onClick={() => {
                      onChange(country.code);
                      setIsOpen(false);
                    }}
                    style={itemStyle}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', marginRight: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <CountryFlag countryCode={country.code} />
                      </span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {country.name}
                      </span>
                    </div>
                    <span style={{ color: '#94a3b8', fontWeight: '500', marginLeft: 'auto', flexShrink: 0 }}>
                      {country.dialCode}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});

CountrySelector.displayName = 'CountrySelector';

// ============================================================================
// MAIN EXPORTED COMPONENT
// ============================================================================

/**
 * Reusable, production-grade PhoneNumberInput component.
 * Integrates with standard input patterns and uses libphonenumber-js for metadata.
 */
const PhoneNumberInput = ({
  value = '',
  onChange,
  disabled = false,
  error = false,
  placeholder = 'Enter phone number',
  id = 'phone-input',
  className = ''
}) => {
  // Sync state initialization with props defensively
  const initialDetails = useMemo(() => resolvePhoneDetails(value), [value]);

  const [country] = useState('IN');
  const [nationalNumber, setNationalNumber] = useState(initialDetails.nationalNumber);
  const [isFocused, setIsFocused] = useState(false);

  // Sync state when raw E.164 string from parent changes
  useEffect(() => {
    if (!value) {
      setNationalNumber('');
      return;
    }

    try {
      const normalizedValue = value.startsWith('+') ? value : `+${value}`;
      const parsed = parsePhoneNumberFromString(normalizedValue);
      if (parsed && parsed.country === 'IN') {
        setNationalNumber(parsed.nationalNumber || '');
      } else {
        const currentDialCode = '+91';
        if (value.startsWith(currentDialCode)) {
          setNationalNumber(value.slice(currentDialCode.length));
        } else {
          setNationalNumber(value.replace(/^\+91\s*/, ''));
        }
      }
    } catch (_) {
      setNationalNumber(value);
    }
  }, [value]);

  // Compute maximum allowed national digits dynamically
  const maxLength = useMemo(() => {
    try {
      const example = getExampleNumber(country, examples);
      if (example) {
        return example.nationalNumber.length;
      }
    } catch (_) { }
    return 15; // default fallback limit
  }, [country]);

  // Formats and cleans local input, invoking parent onChange with E.164 representation
  const handlePhoneChange = useCallback(
    (e) => {
      const inputVal = e.target.value;
      const cleanLocalVal = cleanPhoneNumberString(inputVal);
      const digitsOnly = cleanLocalVal.replace(/\D/g, '');

      if (digitsOnly.length > maxLength) return;

      setNationalNumber(cleanLocalVal);

      if (!cleanLocalVal) {
        onChange('');
        return;
      }

      try {
        const dialCode = safeGetDialCode(country);
        const e164 = `${dialCode}${digitsOnly}`;
        const parsed = parsePhoneNumberFromString(e164, country);
        onChange(parsed ? parsed.number : e164);
      } catch (_) {
        onChange(cleanLocalVal);
      }
    },
    [country, maxLength, onChange]
  );

  // Handle selected country changes
  const handleCountryChange = useCallback(
    (newCountry) => {
      setCountry(newCountry);
      if (nationalNumber) {
        try {
          const dialCode = safeGetDialCode(newCountry);
          const digitsOnly = nationalNumber.replace(/\D/g, '');
          const e164 = `${dialCode}${digitsOnly}`;
          const parsed = parsePhoneNumberFromString(e164, newCountry);
          onChange(parsed ? parsed.number : e164);
        } catch (_) {
          onChange(nationalNumber);
        }
      }
    },
    [nationalNumber, onChange]
  );

  const isTaller = useMemo(() => className?.includes('h-12'), [className]);

  // Dynamically compute wrapper styles
  const wrapperStyle = useMemo(
    () => ({
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      height: isTaller ? '48px' : '44px',
      border: error
        ? '1.5px solid #f43f5e'
        : isFocused
          ? '1.5px solid #b70805'
          : '1.5px solid #e2e8f0',
      borderRadius: '12px',
      backgroundColor: isFocused ? '#ffffff' : '#faf6f0',
      boxShadow: isFocused
        ? (error ? '0 0 0 3px rgba(244,63,94,0.2)' : '0 0 0 3px rgba(183,8,5,0.15)')
        : 'none',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
      position: 'relative',
    }),
    [error, isFocused, isTaller]
  );

  const onInputFocus = useCallback(() => setIsFocused(true), []);
  const onInputBlur = useCallback(() => setIsFocused(false), []);

  return (
    <div className={className || ''} style={wrapperStyle}>
      <CountrySelector
        value={country}
        onChange={handleCountryChange}
        disabled={true}
      />
      <input
        type="tel"
        id={id}
        disabled={disabled}
        value={nationalNumber}
        onChange={handlePhoneChange}
        onFocus={onInputFocus}
        onBlur={onInputBlur}
        placeholder={placeholder}
        className="flex-1 h-full text-slate-800"
        style={staticStyles.textInput}
      />
    </div>
  );
};

PhoneNumberInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  placeholder: PropTypes.string,
  id: PropTypes.string,
  className: PropTypes.string,
};

export default PhoneNumberInput;
