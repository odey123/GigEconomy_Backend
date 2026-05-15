# Gig Economy API - Complete Test Plan

**Last Updated:** May 15, 2026  
**API Base URL:** `http://localhost:5000`

---

## Overview

This document outlines all API endpoints, their request formats, expected responses, and test sequences. Tests should be run in the order specified to properly set up dependencies.

---

## Layer 1: Authentication & Wallet

### 1.1 Authentication Endpoints

#### 1.1.1 POST /api/auth/signup
**Purpose:** Register a new user (client or worker)

**Request:**
```json
{
  "firstName": "Rock",
  "lastName": "Healthy",
  "email": "rockhealthy@example.com",
  "phone": "+2348012345678",
  "password": "SecurePass123!",
  "role": "client"  // or "worker"
}
```

**Expected Response (201):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "_id": "user_id",
      "firstName": "Rock",
      "lastName": "Healthy",
      "email": "rockhealthy@example.com",
      "phone": "+2348012345678",
      "role": "client",
      "createdAt": "2026-05-15T14:00:00Z",
      "updatedAt": "2026-05-15T14:00:00Z"
    }
  }
}
```

**Test Notes:**
- ✅ Create at least 2 users: one "client" and one "worker"
- ✅ Save tokens for subsequent requests
- ❌ Should reject duplicate emails
- ❌ Should reject weak passwords

---

#### 1.1.2 POST /api/auth/login
**Purpose:** Authenticate existing user and get JWT token

**Request:**
```json
{
  "email": "rockhealthy@example.com",
  "password": "SecurePass123!"
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "_id": "user_id",
      "email": "rockhealthy@example.com",
      "role": "client"
    }
  }
}
```

**Test Notes:**
- ✅ Valid credentials return token
- ❌ Invalid email returns 401
- ❌ Invalid password returns 401

---

#### 1.1.3 POST /api/auth/refresh
**Purpose:** Refresh expired JWT token

**Request Headers:**
```
Authorization: Bearer <token>
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "token": "new_jwt_token_here"
  }
}
```

---

#### 1.1.4 POST /api/auth/logout
**Purpose:** Invalidate current session

**Request Headers:**
```
Authorization: Bearer <token>
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Logout successful"
}
```

---

### 1.2 Wallet Endpoints

#### 1.2.1 POST /api/wallet/create
**Purpose:** Create Squad virtual account and wallet with BVN verification

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "bvn": "12345678901",
  "fullName": "Rock Healthy",
  "dateOfBirth": "1990-01-15"
}
```

**Expected Response (201):**
```json
{
  "status": "success",
  "message": "Wallet created successfully with Squad virtual account",
  "data": {
    "_id": "wallet_id",
    "userId": "user_id",
    "accountNumber": "0123456789",
    "accountName": "Rock Healthy",
    "bankName": "First Bank Nigeria",
    "bankCode": "011",
    "balance": 0,
    "verified": true,
    "createdAt": "2026-05-15T14:00:00Z"
  }
}
```

**Test Notes:**
- ✅ BVN must be 11 digits
- ✅ Creates virtual account at Squad
- ✅ Returns account details for receiving payments
- ❌ Should reject invalid BVN format
- ❌ Should reject duplicate wallets (one per user)

---

#### 1.2.2 GET /api/wallet
**Purpose:** Get authenticated user's wallet details

**Request Headers:**
```
Authorization: Bearer <token>
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "wallet_id",
    "userId": "user_id",
    "accountNumber": "0123456789",
    "accountName": "Rock Healthy",
    "bankName": "First Bank Nigeria",
    "bankCode": "011",
    "balance": 5000,
    "verified": true,
    "createdAt": "2026-05-15T14:00:00Z"
  }
}
```

**Test Notes:**
- ✅ Requires authentication
- ❌ Returns 404 if no wallet exists

---

#### 1.2.3 GET /api/wallet/balance
**Purpose:** Get wallet balance (quick check)

