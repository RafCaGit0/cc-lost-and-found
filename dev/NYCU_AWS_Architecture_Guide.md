# NYCU Campus Lost & Found Platform
**Cloud Architecture & AWS Setup Guide — Revised**

---

## 1. Architecture Philosophy
Serverless microservices on AWS. No EC2. No always-on servers. Zero cost when idle, auto-scales under load, and minimal ops overhead.

**Target Region:** `ap-east-2` (Asia Pacific — Taipei)

---

## 2. AWS Service Breakdown

| Layer | Service | Role |
| :--- | :--- | :--- |
| Frontend Hosting | AWS Amplify Hosting | Auto-deploys React/Vite app from GitHub `main` branch on every push |
| Authentication | Amazon Cognito (User Pools) | Signup/login, JWT token issuance, `@nycu.edu.tw` email enforcement via pre-sign-up Lambda, `Admins` group for role management |
| API | Amazon API Gateway (REST) + AWS Lambda (Python) | Secure REST endpoints; validates Cognito JWT before passing requests to Lambda handlers |
| Database | Amazon DynamoDB | NoSQL store for all item metadata |
| Object Storage | Amazon S3 | Stores uploaded images; access via pre-signed URLs |
| Email (Phase 2) | Amazon SES | Automated notification emails on status change to `RESOLVED` |
| AI Tagging (Phase 2) | Amazon Rekognition | Auto-label images on S3 upload via Lambda trigger |

---

## 3. API Contract

**Base URL:** `https://<api-id>.execute-api.ap-east-2.amazonaws.com/prod`

All endpoints require a valid Cognito JWT in the `Authorization` header (enforced by API Gateway Cognito Authorizer). Exceptions noted.

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/items` | Any user | List all posts, sorted newest-first. Optional query params: `?postType=FOUND`, `?status=OPEN` |
| `GET` | `/items/{id}` | Any user | Get a single post by ID |
| `POST` | `/items` | Any user | Create a new post (FOUND or LOST) |
| `PUT` | `/items/{id}` | Author or Admin | Update post status or details |
| `DELETE` | `/items/{id}` | Author or Admin | Delete a post |
| `POST` | `/items/{id}/resolve` | Author or Admin | Shortcut to mark a post as RESOLVED (triggers SES in Phase 2) |
| `POST` | `/items/upload-url` | Any user | Request a pre-signed S3 PUT URL for image upload. Returns `{ uploadUrl, imageKey }`. |
| `GET` | `/admin/users` | Admin only | List Cognito users (for admin promotion UI) |
| `POST` | `/admin/promote` | Admin only | Add a user to the `Admins` Cognito group |

> **Note on `/resolve`:** Functionally a subset of `PUT /items/{id}`, but kept as a dedicated endpoint for a clean SES hook in Phase 2.

> **Admin check:** Lambda reads the `cognito:groups` claim from the decoded JWT. If `"Admins"` is not in the list, return `403 Forbidden`.

---

## 4. Image Upload Flow (Pre-Signed URL Pattern)

The S3 bucket is **fully private** (Block All Public Access enabled). Images are never accessible via a static public URL. Pre-signed URLs are used for both upload and read.

**Upload (PUT):**
1. Frontend calls `POST /items/upload-url` with `{ filename, contentType }`.
2. Lambda verifies the JWT, validates `contentType` is one of `[image/jpeg, image/png, image/webp]` — returns `400` otherwise. Frontend also validates file type and size (≤ 5 MB) before calling this endpoint.
3. Lambda generates a **pre-signed S3 PUT URL** (valid 5 min) and returns it along with the `imageKey` (the S3 object path).
4. Frontend uploads the file directly to S3 using that URL (plain HTTP PUT — no Lambda in the data path).
5. Frontend includes the `imageKey` (not a URL) in the subsequent `POST /items` body.

**Read (GET):**
1. When a Lambda returns item data from DynamoDB, if an `imageKey` exists it calls `generate_presigned_url("get_object", imageKey, ExpiresIn=900)` (15 min).
2. The signed GET URL is attached to the response as `imageUrl`.
3. Frontend renders the image using this URL. It expires and cannot be shared or scraped permanently.

This keeps Lambda payloads small, avoids the 6MB limit, and ensures sensitive photos (ID cards, wallets) are protected.

---

## 5. Data Flow (Full Request Lifecycle)

```
[Browser]
    |
    |-- Auth: POST credentials --> [Cognito]
    |                                  |-- Returns JWT token
    |
    |-- API call + JWT ---------> [API Gateway]
    |                                  |-- Validates JWT via Cognito Authorizer
    |                                  |-- Routes to Lambda
    |                                       |-- Reads/writes [DynamoDB]
    |                                       |-- Issues pre-signed PUT URL for upload
    |                                       |-- Issues pre-signed GET URL for image reads
    |
    |-- Image upload (direct) --> [S3] (private bucket, via pre-signed PUT URL)
    |
    |-- Image render (direct) --> [S3] (private bucket, via pre-signed GET URL, expires 15min)
