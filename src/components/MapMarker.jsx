import L from 'leaflet';

const TYPE_BORDER_COLORS = {
  LOST: '#ef4444',
  FOUND: '#3b82f6',
};

const TYPE_BG_LIGHT = {
  LOST: '#fecaca',
  FOUND: '#bfdbfe',
};

const PACKAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>`;

export function createItemIcon(item) {
  const color = TYPE_BORDER_COLORS[item.postType] || '#6b7280';
  const bgLight = TYPE_BG_LIGHT[item.postType] || '#e5e7eb';

  let html;

  if (item.imageUrl) {
    html = `
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid ${color};
        background: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img
          src="${item.imageUrl}"
          alt=""
          style="
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
          "
        />
      </div>
    `;
  } else {
    html = `
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid ${color};
        background: ${bgLight};
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color};
        ">
          ${PACKAGE_SVG}
        </div>
      </div>
    `;
  }

  return new L.DivIcon({
    className: 'custom-map-icon',
    html,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}