**Request Headers:**
```
Authorization: Bearer <token>
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "balance": 5000,
    "accountNumber": "0123456789"
  }
}
```

**Test Notes:**
- ✅ Fast operation for balance checks
- ✅ Real-time balance from Squad

---

#### 1.2.4 GET /api/wallet/transactions
**Purpose:** Get transaction history with pagination

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (default: 50, max: 100)
- `offset` (default: 0)

**Example:** `GET /api/wallet/transactions?limit=10&offset=0`

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "transactions": [
      {
        "_id": "tx_id",
        "type": "credit",
        "amount": 5000,
        "netAmount": 5000,
        "description": "Payment received from Job #123",
        "status": "completed",
        "reference": "REF_123456",
        "createdAt": "2026-05-15T14:00:00Z"
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  }
}
```

**Test Notes:**
- ✅ Shows all incoming and outgoing transactions
- ✅ Supports pagination
- ✅ Filters by transaction type

---

#### 1.2.5 POST /api/wallet/withdraw
**Purpose:** Initiate withdrawal to bank account

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 5000,
  "bankAccount": {
    "accountNumber": "0123456789",
    "bankCode": "050"
  }
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Withdrawal initiated successfully",
  "data": {
    "transactionId": "withdrawal_tx_id",
    "reference": "WTH_user_id_timestamp",
    "amount": 5000,
    "status": "pending",
    "estimatedTime": "2 - 5 business days"
  }
}
```

**Test Notes:**
- ✅ Deducts from wallet balance
- ✅ Initiates Squad transfer
- ✅ Creates transaction record
- ❌ Should reject if insufficient balance
- ❌ Should validate bank account details

---

---

## Layer 2: Gigs Management

### 2.1 Gig Creation & Listing

#### 2.1.1 POST /api/gigs
**Purpose:** Create a new gig (sales or task)

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Sales Gig Request:**
```json
{
  "title": "iPhone 15 Sales",
  "description": "Sell iPhone 15 Pro Max phones. Commission based.",
  "workType": "sales",
  "category": "retail",
  "productName": "iPhone 15 Pro Max",
  "productPrice": 1500,
  "commissionPercent": 15,
  "stockAvailable": 50,
  "skillLevelRequired": "intermediate",
  "evidenceRequired": "none"
}
```

**Task Gig Request:**
```json
{
  "title": "Build a React Dashboard",
  "description": "Create a responsive dashboard with charts and tables.",
  "workType": "task",
  "category": "programming",
  "fixedPrice": 500,
  "deadline": "2026-06-01T00:00:00Z",
  "skillLevelRequired": "intermediate",
  "evidenceRequired": "none",
  "skills": ["React", "TypeScript", "Tailwind CSS"]
}
```

**Expected Response (201):**
```json
{
  "status": "success",
  "message": "Gig created successfully",
  "data": {
    "_id": "gig_id",
    "ownerId": "user_id",
    "title": "iPhone 15 Sales",
    "description": "Sell iPhone 15 Pro Max phones...",
    "workType": "sales",
    "status": "active",
    "createdAt": "2026-05-15T14:00:00Z"
  }
}
```

**Test Notes:**
- ✅ Client role required
- ✅ Create both sales and task gigs
- ✅ Sales gigs calculate earnings: `commission = productPrice * quantity * (commissionPercent / 100)`
- ✅ Task gigs have fixed price + escrow
- ❌ Should validate deadline (must be future date for tasks)

---

#### 2.1.2 GET /api/gigs
**Purpose:** List all gigs with filters and pagination

**Request Headers:** (Optional for auth)
```
Authorization: Bearer <token>  // Optional
```

**Query Parameters:**
- `category`: Filter by category
- `workType`: "sales" or "task"
- `skillLevel`: "beginner", "intermediate", "expert"
- `limit`: Default 10, max 50
- `page`: Default 1

