import { TIME_RANGE_LABELS } from './constants';

// Format a creation timestamp (epoch ms) as a relative time string.
// e.g. "Just now", "5m ago", "2h ago", "Yesterday", "May 20"
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';

  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  // Older than a week — show date
  const date = new Date(timestamp);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

// Format an incident date for display on item cards.
// Input: ISO date string "2026-05-23" or "2026-05-23" + timeRange "afternoon"
// Output: "May 23, 2026" or "May 23, 2026 (Afternoon)"
export function formatIncidentDate(incidentDate, incidentTimeRange) {
  if (!incidentDate) return null;

  try {
    // Parse the ISO date string (YYYY-MM-DD)
    const parts = incidentDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let formatted = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

    if (incidentTimeRange && TIME_RANGE_LABELS[incidentTimeRange]) {
      formatted += ` (${TIME_RANGE_LABELS[incidentTimeRange]})`;
    }

    return formatted;
  } catch {
    return incidentDate; // fallback to raw string
  }
}

// Format an incident date for short display on item cards.
// Output: "May 23" or "May 23, 2025" (if different year)
export function formatIncidentDateShort(incidentDate) {
  if (!incidentDate) return null;

  try {
    const parts = incidentDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    const currentYear = new Date().getFullYear();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (year === currentYear) {
      return `${monthNames[date.getMonth()]} ${date.getDate()}`;
    }
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${year}`;
  } catch {
    return incidentDate;
  }
}

// Get today's date as ISO string (YYYY-MM-DD) for date input default value
export function getTodayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
