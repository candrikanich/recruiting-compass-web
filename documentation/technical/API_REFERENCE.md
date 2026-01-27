# Recruiting Compass: API Reference

Complete API endpoint documentation for Recruiting Compass backend.

---

## Overview

All endpoints use REST conventions and return JSON responses. Requests require JWT authentication (passed via `Authorization: Bearer <token>` header).

**Base URL:** `https://recruitingcompass.com/api`
**Authentication:** Supabase JWT (obtained after login)
**Response Format:** JSON
**Errors:** Standard HTTP status codes

---

## Authentication

### Login (Public Endpoint)

```http
POST /auth/login
Content-Type: application/json

{
  "email": "athlete@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "athlete@example.com",
    "role": "athlete"
  },
  "session": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 3600
  }
}
```

**Error (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

---

## Schools Endpoints

### Get All Schools

```http
GET /schools
Authorization: Bearer <token>
```

**Query Parameters:**
- `division_level` (optional): Filter by D1, D2, D3, JUCO, NAIA
- `priority_tier` (optional): Filter by reach, target, safety
- `sort_by` (optional): fit_score (default), name, added_date
- `limit` (optional): Max results (default 50)
- `offset` (optional): Pagination offset (default 0)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "school_name": "University of Florida",
      "state": "FL",
      "city": "Gainesville",
      "division_level": "D1",
      "priority_tier": "target",
      "fit_score": 8,
      "coach_count": 5,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 50,
    "offset": 0
  }
}
```

---

### Get Single School

```http
GET /schools/:schoolId
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "school_name": "University of Florida",
  "state": "FL",
  "city": "Gainesville",
  "division_level": "D1",
  "priority_tier": "target",
  "founded_year": 1853,
  "student_population": 52000,
  "logo_url": "https://...",
  "school_url": "https://gatorssports.com",
  "notes": "Top choice, great campus",
  "fit_score": 8,
  "coaches": [
    {
      "id": "uuid",
      "coach_name": "Coach Smith",
      "position_title": "Head Coach",
      "email": "smith@ufl.edu",
      "phone": "+1-352-555-1234"
    }
  ],
  "fit_score_breakdown": {
    "academic": 8,
    "athletic": 9,
    "location": 7,
    "program": 8,
    "financial": 7
  }
}
```

**Error (404 Not Found):**
```json
{
  "error": "School not found"
}
```

---

### Create School

```http
POST /schools
Authorization: Bearer <token>
Content-Type: application/json

{
  "school_name": "University of Florida",
  "state": "FL",
  "city": "Gainesville",
  "division_level": "D1",
  "priority_tier": "target"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "school_name": "University of Florida",
  "state": "FL",
  "division_level": "D1",
  "priority_tier": "target",
  "fit_score": 0,
  "created_at": "2025-01-26T14:22:00Z"
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Missing required field: school_name"
}
```

---

### Update School

```http
PATCH /schools/:schoolId
Authorization: Bearer <token>
Content-Type: application/json

{
  "priority_tier": "reach",
  "notes": "Updated notes"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "school_name": "University of Florida",
  "priority_tier": "reach",
  "notes": "Updated notes",
  "updated_at": "2025-01-26T14:25:00Z"
}
```

---

### Delete School

```http
DELETE /schools/:schoolId
Authorization: Bearer <token>
```

**Response (204 No Content):**
(Empty response)

**Note:** Deleting a school also deletes all associated coaches and interactions.

---

## Coaches Endpoints

### Get Coaches for School

```http
GET /schools/:schoolId/coaches
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "coach_name": "Coach Smith",
      "position_title": "Head Coach",
      "email": "smith@ufl.edu",
      "phone": "+1-352-555-1234",
      "position_focus": "Shortstop, 2B",
      "years_at_program": 5,
      "responsiveness_score": 8,
      "last_contact_date": "2025-01-20T15:00:00Z",
      "interaction_count": 3,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### Get Single Coach

