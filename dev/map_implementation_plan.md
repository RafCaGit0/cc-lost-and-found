# Campus Map Implementation Plan

Based on your brainstorming, this map will be the centerpiece of the application. It needs to be beautiful, highly functional, and intuitive.

## 1. Technology Choice
**Recommendation: Leaflet.js (via `react-leaflet`)**
* **Why not Google Maps?** Google Maps requires a billing account, API keys, and has strict usage limits. It can also look a bit generic and "corporate."
* **Why Leaflet?** It is 100% free, open-source, requires NO API keys (we can use OpenStreetMap or styled map tiles like CartoDB), and it is extremely fast and lightweight. 
* **Alternative (Mapbox):** If you want a highly customized, ultra-modern "dark mode" 3D map, Mapbox is the industry leader, but it requires an API key and managing a free tier. Leaflet is the safest, easiest bet for a university project.

## 2. Pin Placement: Free-form vs. Premade
Your idea to let users place pins freely is brilliant. Instead of relying on a hardcoded dropdown ("Engineering Building 1"), the user experience should be:
1. When creating a post, the user sees a mini-map.
2. They click the exact spot they lost/found the item.
3. We save the precise `lat` and `lng` coordinates to DynamoDB.
*Note: Because DynamoDB is NoSQL (schema-less), we don't even need a database migration! We just start saving `{ lat: 24.787... , lng: 120.99... }` with new posts.*

## 3. UI/UX & Moodboard Inspiration
To get a feel for the design we are aiming for, look at:
* **Airbnb's Map Search:** Clean, pill-shaped floating search bars over the map, with custom markers that expand on click.
* **Snapchat Map / Zenly:** Items are represented by floating bubbles containing the image thumbnail.
* **Our Target UI:** 
  * The Map takes up the full background of the landing page.
  * Floating, glassmorphism Search/Filter bar at the top center.
  * Floating toggle at the bottom to switch between "Map View" and "List View".
  * Markers on the map will be custom circular avatars of the uploaded item image!

## 4. Scalability (Other Campuses)
We will center the map exactly on NYCU Guangfu Campus by default.
Because we are saving `lat/lng` coordinates, expanding to Boai or Yangming campus requires zero database changes. We just add a "Jump to Campus" button later that simply pans the map camera to the other campus coordinates!

---

## Technical Implementation Steps

### Step 1: Data Structure Update
* Update `App.jsx` and `api.js` to handle `lat` and `lng` fields during `POST /items` and `PUT /items`. (We can still keep the text `location` field as an optional descriptive text).

### Step 2: Install Map Dependencies
```bash
npm install leaflet react-leaflet
```

### Step 3: Create the Map Components
* **`InteractiveMap.jsx`**: The main landing page component. Fetches all items and renders `Marker` components.
* **`LocationPickerMap.jsx`**: A smaller map used inside the "Create Post" form allowing users to click to drop a pin and set state.

### Step 4: UI Overhaul
* Reorganize `App.jsx` routing. `/` becomes the Map. `/list` becomes the old feed.
* Implement custom Leaflet icons using the `item.imageUrl` so the pins look like the items themselves.
* Build the floating Filter Bar (Post Type, Status, Text Search).

### Step 5: Popups
* When clicking a custom image pin, a glassmorphism popup appears directly over the map showing the Title, Status, and "Contact" button.
