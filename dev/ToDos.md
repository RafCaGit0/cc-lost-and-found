# Implementation Checklist

Status: Spec locked. Ready to build.

---

## Phase 0 — Project Setup (Do Once)

- [ ] Scaffold React + Vite app in repo root:
  ```bash
  npm create vite@latest . -- --template react
  npm install
  ```
- [ ] Install dependencies:
  ```bash
  npm install aws-amplify @aws-amplify/ui-react react-router-dom
  ```
- [ ] Verify `.gitignore` includes: `src/aws-exports.js`, `.env`, `dist/`
- [ ] Create branch structure: `main`, `dev`. Set Amplify to deploy from `main`.

---

## Phase 1 — AWS Backend (Build First, UI Second)

### 1.1 Cognito
- [ ] Create Cognito User Pool in AWS Console (region: `ap-east-2`)
  - Sign-in: Email
  - Self-registration **enabled** — students sign up themselves. Domain enforcement is handled by the pre-sign-up Lambda, not by disabling signup.
- [ ] Write pre-sign-up Lambda trigger (`lambdas/pre_signup.py`):
  - Extract domain from `event["request"]["userAttributes"]["email"]`
  - If domain ≠ `@nycu.edu.tw` → raise exception with a clear message → Cognito rejects signup
  - Only `@nycu.edu.tw` is valid. No other domains.
- [ ] Attach Lambda trigger to User Pool
- [ ] Create `Admins` User Group in Cognito
- [ ] Write `scripts/bootstrap_admin.py`:
  - `AdminCreateUser` → `AdminAddUserToGroup("Admins")`
  - Run once to create first admin account
- [ ] Create Cognito App Client (for frontend SDK)

### 1.2 DynamoDB
- [ ] Create `Items` table:
  - Partition Key: `id` (String)
  - Enable on-demand billing (no provisioned capacity needed)
- [ ] **Sorting:** `Scan` returns unordered data. Do NOT rely on DynamoDB for ordering. Sort in Python inside the Lambda before returning: `items.sort(key=lambda x: x['timestamp'], reverse=True)`. Fine for MVP scale.

### 1.3 S3
- [ ] Create S3 bucket for images (`nycu-lost-found-images-<suffix>`)
- [ ] Block all public access (no exceptions)
- [ ] Add CORS policy to allow PUT from `localhost:5173` and Amplify domain
- [ ] Configure bucket policy: allow Lambda IAM role to `PutObject` and `GetObject` only
- ~~[ ] S3 Lifecycle Rule for orphaned uploads~~ → moved to Phase 4 (negligible cost at MVP scale)

### 1.4 Lambda Functions (Python)
Write one file per endpoint. Keep each function small and focused.

> ⚠️ **CORS Rule:** Every Lambda response — including errors — MUST include these headers, or the browser will show a misleading "CORS Error" that hides the real error:
> ```python
> CORS_HEADERS = {
>     "Access-Control-Allow-Origin": "*",
>     "Access-Control-Allow-Headers": "Content-Type,Authorization"
> }
> # Use in every return: return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps(data)}
> ```

- [ ] `get_items.py` — scan DynamoDB → Python sort by `timestamp` desc → generate pre-signed GET URL for each `imageKey` → return list. Support optional query params `?postType=` and `?status=`.
- [ ] `get_item.py` — get single item by `id` → generate pre-signed GET URL for `imageKey` if present
- [ ] `create_item.py` — validate input and write to DynamoDB. **Server-side validation required:**
  - `authorEmail` must be taken from the JWT, never from the request body
  - `postType` must be `FOUND` or `LOST`
  - `status` must be valid for the given `postType` (FOUND: `LEFT_AT_SCENE`/`WITH_FINDER`/`AT_OFFICE`; LOST: always starts as `OPEN`)
  - `location` must be one of the predefined campus locations (validate against an allowed list)
  - Generate UUID + epoch timestamp server-side. Set `updatedAt = timestamp` on creation. Store `imageKey`, NOT a URL.
- [ ] `update_item.py` — verify caller is author or admin (decode JWT `cognito:groups`). **Validation:**
  - Re-check new status is valid for the item's `postType`
  - Never allow `authorEmail` or `postType` to be changed after creation
  - Always update `updatedAt` to current epoch ms