```http
GET /coaches/:coachId
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "school_id": "uuid",
  "coach_name": "Coach Smith",
  "position_title": "Head Coach",
  "email": "smith@ufl.edu",
  "phone": "+1-352-555-1234",
  "position_focus": "Shortstop, 2B",
  "years_at_program": 5,
  "coaching_background": "Previously at FSU for 8 years",
  "notes": "Very responsive, likes my athletic profile",
  "responsiveness_score": 8,
  "last_contact_date": "2025-01-20T15:00:00Z",
  "interactions": [
    {
      "id": "uuid",
      "interaction_type": "email_sent",
      "interaction_date": "2025-01-15T10:00:00Z",
      "notes": "Initial introduction email with highlights"
    }
  ]
}
```

---

### Create Coach

```http
POST /schools/:schoolId/coaches
Authorization: Bearer <token>
Content-Type: application/json

{
  "coach_name": "Coach Smith",
  "position_title": "Head Coach",
  "email": "smith@ufl.edu",
  "phone": "+1-352-555-1234",
  "position_focus": "Shortstop, 2B"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "school_id": "uuid",
  "coach_name": "Coach Smith",
  "position_title": "Head Coach",
  "email": "smith@ufl.edu",
  "created_at": "2025-01-26T14:30:00Z"
}
```

---

### Update Coach

```http
PATCH /coaches/:coachId
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newemailaddress@ufl.edu",
  "phone": "+1-352-555-5678",
  "notes": "Updated notes"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "newemailaddress@ufl.edu",
  "phone": "+1-352-555-5678",
  "updated_at": "2025-01-26T14:35:00Z"
}
```

---

### Delete Coach

```http
DELETE /coaches/:coachId
Authorization: Bearer <token>
```

**Response (204 No Content):**

---

## Interactions Endpoints

### Get Interactions for Coach

```http
GET /coaches/:coachId/interactions
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Max results (default 50)
- `offset` (optional): Pagination offset

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "coach_id": "uuid",
      "interaction_type": "email_sent",
      "interaction_date": "2025-01-20T15:00:00Z",
      "duration_minutes": null,
      "notes": "Sent highlights and recruiting survey",
      "outcome": "positive",
      "response_time_hours": 24,
      "created_at": "2025-01-20T16:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 50,
    "offset": 0
  }
}
```

---

### Log Interaction

```http
POST /coaches/:coachId/interactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "interaction_type": "email_sent",
  "interaction_date": "2025-01-20",
  "duration_minutes": null,
  "notes": "Sent highlights and recruiting survey",
  "outcome": "positive"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "coach_id": "uuid",
  "interaction_type": "email_sent",
  "interaction_date": "2025-01-20",
  "notes": "Sent highlights and recruiting survey",
  "outcome": "positive",
  "created_at": "2025-01-26T14:40:00Z"
}
```

---

### Update Interaction

```http
PATCH /interactions/:interactionId
Authorization: Bearer <token>
Content-Type: application/json

{
  "outcome": "positive",
  "notes": "Updated notes"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "outcome": "positive",
  "notes": "Updated notes",
  "updated_at": "2025-01-26T14:42:00Z"
}
```

---

### Delete Interaction

```http
DELETE /interactions/:interactionId
Authorization: Bearer <token>
```

**Response (204 No Content):**

---

## Timeline Endpoints

### Get Timeline Phases

```http
GET /timeline/phases
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "phase_name": "freshman",
      "phase_number": 1,
      "current_phase": true,
      "started_at": "2024-09-01",
      "completed_at": null,
      "tasks": [
        {
          "id": "uuid",
          "task_name": "Build your skills",
          "is_complete": false,
          "task_order": 1
        }
      ]
    }
  ]
}
```

---

### Get Timeline Tasks for Phase

```http
GET /timeline/phases/:phaseId/tasks
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "phase_id": "uuid",
      "task_name": "Build your skills",
      "description": "Focus on improving athletic performance",
      "task_order": 1,
      "is_complete": false,
      "completed_at": null,
      "depends_on_task_id": null,
      "is_locked": false
    }
  ]
}
```

---

### Update Task Completion

```http
PATCH /timeline/tasks/:taskId
Authorization: Bearer <token>
Content-Type: application/json

{
  "is_complete": true
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "task_name": "Build your skills",
  "is_complete": true,
  "completed_at": "2025-01-26T14:45:00Z",
  "updated_at": "2025-01-26T14:45:00Z"
}
```

