import { useEffect, useState } from 'react';
import { useLanguage } from '../providers/LanguageProvider';

// Special "Happy {Day}" greetings take priority over the plain time-of-day
// greeting on these days — Friday/Saturday/Sunday always, and Monday only
// during the morning window (to avoid "Happy Monday" showing at 11pm).
function computeGreetingKey(date) {
  const hour = date.getHours();
  const day = date.getDay(); // 0 = Sunday ... 6 = Saturday

  if (day === 5) return 'greeting.day.friday';
  if (day === 6) return 'greeting.day.saturday';
  if (day === 0) return 'greeting.day.sunday';
  if (day === 1 && hour >= 5 && hour < 12) return 'greeting.day.monday';

  if (hour >= 5 && hour < 12) return 'greeting.morning';
  if (hour >= 12 && hour < 17) return 'greeting.afternoon';
  if (hour >= 17 && hour < 21) return 'greeting.evening';
  return 'greeting.night';
}

// Returns the current greeting string (without the trailing comma),
// re-evaluated every minute so it naturally rolls over at hour and
// midnight boundaries without needing a manual refresh.
export function useGreeting() {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return t(computeGreetingKey(now));
}