**Example:** `GET /api/gigs?workType=sales&limit=10&page=1`

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "gigs": [
      {
        "_id": "gig_id",
        "title": "iPhone 15 Sales",
        "ownerId": "user_id",
        "workType": "sales",
        "category": "retail",
        "skillLevelRequired": "intermediate",
        "status": "active",
        "applicantCount": 5,
        "createdAt": "2026-05-15T14:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

**Test Notes:**
- ✅ Public endpoint (no auth required)
- ✅ Shows personalized "matched" percentage if authenticated
- ✅ Sorts by relevance if user authenticated

---

#### 2.1.3 GET /api/gigs/matched
**Purpose:** Get AI-matched gigs (worker only)

**Request Headers:**
```
Authorization: Bearer <token>  // Worker token
```

**Query Parameters:**
- `limit`: Default 10

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "gigs": [
      {
        "_id": "gig_id",
        "title": "iPhone 15 Sales",
        "matchScore": 87,
        "matchReasons": [
          "You have intermediate skills",
          "You've completed similar gigs",
          "Your rating is 4.8/5"
        ],
        "createdAt": "2026-05-15T14:00:00Z"
      }
    ]
  }
}
```

**Test Notes:**
- ✅ Worker role required
- ✅ Uses AI matching algorithm
- ✅ Scores gigs 0-100 based on helper profile
- ✅ Personalized results

---

#### 2.1.4 GET /api/gigs/:id
**Purpose:** Get detailed gig information

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "gig_id",
    "title": "iPhone 15 Sales",
    "description": "Sell iPhone 15 Pro Max phones...",
    "ownerId": "user_id",
    "ownerName": "Rock Healthy",
    "ownerRating": 4.8,
    "workType": "sales",
    "category": "retail",
    "productName": "iPhone 15 Pro Max",
    "productPrice": 1500,
    "commissionPercent": 15,
    "stockAvailable": 50,
    "skillLevelRequired": "intermediate",
    "evidenceRequired": "none",
    "applicantCount": 5,
    "status": "active",
    "createdAt": "2026-05-15T14:00:00Z"
  }
}
```

---

