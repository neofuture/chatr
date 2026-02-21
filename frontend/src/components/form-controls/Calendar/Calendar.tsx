'use client';

import { useState } from 'react';
import './Calendar.css';

interface CalendarProps {
  value?: Date;
  onChange?: (date: Date) => void;
  onClose?: () => void;
  mode?: 'date' | 'time' | 'datetime';
  minDate?: Date;
  maxDate?: Date;
}

export default function Calendar({ value, onChange, onClose, mode = 'datetime' }: CalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(value || new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(value || new Date());
  const [selectedTime, setSelectedTime] = useState({
    hour: value ? value.getHours() : new Date().getHours(),
    minute: value ? value.getMinutes() : new Date().getMinutes()
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentMonth);
    const prevMonthDays = firstDayOfMonth(currentMonth);

    // Previous month days
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    const prevMonthTotal = daysInMonth(prevMonth);

    for (let i = prevMonthTotal - prevMonthDays + 1; i <= prevMonthTotal; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isPrevMonth: true,
        date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), i)
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        isPrevMonth: false,
        date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i)
      });
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
      days.push({
        day: i,
        isCurrentMonth: false,
        isPrevMonth: false,
        date: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i)
      });
    }

    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const handleDateClick = (date: Date) => {
    const newDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      selectedTime.hour,
      selectedTime.minute
    );
    setSelectedDate(newDate);

    if (mode === 'date') {
      // For date-only mode, apply immediately
      if (onChange) onChange(newDate);
      if (onClose) onClose();
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleTimeChange = (type: 'hour' | 'minute', value: number) => {
    const newTime = { ...selectedTime, [type]: value };
    setSelectedTime(newTime);

    const newDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      newTime.hour,
      newTime.minute
    );
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    const finalDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      selectedTime.hour,
      selectedTime.minute
    );
    if (onChange) onChange(finalDate);
    if (onClose) onClose();
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
    setSelectedTime({
      hour: today.getHours(),
      minute: today.getMinutes()
    });
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="calendar-popover">
      <div className="calendar-container">
        {/* Header */}
        {(mode === 'date' || mode === 'datetime') && (
          <div className="calendar-header">
            <button className="calendar-nav-btn" onClick={handlePrevMonth}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
              </svg>
            </button>
            <div className="calendar-month-year">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button className="calendar-nav-btn" onClick={handleNextMonth}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
              </svg>
            </button>
          </div>
        )}

        {/* Calendar Grid */}
        {(mode === 'date' || mode === 'datetime') && (
          <div className="calendar-body">
            {/* Day headers */}
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="calendar-weekday">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="calendar-days">
              {calendarDays.map((dayObj, index) => (
                <button
                  key={index}
                  className={`calendar-day ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${isToday(dayObj.date) ? 'today' : ''} ${isSelected(dayObj.date) ? 'selected' : ''}`}
                  onClick={() => handleDateClick(dayObj.date)}
                >
                  {dayObj.day}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Time Picker */}
        {(mode === 'time' || mode === 'datetime') && (
          <div className="calendar-time-picker">
            <div className="time-picker-label">
              {mode === 'datetime' ? 'Time' : 'Select Time'}
            </div>
            <div className="time-picker-controls">
              <div className="time-picker-group">
                <label>Hour</label>
                <select
                  value={selectedTime.hour}
                  onChange={(e) => handleTimeChange('hour', parseInt(e.target.value))}
                  className="time-picker-select"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
              <span className="time-separator">:</span>
              <div className="time-picker-group">
                <label>Minute</label>
                <select
                  value={selectedTime.minute}
                  onChange={(e) => handleTimeChange('minute', parseInt(e.target.value))}
                  className="time-picker-select"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="calendar-footer">
          <button className="calendar-btn calendar-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="calendar-btn calendar-btn-today"
            onClick={handleToday}
            title="Jump to today"
          >
            Today
          </button>
          <button className="calendar-btn calendar-btn-primary" onClick={handleConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