- [ ] `delete_item.py` — verify caller is author or admin, delete DynamoDB record, delete S3 object by `imageKey` if present
- [ ] `resolve_item.py` — set `status: RESOLVED`, update `updatedAt`; hook for SES in Phase 2. **SES must only fire when transitioning TO `RESOLVED` (i.e. `existing_status != 'RESOLVED'`) — not on re-resolves.**
- [ ] `get_upload_url.py` — validate `contentType` is one of `[image/jpeg, image/png, image/webp]` (return `400` otherwise) → generate pre-signed S3 PUT URL → return `{ uploadUrl, imageKey }`
- [ ] `admin_list_users.py` — call Cognito `ListUsers`, admin only
- [ ] `admin_promote_user.py` — call `AdminAddUserToGroup("Admins")`, admin only

### 1.5 API Gateway
- [ ] Create REST API
- [ ] Add Cognito Authorizer (validates JWT on every route)
- [ ] Wire routes to Lambda functions (see API contract in Architecture Guide)
- [ ] Enable CORS on all routes in API Gateway console (handles OPTIONS preflight)
- [ ] Note: API Gateway CORS config handles the preflight, but each Lambda must still return CORS headers in its own response body — both are required.
- [ ] Deploy to `prod` stage

---

## Phase 2 — Frontend (React + Vite)

### 2.1 Auth
- [x] Configure Amplify in `main.jsx` with Cognito User Pool + App Client IDs
- [x] Wrap app in `<Authenticator>` from `@aws-amplify/ui-react` — gives login/signup UI for free
- [x] After login, read JWT and check `cognito:groups` → set `isAdmin` in app state

### 2.2 Pages / Views
- [x] **Home / Feed:** List all posts, newest first. Toggle between FOUND and LOST tabs. Each card shows: title, location, status badge, image thumbnail, "Email Poster" button.
- [x] **Create Post:** Form with postType toggle, title, description, location dropdown, status dropdown (FOUND only), optional image upload.
- [ ] **Post Detail:** Full post view. Show all fields. "Email Poster" (`mailto:` link). Author + Admin see "Edit Status" and "Delete" buttons.
- [ ] **Admin Panel:** List users, promote to admin. (Simple table, minimal UI.)

### 2.3 Campus Locations Dropdown
Hardcode this list (add/remove as needed):
```
Library, Engineering Building 1, Engineering Building 3,
Student Cafeteria, Student Activity Center, Admin Office (Lost & Found),
Gymnasium, Dormitory Area, Main Gate, Other
```

### 2.4 Image Upload Flow
- [x] On file select: call `POST /items/upload-url` with `{ filename, contentType }` → receive `{ uploadUrl, imageKey }`
- [x] PUT file directly to S3 using `uploadUrl` (plain fetch/axios PUT, no auth header)
- [x] Store `imageKey` (not the URL) in form state → include in `POST /items` body on submit
- [x] When rendering images, use the `imageUrl` field returned by the read endpoints (pre-signed GET URL, expires 15 min)

---

## Phase 3 — Polish & Deploy

- [ ] Connect GitHub repo to AWS Amplify Hosting (auto-deploy from `main`)
- [ ] Set environment variables in Amplify console (Cognito IDs, API URL)
- [ ] End-to-end test all flows (A, B, C, D from spec)
- [ ] Test pre-sign-up Lambda: attempt signup with `@gmail.com` → should be rejected
- [ ] Test admin promotion and admin-only delete

---

## Phase 4 — Stretch Goals (If Time Permits)

- [ ] **Rekognition:** Lambda triggered on S3 upload → `detect_labels` → update DynamoDB item with `tags` field
- [ ] **SES:** `resolve_item.py` sends email to `authorEmail` on resolve
- [ ] **Search/Filter:** Add filter bar to Home feed (by location, postType, status)
- [ ] **Campus Map:** Leaflet.js map, plot item pins by location value
- [ ] **S3 Lifecycle Rule:** Delete untagged objects older than 7 days to clean up orphaned uploads

---

## Phase 5 — Post-Launch Hardening (MVP-Friendly)

- [ ] **Operational hygiene**: Confirm Amplify env vars are set (`VITE_API_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_APP_CLIENT_ID`) and add a simple "health check" endpoint to verify API + auth.
- [ ] **Abuse guardrails**: Add a soft image size cap in the client (e.g., 5–10MB) and show a friendly error; log oversize attempts server-side.
- [ ] **Visibility & audit**: Log `sub` and email on write actions (create, resolve, delete) so you can trace misuse.
- [ ] **Basic rate limiting**: Add an API Gateway usage plan or WAF rule with conservative limits (mostly click-ops, no code).
- [ ] **Email privacy**: Replace mailto with a "contact requester" modal that reveals email only after user intent.
- [ ] **Backup & retention**: Turn on DynamoDB PITR and set S3 lifecycle rules to expire unused images after N days.