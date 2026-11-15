# NYCU Campus Lost & Found

A fully serverless lost-and-found web application built for the National Yang Ming Chiao Tung University (NYCU) campus. Students and staff can post, search, and manage lost or found items through an interactive map-based interface.

Built independently as a cloud computing project during an exchange semester in Taiwan.

## Features

- **Post & Search** — Create lost/found notices with title, description, location, and images
- **Interactive Campus Map** — Browse items on a Leaflet-powered map with location markers
- **AI-Powered Tagging** — Amazon Rekognition automatically analyzes uploaded images and suggests descriptive tags
- **Image Uploads** — Secure, direct-to-S3 uploads via presigned URLs (private bucket)
- **University-Restricted Auth** — Only `@nycu.edu.tw` email addresses can register (Cognito pre-signup validation)
- **Admin Moderation** — Role-based access control with user promotion and content management
- **Item Resolution** — Mark items as resolved when returned to their owner
- **Responsiveness** — Optimized for both desktop and mobile versions

## Architecture

```
React/Vite (Amplify Hosting)
    │
    ▼
API Gateway (REST, Cognito Authorizer)
    │
    ▼
AWS Lambda (Python 3.12, one function per endpoint)
    │
    ├── DynamoDB (item metadata)
    ├── S3 (image storage, presigned URLs)
    ├── Cognito (auth, user groups)
    └── Rekognition (image label detection)
```

<img width="1624" height="990" alt="image" src="https://github.com/user-attachments/assets/b867b5a2-9529-4a66-babb-654e6f998ad2" />


All backend infrastructure is defined as Infrastructure as Code using **AWS SAM / CloudFormation** (`template.yaml`).

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router, Leaflet, AWS Amplify UI |
| **Auth** | Amazon Cognito (JWT, user groups, email restriction) |
| **API** | Amazon API Gateway (REST) |
| **Compute** | AWS Lambda (Python 3.12) |
| **Database** | Amazon DynamoDB |
| **Storage** | Amazon S3 (private, presigned URL access) |
| **AI** | Amazon Rekognition (image label detection) |
| **IaC** | AWS SAM / CloudFormation |
| **Hosting** | AWS Amplify Hosting |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/items` | List all lost/found items |
| `GET` | `/items/{id}` | Get a single item |
| `POST` | `/items` | Create a new post |
| `PUT` | `/items/{id}` | Update an existing post |
| `DELETE` | `/items/{id}` | Delete a post and its image |
| `POST` | `/items/{id}/resolve` | Mark item as resolved |
| `POST` | `/items/upload-url` | Get a presigned S3 upload URL |
| `POST` | `/items/analyze` | Analyze image with Rekognition |
| `GET` | `/admin/users` | List all users (admin only) |
| `POST` | `/admin/promote` | Promote user to admin (admin only) |

## Project Structure

```
cc-lost-and-found/
├── src/
│   ├── components/     # Reusable UI components (Navbar, ItemCard, MapMarker, etc.)
│   ├── pages/          # Page views (Feed, MapView, CreatePost, AdminPanel, etc.)
│   ├── contexts/       # React Context for items and search state caching
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Helper functions
│   └── api.js          # API client for all backend calls
├── lambdas/            # Individual Lambda function handlers (Python)
├── template.yaml       # AWS SAM template (Infrastructure as Code)
├── package.json
└── vite.config.js
```

## Key Design Decisions

- **Serverless-first** — No EC2 instances; fully managed services for zero server maintenance
- **One Lambda per endpoint** — Keeps functions small, focused, and independently deployable
- **Private S3 bucket** — All image access goes through time-limited presigned URLs
- **Client-side caching** — React Context keeps fetched items in memory to minimize API calls
- **Map-first UX** — Interactive campus map as a primary browsing interface alongside the feed

## License

This project was built as a university cloud computing assignment. For educational purposes only.