#### 2.1.5 PATCH /api/gigs/:id
**Purpose:** Update gig details (owner only)

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "description": "Updated description",
  "commissionPercent": 20
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Gig updated successfully",
  "data": { /* updated gig */ }
}
```

**Test Notes:**
- ✅ Owner only
- ❌ Cannot modify after first booking

---

#### 2.1.6 DELETE /api/gigs/:id
**Purpose:** Delete a gig (owner only, if no active bookings)

**Request Headers:**
```
Authorization: Bearer <token>
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Gig deleted successfully"
}
```

**Test Notes:**
- ✅ Owner only
- ❌ Cannot delete if has active bookings

---

---

## Layer 3: Bookings & Applications

### 3.1 Booking Management

#### 3.1.1 POST /api/bookings
**Purpose:** Apply for a gig (worker applies)

**Request Headers:**
```
Authorization: Bearer <token>  // Worker token
Content-Type: application/json
```

**Request Body:**
```json
{
  "gigId": "gig_id"
}
```

**Expected Response (201):**
```json
{
  "status": "success",
  "message": "Application submitted",
  "data": {
    "_id": "booking_id",
    "gigId": "gig_id",
    "workerId": "worker_user_id",
    "ownerId": "owner_user_id",
    "status": "pending",
    "appliedAt": "2026-05-15T14:00:00Z"
  }
}
```

**Test Notes:**
- ✅ Worker role required
- ✅ Creates booking with "pending" status
- ✅ Notifies owner
- ❌ Should prevent duplicate applications

---

#### 3.1.2 GET /api/bookings/my
**Purpose:** Get authenticated user's bookings

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit`: Default 10
- `page`: Default 1

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "bookings": [
      {
        "_id": "booking_id",
        "gigId": "gig_id",
        "gigTitle": "iPhone 15 Sales",
        "ownerId": "owner_user_id",
        "ownerName": "Rock Healthy",
        "status": "accepted",
        "appliedAt": "2026-05-15T14:00:00Z",
        "acceptedAt": "2026-05-15T14:30:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

**Test Notes:**
- ✅ Returns both owner and worker bookings
- ✅ Filters based on user role

---

#### 3.1.3 GET /api/bookings/:id
**Purpose:** Get booking details

**Request Headers:**
```
Authorization: Bearer <token>
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "booking_id",
    "gigId": "gig_id",
    "workerId": "worker_id",
    "ownerId": "owner_id",
    "gigTitle": "iPhone 15 Sales",
    "status": "accepted",
    "appliedAt": "2026-05-15T14:00:00Z",
    "acceptedAt": "2026-05-15T14:30:00Z",
    "earnings": 2250  // For sales gigs
  }
}
```

---

#### 3.1.4 PATCH /api/bookings/:id/accept
**Purpose:** Owner accepts worker's application

**Request Headers:**
```
Authorization: Bearer <token>  // Owner token
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Application accepted",
  "data": {
    "_id": "booking_id",
    "status": "accepted",
    "acceptedAt": "2026-05-15T14:30:00Z"
  }
}
```

**Test Notes:**
- ✅ Owner only
- ✅ Changes status to "accepted"
- ✅ Notifies worker
- ❌ Cannot accept if already accepted/rejected

---

#### 3.1.5 PATCH /api/bookings/:id/complete
**Purpose:** Mark booking as complete

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Booking completed",
  "data": {
    "_id": "booking_id",
    "status": "completed",
    "completedAt": "2026-05-15T15:00:00Z"
  }
}
```

**Test Notes:**
- ✅ Available to both owner and worker
- ✅ Finalizes the gig
- ✅ Makes workers eligible for disputes/reviews

---

#### 3.1.6 PATCH /api/bookings/:id/cancel
**Purpose:** Cancel booking

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "No longer available"
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Booking cancelled",
  "data": {
    "_id": "booking_id",
    "status": "cancelled",
    "cancellationReason": "No longer available",
    "cancelledAt": "2026-05-15T15:00:00Z"
  }
}
```

---

---

## Layer 4: Contracts & Payments (Squad Integration)

### 4.1 Sales Gig Flow

#### 4.1.1 POST /api/contracts/:id/sales/record-pickup
**Purpose:** Worker records stock pickup

**Request Headers:**
```
Authorization: Bearer <token>  // Worker token
Content-Type: application/json
```

**Request Body:**
```json
{
  "quantity": 5,
  "value": 7500
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Stock pickup recorded",
  "data": {
    "contractId": "contract_id",
    "quantity": 5,
    "value": 7500,
    "commission": 1125,
    "pickedUpAt": "2026-05-15T14:00:00Z"
  }
}
```

**Test Notes:**
- ✅ Worker role required
- ✅ Commission = value × (commissionPercent / 100)
- ✅ Tracks inventory

---

#### 4.1.2 POST /api/contracts/:id/sales/payment-link
**Purpose:** Generate Squad payment link for customer

**Request Headers:**
```
Authorization: Bearer <token>  // Worker token
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerEmail": "customer@example.com"
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Payment link generated",
  "data": {
    "paymentUrl": "https://checkout.squad.co/...",
    "reference": "SQUAD_REF_123456",
    "amount": 7500,
    "expiresAt": "2026-05-22T14:00:00Z"
  }
}
```

**Test Notes:**
- ✅ Uses Squad payment gateway
- ✅ Generates unique links per transaction
- ✅ Links expire after 7 days
- ✅ Webhook notifies system when customer pays

---

#### 4.1.3 GET /api/contracts/:id/sales/earnings
**Purpose:** Get real-time earnings for sales gig

**Request Headers:**
```
Authorization: Bearer <token>
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "contractId": "contract_id",
    "totalSalesValue": 37500,
    "totalCommission": 5625,
    "withdrawnAmount": 0,
    "availableBalance": 5625,
    "transactions": [
      {
        "quantity": 5,
        "value": 7500,
        "commission": 1125,
        "status": "completed",
        "date": "2026-05-15T14:00:00Z"
      }
    ]
  }
}
```

**Test Notes:**
- ✅ Real-time calculation
- ✅ Shows available vs withdrawn
- ✅ Transaction breakdown

---

### 4.2 Task Gig Flow

#### 4.2.1 POST /api/contracts/:id/task/fund-escrow
**Purpose:** Owner locks payment in escrow

**Request Headers:**
```
Authorization: Bearer <token>  // Owner token
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Escrow funded successfully",
  "data": {
    "contractId": "contract_id",
    "escrowAmount": 500,
    "status": "funded",
    "fundedAt": "2026-05-15T14:00:00Z"
  }
}
```

**Test Notes:**
- ✅ Owner transfers payment to Squad escrow
- ✅ Funds held until worker completes
- ✅ Can be released or refunded

---

#### 4.2.2 POST /api/contracts/:id/task/submit
**Purpose:** Worker submits completed work

**Request Headers:**
```
Authorization: Bearer <token>  // Worker token
Content-Type: application/json
```

**Request Body:**
```json
{
  "notes": "Completed the dashboard with all requested features",
  "attachments": ["https://github.com/link-to-repo", "https://live-demo.com"]
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Deliverable submitted",
  "data": {
    "contractId": "contract_id",
    "status": "submitted",
    "submittedAt": "2026-05-15T14:00:00Z",
    "notes": "Completed the dashboard...",
    "attachments": [...]
  }
}
```

**Test Notes:**
- ✅ Worker provides proof of completion
- ✅ Attachments stored
- ✅ Triggers AI verification if evidence required

---

#### 4.2.3 POST /api/contracts/:id/task/approve
**Purpose:** Owner approves and releases escrow

**Request Headers:**
```
Authorization: Bearer <token>  // Owner token
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Task approved and payment released",
  "data": {
    "contractId": "contract_id",
    "status": "completed",
    "paymentReleased": 500,
    "approvedAt": "2026-05-15T14:30:00Z"
  }
}
```

**Test Notes:**
- ✅ Owner marks work as satisfactory
- ✅ Squad releases escrow to worker wallet
- ✅ Creates transaction record
- ✅ Enables worker to leave review

---

#### 4.2.4 POST /api/contracts/:id/task/dispute
**Purpose:** Owner disputes work quality

**Request Headers:**
```
Authorization: Bearer <token>  // Owner token
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Work does not meet specifications. Missing chart functionality.",
  "evidence": ["screenshot_url_1", "screenshot_url_2"]
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Dispute opened",
  "data": {
    "contractId": "contract_id",
    "disputeId": "dispute_id",
    "status": "open",
    "reason": "Work does not meet specifications...",
    "openedAt": "2026-05-15T14:30:00Z"
  }
}
```

**Test Notes:**
- ✅ Puts contract in dispute
- ✅ Blocks escrow release
- ✅ Platform admin reviews
- ✅ Can result in refund or worker revision

---

### 4.3 Contract Management

#### 4.3.1 GET /api/contracts/:id
**Purpose:** Get contract details

**Request Headers:**
```
Authorization: Bearer <token>
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "contract_id",
    "bookingId": "booking_id",
    "gigId": "gig_id",
    "ownerId": "owner_id",
    "workerId": "worker_id",
    "workType": "task",
    "status": "completed",
    "amount": 500,
    "escrowStatus": "released",
    "createdAt": "2026-05-15T14:00:00Z",
    "completedAt": "2026-05-15T14:30:00Z"
  }
}
```

---

#### 4.3.2 GET /api/contracts
**Purpose:** Get user's contracts with filters

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `workType`: "sales" or "task"
- `status`: "pending", "active", "completed", "disputed"
- `limit`: Default 10
- `page`: Default 1

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "contracts": [
      {
        "_id": "contract_id",
        "gigTitle": "iPhone 15 Sales",
        "counterpartyName": "Alice Worker",
        "status": "completed",
        "amount": 500,
        "createdAt": "2026-05-15T14:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

---

## Layer 5: AI Service (Gemini Integration)

### 5.1 AI Endpoints

#### 5.1.1 POST /api/ai/match-score
**Purpose:** Score how well worker matches a gig

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "gigData": {
    "workType": "sales",
    "skillLevel": "intermediate",
    "evidenceRequired": "none",
    "productName": "iPhone 15",
    "category": "retail"
  },
  "helperProfile": {
    "skillLevel": "intermediate",
    "completedGigs": 15,
    "avgRating": 4.8,
    "totalEarnings": 50000,
    "recentActivity": "Completed 3 gigs in last 2 weeks"
  }
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "matchScore": 87,
    "reasons": [
      "Skill level matches perfectly",
      "Excellent track record with 15 completed gigs",
      "High average rating of 4.8/5",
      "Recent activity shows engagement"
    ]
  }
}
```

**Test Notes:**
- ✅ Uses Gemini AI
- ✅ Scores 0-100
- ✅ Provides reasoning
- ✅ Used in /gigs/matched endpoint

---

#### 5.1.2 POST /api/ai/verify-evidence
**Purpose:** Analyze work photos for quality and skill level

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "imageUrl": "base64_or_url_to_image",
  "claimedSkillLevel": "intermediate",
  "workType": "carpentry"
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "verified": true,
    "detectedLevel": "intermediate",
    "quality": "high",
    "confidence": 92,
    "flags": [],
    "qualitySignals": [
      "Professional finishing",
      "Proper tool usage",
      "Clean workmanship"
    ]
  }
}
```

**Test Notes:**
- ✅ Uses Gemini vision API
- ✅ Analyzes images for quality
- ✅ Detects skill level from visual cues
- ✅ Returns confidence score
- ✅ Can flag suspicious submissions

---

#### 5.1.3 POST /api/ai/credit-score
**Purpose:** Calculate credit score from transaction history

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "transactionHistory": {
    "totalTransactions": 45,
    "totalVolume": 500000,
    "successRate": 98,
    "averageTransactionValue": 11111,
    "daysSinceFirstTransaction": 180,
    "chargebackCount": 0,
    "disputeCount": 0,
    "averageDaysToCompletion": 3,
    "recentPaymentSuccess": true
  }
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "creditScore": 780,
    "riskLevel": "low",
    "loanEligibility": true,
    "maxLoanAmount": 50000,
    "breakdown": {
      "transactionVolumeScore": 90,
      "successRateScore": 98,
      "historyLengthScore": 85,
      "disputeScore": 100
    }
  }
}
```

**Test Notes:**
- ✅ Uses Gemini data analysis
- ✅ Score 300-850 (like FICO)
- ✅ Determines loan eligibility
- ✅ Personalized max loan amount

---

#### 5.1.4 POST /api/ai/detect-anomaly
**Purpose:** Detect fraudulent transactions

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "transactions": [
    {
      "id": "t1",
      "amount": 50000,
      "type": "credit",
      "timestamp": "2026-05-15T10:00:00Z",
      "status": "completed"
    },
    {
      "id": "t2",
      "amount": 60000,
      "type": "credit",
      "timestamp": "2026-05-15T10:05:00Z",
      "status": "completed"
    }
  ]
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "anomaliesDetected": 1,
    "riskLevel": "medium",
    "anomalies": [
      {
        "transactionId": "t2",
        "riskScore": 72,
        "reason": "Unusually large transaction (60,000) in rapid succession",
        "recommendation": "Review manually"
      }
    ]
  }
}
```

