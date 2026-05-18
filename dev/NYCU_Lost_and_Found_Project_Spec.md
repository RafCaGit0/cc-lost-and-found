# NYCU Campus Lost & Found Platform
**Project Scope & Specification — Revised**

---

## 1. Core Purpose
A digital bulletin board for NYCU Guangfu campus that eliminates the need to physically visit the Lost & Found office just to check if an item is there. Users can post found or lost items and coordinate returns via email — no in-app messaging needed.

---

## 2. Target Audience & Access
- **Users:** NYCU Students and Staff only.
- **Authentication:** AWS Cognito User Pools. A **pre-sign-up Lambda trigger** rejects any email not ending in `@nycu.edu.tw` at the Cognito level — no non-NYCU account can be created.

---

## 3. User Flows

All flows revolve around two post types: **FOUND** (someone found an item) and **LOST** (someone lost an item).

### Flow A — Found item, brought to office (most formal)
1. Finder picks up item, brings it to the Division of Student Assistance (Lost & Found office).
2. Finder (or admin) posts it on the platform with `status: AT_OFFICE`.
3. Owner sees the post and either emails the finder or walks to the office.
4. Admin verifies the match and marks the post `RESOLVED`.
5. *(Phase 2)* Finder receives an automated email notification via SES.

### Flow B — Found item, left at scene
1. Finder sees item, doesn't take it, posts it with `status: LEFT_AT_SCENE` and the campus location.
2. Owner sees the post and goes to retrieve it.
3. Owner contacts the finder via the `mailto:` link to confirm pickup.
4. Finder marks post `RESOLVED`.

### Flow C — Found item, taken by finder
1. Finder picks up item, posts it with `status: WITH_FINDER`.
2. Owner contacts finder via `mailto:` link.
3. They arrange handoff privately (in person, or finder drops it off somewhere).
4. Finder marks post `RESOLVED`.

### Flow D — Lost item post
1. User loses item, creates a `LOST` post with description and last known location.
2. Someone who finds or knows the item contacts the owner via `mailto:` link.
3. They resolve privately (handoff, drop-off, or office).
4. Owner marks the post `RESOLVED`.

---

## 4. Item Status Rules

| Post Type | Valid Statuses |
| :--- | :--- |
| `FOUND` | `LEFT_AT_SCENE`, `WITH_FINDER`, `AT_OFFICE`, `RESOLVED` |
| `LOST` | `OPEN`, `RESOLVED` |

- Status is set at creation and can be updated only by the **post author** or an **admin**.
- `RESOLVED` posts remain visible and can be re-opened by the author or an admin (e.g. to fix an accidental resolve). Permission model is consistent: author and admin have symmetric rights on all status changes.
- `authorEmail` and `postType` are immutable after creation — `update_item.py` must never allow these fields to be changed.

---

## 5. Edge Cases — Decided

| Case | Decision |
| :--- | :--- |
| No one contacts the poster | Post stays `OPEN` indefinitely. Acceptable. |
| Item disappears / picked up by wrong person | App is a bulletin board, not a custody chain. Finder deletes or resolves the post manually. UI note: *"Please mark as resolved once the item is returned."* |
| Owner picks up item silently (LEFT_AT_SCENE) without notifying finder | Acceptable. Finder resolves post when they revisit the location or after a reasonable time. No enforcement needed. |
| In-app comments | ❌ Out of scope. The `mailto:` link handles all communication. |
| "I'm the owner" claim button | ❌ Out of scope. Creates social engineering risk. NYCU email thread is the proof of ownership. |

---

## 6. Key Features

- **Dual-Post System:** `FOUND` posts (item found) and `LOST` posts (item missing).
- **Simple Communication:** No in-app chat. Each post shows an "Email the Poster" button that opens a `mailto:` link to their verified NYCU address. Maybe next phase feature to send preset messages to the poster? 
- **Status Management:** Post authors and admins can update item status via a dropdown.
- **Image Upload:** Optional photo for both FOUND and LOST posts. Uploaded directly to S3 via a pre-signed PUT URL. The S3 **object key** (not a public URL) is stored in DynamoDB. When a post is fetched, Lambda generates a short-lived pre-signed GET URL on the fly — the bucket is fully private, so images are never directly accessible without a valid signed request.
- **Location Dropdown:** Predefined campus locations (Library, Eng Bldg 3, Cafeteria, Admin Office, etc.). On LOST posts the label reads "Where did you last see it?" On FOUND posts: "Where did you find/leave it?"
- **Admin Role:** Admins can delete or resolve any post. Admins can promote other users to admin via the app.

---

## 7. DynamoDB Schema

**Table Name:** `Items`

| Attribute | Type | Notes |
| :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key |
| `postType` | String | `"FOUND"` or `"LOST"` |
| `title` | String | Short description (e.g., "Blue Hydroflask") |
| `description` | String | Details, context, any pickup arrangements |
| `location` | String | Predefined campus location from dropdown |
| `status` | String | FOUND: `LEFT_AT_SCENE`, `WITH_FINDER`, `AT_OFFICE`, `RESOLVED`. LOST: `OPEN`, `RESOLVED` |
| `imageKey` | String (optional) | S3 object key (e.g. `uploads/abc-123.jpg`). Lambda generates a pre-signed GET URL at query time — no public URLs stored. |
| `authorEmail` | String | Cognito email of post creator |
| `timestamp` | Number | Epoch ms (creation time), used for sorting newest-first |
| `updatedAt` | Number | Epoch ms, set on every write. Equals `timestamp` at creation. |

---

## 8. Admin System

- **Cognito User Group:** `"Admins"` group in Cognito User Pool.
- **Detection:** The JWT token issued by Cognito includes a `cognito:groups` claim. Lambda functions and the frontend both read this claim to determine admin privileges.
- **Bootstrap:** A one-time local script (`scripts/bootstrap_admin.py`) uses the AWS SDK to create the first admin user and add them to the `Admins` group directly — bypassing normal signup. This script is never committed to the repo with credentials.
- **Promotion:** Admins can promote other existing users via the app UI, which calls an admin-only API endpoint that adds the target user to the `Admins` Cognito group.

---

## 9. Phase 2 — Planned Enhancements

### Campus Map (Core Phase 2 — Build This)
A Leaflet.js map of NYCU campus is the primary visual goal for Phase 2. Scope is deliberately fixed-pin:
- Each dropdown location (Library, Cafeteria, etc.) has a **hardcoded lat/lng coordinate**.
- When the map view is open, all active posts are shown as **clickable pins** on the map.
- Clicking a pin opens a small popup with the item title, status badge, and a link to the full post.
- No user-draggable pins in MVP — location is still set via the dropdown, the map just visualizes it.
- Use Leaflet.js (free, no API key needed) with OpenStreetMap tiles.

**Phase 3 map upgrade (if time permits):** Replace the dropdown with a map click — user places a pin directly on the campus map to set a precise location. Stores lat/lng in DynamoDB instead of a string.

### Search & Filter
Filter bar on the Home feed: by `postType`, `status`, `location`, or date range. Pure frontend filtering on the already-fetched list — no backend changes needed.

### AI Image Tagging (Amazon Rekognition)
S3 upload triggers a Lambda → `detect_labels` → saves tags (e.g., `["Electronics", "Blue", "Backpack"]`) as a DynamoDB `tags` String Set. Enables tag-based search. ~20 lines of Python. Will impress the professor.

### Automated Notifications (Amazon SES)
When an admin marks a post `RESOLVED`, Lambda emails the post author: *"Thank you — the item has been returned to its owner."* Hook point already in `resolve_item.py`.