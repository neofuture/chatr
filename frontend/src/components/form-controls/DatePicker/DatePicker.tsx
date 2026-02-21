'use client';

import { useState, useRef, useEffect, forwardRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Calendar from '@/components/form-controls/Calendar/Calendar';

interface DatePickerProps {
  label?: string;
  value?: Date;
  onChange?: (date: Date) => void;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  locale?: 'en-US' | 'en-GB' | string; // en-US = MM/DD/YYYY, en-GB = DD/MM/YYYY
  mode?: 'date' | 'time' | 'datetime'; // date-only, time-only, or both
}

const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  ({ label, value, onChange, error, minDate, maxDate, locale = 'en-GB', mode = 'datetime' }, ref) => {
    const [selectedDate, setSelectedDate] = useState<Date>(value || new Date());
    const [isOpen, setIsOpen] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [monthScrollPosition, setMonthScrollPosition] = useState(0);
    const [dayScrollPosition, setDayScrollPosition] = useState(0);
    const [yearScrollPosition, setYearScrollPosition] = useState(0);
    const [hourScrollPosition, setHourScrollPosition] = useState(0);
    const [minuteScrollPosition, setMinuteScrollPosition] = useState(0);

    // Track selected values independently to prevent re-renders
    const [tempMonth, setTempMonth] = useState(selectedDate.getMonth());
    const [tempDay, setTempDay] = useState(selectedDate.getDate());
    const [tempYear, setTempYear] = useState(selectedDate.getFullYear());
    const [tempHour, setTempHour] = useState(selectedDate.getHours());
    const [tempMinute, setTempMinute] = useState(selectedDate.getMinutes());

    const monthRef = useRef<HTMLDivElement>(null);
    const dayRef = useRef<HTMLDivElement>(null);
    const yearRef = useRef<HTMLDivElement>(null);
    const hourRef = useRef<HTMLDivElement>(null);
    const minuteRef = useRef<HTMLDivElement>(null);
    const isDayScrollingRef = useRef(false);
    const lastDayScrollTopRef = useRef(0);
    const dayInitializedRef = useRef(false);

    // Flags to prevent boundary repositioning during smooth scroll animations
    const isMonthAnimatingRef = useRef(false);
    const isYearAnimatingRef = useRef(false);
    const isHourAnimatingRef = useRef(false);
    const isMinuteAnimatingRef = useRef(false);

    // Timeout refs for snap-to-item animation when scrolling stops
    const monthScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dayScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const yearScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hourScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const minuteScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isAnimatingRef = useRef(false);

    // Track if wheels are currently being scrolled by user
    const isMonthScrollingRef = useRef(false);
    const isYearScrollingRef = useRef(false);

    // Debounce ref for day wheel updates
    const dayUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Store the last known good days length to detect actual changes
    const lastDaysLengthRef = useRef(0);

    // Determine wheel order based on locale
    const isUKFormat = locale === 'en-GB';
    const wheelOrder = isUKFormat ? ['day', 'month', 'year'] : ['month', 'day', 'year'];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i);

  // Hours (0-23) and Minutes (0-59)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Use tempMonth and tempYear to calculate days dynamically
  const daysInMonth = getDaysInMonth(tempMonth, tempYear);
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // Create infinite wrapping arrays by quintuplicating (5 copies for smoother infinite scroll)
  const infiniteMonths = [...months, ...months, ...months, ...months, ...months];
  const infiniteDays = useMemo(() => [...days, ...days, ...days, ...days, ...days], [days]);
  const infiniteYears = [...years, ...years, ...years, ...years, ...years];
  const infiniteHours = [...hours, ...hours, ...hours, ...hours, ...hours];
  const infiniteMinutes = [...minutes, ...minutes, ...minutes, ...minutes, ...minutes];

  // Effect to maintain day scroll position when month/year changes
  useEffect(() => {
    if (!isOpen || !dayRef.current) return;

    // Clear any pending day update timeout
    if (dayUpdateTimeoutRef.current) {
      clearTimeout(dayUpdateTimeoutRef.current);
    }

    // If month or year is currently being scrolled, defer updates
    if (isMonthScrollingRef.current || isYearScrollingRef.current) {
      // Schedule update to happen 400ms after scrolling stops
      dayUpdateTimeoutRef.current = setTimeout(() => {
        if (!dayRef.current) return;

        const maxDays = getDaysInMonth(tempMonth, tempYear);
        const dayToShow = Math.min(tempDay, maxDays);

        if (tempDay > maxDays) {
          setTempDay(maxDays);
        }

        // Only update if days length actually changed
        if (days.length !== lastDaysLengthRef.current) {
          lastDaysLengthRef.current = days.length;
        }

        // Use 3rd copy (index 2) of 5 copies
        const targetScrollPos = (dayToShow - 1 + days.length * 2) * 34;
        lastDayScrollTopRef.current = targetScrollPos;

        // Use immediate update (no animation) to prevent flash
        dayRef.current.scrollTop = targetScrollPos;
        setDayScrollPosition(targetScrollPos / 34);
      }, 400);
      return;
    }

    // If not scrolling, update immediately but check if days actually changed
    const maxDays = getDaysInMonth(tempMonth, tempYear);
    const dayToShow = Math.min(tempDay, maxDays);

    if (tempDay > maxDays) {
      setTempDay(maxDays);
    }

    // Only update position if days length changed
    if (days.length !== lastDaysLengthRef.current) {
      lastDaysLengthRef.current = days.length;
    }

    // Use 3rd copy (index 2) of 5 copies
    const targetScrollPos = (dayToShow - 1 + days.length * 2) * 34;
    lastDayScrollTopRef.current = targetScrollPos;

    // Use immediate scroll update
    if (dayRef.current) {
      dayRef.current.scrollTop = targetScrollPos;
      setDayScrollPosition(targetScrollPos / 34);
    }
  }, [tempMonth, tempYear, isOpen, days.length]);

  // Smooth snap-to-item animation when user stops scrolling
  const snapToNearestItem = (
    element: HTMLDivElement,
    currentScrollTop: number,
    setScrollPosition: (pos: number) => void,
    setValue: (val: number) => void,
    itemCount: number,
    getValueFromIndex: (index: number) => number
  ) => {
    if (isAnimatingRef.current) return;

    const itemHeight = 34;
    const rawIndex = Math.round(currentScrollTop / itemHeight);
    const targetScrollPos = rawIndex * itemHeight;

    // Only animate if we're not already aligned
    if (Math.abs(currentScrollTop - targetScrollPos) > 1) {
      isAnimatingRef.current = true;
      const startScrollPos = currentScrollTop;
      const distance = targetScrollPos - startScrollPos;
      const duration = 300; // Quick snap animation
      const startTime = performance.now();

      const easeOutCubic = (t: number) => {
        return 1 - Math.pow(1 - t, 3);
      };

      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);

        const newScrollPos = startScrollPos + distance * easedProgress;
        element.scrollTop = newScrollPos;
        setScrollPosition(newScrollPos / itemHeight);

        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          isAnimatingRef.current = false;
          // Update the value after animation completes
          const actualIndex = rawIndex % itemCount;
          if (actualIndex >= 0 && actualIndex < itemCount) {
            setValue(getValueFromIndex(actualIndex));
          }
        }
      };

      requestAnimationFrame(animateScroll);
    }
  };

  const handleMonthScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const itemHeight = 34;
    const scrollTop = element.scrollTop;
    const actualCount = months.length;

    // Mark that month wheel is being scrolled
    isMonthScrollingRef.current = true;

    // Clear previous timeout
    if (monthScrollTimeoutRef.current) {
      clearTimeout(monthScrollTimeoutRef.current);
    }

    // Track fractional scroll position for smooth styling (no repositioning during scroll)
    setMonthScrollPosition(scrollTop / itemHeight);

    // Set timeout to snap to nearest item when scrolling stops
    monthScrollTimeoutRef.current = setTimeout(() => {
      if (!monthRef.current) return;

      // Calculate final month value when scrolling stops
      const finalScrollTop = monthRef.current.scrollTop;
      const finalRawIndex = Math.round(finalScrollTop / itemHeight);
      const finalActualIndex = finalRawIndex % actualCount;

      // NOW update tempMonth after scrolling stops
      if (finalActualIndex >= 0 && finalActualIndex < actualCount) {
        setTempMonth(finalActualIndex);
      }

      // Check if we need to reposition (only at extreme boundaries)
      // With 5 copies, only reposition if in first or last copy
      if (!isMonthAnimatingRef.current && (finalRawIndex < actualCount || finalRawIndex >= actualCount * 4)) {
        const newScrollTop = (finalActualIndex + actualCount * 2) * itemHeight;
        monthRef.current.scrollTop = newScrollTop;
        setMonthScrollPosition(newScrollTop / itemHeight);
      }

      // Clear scrolling flag when scrolling stops
      isMonthScrollingRef.current = false;

      if (monthRef.current && !isAnimatingRef.current) {
        snapToNearestItem(
          monthRef.current,
          monthRef.current.scrollTop,
          setMonthScrollPosition,
          setTempMonth,
          actualCount,
          (index) => index
        );
      }
    }, 150);
  };

  const handleDayScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const itemHeight = 34;
    const scrollTop = element.scrollTop;

    // Clear previous timeout
    if (dayScrollTimeoutRef.current) {
      clearTimeout(dayScrollTimeoutRef.current);
    }

    // Mark that user is actively scrolling day wheel
    isDayScrollingRef.current = true;
    lastDayScrollTopRef.current = scrollTop;

    requestAnimationFrame(() => {
      setDayScrollPosition(scrollTop / itemHeight);

      // Calculate which day number based on scroll position
      const rawIndex = Math.round(scrollTop / itemHeight);
      const actualIndex = rawIndex % days.length;

      // With 5 copies, only reposition if outside copy 2-4 range
      if (rawIndex < days.length || rawIndex >= days.length * 4) {
        const newScrollTop = (actualIndex + days.length * 2) * itemHeight;
        element.scrollTop = newScrollTop;
        lastDayScrollTopRef.current = newScrollTop;
        setDayScrollPosition(newScrollTop / itemHeight);
        return;
      }

      if (actualIndex >= 0 && actualIndex < days.length) {
        const dayNumber = actualIndex + 1;
        setTempDay(dayNumber);
      }
    });

    // Set timeout to snap to nearest item when scrolling stops
    dayScrollTimeoutRef.current = setTimeout(() => {
      if (dayRef.current && !isAnimatingRef.current) {
        snapToNearestItem(
          dayRef.current,
          dayRef.current.scrollTop,
          setDayScrollPosition,
          setTempDay,
          days.length,
          (index) => index + 1
        );
      }
    }, 150);
  };

  const handleYearScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const itemHeight = 34;
    const scrollTop = element.scrollTop;
    const actualCount = years.length;

    // Mark that year wheel is being scrolled
    isYearScrollingRef.current = true;

    // Clear previous timeout
    if (yearScrollTimeoutRef.current) {
      clearTimeout(yearScrollTimeoutRef.current);
    }

    // Track fractional scroll position for smooth styling (no repositioning during scroll)
    setYearScrollPosition(scrollTop / itemHeight);

    // Set timeout to clear scrolling flag when scrolling stops
    yearScrollTimeoutRef.current = setTimeout(() => {
      if (!yearRef.current) return;

      // Calculate final year value when scrolling stops
      const finalScrollTop = yearRef.current.scrollTop;
      const finalRawIndex = Math.round(finalScrollTop / itemHeight);
      const finalActualIndex = finalRawIndex % actualCount;

      // NOW update tempYear after scrolling stops
      if (finalActualIndex >= 0 && finalActualIndex < actualCount) {
        setTempYear(years[finalActualIndex]);
      }

      // Check if we need to reposition (only at extreme boundaries)
      if (!isYearAnimatingRef.current && (finalRawIndex < actualCount || finalRawIndex >= actualCount * 4)) {
        const newScrollTop = (finalActualIndex + actualCount * 2) * itemHeight;
        yearRef.current.scrollTop = newScrollTop;
        setYearScrollPosition(newScrollTop / itemHeight);
      }

      isYearScrollingRef.current = false;
    }, 150);
  };

  const handleHourScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const itemHeight = 34;
    const scrollTop = element.scrollTop;
    const actualCount = hours.length;

    // Clear previous timeout
    if (hourScrollTimeoutRef.current) {
      clearTimeout(hourScrollTimeoutRef.current);
    }

    // Track fractional scroll position for smooth styling (no repositioning during scroll)
    setHourScrollPosition(scrollTop / itemHeight);

    // Update hour value immediately
    const rawIndex = Math.round(scrollTop / itemHeight);
    const actualIndex = rawIndex % actualCount;
    if (actualIndex >= 0 && actualIndex < actualCount) {
      setTempHour(hours[actualIndex]);
    }

    // Set timeout to reposition after scroll stops
    hourScrollTimeoutRef.current = setTimeout(() => {
      if (!hourRef.current) return;

      const finalScrollTop = hourRef.current.scrollTop;
      const finalRawIndex = Math.round(finalScrollTop / itemHeight);
      const finalActualIndex = finalRawIndex % actualCount;

      // Check if we need to reposition (only at extreme boundaries)
      if (!isHourAnimatingRef.current && (finalRawIndex < actualCount || finalRawIndex >= actualCount * 4)) {
        const newScrollTop = (finalActualIndex + actualCount * 2) * itemHeight;
        hourRef.current.scrollTop = newScrollTop;
        setHourScrollPosition(newScrollTop / itemHeight);
      }
    }, 150);
  };

  const handleMinuteScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const itemHeight = 34;
    const scrollTop = element.scrollTop;
    const actualCount = minutes.length;

    // Clear previous timeout
    if (minuteScrollTimeoutRef.current) {
      clearTimeout(minuteScrollTimeoutRef.current);
    }

    // Track fractional scroll position for smooth styling (no repositioning during scroll)
    setMinuteScrollPosition(scrollTop / itemHeight);

    // Update minute value immediately
    const rawIndex = Math.round(scrollTop / itemHeight);
    const actualIndex = rawIndex % actualCount;
    if (actualIndex >= 0 && actualIndex < actualCount) {
      setTempMinute(minutes[actualIndex]);
    }

    // Set timeout to reposition after scroll stops
    minuteScrollTimeoutRef.current = setTimeout(() => {
      if (!minuteRef.current) return;

      const finalScrollTop = minuteRef.current.scrollTop;
      const finalRawIndex = Math.round(finalScrollTop / itemHeight);
      const finalActualIndex = finalRawIndex % actualCount;

      // Check if we need to reposition (only at extreme boundaries)
      if (!isMinuteAnimatingRef.current && (finalRawIndex < actualCount || finalRawIndex >= actualCount * 4)) {
        const newScrollTop = (finalActualIndex + actualCount * 2) * itemHeight;
        minuteRef.current.scrollTop = newScrollTop;
        setMinuteScrollPosition(newScrollTop / itemHeight);
      }
    }, 150);
  };

    const scrollToValue = () => {
      if (monthRef.current) {
        // Use 3rd copy (index 2) as middle position with 5 copies total
        const middleSetIndex = selectedDate.getMonth() + (months.length * 2);
        monthRef.current.scrollTop = middleSetIndex * 34;
      }
      // Only set day scroll position on FIRST open, then never touch it again
      if (dayRef.current && !dayInitializedRef.current) {
        // Use 3rd copy (index 2) as middle position with 5 copies total
        const middleSetIndex = (selectedDate.getDate() - 1) + (days.length * 2);
        const scrollTop = middleSetIndex * 34;
        dayRef.current.scrollTop = scrollTop;
        lastDayScrollTopRef.current = scrollTop;
        dayInitializedRef.current = true;
      }
      if (yearRef.current) {
        const yearIndex = years.indexOf(selectedDate.getFullYear());
        if (yearIndex >= 0) {
          // Use 3rd copy (index 2) as middle position with 5 copies total
          const middleSetIndex = yearIndex + (years.length * 2);
          yearRef.current.scrollTop = middleSetIndex * 34;
        }
      }
      if (hourRef.current) {
        // Use 3rd copy (index 2) as middle position with 5 copies total
        const middleSetIndex = selectedDate.getHours() + (hours.length * 2);
        hourRef.current.scrollTop = middleSetIndex * 34;
      }
      if (minuteRef.current) {
        // Use 3rd copy (index 2) as middle position with 5 copies total
        const middleSetIndex = selectedDate.getMinutes() + (minutes.length * 2);
        minuteRef.current.scrollTop = middleSetIndex * 34;
      }
    };

    const getItemStyle = (itemIndex: number, scrollPosition: number) => {
      // Calculate fractional distance from scroll center (with sign) - use actual scroll position, not rounded
      const signedDistance = itemIndex - scrollPosition; // This is now fractional and smooth
      const distance = Math.abs(signedDistance);

      // MORE aggressive exponential curve for stronger cylindrical effect
      const normalizedDistance = Math.min(distance / 2.5, 1);
      const smoothFactor = Math.pow(normalizedDistance, 1.8); // Increased from 1.6 to 1.8 for gentler middle fade

      // STRONGER vertical squish - more dramatic
      // Make items 2 and 4 (distance ~1) slightly smaller
      const scaleY = 1 - (smoothFactor * 0.68); // Increased from 0.65 to 0.68 for more squish

      // MORE aggressive horizontal narrowing - stronger cylinder effect
      const angleFromCenter = (distance / 2.5) * (Math.PI / 2);
      const cosineScale = Math.cos(angleFromCenter);
      const scaleX = 0.50 + (cosineScale * 0.50);

      // Add STRONG perspective rotation tied directly to scroll position
      // This makes rotation smooth and prevents jumping when scroll stops
      // Items above center (negative signedDistance) tilt top away (positive rotateX)
      // Items below center (positive signedDistance) tilt bottom away (negative rotateX)
      const maxRotation = 25; // degrees
      // Use signedDistance directly (which is fractional) for smooth rotation
      const rotationDeg = -signedDistance * (maxRotation / 4) * smoothFactor;

      // Enhanced opacity fade - make items 2 and 4 lighter
      // Items at distance ~1 should be more faded
      const opacity = Math.max(1 - (smoothFactor * 0.85), 0.15); // Increased from 0.80 to 0.85

      // Enhanced brightness for depth - items 2 and 4 will be dimmer (lighter appearance)
      const brightness = 1 - (smoothFactor * 0.48); // Increased from 0.40 to 0.48 for more brightness reduction

      // Calculate grayscale for mid-grey effect on items 2 and 3
      // Items at distance 1.5-2.5 should have a grey tint
      let grayscale = 0;
      if (distance >= 1.5 && distance <= 2.5) {
        // Peak grey at distance 2
        const greyIntensity = 1 - Math.abs(distance - 2) / 0.5; // 0 at 1.5, 1 at 2, 0 at 2.5
        grayscale = greyIntensity * 0.4; // Max 40% grayscale
      }

      // Font weight based on rounded distance
      const roundedDistance = Math.round(distance);
      const fontWeight = roundedDistance === 0 ? '600' : roundedDistance <= 1 ? '500' : '400';

      return {
        opacity,
        transform: `scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}) rotateX(${rotationDeg.toFixed(2)}deg)`,
        fontWeight,
        filter: `brightness(${brightness.toFixed(2)}) grayscale(${grayscale.toFixed(2)})`,
        transition: 'none',
        transformOrigin: 'center center'
      };
    };

    const handleConfirm = () => {
      // Build final date from temp values including hour and minute
      const finalDate = new Date(tempYear, tempMonth, tempDay, tempHour, tempMinute, 0);

      setSelectedDate(finalDate);

      if (onChange) {
        onChange(finalDate);
      }
      setIsOpen(false);
      dayInitializedRef.current = false; // Reset for next open
    };

    const handleCancel = () => {
      setSelectedDate(value || new Date());
      setIsOpen(false);
      dayInitializedRef.current = false; // Reset for next open
    };

  useEffect(() => {
    if (isOpen) {
      // Initialize temp values from selectedDate when opening
      setTempMonth(selectedDate.getMonth());
      setTempDay(selectedDate.getDate());
      setTempYear(selectedDate.getFullYear());
      setTempHour(selectedDate.getHours());
      setTempMinute(selectedDate.getMinutes());

      scrollToValue();
      // Initialize scroll positions for smooth styling - use 3rd copy (index 2) of 5 copies
      const monthMiddle = selectedDate.getMonth() + (months.length * 2);
      const dayMiddle = (selectedDate.getDate() - 1) + (days.length * 2);
      const yearIndex = years.indexOf(selectedDate.getFullYear());
      const yearMiddle = yearIndex >= 0 ? yearIndex + (years.length * 2) : years.length * 2;
      const hourMiddle = selectedDate.getHours() + (hours.length * 2);
      const minuteMiddle = selectedDate.getMinutes() + (minutes.length * 2);

      setMonthScrollPosition(monthMiddle);
      setDayScrollPosition(dayMiddle);
      setYearScrollPosition(yearMiddle);
      setHourScrollPosition(hourMiddle);
      setMinuteScrollPosition(minuteMiddle);
    }
  }, [isOpen]);

  useEffect(() => {
    if (value) {
      setSelectedDate(value);
    }
  }, [value]);

  // Prevent body scroll when picker is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString(locale, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    };

    // Helper to render individual wheel
    const renderWheel = (type: 'month' | 'day' | 'year' | 'hour' | 'minute') => {
      if (type === 'month') {
        const handleMonthClick = (index: number) => {
          if (!monthRef.current) return;

          const itemHeight = 34;
          const actualCount = months.length;
          const actualIndex = index % actualCount;
          const element = monthRef.current;
          const currentScrollPos = element.scrollTop;

          // Find the closest occurrence among 5 copies
          const set1Pos = actualIndex * itemHeight;
          const set2Pos = (actualIndex + actualCount) * itemHeight;
          const set3Pos = (actualIndex + actualCount * 2) * itemHeight;
          const set4Pos = (actualIndex + actualCount * 3) * itemHeight;
          const set5Pos = (actualIndex + actualCount * 4) * itemHeight;

          const distances = [
            Math.abs(set1Pos - currentScrollPos),
            Math.abs(set2Pos - currentScrollPos),
            Math.abs(set3Pos - currentScrollPos),
            Math.abs(set4Pos - currentScrollPos),
            Math.abs(set5Pos - currentScrollPos)
          ];

          const minDistance = Math.min(...distances);
          const closestIndex = distances.indexOf(minDistance);

          let targetScrollPos: number;
          if (closestIndex === 0) targetScrollPos = set1Pos;
          else if (closestIndex === 1) targetScrollPos = set2Pos;
          else if (closestIndex === 2) targetScrollPos = set3Pos;
          else if (closestIndex === 3) targetScrollPos = set4Pos;
          else targetScrollPos = set5Pos;

          // Set flag to prevent boundary repositioning during animation
          isMonthAnimatingRef.current = true;

          // Use browser's native smooth scroll
          element.scrollTo({
            top: targetScrollPos,
            behavior: 'smooth'
          });

          setTempMonth(actualIndex);

          // Clear flag after animation completes
          setTimeout(() => {
            isMonthAnimatingRef.current = false;
          }, 500);
        };

        return (
          <div
            key="month"
            ref={monthRef}
            className="date-picker-wheel"
            onScroll={handleMonthScroll}
            style={{ flex: 2 }}
          >
            <div style={{ height: '67px' }} />
            {infiniteMonths.map((month, index) => (
              <div
                key={`${month}-${index}`}
                className="date-picker-item"
                style={getItemStyle(index, monthScrollPosition)}
                onClick={() => handleMonthClick(index)}
              >
                {month}
              </div>
            ))}
            <div style={{ height: '67px' }} />
          </div>
        );
      } else if (type === 'day') {
        const handleDayClick = (index: number) => {
          if (!dayRef.current) return;

          const itemHeight = 34;
          const actualIndex = index % days.length;

          // Get current scroll position
          const element = dayRef.current;
          const currentScrollPos = element.scrollTop;

          // Find the closest occurrence among 5 copies
          const set1Pos = actualIndex * itemHeight;
          const set2Pos = (actualIndex + days.length) * itemHeight;
          const set3Pos = (actualIndex + days.length * 2) * itemHeight;
          const set4Pos = (actualIndex + days.length * 3) * itemHeight;
          const set5Pos = (actualIndex + days.length * 4) * itemHeight;

          const distances = [
            Math.abs(set1Pos - currentScrollPos),
            Math.abs(set2Pos - currentScrollPos),
            Math.abs(set3Pos - currentScrollPos),
            Math.abs(set4Pos - currentScrollPos),
            Math.abs(set5Pos - currentScrollPos)
          ];

          const minDistance = Math.min(...distances);
          const closestIndex = distances.indexOf(minDistance);

          let targetScrollPos: number;
          if (closestIndex === 0) targetScrollPos = set1Pos;
          else if (closestIndex === 1) targetScrollPos = set2Pos;
          else if (closestIndex === 2) targetScrollPos = set3Pos;
          else if (closestIndex === 3) targetScrollPos = set4Pos;
          else targetScrollPos = set5Pos;

          lastDayScrollTopRef.current = targetScrollPos;

          // Use browser's native smooth scroll
          element.scrollTo({
            top: targetScrollPos,
            behavior: 'smooth'
          });

          const dayNumber = actualIndex + 1;
          setTempDay(dayNumber);
        };

        return (
          <div style={{ position: 'relative', flex: 0.8 }} key="day-container">
            <div
              key="day-main"
              ref={dayRef}
              className="date-picker-wheel"
              onScroll={handleDayScroll}
              style={{
                flex: 0.8,
                position: 'relative',
                zIndex: 1
              }}
            >
              <div style={{ height: '67px' }} />
              {infiniteDays.map((day, index) => (
                <div
                  key={`day-main-${day}-${index}-${days.length}`}
                  className="date-picker-item"
                  style={getItemStyle(index, dayScrollPosition)}
                  onClick={() => handleDayClick(index)}
                >
                  {day}
                </div>
              ))}
              <div style={{ height: '67px' }} />
            </div>
          </div>
        );
      } else if (type === 'year') {
        const handleYearClick = (index: number) => {
          if (!yearRef.current) return;

          const itemHeight = 34;
          const actualCount = years.length;
          const actualIndex = index % actualCount;

          // Get current scroll position
          const element = yearRef.current;
          const currentScrollPos = element.scrollTop;

          // Find the closest occurrence among 5 copies
          const set1Pos = actualIndex * itemHeight;
          const set2Pos = (actualIndex + actualCount) * itemHeight;
          const set3Pos = (actualIndex + actualCount * 2) * itemHeight;
          const set4Pos = (actualIndex + actualCount * 3) * itemHeight;
          const set5Pos = (actualIndex + actualCount * 4) * itemHeight;

          const distances = [
            Math.abs(set1Pos - currentScrollPos),
            Math.abs(set2Pos - currentScrollPos),
            Math.abs(set3Pos - currentScrollPos),
            Math.abs(set4Pos - currentScrollPos),
            Math.abs(set5Pos - currentScrollPos)
          ];

          const minDistance = Math.min(...distances);
          const closestIndex = distances.indexOf(minDistance);

          let targetScrollPos: number;
          if (closestIndex === 0) targetScrollPos = set1Pos;
          else if (closestIndex === 1) targetScrollPos = set2Pos;
          else if (closestIndex === 2) targetScrollPos = set3Pos;
          else if (closestIndex === 3) targetScrollPos = set4Pos;
          else targetScrollPos = set5Pos;

          // Set flag to prevent boundary repositioning during animation
          isYearAnimatingRef.current = true;

          // Use browser's native smooth scroll
          element.scrollTo({
            top: targetScrollPos,
            behavior: 'smooth'
          });

          setTempYear(years[actualIndex]);

          // Clear flag after animation completes
          setTimeout(() => {
            isYearAnimatingRef.current = false;
          }, 500);
        };

        return (
          <div
            key="year"
            ref={yearRef}
            className="date-picker-wheel"
            onScroll={handleYearScroll}
            style={{ flex: 0.8 }}
          >
            <div style={{ height: '67px' }} />
            {infiniteYears.map((year, index) => (
              <div
                key={`${year}-${index}`}
                className="date-picker-item"
                style={getItemStyle(index, yearScrollPosition)}
                onClick={() => handleYearClick(index)}
              >
                {year}
              </div>
            ))}
            <div style={{ height: '67px' }} />
          </div>
        );
      } else if (type === 'hour') {
        const handleHourClick = (index: number) => {
          if (!hourRef.current) return;

          const itemHeight = 34;
          const actualCount = hours.length;
          const actualIndex = index % actualCount;
          const element = hourRef.current;
          const currentScrollPos = element.scrollTop;

          const set1Pos = actualIndex * itemHeight;
          const set2Pos = (actualIndex + actualCount) * itemHeight;
          const set3Pos = (actualIndex + actualCount * 2) * itemHeight;
          const set4Pos = (actualIndex + actualCount * 3) * itemHeight;
          const set5Pos = (actualIndex + actualCount * 4) * itemHeight;

          const distances = [
            Math.abs(set1Pos - currentScrollPos),
            Math.abs(set2Pos - currentScrollPos),
            Math.abs(set3Pos - currentScrollPos),
            Math.abs(set4Pos - currentScrollPos),
            Math.abs(set5Pos - currentScrollPos)
          ];

          const minDistance = Math.min(...distances);
          const closestIndex = distances.indexOf(minDistance);

          let targetScrollPos: number;
          if (closestIndex === 0) targetScrollPos = set1Pos;
          else if (closestIndex === 1) targetScrollPos = set2Pos;
          else if (closestIndex === 2) targetScrollPos = set3Pos;
          else if (closestIndex === 3) targetScrollPos = set4Pos;
          else targetScrollPos = set5Pos;

          isHourAnimatingRef.current = true;

          element.scrollTo({
            top: targetScrollPos,
            behavior: 'smooth'
          });

          setTempHour(hours[actualIndex]);

          setTimeout(() => {
            isHourAnimatingRef.current = false;
          }, 500);
        };

        return (
          <div
            key="hour"
            ref={hourRef}
            className="date-picker-wheel"
            onScroll={handleHourScroll}
          >
            <div style={{ height: '67px' }} />
            {infiniteHours.map((hour, index) => (
              <div
                key={`${hour}-${index}`}
                className="date-picker-item"
                style={getItemStyle(index, hourScrollPosition)}
                onClick={() => handleHourClick(index)}
              >
                {hour.toString().padStart(2, '0')}
              </div>
            ))}
            <div style={{ height: '67px' }} />
          </div>
        );
      } else if (type === 'minute') {
        const handleMinuteClick = (index: number) => {
          if (!minuteRef.current) return;

          const itemHeight = 34;
          const actualCount = minutes.length;
          const actualIndex = index % actualCount;
          const element = minuteRef.current;
          const currentScrollPos = element.scrollTop;

          const set1Pos = actualIndex * itemHeight;
          const set2Pos = (actualIndex + actualCount) * itemHeight;
          const set3Pos = (actualIndex + actualCount * 2) * itemHeight;
          const set4Pos = (actualIndex + actualCount * 3) * itemHeight;
          const set5Pos = (actualIndex + actualCount * 4) * itemHeight;

          const distances = [
            Math.abs(set1Pos - currentScrollPos),
            Math.abs(set2Pos - currentScrollPos),
            Math.abs(set3Pos - currentScrollPos),
            Math.abs(set4Pos - currentScrollPos),
            Math.abs(set5Pos - currentScrollPos)
          ];

          const minDistance = Math.min(...distances);
          const closestIndex = distances.indexOf(minDistance);

          let targetScrollPos: number;
          if (closestIndex === 0) targetScrollPos = set1Pos;
          else if (closestIndex === 1) targetScrollPos = set2Pos;
          else if (closestIndex === 2) targetScrollPos = set3Pos;
          else if (closestIndex === 3) targetScrollPos = set4Pos;
          else targetScrollPos = set5Pos;

          isMinuteAnimatingRef.current = true;

          element.scrollTo({
            top: targetScrollPos,
            behavior: 'smooth'
          });

          setTempMinute(minutes[actualIndex]);

          setTimeout(() => {
            isMinuteAnimatingRef.current = false;
          }, 500);
        };

        return (
          <div
            key="minute"
            ref={minuteRef}
            className="date-picker-wheel"
            onScroll={handleMinuteScroll}
          >
            <div style={{ height: '67px' }} />
            {infiniteMinutes.map((minute, index) => (
              <div
                key={`${minute}-${index}`}
                className="date-picker-item"
                style={getItemStyle(index, minuteScrollPosition)}
                onClick={() => handleMinuteClick(index)}
              >
                {minute.toString().padStart(2, '0')}
              </div>
            ))}
            <div style={{ height: '67px' }} />
          </div>
        );
      }
    };

    return (
      <div className="form-group" ref={ref} style={{ position: 'relative' }}>
        {label && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>{label}</label>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCalendar(!showCalendar);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--blue-400)',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.color = 'var(--orange-500)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--blue-400)';
              }}
              title="Open calendar view"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M6 2V4M14 2V4M3 8H17M5 4H15C16.1046 4 17 4.89543 17 6V16C17 17.1046 16.1046 18 15 18H5C3.89543 18 3 17.1046 3 16V6C3C4.89543 3.89543 4 5 4Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Display Input */}
        <div
          onClick={() => setIsOpen(true)}
          className="date-picker-input"
        >
          <span style={{ color: selectedDate ? 'var(--blue-100)' : 'rgba(147, 197, 253, 0.5)' }}>
            {mode === 'time'
              ? `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`
              : mode === 'date'
              ? formatDate(selectedDate)
              : `${formatDate(selectedDate)} ${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`
            }
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            style={{ color: 'var(--blue-400)' }}
          >
            <path
              d="M6 2V4M14 2V4M3 8H17M5 4H15C16.1046 4 17 4.89543 17 6V16C17 17.1046 16.1046 18 15 18H5C3.89543 18 3 17.1046 3 16V6C3 4.89543 3.89543 4 5 4Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {error && <p className="error-message">{error}</p>}

        {/* Calendar Modal (Full Screen Overlay - Rendered at Page Level via Portal) */}
        {showCalendar && typeof window !== 'undefined' && createPortal(
          <div
            className="date-picker-overlay"
            onClick={() => setShowCalendar(false)}
            style={{ zIndex: 10000 }}
          >
            <div
              className="date-picker-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '400px', margin: 'auto' }}
            >
              <Calendar
                value={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date);
                  if (onChange) onChange(date);
                  setShowCalendar(false);
                }}
                onClose={() => setShowCalendar(false)}
                mode={mode}
                minDate={minDate}
                maxDate={maxDate}
              />
            </div>
          </div>,
          document.body
        )}

        {/* iOS-style Picker Modal */}
        {isOpen && (
          <div
            className="date-picker-overlay"
            onClick={handleCancel}
            onTouchMove={(e) => e.preventDefault()}
            onWheel={(e) => e.preventDefault()}
          >
            <div className="date-picker-modal" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="date-picker-header">
                <button onClick={handleCancel} className="date-picker-button">
                  Cancel
                </button>
                <h3 className="date-picker-title">
                  {mode === 'time' ? 'Select Time' : mode === 'date' ? 'Select Date' : 'Select Date & Time'}
                </h3>
                <button onClick={handleConfirm} className="date-picker-button date-picker-button-primary">
                  Done
                </button>
              </div>

              {/* Picker Wheels */}
              <div className="date-picker-wheels">
                {/* Clickable highlight area to submit date */}
                <div
                  className="date-picker-highlight"
                  onClick={handleConfirm}
                  style={{ cursor: 'pointer' }}
                  title="Click to select"
                />

                {/* Render date wheels in locale-specific order (only if mode is 'date' or 'datetime') */}
                {(mode === 'date' || mode === 'datetime') && wheelOrder.map((wheelType) => renderWheel(wheelType as 'month' | 'day' | 'year'))}

                {/* Separator (only if showing both date and time) - space between date and time */}
                {mode === 'datetime' && <div style={{ width: '20px' }}></div>}

                {/* Time wheels (HH:MM) - only if mode is 'time' or 'datetime' */}
                {(mode === 'time' || mode === 'datetime') && (
                  <>
                    {renderWheel('hour' as any)}
                    {/* Colon separator between hour and minute */}
                    <div style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-400)', fontSize: '1.5rem', fontWeight: '600' }}>:</div>
                    {renderWheel('minute' as any)}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export default DatePicker;