**Test Notes:**
- ✅ Uses Gemini anomaly detection
- ✅ Analyzes transaction patterns
- ✅ Flags suspicious activity
- ✅ Prevents fraud

---

---

## Layer 6: Evidence & Reputation

### 6.1 Evidence Management

#### 6.1.1 POST /api/evidence/upload
**Purpose:** Upload work photos with AI verification

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `photos`: File[] (max 10 files, 5MB each)
- `contractId`: string (required)
- `workType`: "sales" | "task" (required)
- `notes`: string (optional)

**Expected Response (201):**
```json
{
  "status": "success",
  "message": "Photos uploaded. AI verification in progress...",
  "data": {
    "evidenceId": "evidence_id",
    "status": "pending",
    "photoCount": 3,
    "message": "Awaiting AI verification..."
  }
}
```

**Test Notes:**
- ✅ Multipart upload
- ✅ AI verification runs asynchronously
- ✅ Updates status when complete
- ✅ Max 10 photos per upload

---

#### 6.1.2 GET /api/evidence
**Purpose:** Get user's evidence uploads

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit`: Default 10, max 50
- `offset`: Default 0

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "evidence": [
      {
        "_id": "evidence_id",
        "contractId": "contract_id",
        "photoCount": 3,
        "status": "verified",
        "quality": "high",
        "uploadedAt": "2026-05-15T14:00:00Z",
        "verifiedAt": "2026-05-15T14:10:00Z"
      }
    ],
    "total": 1
  }
}
```

