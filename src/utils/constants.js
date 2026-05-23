// Shared constants for the NYCU Lost & Found application.
// Single source of truth for locations, statuses, and configuration.

// Campus locations for dropdown — Admin Office first, rest alphabetical
export const LOCATIONS = [
  'Admin Office (Lost & Found)',
  'Dormitory Area',
  'Engineering Building 1',
  'Engineering Building 3',
  'Gymnasium',
  'Library',
  'Main Gate',
  'Other',
  'Student Activity Center',
  'Student Cafeteria',
];

// Valid initial statuses when creating a new post
export const VALID_INITIAL_STATUSES = {
  FOUND: ['LEFT_AT_SCENE', 'WITH_FINDER', 'AT_OFFICE'],
  LOST: ['OPEN'],
};

// All valid statuses per post type (includes RESOLVED for updates)
export const VALID_STATUSES = {
  FOUND: ['LEFT_AT_SCENE', 'WITH_FINDER', 'AT_OFFICE', 'RESOLVED'],
  LOST: ['OPEN', 'RESOLVED'],
};

// Human-readable status labels
export const STATUS_LABELS = {
  LEFT_AT_SCENE: 'Left at Scene',
  WITH_FINDER: 'With Finder',
  AT_OFFICE: 'At Office',
  OPEN: 'Open',
  RESOLVED: 'Resolved',
};

// Status descriptions shown in create post form
export const STATUS_DESCRIPTIONS = {
  LEFT_AT_SCENE: 'I left it where I found it',
  WITH_FINDER: 'I kept it with me',
  AT_OFFICE: 'Turned in to Lost & Found Office',
};

// Color mappings
export const TYPE_COLORS = {
  LOST: '#ef4444',
  FOUND: '#3b82f6',
};

export const STATUS_COLORS = {
  RESOLVED: '#10b981',
  LOST: '#ef4444',
  FOUND: '#3b82f6',
};

// Approximate time ranges for incident date
export const TIME_RANGES = [
  { value: '', label: 'Not sure' },
  { value: 'morning', label: 'Morning (6:00 - 12:00)' },
  { value: 'afternoon', label: 'Afternoon (12:00 - 18:00)' },
  { value: 'evening', label: 'Evening (18:00 - 24:00)' },
  { value: 'night', label: 'Night (0:00 - 6:00)' },
];

// Time range display labels (shorter, for display contexts)
export const TIME_RANGE_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};
