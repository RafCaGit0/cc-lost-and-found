# NYCU Lost & Found - AWS Architecture & Services

This document outlines the AWS services used in the NYCU Lost & Found backend. The architecture is fully serverless, meaning there are no servers to provision or manage. The infrastructure is defined as code using AWS CloudFormation (SAM).

> [!NOTE]
> **A Note on AWS Promotional Credits (Project Context):** This project is currently running on a standard AWS account supplemented by a **$100 promotional credit valid for 6 months**. The AWS Cost Explorer chart will display accrued Pay-As-You-Go costs for usage throughout the month, but AWS applies the promotional credits at the invoice level to offset these charges to $0.00. Given the extreme cost-efficiency of this serverless architecture (burning merely ~$0.06/month), the project will comfortably run for free until the 6-month credit window expires, at which point the monthly maintenance cost would be fractions of a dollar.

## 1. AWS Cognito (Identity Provider)
**Purpose:** Handles all user authentication, authorization, and secure credential storage.
**How it works here:** 
- Acts as the central User Pool. Users register, verify their email with a 6-digit code, and log in through Cognito.
- Emits JSON Web Tokens (JWT) upon successful login.
- Connected to a **PreSignUp Lambda trigger** that enforces the `@nycu.edu.tw` email rule on the backend.
**Cost:** 
- **Always Free Tier:** 50,000 Monthly Active Users (MAUs) are free forever. 

## 2. Amazon API Gateway
**Purpose:** Acts as the "front door" and secure bouncer for the backend API.
**How it works here:**
- Receives all HTTP requests (GET, POST, PUT, DELETE) from the React frontend.
- **Security:** Configured with a `CognitoAuthorizer`. Before allowing a request to pass through, it validates the JWT token in the `Authorization` header. If invalid, it blocks the request.
- **Routing:** Routes validated requests to the appropriate AWS Lambda function.
**Cost:**
- **12-Month Free Tier:** 1 Million API calls per month for the first year.
- **Pay-As-You-Go (After 12 months):** ~$3.50 per 1 million API calls. (Even small usage will show up as fractions of a cent, e.g., ~1,400 calls = $0.005).

## 3. AWS Lambda (Serverless Compute)
**Purpose:** Executes the backend business logic in Python.
**How it works here:**
- Short-lived functions that run only when triggered by API Gateway (or Cognito).
- Includes functions for CRUD operations on items (`create_item`, `get_items`, `delete_item`), admin tasks, generating S3 upload URLs, and AI image analysis.
- They securely communicate with DynamoDB, S3, and Rekognition using AWS SDK (boto3) and IAM roles.
**Cost:**
- **Always Free Tier:** 1 Million requests per month and 400,000 GB-seconds of compute time per month (forever). This service rarely incurs costs for small projects.

## 4. Amazon DynamoDB (NoSQL Database)
**Purpose:** Stores the core text/metadata for lost and found items.
**How it works here:**
- The `Items` table stores JSON-like documents containing the title, description, location, status, author email, and a reference (`imageKey`) to the image in S3.
- Queried by the Lambdas to fetch the feed or individual item details.
**Cost:**
- **Always Free Tier:** 25 GB of storage forever and 25 Read/Write Capacity Units. Like Lambda, this is permanently free up to these limits.

## 5. Amazon S3 (Simple Storage Service)
**Purpose:** Stores the uploaded images (JPG, PNG, WEBP) of the lost and found items.
**How it works here:**
- Images are not sent through API Gateway (to avoid payload limits and high latency). Instead, the frontend requests a **Pre-signed URL** from a Lambda (`get_upload_url`).
- The frontend then uploads the image *directly* to the S3 bucket using that secure, temporary URL.
- When fetching items, the Lambdas generate short-lived read URLs so the frontend can display the images.
**Cost:**
- **12-Month Free Tier:** 5 GB of Standard Storage, 20,000 GET requests, and 2,000 PUT requests per month for the first year.
- **Pay-As-You-Go (After 12 months):** $0.023 per GB/month for storage.

## 6. Amazon Rekognition (AI Image Analysis)
**Purpose:** Analyzes uploaded images to auto-generate tags or descriptions.
**How it works here:**
- The `AnalyzeImageFunction` takes a base64 image (or S3 reference) and sends it to Rekognition to detect labels/objects in the image (e.g., "keys", "hydroflask", "laptop").
- Helps users quickly categorize items without manual typing.
**Cost:**
- **12-Month Free Tier:** 5,000 image analysis requests per month for the first year.
- **Pay-As-You-Go (After 12 months):** $0.001 per image analyzed. (e.g., 15 images analyzed = $0.015).

## 7. AWS CloudFormation (via AWS SAM)
**Purpose:** Infrastructure as Code (IaC).
**How it works here:**
- Yes, it is exactly like **Terraform**! The main difference is that Terraform is cloud-agnostic (works with AWS, GCP, Azure), whereas CloudFormation is AWS's native IaC tool.
- The `template.yaml` file defines the entire backend (API Gateway, Lambdas, IAM Permissions).
- When deploying, CloudFormation reads this file and automatically provisions and links all the resources in the AWS cloud, avoiding the need to manually click through the AWS console.
**Cost:**
- CloudFormation itself is **Always Free**. You only pay for the underlying resources it creates.

## 8. AWS Amplify Hosting
**Purpose:** Frontend CI/CD and Web Hosting.
**How it works here:**
- Amplify Hosting serves the built React application (HTML/CSS/JS) to the users over a global Content Delivery Network (CDN).
- It is connected directly to your **GitHub `main` branch**. Every time you push code to GitHub, Amplify automatically triggers a build and deploys the new version of your frontend seamlessly.
**Cost:**
- **12-Month Free Tier:** 1,000 build minutes per month, 5 GB of storage, and 15 GB of bandwidth for the first year.
- **Pay-As-You-Go (After 12 months or if limits exceeded):** 
  - Build & Deploy: $0.01 per build minute.
  - Hosting: $0.023 per GB/month.
  - Bandwidth: $0.15 per GB transferred out.
  - (e.g., 4 build minutes = $0.04).

---

### Communication Flow Summary:
1. User visits the URL hosted by **AWS Amplify**.
2. User logs in via **Cognito** $\rightarrow$ gets JWT.
3. User submits a new item with an image.
4. Frontend asks **API Gateway** $\rightarrow$ **Lambda** for an S3 upload link.
5. Frontend uploads image directly to **S3**.
6. Frontend sends item details + image S3 Key to **API Gateway**.
7. **API Gateway** verifies JWT $\rightarrow$ forwards to **Lambda**.
8. **Lambda** saves the item record into **DynamoDB**.