---

#### 6.1.3 GET /api/evidence/:id
**Purpose:** Get specific evidence

**Request Headers:**
```
Authorization: Bearer <token>
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "evidence_id",
    "userId": "user_id",
    "contractId": "contract_id",
    "workType": "task",
    "status": "verified",
    "photos": [
      {
        "url": "https://...",
        "uploadedAt": "2026-05-15T14:00:00Z",
        "metadata": { "size": 512000, "mimeType": "image/jpeg" }
      }
    ],
    "aiAnalysis": {
      "quality": "high",
      "skillLevelDetected": "intermediate",
      "confidence": 92,
      "flags": [],
      "qualitySignals": ["Professional finishing", "Clean workmanship"]
    }
  }
}
```

---

#### 6.1.4 GET /api/evidence/contract/:contractId
**Purpose:** Get evidence for a contract

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "evidence_id",
    "contractId": "contract_id",
    "photoCount": 3,
    "status": "verified",
    "aiAnalysis": { /* ... */ }
  }
}
```

---

### 6.2 Reviews & Reputation

#### 6.2.1 POST /api/reviews
**Purpose:** Post review after gig completion

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "bookingId": "booking_id",
  "rating": 5,
  "comment": "Excellent work, very professional and timely",
  "tags": ["punctual", "skilled", "professional"]
}
```

