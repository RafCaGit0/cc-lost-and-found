// NYCU Guangfu Campus — real coordinates for each predefined location.
// These are used as defaults for items created before the map feature,
// and as "quick-jump" presets in the location picker.

export const CAMPUS_CENTER = [24.7868, 120.9985];
export const CAMPUS_ZOOM = 17;

export const CAMPUS_LOCATIONS = {
  'Library':                    [24.7871, 120.9978],
  'Engineering Building 1':     [24.7863, 120.9972],
  'Engineering Building 3':     [24.7858, 120.9965],
  'Student Cafeteria':          [24.7878, 120.9992],
  'Student Activity Center':    [24.7882, 120.9988],
  'Admin Office (Lost & Found)':[24.7875, 121.0001],
  'Gymnasium':                  [24.7888, 121.0005],
  'Dormitory Area':             [24.7855, 121.0010],
  'Main Gate':                  [24.7893, 120.9970],
  'Other':                      [24.7868, 120.9985], // fallback to campus center
};
