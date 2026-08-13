import React from 'react';
import { ConfigProvider, DatePicker } from 'antd';
import dayjs from 'dayjs';

// Brand primary color = #b70805
const BRAND_TOKEN = {
  colorPrimary: '#b70805',
  colorPrimaryHover: '#e03131',
  colorPrimaryActive: '#c92a2a',
  colorPrimaryBg: '#fff5f5',
  colorPrimaryBgHover: '#ffe3e3',
  borderRadius: 10,
  fontFamily: "'Outfit', 'Inter', sans-serif",
};

/**
 * AppDatePicker — Ant Design DatePicker pre-themed with app brand colors.
 *
 * Props:
 *  - value: string (ISO datetime string "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD")
 *  - onChange: (isoString: string) => void
 *  - showTime: boolean (default false)
 *  - disabled: boolean
 *  - minDate: string (ISO string — disables dates before this)
 *  - maxDate: string (ISO string — disables dates after this)
 *  - placeholder: string
 *  - hasError: boolean
 *  - style: object (extra styles on the picker)
 */
export default function AppDatePicker({
  value,
  onChange,
  showTime = false,
  disabled = false,
  minDate,
  maxDate,
  placeholder,
  hasError = false,
  style = {},
}) {
  const dayjsValue = value ? dayjs(value) : null;

  const disabledDate = (current) => {
    if (!current) return false;
    if (minDate && current.isBefore(dayjs(minDate), 'day')) return true;
    if (maxDate && current.isAfter(dayjs(maxDate), 'day')) return true;
    return false;
  };

  const handleChange = (val) => {
    if (!val) {
      onChange('');
      return;
    }
    onChange(showTime ? val.format('YYYY-MM-DDTHH:mm') : val.format('YYYY-MM-DD'));
  };

  return (
    <ConfigProvider theme={{ token: BRAND_TOKEN }}>
      <DatePicker
        showTime={showTime ? { format: 'hh:mm A', use12Hours: true } : false}
        value={dayjsValue}
        onChange={handleChange}
        disabled={disabled}
        disabledDate={disabledDate}
        format={showTime ? 'DD/MM/YYYY hh:mm A' : 'DD/MM/YYYY'}
        placeholder={placeholder || (showTime ? 'Select date & time' : 'Select date')}
        popupStyle={{ zIndex: 10001 }}
        style={{
          width: '100%',
          height: '40px',
          borderRadius: '10px',
          border: hasError ? '1.5px solid #e11d48' : '1.5px solid #e2e8f0',
          fontSize: '13.5px',
          ...style,
        }}
      />
    </ConfigProvider>
  );
}