**Expected Response (201):**
```json
{
  "status": "success",
  "message": "Review posted successfully",
  "data": {
    "_id": "review_id",
    "bookingId": "booking_id",
    "reviewerId": "reviewer_id",
    "rating": 5,
    "comment": "Excellent work...",
    "tags": ["punctual", "skilled", "professional"],
    "createdAt": "2026-05-15T14:00:00Z"
  }
}
```

**Test Notes:**
- ✅ Only available after gig completed
- ✅ 1-5 star rating
- ✅ Updates user's average rating
- ✅ Can use predefined tags

---

#### 6.2.2 GET /api/reviews/:userId
**Purpose:** Get user's reviews

**Query Parameters:**
- `limit`: Default 10
- `page`: Default 1

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "reviews": [
      {
        "_id": "review_id",
        "rating": 5,
        "comment": "Excellent work...",
        "reviewerName": "Rock Healthy",
        "createdAt": "2026-05-15T14:00:00Z"
      }
    ],
    "averageRating": 4.8,
    "totalReviews": 25,
    "page": 1,
    "limit": 10
  }
}
```

**Test Notes:**
- ✅ Public endpoint
- ✅ Shows overall rating
- ✅ Paginated results

---

#### 6.2.3 GET /api/reputation/:userId
**Purpose:** Get reputation summary (authenticated)

**Request Headers:**
```
Authorization: Bearer <token>
```

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "userId": "user_id",
    "averageRating": 4.8,
    "totalReviews": 25,
    "completedGigs": 45,
    "successRate": 98,
    "trustTier": "gold",
    "creditScore": 780,
    "loanEligibility": true,
    "maxLoanAmount": 50000,
    "joinDate": "2025-11-01T00:00:00Z"
  }
}
```