---

### Advance Phase

```http
POST /timeline/phases/:phaseId/advance
Authorization: Bearer <token>
Content-Type: application/json

{}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "phase_name": "sophomore",
  "phase_number": 2,
  "current_phase": true,
  "started_at": "2025-01-26",
  "message": "Congratulations! You've advanced to Sophomore phase"
}
```

---

## Fit Score Endpoints

### Get School Fit Score

```http
GET /schools/:schoolId/fit-score
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "school_id": "uuid",
  "overall_score": 8,
  "breakdown": {
    "academic": 8,
    "athletic": 9,
    "location": 7,
    "program": 8,
    "financial": 7
  },
  "last_calculated_at": "2025-01-26T10:00:00Z",
  "calculation_summary": "Strong academic and athletic match, slightly distant location"
}
```

---

### Get All Fit Scores

```http
GET /schools/fit-scores
Authorization: Bearer <token>
```

**Query Parameters:**
- `min_score` (optional): Minimum fit score (1-10)
- `sort_by` (optional): score (default), school_name

**Response (200 OK):**
```json
{
  "data": [
    {
      "school_id": "uuid",
      "school_name": "University of Florida",
      "overall_score": 8,
      "breakdown": {
        "academic": 8,
        "athletic": 9,
        "location": 7,
        "program": 8,
        "financial": 7
      }
    }
  ]
}
```

---

## Suggestions Endpoints

### Get AI Suggestions

```http
GET /suggestions
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Max results (default 10)
- `priority` (optional): high, medium, low

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "suggestion_type": "follow_up",
      "suggestion_text": "Follow up with Coach Smith (45 days since last contact)",
      "related_coach_id": "uuid",
      "related_school_id": "uuid",
      "priority": "high",
      "action_suggestion": "Send email mentioning recent athletic performance improvement",
      "is_acted_on": false,
      "created_at": "2025-01-25T10:00:00Z"
    }
  ]
}
```

---

### Mark Suggestion as Acted On

```http
PATCH /suggestions/:suggestionId
Authorization: Bearer <token>
Content-Type: application/json

{
  "is_acted_on": true
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "is_acted_on": true,
  "updated_at": "2025-01-26T14:50:00Z"
}
```

---

## Performance Metrics Endpoints

### Get Performance Metrics

```http
GET /performance/metrics
Authorization: Bearer <token>
```

**Query Parameters:**
- `metric_type` (optional): Filter by dash_60, exit_velocity, etc.
- `sort_by` (optional): date (default), value

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "metric_type": "dash_60",
      "metric_value": 6.8,
      "metric_unit": "seconds",
      "measurement_date": "2025-01-20",
      "notes": "Training hard, improving speed"
    }
  ]
}
```

---

### Add Performance Metric

```http
POST /performance/metrics
Authorization: Bearer <token>
Content-Type: application/json

{
  "metric_type": "dash_60",
  "metric_value": 6.8,
  "metric_unit": "seconds",
  "measurement_date": "2025-01-20",
  "notes": "Training hard, improving speed"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "metric_type": "dash_60",
  "metric_value": 6.8,
  "metric_unit": "seconds",
  "measurement_date": "2025-01-20",
  "created_at": "2025-01-26T14:55:00Z"
}
```

---

## Documents Endpoints

### Get Documents

```http
GET /documents
Authorization: Bearer <token>
```

**Query Parameters:**
- `document_type` (optional): highlights, transcripts, stats, recruiting_survey, other
- `limit` (optional): Max results (default 50)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "document_name": "Spring 2025 Highlights",
      "document_type": "highlights",
      "description": "Latest highlight film",
      "file_url": "https://...",
      "file_size_mb": 125.5,
      "upload_date": "2025-01-15",
      "is_shareable": true,
      "share_token": "token123abc"
    }
  ]
}
```

---

### Upload Document

```http
POST /documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "document_name": "Spring 2025 Highlights",
  "document_type": "highlights",
  "description": "Latest highlight film",
  "file": <binary file data>
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "document_name": "Spring 2025 Highlights",
  "file_url": "https://storage.example.com/files/uuid",
  "file_size_mb": 125.5,
  "created_at": "2025-01-26T15:00:00Z"
}
```