```

---

## 6. Cognito Configuration

- **Sign-in method:** Email
- **Password policy:** Cognito defaults (sufficient for MVP)
- **Pre-sign-up Lambda trigger:** Rejects signup if email domain ≠ `@nycu.edu.tw`. Returns an error to Cognito before the user is created.
- **User Group:** `Admins` — created manually in Cognito console or via bootstrap script.
- **JWT claims used:**
  - `email` — stored as `authorEmail` in DynamoDB
  - `cognito:groups` — checked for admin privileges in Lambda

---

## 7. Admin Bootstrap

A one-time script (`scripts/bootstrap_admin.py`) run locally by a developer:
1. Creates the first admin user in Cognito via `AdminCreateUser` (bypasses pre-sign-up trigger and email verification).
2. Sets a temporary password and forces password reset on first login.
3. Adds user to the `Admins` Cognito group via `AdminAddUserToGroup`.

The script reads credentials from the local AWS SSO session (`aws login`). **Never hardcode credentials. Never commit this script with any account-specific values.**

---

## 8. Security Checklist

- [x] Root account MFA enabled
- [x] Billing alarm: $10 zero-spend budget alert
- [x] IAM Identity Center (SSO): developers use `aws login` for temporary credentials — no long-term access keys
- [x] `.gitignore`: `src/aws-exports.js`, `.env`, `scripts/secrets*`
- [ ] S3 bucket: block all public access; images served via pre-signed URLs or CloudFront (not public ACLs)
- [ ] API Gateway: Cognito authorizer on all routes except none (all routes are authenticated)
- [ ] Lambda IAM roles: least privilege — each function only has permissions for the specific DynamoDB table and S3 bucket it needs

---

## 9. Local Development Workflow

1. `aws login` — refresh SSO credentials (region: `ap-east-2`)
2. `git pull origin dev`
3. `npm run dev` — start local Vite dev server
4. Develop feature on a feature branch, test locally against real AWS backend (dev environment)
5. PR to `dev` → review → merge
6. PR to `main` → Amplify auto-deploys to production URL

---

## 10. Branch Strategy

| Branch | Purpose |
| :--- | :--- |
| `main` | Production. Amplify auto-deploys from this branch. |
| `dev` | Integration branch. All PRs go here first. |
| `feature/*` | Individual feature branches cut from `dev`. |

---

## 11. Phase 2 Architecture Additions

- **Rekognition:** S3 `PutObject` event triggers a Lambda that calls `detect_labels`, then updates the DynamoDB item with a `tags` attribute (String Set). No schema migration needed — DynamoDB is schemaless.
- **SES:** The `resolve` Lambda handler (or a DynamoDB Stream trigger on status change to `RESOLVED`) calls SES to send a confirmation email to the `authorEmail` stored in the item record.