**Test Notes:**
- ✅ Requires authentication
- ✅ Returns private reputation details
- ✅ Includes credit score

---

#### 6.2.4 GET /api/reputation/public/:userId
**Purpose:** Get public profile (anyone can view)

**Expected Response (200):**
```json
{
  "status": "success",
  "data": {
    "userId": "user_id",
    "name": "Alice Worker",
    "averageRating": 4.8,
    "totalReviews": 25,
    "completedGigs": 45,
    "trustTier": "gold",
    "joinDate": "2025-11-01T00:00:00Z"
  }
}
```

**Test Notes:**
- ✅ Public endpoint
- ✅ Shows verified worker info
- ✅ No credit score or sensitive data

---

---

## Webhooks

### 6.3.1 POST /webhooks/squad
**Purpose:** Handle Squad payment notifications

**Request Headers:**
```
Content-Type: application/json
X-Squad-Signature: signature_verification
```

**Request Body:**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "payment_ref_123",
    "amount": 50000,
    "customer_id": "cust_123",
    "metadata": {
      "contractId": "contract_id",
      "transactionType": "sales"
    }
  }
}
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Webhook processed"
}
```

**Test Notes:**
- ✅ Updates wallet balance
- ✅ Changes transaction status
- ✅ Triggers notifications
- ✅ Signature verification required

---

---

## Testing Sequence (Recommended Order)

### Phase 1: Setup (Authentication & Wallet)
1. ✅ Signup client
2. ✅ Signup worker
3. ✅ Login (both users)
4. ✅ Create wallet (client)
5. ✅ Get wallet
6. ✅ Create wallet (worker)

### Phase 2: Gigs (Create, List, Browse)
7. ✅ Post sales gig (client)
8. ✅ Post task gig (client)
9. ✅ Get all gigs
10. ✅ Get matched gigs (worker)
11. ✅ Get gig details

### Phase 3: Bookings & Contracts
12. ✅ Apply for gig (worker)
13. ✅ Get my bookings (worker)
14. ✅ Accept application (client)
15. ✅ Get contract details

### Phase 4: Sales Flow
16. ✅ Record pickup (worker)
17. ✅ Generate payment link
18. ✅ (Manual) Complete Squad payment in browser
19. ✅ Get earnings

### Phase 5: Task Flow
20. ✅ Fund escrow (client)
21. ✅ Submit deliverable (worker)
22. ✅ Approve task (client)
23. ✅ Get wallet balance (should increase)

### Phase 6: AI & Reputation
24. ✅ Upload evidence (worker)
25. ✅ Get evidence
26. ✅ Post review (client)
27. ✅ Get user reputation
28. ✅ Get public profile

---

## Postman Collection Issues & Corrections

| Issue | Postman URL | Actual URL | Status |
|-------|-------------|-----------|--------|
| Bookings | `GET /api/bookings?role=worker` | `GET /bookings/my` | ⚠️ **UPDATE NEEDED** |
| Reputation | `GET /api/reputation/{{helperId}}` | `GET /reputation/:id` | ✅ Same |
| Public Profile | `GET /api/reputation/public/{{helperId}}` | `GET /reputation/public/:id` | ✅ Same |
| Evidence Upload | `POST /api/evidence/upload` | `POST /evidence/upload` | ✅ Same |
| Reviews | `GET /api/reviews/{{helperId}}` | `GET /reviews/:userId` | ✅ Same |

### Postman Collection Update Required

The following Postman requests need updating:

1. **Get My Bookings:** Change from  
   `GET {{baseUrl}}/api/bookings?role=worker&limit=10&page=1`  
   to  
   `GET {{baseUrl}}/api/bookings/my?limit=10&page=1`

---

## Summary

- **Total Endpoints:** 28
- **Authentication:** JWT Bearer tokens
- **Payment Integration:** Squad (virtual accounts + transfers)
- **AI Integration:** Gemini (matching, evidence verification, credit scoring)
- **Database:** MongoDB
- **Status:** ✅ All core functionality implemented

