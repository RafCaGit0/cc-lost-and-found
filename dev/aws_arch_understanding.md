# NYCU Lost & Found — Complete AWS Architecture & Technical Deep-Dive

> **Purpose:** This document is your comprehensive reference for the live demo and Q&A. It covers every AWS service, every Lambda function, every design decision, the frontend architecture, caching strategy, security posture, and a realistic cost model. Read it end to end.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [AWS Cognito — Authentication & Authorization](#2-aws-cognito--authentication--authorization)
3. [Amazon API Gateway — The Front Door](#3-amazon-api-gateway--the-front-door)
4. [AWS Lambda — Serverless Compute](#4-aws-lambda--serverless-compute)
5. [Amazon DynamoDB — NoSQL Database](#5-amazon-dynamodb--nosql-database)
6. [Amazon S3 — Object Storage](#6-amazon-s3--object-storage)
7. [Amazon Rekognition — AI Image Analysis](#7-amazon-rekognition--ai-image-analysis)
8. [AWS CloudFormation (SAM) — Infrastructure as Code](#8-aws-cloudformation-sam--infrastructure-as-code)
9. [AWS Amplify Hosting — Frontend CI/CD & CDN](#9-aws-amplify-hosting--frontend-cicd--cdn)
10. [Frontend Architecture (React + Vite)](#10-frontend-architecture-react--vite)
11. [Client-Side Caching Strategy](#11-client-side-caching-strategy)
12. [Image Upload Pipeline](#12-image-upload-pipeline)
13. [Security Posture & IAM Design](#13-security-posture--iam-design)
14. [Cost Model](#14-cost-model)
15. [Design Decisions & Trade-offs](#15-design-decisions--trade-offs)
16. [End-to-End Request Flows](#16-end-to-end-request-flows)
17. [What We Would Do Differently / Future Improvements](#17-what-we-would-do-differently--future-improvements)

---

## 1. Architecture Overview

The NYCU Lost & Found application is a **fully serverless** web application running on AWS. There are **zero provisioned servers** — every component scales to zero when idle and scales up automatically under load. The entire backend is defined as code using **AWS SAM** (Serverless Application Model), a superset of CloudFormation.

### High-Level Architecture Diagram (Mental Model)

```
┌──────────────────────────────────────────────────────────────────────┐
│  USER's BROWSER                                                      │
│  ┌──────────────────────────────┐                                    │
│  │  React SPA (Vite build)      │                                    │
│  │  ├── Amplify Auth UI         │──── Login/Signup ──► AWS Cognito   │
│  │  ├── ItemsContext (cache)    │                      (User Pool)   │
│  │  ├── Leaflet Map             │                          │         │
│  │  └── Feed / Create / Admin   │                      JWT Token     │
│  └──────────┬───────────────────┘                          │         │
│             │ API calls (with JWT)                          ▼         │
│             │                                                        │
└─────────────┼────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────┐     ┌──────────────────────┐
│  Amazon API Gateway      │     │  AWS Amplify Hosting  │
│  (REST API, prod stage)  │     │  (CDN for React SPA)  │
│  • CognitoAuthorizer     │     │  • GitHub CI/CD       │
│  • Routes → Lambda       │     │  • Global edge cache   │
└──────────┬───────────────┘     └──────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│  AWS Lambda Functions (Python 3.12, 128 MB, 10s timeout) │
│  ├── get_items         ──► DynamoDB Scan + S3 presign    │
│  ├── get_item          ──► DynamoDB GetItem + S3 presign │
│  ├── create_item       ──► DynamoDB PutItem              │
│  ├── update_item       ──► DynamoDB UpdateItem           │
│  ├── delete_item       ──► DynamoDB DeleteItem + S3 del  │
│  ├── resolve_item      ──► DynamoDB UpdateItem           │
│  ├── get_upload_url    ──► S3 generate_presigned_post    │
│  ├── analyze_image     ──► Rekognition (Tokyo region!)   │
│  ├── admin_list_users  ──► Cognito ListUsers             │
│  ├── admin_promote_user──► Cognito AdminAddUserToGroup   │
│  └── pre_signup        ──► Cognito trigger (email check) │
└──────────┬────────────┬──────────┬───────────────────────┘
           │            │          │
           ▼            ▼          ▼
     ┌──────────┐  ┌─────────┐  ┌────────────────┐
     │ DynamoDB │  │   S3    │  │  Rekognition   │
     │ (Items)  │  │ (imgs)  │  │ (ap-northeast-1│
     │ On-demand│  │ Private │  │   = Tokyo)     │
     └──────────┘  └─────────┘  └────────────────┘
```

### Region: `ap-east-2` (Asia Pacific — Taipei, Taiwan)

Chosen because NYCU (National Yang Ming Chiao Tung University) is in Hsinchu, Taiwan. Taipei is the closest AWS region (~60 km away) for minimal latency. One notable exception: **Rekognition is not available in ap-east-2**, so the AI image analysis Lambda connects to `ap-northeast-1` (Tokyo) for that service.

---

## 2. AWS Cognito — Authentication & Authorization

### What It Does
Cognito is our **Identity Provider (IdP)**. It handles user registration, email verification, login, and JWT token issuance. We never store passwords ourselves.

### Configuration
| Setting | Value |
|---|---|
| **User Pool ID** | `ap-east-2_vJhuF2wUw` |
| **App Client ID** | `4k1p34hg5d1dl3h6cv9o9nvj6o` |
| **Sign-in method** | Email (not username) |
| **Verification** | 6-digit code sent to email |
| **Admin group** | `Admins` (Cognito Group) |

### Security: Pre-Signup Lambda Trigger
A dedicated Lambda (`pre_signup.py`, 8 lines) is attached as a Cognito Pre-Signup trigger. Before Cognito even creates the user account, this function checks:

```python
if not email.endswith('@nycu.edu.tw'):
    raise Exception('Only @nycu.edu.tw email addresses are allowed.')
```

This is **backend-enforced** — even if someone bypasses the frontend validation, the signup will fail. Only NYCU students/staff can register.

### How Admin Works
- Admins are users in the Cognito `Admins` group.
- The first admin is bootstrapped via a Python script (`scripts/bootstrap_admin.py`) that calls `admin_create_user` + `admin_add_user_to_group`.
- When any user logs in, their JWT `idToken` contains a `cognito:groups` claim (e.g., `["Admins"]`).
- Every Lambda that needs admin-only access reads this claim from the JWT and checks for the `Admins` group.
- The frontend also reads this claim via `fetchAuthSession()` to conditionally show the Admin Panel link.

### Frontend Integration
- Uses `@aws-amplify/ui-react` v6 with the `<Authenticator>` component.
- Custom form fields, custom validation (NYCU email, password policy).
- Custom branded header with MapPin icon and university email prompt.
- A `useAuth()` hook centralizes auth state: `{ user, userEmail, isAdmin, signOut }`.

### Cost
**Always Free Tier:** 50,000 Monthly Active Users (MAUs) free **forever** (not just 12 months). A campus app will never come close to this limit.

---

## 3. Amazon API Gateway — The Front Door

### What It Does
API Gateway is the single entry point for all backend HTTP requests. It receives calls from the React frontend, validates authentication, and routes to the appropriate Lambda function.

### Configuration
| Setting | Value |
|---|---|
| **API Type** | REST API (not HTTP API) |
| **Stage** | `prod` |
| **Base URL** | `https://59afqfzkdj.execute-api.ap-east-2.amazonaws.com/prod` |
| **Default Auth** | `CognitoAuthorizer` (validates JWT on every request) |
| **CORS** | AllowOrigin: `*`, AllowMethods: GET, POST, PUT, DELETE, OPTIONS |

### Why REST API instead of HTTP API?
AWS offers two API Gateway types. We chose **REST API** because:
- Built-in `CognitoAuthorizer` — just point it at the User Pool and it validates JWTs automatically. No custom Lambda authorizer needed.
- HTTP API requires a manual JWT authorizer configuration, which is more setup work.
- For our scale, REST API is within free tier anyway.

### The OPTIONS Method & CORS
Every endpoint has an `OPTIONS` method in addition to the actual method (GET, POST, etc.). This is for **CORS preflight requests**.

**Why:** Browsers enforce the Same-Origin Policy. Our frontend (`https://main.d...amplifyapp.com`) and API (`https://...execute-api...amazonaws.com`) are on different domains. Before making a real request (e.g., `POST /items`), the browser sends an `OPTIONS` request first asking: "Is this cross-origin request allowed?"

**Why OPTIONS endpoints have no Cognito auth:** The CORS preflight is sent by the browser automatically — it contains no `Authorization` header. If we required Cognito auth on OPTIONS, every preflight would fail with 401, and no actual request would ever go through. That's why the template sets `AddDefaultAuthorizerToCorsPreflight: false`.

### All API Endpoints

| Method | Path | Lambda | Auth | Purpose |
|---|---|---|---|---|
| `GET` | `/items` | GetItemsFunction | Cognito | List all items (optional `?postType=LOST\|FOUND`, `?status=...` filters) |
| `GET` | `/items/{id}` | GetItemFunction | Cognito | Get single item by ID |
| `POST` | `/items` | CreateItemFunction | Cognito | Create a new lost/found post |
| `PUT` | `/items/{id}` | UpdateItemFunction | Cognito | Update item fields |
| `DELETE` | `/items/{id}` | DeleteItemFunction | Cognito | Delete item + S3 image |
| `POST` | `/items/{id}/resolve` | ResolveItemFunction | Cognito | Mark item as RESOLVED |
| `POST` | `/items/upload-url` | GetUploadUrlFunction | Cognito | Get presigned S3 upload URL |
| `POST` | `/items/analyze` | AnalyzeImageFunction | Cognito | AI image analysis (Rekognition) |
| `GET` | `/admin/users` | AdminListUsersFunction | Cognito | List all Cognito users (admin-only) |
| `POST` | `/admin/promote` | AdminPromoteUserFunction | Cognito | Promote user to admin (admin-only) |

### Throttling & Limits
- **Default throttle:** 10,000 requests/second, 5,000 burst. More than enough for a campus app.
- **Lambda soft limit:** 1,000 concurrent executions per account (regional). This is a soft limit that can be increased via AWS support ticket. At our scale (campus app), we'd need hundreds of simultaneous users to even approach this.

### Cost
- **12-Month Free Tier:** 1 million API calls/month free.
- **After free tier:** ~$3.50 per million calls. At campus scale, this is fractions of a cent per month.

---

## 4. AWS Lambda — Serverless Compute

### Global Settings (template.yaml Globals)
| Setting | Value | Rationale |
|---|---|---|
| **Runtime** | Python 3.12 | Latest stable Python, great boto3 support |
| **Timeout** | 10 seconds | All operations are fast DB/S3 calls; 10s is generous with margin |
| **Memory** | 128 MB | Minimum. Sufficient for our lightweight functions |
| **Env vars** | `USER_POOL_ID`, `BUCKET_NAME` | Passed as CloudFormation parameters, available in all Lambdas |

### Key Concepts
- **Cold start:** First invocation after idle (or scale-up) takes ~200-500ms extra to initialize the Python runtime. Subsequent invocations ("warm starts") are faster.
- **Concurrency:** Each Lambda invocation runs in its own isolated container. AWS can run up to 1,000 concurrent instances by default (soft limit). With 128 MB memory, that's 128 GB of simultaneous compute.
- **One Lambda per endpoint:** Each API endpoint maps to exactly one Lambda function. This is slightly more verbose than a monolithic handler but keeps each function small, readable, and independently deployable. It's also the best practice for learning projects.

### Detailed Lambda Breakdown

#### 4.1 `get_items.py` — List All Items
**Trigger:** `GET /items` (via API Gateway)
**Flow:**
1. Performs a full DynamoDB **Scan** (reads entire table) with pagination handling
2. Optionally filters by `postType` (LOST/FOUND) and `status` query parameters — but filtering happens in Python, not DynamoDB (filter is post-scan)
3. Sorts items by `timestamp` descending (newest first) in Python
4. For each item with an `imageKey`, generates a **presigned GET URL** from S3 (1-hour expiry)
5. Returns the full JSON array

**Why a Scan?** DynamoDB is key-value optimized. Our table has `id` as the only key. To get "all items sorted by date," there's no index to query — so we scan. This is acceptable because:
- Our data volume is tiny (hundreds of items, maybe low thousands)
- A full scan of a small table takes milliseconds
- We'd need a GSI (Global Secondary Index) with `postType` as partition key and `timestamp` as sort key to avoid scans — overkill for our scale

**Services used:** DynamoDB, S3

#### 4.2 `get_item.py` — Get Single Item
**Trigger:** `GET /items/{id}`
**Flow:** DynamoDB `get_item` by ID → 404 if missing → generate presigned image URL → return
**Services used:** DynamoDB, S3

#### 4.3 `create_item.py` — Create New Post
**Trigger:** `POST /items`
**Flow:**
1. Extracts `authorEmail` from the JWT claims — **never from the request body** (security-critical: prevents impersonation)
2. Validates `postType` (FOUND or LOST), `status` (must match postType rules), `location` (from a hardcoded list of 10 campus locations), `title` (required)
3. Generates a UUID as the item `id` and epoch milliseconds as `timestamp`
4. Stores the item with optional fields: `description`, `imageKey`, `lat`/`lng` (as Decimal), `incidentDate`, `incidentTimeRange`, `tags`
5. DynamoDB `put_item`

**Valid Locations:** Library, Engineering Building 1, Engineering Building 3, Student Cafeteria, Student Activity Center, Admin Office (Lost & Found), Gymnasium, Dormitory Area, Main Gate, Other

**Valid Statuses by postType:**
- `FOUND`: LEFT_AT_SCENE, WITH_FINDER, AT_OFFICE
- `LOST`: OPEN

**Services used:** DynamoDB

#### 4.4 `update_item.py` — Update Existing Post
**Trigger:** `PUT /items/{id}`
**Flow:**
1. Extracts caller email and groups from JWT
2. Fetches existing item from DynamoDB
3. **Authorization check:** caller must be the original author OR an admin
4. Validates new status against postType-valid statuses (includes RESOLVED as valid target)
5. Validates location if changed
6. Builds a dynamic `UpdateExpression` with only the provided fields (partial update)
7. Always sets `updatedAt` to current epoch ms
8. Returns the updated item

**Notable:** Uses `ExpressionAttributeNames` to handle DynamoDB reserved words (`status` → `#st`, `location` → `#loc`)

**Services used:** DynamoDB

#### 4.5 `delete_item.py` — Delete Post + Image
**Trigger:** `DELETE /items/{id}`
**Flow:** Auth check → if item has `imageKey`, delete S3 object (silently ignores errors) → DynamoDB `delete_item`
**Services used:** DynamoDB, S3

#### 4.6 `resolve_item.py` — Mark as Resolved
**Trigger:** `POST /items/{id}/resolve`
**Flow:** Auth check → if already RESOLVED, return 200 → set status to RESOLVED + update `updatedAt`
**Why a separate endpoint?** It's a common operation that could later trigger an SES notification email. Having it as a clean POST endpoint gives us a hook point without modifying the general update logic. The code has a `# TODO: Trigger SES Email here` comment.
**Services used:** DynamoDB

#### 4.7 `get_upload_url.py` — Presigned Upload URL
**Trigger:** `POST /items/upload-url`
**Flow:**
1. Validates `contentType` against allowed types: `image/jpeg`, `image/png`, `image/webp`
2. Generates S3 key: `uploads/{uuid}.{extension}`
3. Creates presigned POST URL with conditions:
   - Content-Type must match the requested type
   - **Content-Length: 1 byte to 10 MB** (server-side enforcement)
4. Returns `{ uploadUrl, uploadFields, imageKey }` (5-minute expiry on the URL)

**Why presigned POST (not PUT)?** `generate_presigned_post` supports conditions (size limits, content type). `generate_presigned_url` for PUT does not enforce server-side size limits.

**Services used:** S3

#### 4.8 `analyze_image.py` — AI Image Analysis
**Trigger:** `POST /items/analyze`
**Flow:**
1. Takes base64-encoded image from request body
2. Strips data URI prefix if present (`data:image/jpeg;base64,...`)
3. Decodes to bytes
4. Calls Rekognition `detect_labels` (MaxLabels=5, MinConfidence=75%)
5. Returns label names as `{ tags: ["Backpack", "Laptop", ...] }`

**Cross-Region:** This Lambda explicitly creates the Rekognition client for `ap-northeast-1` (Tokyo) because **Rekognition is not available in ap-east-2 (Taipei)**. This adds ~20-30ms extra latency per call, but it's the only option.

**Services used:** Rekognition (Tokyo)

#### 4.9 `admin_list_users.py` — List Users (Admin Only)
**Trigger:** `GET /admin/users`
**Flow:** Check JWT for Admins group → list all admin usernames → list all users → return array with `{ username, email, status, isAdmin }` for each
**Services used:** Cognito

#### 4.10 `admin_promote_user.py` — Promote User (Admin Only)
**Trigger:** `POST /admin/promote`
**Flow:** Admin check → add user to `Admins` Cognito group
**Services used:** Cognito

#### 4.11 `pre_signup.py` — Cognito Pre-Signup Trigger
**Trigger:** Cognito (not API Gateway!) — fires automatically when someone tries to sign up
**Flow:** Check email domain → raise exception if not `@nycu.edu.tw` → return event if valid
**Length:** 8 lines. Simplest Lambda in the project.
**Services used:** None (pure validation logic)

### Cost
- **Always Free Tier (forever, not just 12 months):** 1 million requests/month + 400,000 GB-seconds of compute
- At 128 MB and 10s max timeout: 400,000 GB-s = **~25 million invocations/month** before any cost
- For a campus app, Lambda costs are essentially $0

---

## 5. Amazon DynamoDB — NoSQL Database

### Why DynamoDB Instead of RDS (Relational)?

| Consideration | DynamoDB (NoSQL) | RDS (Relational, e.g., PostgreSQL) |
|---|---|---|
| **Pricing model** | On-demand (pay per request) — scales to zero | Must run 24/7 instance (even when idle) |
| **Free tier** | 25 GB + 25 RCU/WCU **forever** | 750 hours db.t2.micro/month for **12 months only** |
| **Minimum monthly cost (after free tier)** | $0 if no traffic | ~$15-30/month for smallest instance |
| **Serverless fit** | Native — just call boto3 from Lambda | Need to manage connections, VPC, cold starts |
| **Schema** | Flexible JSON-like documents | Fixed schema, migrations needed |
| **Our data model** | Simple key-value lookups by item ID | No complex JOINs, no relational queries |
| **Scaling** | Automatic, transparent | Manual instance sizing |

**Bottom line:** Our data model is simple (items identified by UUID, no relationships, no JOINs). DynamoDB's serverless nature pairs perfectly with Lambda — both scale to zero, both have generous free tiers, and there's no connection pool management needed.

### Table Schema

**Table Name:** `Items`
**Billing Mode:** On-demand (PAY_PER_REQUEST) — no capacity planning needed

| Attribute | Type | Key | Description |
|---|---|---|---|
| `id` | String | **Partition Key** | UUID v4, generated in `create_item.py` |
| `postType` | String | — | `"FOUND"` or `"LOST"` |
| `title` | String | — | Item title (often auto-generated by Rekognition) |
| `description` | String | — | Free-text description |
| `location` | String | — | One of 10 predefined campus locations |
| `status` | String | — | FOUND: `LEFT_AT_SCENE`, `WITH_FINDER`, `AT_OFFICE`, `RESOLVED`. LOST: `OPEN`, `RESOLVED` |
| `imageKey` | String | — | S3 object key (e.g., `uploads/abc123.jpg`) |
| `authorEmail` | String | — | Extracted from JWT, not user input |
| `timestamp` | Number | — | Creation time (epoch ms) |
| `updatedAt` | Number | — | Last modification time (epoch ms) |
| `lat` | Number | — | Latitude of pin location (stored as Decimal) |
| `lng` | Number | — | Longitude of pin location (stored as Decimal) |
| `incidentDate` | String | — | When the item was lost/found (ISO date string) |
| `incidentTimeRange` | String | — | Time range (e.g., "Morning", "Afternoon") |
| `tags` | List<String> | — | AI-generated or user-entered tags |

### Sample DynamoDB Item (JSON)
```json
{
  "id": "6d5d085f-3546-422a-9dde-8fac7d1b372b",
  "postType": "FOUND",
  "title": "Backpack",
  "description": "Black backpack found near the library entrance, has a red keychain attached.",
  "location": "Library",
  "status": "LEFT_AT_SCENE",
  "imageKey": "uploads/a1b2c3d4-e5f6.jpg",
  "authorEmail": "student@nycu.edu.tw",
  "timestamp": 1748300000000,
  "updatedAt": 1748300000000,
  "lat": 24.7868,
  "lng": 120.9985,
  "incidentDate": "2026-05-26",
  "incidentTimeRange": "Afternoon",
  "tags": ["Backpack", "Bag", "Luggage"]
}
```

### No Sort Key — Trade-off
Our table has no sort key, which means:
- ✅ Simple `get_item(id)` lookups are O(1) and instant
- ⚠️ "Get all items sorted by date" requires a full table `Scan` + Python sort
- This is fine at our scale (campus = hundreds of items). If we needed server-side pagination for thousands of items, we'd add a GSI (Global Secondary Index) with a sort key on `timestamp`.

### Cost
- **Always Free Tier (forever):** 25 GB storage, 25 Read Capacity Units, 25 Write Capacity Units
- On-demand mode: $1.25 per million write requests, $0.25 per million read requests (after free tier)
- Our usage: effectively $0

---

## 6. Amazon S3 — Object Storage

### What It Does
S3 stores the user-uploaded images (JPG, PNG, WEBP) for lost/found items. The bucket is **fully private** — no public access. All image access goes through presigned URLs.

### Bucket Configuration
| Setting | Value |
|---|---|
| **Bucket Name** | `nycu-lost-and-found-items-images` |
| **Region** | `ap-east-2` (Taipei) |
| **Block Public Access** | All 4 settings **enabled** (fully private) |
| **Server-Side Encryption** | Enabled (AES-256 / SSE-S3) — encrypts data at rest |
| **Data in Transit** | All S3 API calls use HTTPS (TLS) — encrypted in transit |
| **Versioning** | Not enabled (not needed for our use case) |
| **Lifecycle Policy** | Not configured (future improvement — could auto-delete old resolved items' images) |

### Dual-Use Bucket
The same bucket stores both:
1. **User images** — under the `uploads/` prefix (e.g., `uploads/a1b2c3d4.jpg`)
2. **Lambda deployment artifacts** — CloudFormation packages Lambda code here during `aws cloudformation package`

This is a simplification. In production, you'd typically use separate buckets. For a campus project, it works fine and keeps infrastructure simpler.

### Presigned URL Pattern — How & Why

**Problem:** We can't send images through API Gateway because:
- API Gateway has a **10 MB payload limit** (hard limit)
- Routing images through Lambda is slow and expensive (Lambda charges by duration × memory)
- S3 direct access is faster and cheaper

**Solution: Presigned URLs** (two types):

#### Upload (Presigned POST)
1. Frontend calls `POST /items/upload-url` with `{ contentType: "image/jpeg" }`
2. Lambda calls `s3.generate_presigned_post()` with conditions:
   - Content-Type must match
   - Content-Length: 1 byte to 10 MB
   - Expiry: 5 minutes
3. Returns `{ uploadUrl, uploadFields, imageKey }`
4. Frontend builds `FormData` with all `uploadFields` + the file, POSTs directly to S3
5. Upload goes **straight from browser to S3** — never touches Lambda or API Gateway

#### Download (Presigned GET)
1. When `get_items` or `get_item` Lambda runs, it generates a presigned GET URL for each item's `imageKey`
2. URL is valid for **1 hour**
3. Frontend uses this URL in `<img src="...">` tags
4. Browser fetches the image **directly from S3**

**Security:** Presigned URLs are cryptographically signed. They:
- Expire after the set duration (can't be reused)
- Are scoped to exactly one S3 object
- Require no AWS credentials from the caller
- Work for any user who has the URL (but only within the expiry window)

### S3 Identity & Access Policies
- The bucket has **Block Public Access** enabled (all 4 settings)
- No bucket policy granting public access
- Access is only through:
  1. **IAM roles** attached to Lambda functions (via SAM policy templates)
  2. **Presigned URLs** generated by those Lambdas
- Each Lambda gets only the minimum S3 permissions it needs:
  - `get_items` / `get_item`: `S3ReadPolicy` (can only read objects)
  - `get_upload_url`: `S3WritePolicy` (can only write/presign)
  - `delete_item`: `S3CrudPolicy` (can read + delete objects)

### Could We Host the Frontend on S3 Instead of Amplify?
**Yes, technically.** S3 can serve static websites. However:
- ❌ No automatic CI/CD (you'd manually upload build files)
- ❌ No automatic HTTPS without CloudFront (S3 static hosting only serves HTTP)
- ❌ No automatic custom domain / SSL certificate management
- ❌ No build-on-push from GitHub
- ✅ Slightly cheaper (but Amplify's free tier is already generous)

**Verdict:** Amplify is the right choice. It provides everything S3 static hosting does, plus CI/CD, HTTPS, and GitHub integration out of the box. The marginal cost difference is negligible.

### Cost
- **12-Month Free Tier:** 5 GB storage, 20,000 GET requests, 2,000 PUT requests/month
- **After free tier:** $0.023/GB/month for storage, $0.0004 per 1,000 GET requests
- Our image storage: a few hundred images at ~1-5 MB each = tens of MBs total. Cost: fractions of a cent.

---

## 7. Amazon Rekognition — AI Image Analysis

### What It Does
Rekognition analyzes uploaded images and returns detected objects/labels (e.g., "Backpack", "Laptop", "Keys"). This auto-generates tags for items, saving users time and improving searchability.

### Cross-Region Requirement
**Rekognition is NOT available in ap-east-2 (Taipei).** Our `analyze_image.py` Lambda explicitly creates the Rekognition client for `ap-northeast-1` (Tokyo):

```python
rekognition = boto3.client('rekognition', region_name='ap-northeast-1')
```

This adds ~20-30ms of cross-region network latency per call. Since image analysis is a one-time operation during post creation (not a real-time feed), this is acceptable.

### How It's Used in the Flow
1. User selects an image on the Create Post form
2. Frontend compresses the image to 800×800px, 80% JPEG quality (using Canvas API)
3. Frontend sends the compressed base64 string to `POST /items/analyze`
4. Lambda decodes the base64, sends bytes to Rekognition `detect_labels`
5. Returns top 5 labels with ≥75% confidence as `{ tags: [...] }`
6. Frontend auto-fills the tags field and uses the #1 tag as the suggested title

### Cost
- **12-Month Free Tier:** 5,000 image analysis requests/month
- **After free tier:** $0.001 per image (1/10th of a cent)
- At campus scale: maybe 50-100 images/month = $0.05-$0.10 after free tier

---

## 8. AWS CloudFormation (SAM) — Infrastructure as Code

### What It Does
AWS SAM (Serverless Application Model) is our **Infrastructure as Code (IaC)** tool. The entire backend is defined in a single `template.yaml` file. When deployed, CloudFormation reads this file and provisions/updates all resources automatically.

### What's Defined in template.yaml (IaC)
- ✅ All 11 Lambda functions (code, handler, runtime, timeout, memory, env vars)
- ✅ API Gateway (REST API, stage, CORS, Cognito authorizer)
- ✅ All IAM policies/roles (granular per-Lambda)
- ✅ Lambda permission for Cognito trigger

### What's Created Manually (Console)
- ❌ DynamoDB `Items` table (created in AWS Console)
- ❌ S3 bucket `nycu-lost-and-found-items-images` (created in AWS Console)
- ❌ Cognito User Pool + App Client (created in AWS Console)
- ❌ Amplify Hosting app (connected via AWS Console)

**Why not everything in IaC?** These are one-time resources that rarely change. The Lambda functions and API Gateway are the frequently deployed components, so they benefit most from IaC. For a production system, you'd define everything in CloudFormation. For a grad project, this hybrid approach is practical.

### SAM vs. Terraform
| | SAM/CloudFormation | Terraform |
|---|---|---|
| **Provider** | AWS-native | HashiCorp (cloud-agnostic) |
| **Multi-cloud** | AWS only | AWS, GCP, Azure, etc. |
| **Lambda support** | Built-in SAM transforms (syntactic sugar) | Generic resource definitions |
| **Learning curve** | Lower for AWS-only projects | Higher, but more versatile |
| **State management** | Managed by AWS (automatic) | State file you must manage |

We chose SAM because we're AWS-only and it has first-class Lambda/API Gateway support with less boilerplate.

### Deployment Command
```bash
# Step 1: Package — uploads Lambda code to S3, replaces local paths with S3 URIs
aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket nycu-lost-and-found-items-images \
  --output-template-file packaged.yaml

# Step 2: Deploy — creates/updates the CloudFormation stack
aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name nycu-lost-and-found-api \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides UserPoolId=ap-east-2_vJhuF2wUw BucketName=nycu-lost-and-found-items-images
```

### Cost
CloudFormation itself is **always free**. You only pay for the resources it creates.

---

## 9. AWS Amplify Hosting — Frontend CI/CD & CDN

### What It Does
Amplify Hosting serves the compiled React application (HTML, CSS, JS) to users worldwide. It acts as both a **CI/CD pipeline** and a **global CDN**.

### How It Works
1. Amplify is connected to the GitHub repository's `main` branch
2. When code is pushed to `main`, Amplify automatically:
   - Pulls the latest code
   - Runs `npm install` + `npm run build` (Vite build)
   - Deploys the `dist/` output to its global edge network
3. The app is served from the nearest edge location to the user

### Amplify and Taiwan — No Problem
AWS Amplify's **build environment** runs in specific AWS regions, and Taiwan isn't one of them. But this is fine because:
- The **build** happens once in a remote region (doesn't affect users)
- The **hosting** uses AWS's global **CloudFront CDN** under the hood
- CloudFront has edge locations in **Taipei and other Asian cities**
- Users in Taiwan get the static files (HTML/CSS/JS) from a nearby edge cache — fast response times

### Are Edge Regions Caching/Storing Our Frontend?
**Yes.** Once a user requests the React app, CloudFront (Amplify's underlying CDN) caches the static files at the nearest edge location. Subsequent requests from users in the same region are served from the edge cache without going back to the origin — resulting in very fast load times.

### Cost
- **12-Month Free Tier:** 1,000 build minutes/month, 5 GB storage, 15 GB bandwidth
- **After free tier:** $0.01/build minute, $0.023/GB storage, $0.15/GB bandwidth
- Our usage: ~4-minute builds, a few deployments per week = negligible cost

---

## 10. Frontend Architecture (React + Vite)

### Tech Stack
| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.2.0 | UI framework (component-based) |
| **Vite** | 4.4.5 | Build tool & dev server (fast HMR) |
| **react-router-dom** | 7.15.1 | Client-side routing (SPA navigation) |
| **Leaflet** + **react-leaflet** | 1.9.4 / 4.2.1 | Interactive campus map |
| **aws-amplify** | 6.17.0 | Cognito auth SDK |
| **@aws-amplify/ui-react** | 6.15.4 | Pre-built login/signup UI |
| **lucide-react** | 1.16.0 | Icon library |

### Component Architecture
```
main.jsx ─── Amplify.configure() + BrowserRouter
  └── App.jsx ─── <Authenticator> wrapper
      └── AppContent
          └── <ItemsProvider> ─── Global items cache (React Context)
              └── <SearchProvider> ─── Filter/search state (React Context)
                  ├── <Navbar> ─── Top nav bar + ProfileDropdown
                  └── <Routes>
                      ├── / ──────── MapView.jsx (Leaflet map + markers)
                      ├── /feed ──── Feed.jsx (card grid)
                      ├── /create ── CreatePost.jsx (form + image upload)
                      ├── /item/:id  ItemDetails.jsx (detail view)
                      ├── /edit/:id  EditPost.jsx (edit form)
                      └── /admin ─── AdminPanel.jsx (user management)
```

### State Management
**Pure React Context API** — no Redux, Zustand, or external state libraries.

Two contexts:
1. **ItemsContext** — single source of truth for all item data, shared across the entire app
2. **SearchContext** — filter and sort state, shared between MapView and Feed

This is a deliberate design choice: for our app's complexity level, React Context is sufficient. Adding Redux would be over-engineering.

### Routing
React Router v7 with `<BrowserRouter>`. Six routes total. Legacy redirects maintain backward compatibility: `/map` → `/`, `/lost` → `/feed`, `/found` → `/feed`.

### Styling
Single large CSS file (`index.css`, ~27 KB) using:
- CSS custom properties (variables) for theming
- Glass-morphism design (backdrop-filter, semi-transparent backgrounds)
- Responsive breakpoints at 768px (mobile) with hamburger menu
- No CSS framework (no Tailwind, no Bootstrap)

### How React Works (Key Concepts for Understanding the Code)
- **Components:** Reusable UI building blocks (functions that return JSX/HTML)
- **State (`useState`):** Component-local reactive data — when it changes, the component re-renders
- **Effects (`useEffect`):** Side effects like API calls, run after render
- **Context (`useContext`):** Share state across components without prop-drilling
- **Memoization (`useMemo`):** Cache computed values to avoid expensive recalculations on every render
- **Hooks pattern:** `useAuth()`, `useFilteredItems()` — encapsulate reusable logic

---

## 11. Client-Side Caching Strategy

### The Problem (Without Cache)
Without caching, every navigation between pages triggers a new API call:
- User opens Feed → `GET /items` (Lambda invocation #1, DynamoDB scan, presigned URL generation)
- User clicks "Show on Map" → navigates to MapView → `GET /items` again (Lambda #2, identical scan)
- User goes back to Feed → `GET /items` again (Lambda #3, identical scan)
- **Each navigation = ~300-500ms wait + unnecessary Lambda/DynamoDB costs**

### The Solution: ItemsContext (In-Memory Cache)

```
┌──────────────────────────────────────────────────────┐
│  ItemsProvider (wraps entire app)                     │
│                                                      │
│  ┌─────────────────────────────┐                     │
│  │  items = useState([])       │ ◄── Single source   │
│  │  loading = useState(true)   │     of truth        │
│  │  error = useState(null)     │                     │
│  └─────────────┬───────────────┘                     │
│                │                                     │
│  On mount:     │ getItems('') ──► Lambda ──► DynamoDB│
│  Every 5 min:  │ setInterval(getItems, 300000)       │
│  After CRUD:   │ refreshItems() (manual re-fetch)    │
│                │                                     │
│  ┌─────────────▼───────────────┐                     │
│  │  Feed.jsx    → useItems()   │ No network call!    │
│  │  MapView.jsx → useItems()   │ Instant from memory │
│  │  Any page    → useItems()   │                     │
│  └─────────────────────────────┘                     │
└──────────────────────────────────────────────────────┘
```

### How It Works
1. **One fetch on login:** When the app loads (user authenticates), `ItemsContext` makes a single `GET /items` call
2. **Stored in React state:** The response (all items with presigned URLs) is held in memory via `useState`
3. **Shared globally:** All pages (Feed, MapView, ItemDetails, etc.) consume items from context — no redundant API calls
4. **Auto-refresh every 5 minutes:** A `setInterval` re-fetches items to pick up changes from other users
5. **Manual refresh after mutations:** After create/edit/delete/resolve, `refreshItems()` is called to immediately re-fetch

### Why Not Real-Time (WebSockets)?
- WebSocket via API Gateway costs more and adds architectural complexity
- For a campus bulletin board, 5-minute staleness is perfectly acceptable
- If another user posts an item, it appears within 5 minutes — not critical
- The creator sees their own changes immediately (optimistic update via `refreshItems()`)

### Why Not localStorage?
- Presigned URLs expire (1 hour for read, 5 minutes for upload) — cached URLs would become stale
- The data volume is small enough that a fresh API call on page load is fast
- We want to always show the latest items, not stale local data

### Trade-off Analysis
| Approach | Lambda Calls | Latency | Freshness | Complexity |
|---|---|---|---|---|
| **No cache** (fetch per page) | ~3-5x per session | 300-500ms each | Always fresh | Low |
| **ItemsContext (our approach)** | 1x + every 5 min | Instant after first | ≤5 min stale | Medium |
| **Service Worker cache** | 1x, offline capable | Instant | Manual invalidation | High |
| **WebSocket (real-time)** | 0 (push-based) | Near-instant | Real-time | Very high |

### Better Alternatives?
- **React Query / TanStack Query:** Automatic caching, background refresh, deduplication, stale-while-revalidate — would be the "industry standard" approach. We implemented essentially the same pattern manually.
- **SWR (stale-while-revalidate):** Similar to React Query but more lightweight.
- **Server-Sent Events (SSE):** One-way push from server. Lower complexity than WebSocket but still requires a persistent connection.

Our manual approach is simpler but achieves the same core behavior. For a campus app, it's the pragmatic choice.

---

## 12. Image Upload Pipeline

### End-to-End Flow

```
┌─ User selects image file ─────────────────────────────────────────────┐
│                                                                       │
│  1. CLIENT-SIDE VALIDATION                                            │
│     ├── File size > 10 MB? → Reject with error message                │
│     └── File type ∈ {jpeg, png, webp}? → Accept                      │
│                                                                       │
│  2. CLIENT-SIDE COMPRESSION (for AI analysis only)                    │
│     ├── Read file as DataURL (FileReader API)                         │
│     ├── Create <img> element, load image                              │
│     ├── Resize to fit within 800×800px (maintain aspect ratio)        │
│     ├── Draw to <canvas>                                              │
│     ├── Export as canvas.toDataURL('image/jpeg', 0.8) = 80% quality   │
│     └── Result: compressed base64 string (used for AI + preview)      │
│                                                                       │
│  3. AI ANALYSIS (optional, happens automatically)                     │
│     ├── POST /items/analyze  { image: base64_compressed }             │
│     ├── Lambda → Rekognition (Tokyo) → detect_labels                  │
│     ├── Returns { tags: ["Backpack", "Bag", ...] }                    │
│     └── Auto-fills tags field + suggests title = tags[0]              │
│                                                                       │
│  4. S3 UPLOAD (on form submit)                                        │
│     ├── POST /items/upload-url  { contentType: "image/jpeg" }         │
│     │   └── Lambda → S3 generate_presigned_post (5 min, 10 MB limit)  │
│     │       └── Returns { uploadUrl, uploadFields, imageKey }         │
│     ├── FormData = uploadFields + ORIGINAL file (not compressed!)     │
│     └── POST uploadUrl (direct browser → S3, bypasses API Gateway)    │
│                                                                       │
│  5. CREATE ITEM                                                       │
│     ├── POST /items  { title, description, ..., imageKey }            │
│     └── Lambda → DynamoDB put_item                                    │
└───────────────────────────────────────────────────────────────────────┘
```

### Key Detail: Compressed vs. Original
- **Compressed (800×800, JPEG 80%):** Used only for AI analysis (reduces API payload size and Rekognition processing) and in-browser preview display
- **Original file:** Uploaded to S3 at full quality for viewing on item detail pages
- **No external library** for compression — uses the native browser **Canvas API** (`compressImage.js`, 30 lines)

### Server-Side Protections
- **Content-Type validation:** Lambda rejects anything that isn't `image/jpeg`, `image/png`, or `image/webp`
- **Size limit:** Presigned POST includes a condition `content-length-range: [1, 10485760]` (1 byte to 10 MB). S3 rejects uploads outside this range.
- **URL expiry:** Presigned POST URL expires after 5 minutes — can't be reused or shared long-term

---

## 13. Security Posture & IAM Design

### Granular IAM Policies (Principle of Least Privilege)
Each Lambda function has **only the permissions it needs** — no shared "do-everything" role:

| Lambda | Policies | What It Can Do |
|---|---|---|
| `get_items` | DynamoDBReadPolicy, S3ReadPolicy | Read items, read S3 (presign) |
| `get_item` | DynamoDBReadPolicy, S3ReadPolicy | Same as above |
| `create_item` | DynamoDBWritePolicy | Write items only |
| `update_item` | DynamoDBCrudPolicy | Read + write items |
| `delete_item` | DynamoDBCrudPolicy, S3CrudPolicy | Read/write/delete items + S3 objects |
| `resolve_item` | DynamoDBCrudPolicy | Read + write items |
| `get_upload_url` | S3WritePolicy | Generate presigned upload URLs |
| `analyze_image` | RekognitionDetectOnlyPolicy | Detect labels only (no write) |
| `admin_list_users` | Custom: cognito-idp:ListUsers, ListUsersInGroup | Read users only |
| `admin_promote_user` | Custom: cognito-idp:AdminAddUserToGroup | Add to group only |
| `pre_signup` | None | No AWS service calls |

**Evolution:** Initially we had a single broad IAM role for all Lambdas. We later refactored to per-Lambda SAM policy templates — a meaningful security improvement that demonstrates understanding of least-privilege access.

### Security Checklist

| Check | Status | Implementation |
|---|---|---|
| Email domain enforcement | ✅ | Pre-signup Lambda trigger (`@nycu.edu.tw` only) |
| `authorEmail` from JWT, not body | ✅ | `create_item.py` extracts from `requestContext.authorizer.claims.email` |
| Admin check via JWT claims | ✅ | Lambdas check `cognito:groups` for `Admins` |
| S3 fully private | ✅ | Block All Public Access enabled |
| Data encrypted at rest | ✅ | S3 SSE-S3 (AES-256) enabled |
| Data encrypted in transit | ✅ | All API calls over HTTPS/TLS |
| Image type/size validation | ✅ | Server-side (presigned POST conditions) + client-side |
| No long-term access keys | ✅ | Using IAM Identity Center (SSO) for deployment |
| Input validation | ✅ | Server-side validation of postType, status, location, title |
| API throttling | ✅ | API Gateway default: 10,000 req/s |
| CORS | ⚠️ | `AllowOrigin: *` — acceptable for demo, should be restricted in prod |
| Delete cleans up S3 | ✅ | `delete_item.py` removes S3 object when deleting item |
| Authorization on mutations | ✅ | update/delete/resolve check author OR admin |

---

## 14. Cost Model

> [!NOTE]
> **Project Context:** Running on a standard AWS account with a **$100 promotional credit valid for 6 months**. AWS Cost Explorer shows accrued Pay-As-You-Go costs, but credits are applied at invoice level. Current monthly spend: ~$0.06/month.

### Component Cost Breakdown

| Service | Free Tier | Our Usage | Monthly Cost | Notes |
|---|---|---|---|---|
| **Cognito** | 50,000 MAU forever | ~10-50 users | **$0.00** | Permanent free tier |
| **API Gateway** | 1M calls/mo (12 months) | ~5,000-10,000 calls/mo | **$0.00** | Well within free tier |
| **Lambda** | 1M requests + 400K GB-s forever | ~5,000-10,000 invocations/mo | **$0.00** | Permanent free tier |
| **DynamoDB** | 25 GB + 25 RCU/WCU forever | ~100-500 items, <1 MB | **$0.00** | Permanent free tier |
| **S3** | 5 GB storage, 20K GET (12 months) | ~500 MB images, few thousand requests | **$0.01** | Minimal storage |
| **Rekognition** | 5,000 images/mo (12 months) | ~50-100 images/mo | **$0.00** | Well within free tier |
| **Amplify Hosting** | 1,000 build min, 15 GB bandwidth (12 months) | ~20 build min/mo, ~2 GB bandwidth | **$0.00** | Well within free tier |
| **CloudWatch Logs** | 5 GB ingestion/mo (free) | Lambda logs, minimal | **$0.00-0.05** | Log ingestion |
| **Data Transfer** | 1 GB out/mo (12 months) | Presigned URL downloads | **$0.00** | Negligible |
| **TOTAL** | | | **~$0.01-0.06/mo** | |

### After Free Tier Expiry (12+ months)
| Service | Estimated Monthly Cost |
|---|---|
| API Gateway | $0.01-0.05 |
| S3 | $0.02-0.10 |
| Rekognition | $0.05-0.10 |
| Amplify Hosting | $0.05-0.20 |
| Lambda + DynamoDB + Cognito | $0.00 (permanent free tier) |
| **TOTAL** | **$0.13-0.45/month** |

**Bottom line:** Even without any free tier, the entire application would cost **less than $1 per month**. This is the power of a fully serverless architecture — you pay only for what you use, and a campus app uses almost nothing.

### What Drives Cost at Scale?

If the app were to grow (thousands of users, tens of thousands of items):
1. **S3 storage** would be the largest cost driver (images accumulate)
2. **Rekognition** ($1 per 1,000 images) would be next
3. **API Gateway** ($3.50 per million calls) follows
4. **Lambda** and **DynamoDB** have the most generous free tiers and would be last to incur costs

**Mitigation at scale:** S3 lifecycle policies to auto-delete old resolved items' images, image compression, DynamoDB GSIs to reduce scan overhead.

---

## 15. Design Decisions & Trade-offs

### Why Serverless (Lambda + DynamoDB + S3) Instead of EC2 + RDS?

| Aspect | Serverless (Our Choice) | Traditional (EC2 + RDS) |
|---|---|---|
| **Cost at low scale** | $0-1/month | $20-50/month minimum |
| **Scaling** | Automatic, transparent | Manual instance sizing |
| **Maintenance** | Zero (no OS patches, no server management) | Significant (updates, monitoring, backups) |
| **Cold starts** | ~200-500ms on first call | None (always running) |
| **Deployment** | `sam deploy` in 2 minutes | More complex (Docker, SSH, etc.) |
| **Learning value** | High (modern cloud-native) | Also valuable but less cutting-edge |

### Why One Lambda Per Endpoint (Not a Monolith)?
- Each function is small (30-100 lines) and easy to understand
- Independent IAM policies (least privilege)
- Independent scaling — a spike in `get_items` doesn't affect `create_item`
- A bug in one function doesn't crash others
- Trade-off: more CloudFormation boilerplate, more functions to manage

### Why Presigned URLs (Not Direct Upload Through API Gateway)?
- API Gateway has a **10 MB hard payload limit**
- Lambda execution time charges: routing a 5 MB image through Lambda costs 50x more than a direct S3 upload
- Presigned URLs are the **AWS-recommended pattern** for client-side uploads

### Why Leaflet.js (Not Google Maps)?
- **Free** — no API key, no billing, no rate limits
- Open-source, well-documented
- `react-leaflet` provides React-native integration
- Google Maps requires billing setup (even with free tier) and API key management

### Why No CloudFront for Images?
- Images are served via presigned S3 URLs directly
- CloudFront would add a CDN layer for images, reducing latency for repeated views
- For our scale (campus in Taiwan, S3 in Taipei), the latency difference is negligible
- Adding CloudFront would require signed cookies or signed URLs with a CloudFront key pair — additional complexity

### Why `authorEmail` from JWT, Not From Request Body?
**Security-critical decision.** If we took `authorEmail` from the request body, any user could impersonate another by sending someone else's email. By extracting it from the JWT (which is cryptographically signed by Cognito), we guarantee the author identity is genuine and untamperable.

### Why CORS `Allow-Origin: *`?
For development convenience. In production, this should be restricted to the Amplify domain (`https://main.d...amplifyapp.com`). For a demo/grad project, the wildcard is acceptable — the real authentication is done by the Cognito JWT, not by CORS.

---

## 16. End-to-End Request Flows

### Flow A: User Views the Feed (First Load)

```
1. Browser → Amplify CDN (edge cache)
   └── Serves React SPA (HTML/CSS/JS)

2. React boots → <Authenticator> → User logs in
   └── Cognito returns JWT tokens (idToken, accessToken, refreshToken)

3. <ItemsProvider> mounts → calls getItems('')
   └── GET /items (Authorization: Bearer <idToken>)
       └── API Gateway validates JWT via CognitoAuthorizer
           └── Forwards to GetItemsFunction Lambda
               ├── DynamoDB Scan (full table, paginated)
               ├── Python sort by timestamp desc
               ├── For each item with imageKey:
               │   └── S3 generate_presigned_url (GET, 1hr expiry)
               └── Returns JSON array of items

4. Items stored in React state (ItemsContext)

5. User navigates to /feed
   └── Feed.jsx calls useItems() → gets items from context (instant, no API call)
       └── useFilteredItems() filters/sorts in-memory
           └── Renders ItemCard grid with <img src={presignedUrl}>
```

### Flow B: User Creates a New Post

```
1. User navigates to /create → CreatePost.jsx

2. User selects image file
   ├── Client validates: size ≤ 10 MB, type ∈ {jpeg, png, webp}
   ├── compressImage() → Canvas API → 800×800, JPEG 80%
   └── POST /items/analyze { image: base64_compressed }
       └── Lambda → Rekognition (Tokyo) → detect_labels
           └── Returns { tags: ["Backpack", "Bag", ...] }
               └── Auto-fills tags + suggests title

3. User fills form, clicks Submit
   ├── POST /items/upload-url { contentType: "image/jpeg" }
   │   └── Lambda → S3 presigned POST (5 min, 10 MB limit)
   │       └── Returns { uploadUrl, uploadFields, imageKey }
   │
   ├── POST uploadUrl (direct browser → S3)
   │   └── FormData: uploadFields + original file → S3 bucket
   │
   └── POST /items { title, description, location, status, imageKey, ... }
       └── Lambda extracts authorEmail from JWT
           └── DynamoDB put_item
               └── Returns new item

4. refreshItems() called → re-fetches all items → context updated
```

### Flow C: Admin Resolves an Item

```
1. Admin views /item/:id → ItemDetails.jsx
2. Clicks "Mark as Resolved"
   └── POST /items/{id}/resolve (Authorization: Bearer <idToken>)
       └── API Gateway validates JWT
           └── ResolveItemFunction Lambda
               ├── Extracts caller email + groups from JWT
               ├── Fetches item from DynamoDB
               ├── Checks: caller is author OR in Admins group
               ├── Sets status = "RESOLVED", updatedAt = now
               └── Returns updated item
3. refreshItems() → context updated → UI reflects RESOLVED status
```

---

## 17. What We Would Do Differently / Future Improvements

### Things We'd Add in Production
1. **S3 Lifecycle Policies** — Auto-transition old images to Glacier/delete after 90-180 days
2. **API Gateway Usage Plans** — Rate limiting per user/API key to prevent abuse
3. **Custom Domain** — Instead of `...amplifyapp.com`, use `lostandfound.nycu.edu.tw`
4. **CORS Restriction** — Lock `AllowOrigin` to the production domain
5. **CloudFront for Images** — CDN layer for image delivery
6. **SES Email Notifications** — Email item author when their post is resolved
7. **DynamoDB GSI** — Global Secondary Index on `postType + timestamp` for efficient queries instead of scans
8. **RESOLVED Terminal State** — `update_item.py` should reject updates to resolved items
9. **CloudWatch Alarms** — Alerts for Lambda errors, API 5xx rates
10. **React Query / SWR** — Replace manual caching with a mature data-fetching library

### AWS Trusted Advisor
**What it is:** A service that inspects your AWS environment and recommends improvements in 5 categories: cost optimization, performance, security, fault tolerance, and service limits.

**Usable for us?** Yes, but limited on the free tier. The free version gives basic checks (e.g., S3 bucket permissions, IAM usage, service limits). The full version requires a Business or Enterprise support plan (~$100/month minimum). For a campus project, the free checks are useful as a sanity check but won't provide deep insights.

### Lessons Learned
1. **Start with IaC** — We could have defined DynamoDB/S3/Cognito in the SAM template from the start, making the entire stack reproducible
2. **Granular IAM from day one** — We initially used a broad shared role, then refactored to per-Lambda policies. Doing it right from the start saves time.
3. **Presigned URL pattern** — This is the correct AWS pattern for client-side file uploads. Sending files through API Gateway is an anti-pattern.
4. **Cross-region services** — Not all AWS services are available in all regions. Always check regional availability (we learned this with Rekognition in Taipei).
5. **In-memory caching** — A simple React Context saved us from redundant API calls. The 5-minute refresh is a good balance between freshness and cost.

---

## Quick Reference Card (Demo Cheat Sheet)

| Fact | Value |
|---|---|
| **Region** | ap-east-2 (Taipei) |
| **Stack name** | nycu-lost-and-found-api |
| **API URL** | https://59afqfzkdj.execute-api.ap-east-2.amazonaws.com/prod |
| **S3 Bucket** | nycu-lost-and-found-items-images |
| **User Pool** | ap-east-2_vJhuF2wUw |
| **Lambda count** | 11 (10 API + 1 Cognito trigger) |
| **Lambda runtime** | Python 3.12, 128 MB, 10s timeout |
| **DynamoDB table** | Items (on-demand, partition key: id) |
| **Frontend** | React 18 + Vite 4, deployed via Amplify |
| **Auth** | Cognito + JWT + @nycu.edu.tw restriction |
| **Image compression** | Canvas API (800×800, JPEG 80%) — for AI only |
| **Image upload limit** | 10 MB (client + server enforced) |
| **Cache refresh** | Every 5 minutes (in-memory React Context) |
| **Monthly cost** | ~$0.06 |
| **Promotional credit** | $100 for 6 months |