---

### Get Shareable Link

```http
GET /documents/:documentId/share
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "document_id": "uuid",
  "share_token": "token123abc",
  "share_url": "https://recruitingcompass.com/share/token123abc",
  "created_at": "2025-01-26T15:02:00Z"
}
```

---

### Delete Document

```http
DELETE /documents/:documentId
Authorization: Bearer <token>
```

**Response (204 No Content):**

---

## Events Endpoints

### Get Events

```http
GET /events
Authorization: Bearer <token>
```

**Query Parameters:**
- `event_type` (optional): showcase, tournament, camp, coach_visit, campus_visit, recruiting_expo
- `upcoming` (optional): true (only future events), false (all)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "event_name": "Nike SPARQ Showcase",
      "event_type": "showcase",
      "event_date": "2025-05-10",
      "location": "Los Angeles, CA",
      "description": "Top showcase event",
      "coaches_attending": ["uuid1", "uuid2"],
      "registered": true,
      "attended": false
    }
  ]
}
```

---

### Create Event

```http
POST /events
Authorization: Bearer <token>
Content-Type: application/json

{
  "event_name": "Nike SPARQ Showcase",
  "event_type": "showcase",
  "event_date": "2025-05-10",
  "location": "Los Angeles, CA",
  "description": "Top showcase event"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "event_name": "Nike SPARQ Showcase",
  "event_date": "2025-05-10",
  "created_at": "2025-01-26T15:05:00Z"
}
```

---

## User Profile Endpoints

### Get Current User Profile

```http
GET /user/profile
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "athlete@example.com",
  "full_name": "John Doe",
  "role": "athlete",
  "high_school": "Lincoln High School",
  "graduation_year": 2025,
  "primary_position": "Shortstop",
  "profile": {
    "unweighted_gpa": 3.85,
    "sat_score": 1420,
    "preferred_major": "Business",
    "target_divisions": ["D1", "D2"],
    "target_regions": ["California", "Texas"]
  }
}
```

---

### Update User Profile

```http
PATCH /user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "unweighted_gpa": 3.90,
  "sat_score": 1450,
  "target_divisions": ["D1"]
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "profile": {
    "unweighted_gpa": 3.90,
    "sat_score": 1450,
    "target_divisions": ["D1"]
  },
  "updated_at": "2025-01-26T15:10:00Z"
}
```

---

## Parent Account Endpoints

### Invite Parent

```http
POST /account/invite-parent
Authorization: Bearer <token>
Content-Type: application/json

{
  "parent_email": "parent@example.com",
  "relationship": "parent"
}
```

**Response (200 OK):**
```json
{
  "invitation_id": "uuid",
  "parent_email": "parent@example.com",
  "status": "pending",
  "invite_sent_at": "2025-01-26T15:12:00Z"
}
```

---

### Get Linked Accounts

```http
GET /account/links
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "linked_user_id": "uuid",
      "linked_user_name": "John Doe",
      "relationship_type": "athlete",
      "access_level": "view_only",
      "approved_at": "2025-01-20T10:00:00Z"
    }
  ]
}
```

---

### Remove Parent Access

```http
DELETE /account/links/:linkId
Authorization: Bearer <token>
```

**Response (204 No Content):**

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": {
    "school_name": "School name is required"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "You don't have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded. Try again in 60 seconds."
}
```

### 500 Server Error
```json
{
  "error": "Internal server error. Please try again later."
}
```

---

## Rate Limiting

- **Authenticated Users**: 100 requests/minute
- **Public Endpoints**: 20 requests/minute
- **File Uploads**: 10 requests/minute

Rate limit headers:
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Pagination

Endpoints that return lists support pagination:

```
?limit=50&offset=0
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

---

## Webhooks (Coming in v2.0)

- Coach interaction notification
- New offer received
- Phase advancement milestone
- Performance metric updates

---

**API Reference Version:** 1.0
**Last Updated:** 2026-01-26
**Status:** Production-ready for MVP
