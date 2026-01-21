# API Endpoint Documentation Guide

**Companion to:** `.github/copilot-instructions.md`
**Purpose:** Establish consistent patterns and documentation standards for Nitro API endpoints
**Status:** Phase 2 implementation guide

---

## 1. API ENDPOINT ARCHITECTURE PRINCIPLES

### File-Based Routing

All endpoints use Nitro's file-based routing system. Path structure maps directly to URLs:

```
server/api/
├── schools.get.ts                    → GET /api/schools
├── schools.post.ts                   → POST /api/schools
├── schools/
│   ├── [id].get.ts                   → GET /api/schools/:id
│   ├── [id].put.ts                   → PUT /api/schools/:id
│   ├── [id].delete.ts                → DELETE /api/schools/:id
│   ├── [id]/
│   │   ├── fit-score.post.ts          → POST /api/schools/:id/fit-score
│   │   ├── fit-score.get.ts           → GET /api/schools/:id/fit-score
│   │   └── coaches.get.ts             → GET /api/schools/:id/coaches
│   └── search.get.ts                 → GET /api/schools/search
└── coaches/
    ├── [id].get.ts
    └── [schoolId]/
        └── [coachId].get.ts          → GET /api/coaches/:schoolId/:coachId
```

### Three-Layer Request Flow

```
1. VALIDATION LAYER
   ├── Extract parameters from URL, query, body
   ├── Validate input types and constraints
   └── Throw 400 Bad Request if invalid

2. AUTHORIZATION LAYER
   ├── Verify user is authenticated (require auth)
   ├── Check ownership (user owns resource)
   ├── Check permissions (user has role)
   └── Throw 401 Unauthorized or 403 Forbidden if denied

3. BUSINESS LOGIC LAYER
   ├── Query database using queryService layer
   ├── Execute business calculations
   ├── Handle errors gracefully
   └── Return formatted response (200, 201, or error code)
```

---

## 2. STANDARD ENDPOINT PATTERNS

### GET (Fetch)

**Purpose:** Retrieve resource(s)

```typescript
// server/api/schools/[id].get.ts
export default defineEventHandler(async (event) => {
  // 1. Extract and validate parameters
  const schoolId = getRouterParam(event, 'id')
  if (!schoolId) {
    throw createError({ statusCode: 400, message: 'School ID required' })
  }

  // 2. Authenticate user
  const user = await requireAuth(event)

  // 3. Fetch resource
  const { data: school, error } = await querySingle<School>(
    'schools',
    { filters: { id: schoolId, user_id: user.id } },
    { context: 'getSchool' }
  )

  if (error || !school) {
    throw createError({ statusCode: 404, message: 'School not found' })
  }

  // 4. Return response
  return {
    success: true,
    data: school,
  }
})
```

**Response Codes:**
- `200 OK` - Resource retrieved successfully
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - No permission
- `404 Not Found` - Resource not found

### POST (Create)

**Purpose:** Create new resource

```typescript
// server/api/schools.post.ts
export default defineEventHandler(async (event) => {
  // 1. Authenticate
  const user = await requireAuth(event)

  // 2. Parse and validate body
  const body = await readBody(event)

  // Validate required fields
  if (!body.name || !body.location) {
    throw createError({
      statusCode: 400,
      message: 'Name and location required',
    })
  }

  // Validate field types/formats
  if (typeof body.name !== 'string' || body.name.length < 2) {
    throw createError({
      statusCode: 400,
      message: 'School name must be at least 2 characters',
    })
  }

  // 3. Sanitize input (if contains HTML/XSS risk)
  const sanitized = {
    name: body.name.trim(),
    location: body.location.trim(),
    notes: sanitizeHtml(body.notes || ''),
  }

  // 4. Insert record
  const { data: schools, error } = await queryInsert<School>(
    'schools',
    [
      {
        ...sanitized,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    { context: 'createSchool' }
  )

  if (error || !schools || schools.length === 0) {
    throw createError({ statusCode: 500, message: 'Failed to create school' })
  }

  // 5. Return created resource with 201 status
  setResponseStatus(event, 201)
  return {
    success: true,
    data: schools[0],
  }
})
```

**Response Codes:**
- `201 Created` - Resource created successfully (use `setResponseStatus(event, 201)`)
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Not authenticated
- `409 Conflict` - Resource already exists (e.g., duplicate email)

### PUT/PATCH (Update)

**Purpose:** Update existing resource

```typescript
// server/api/schools/[id].put.ts
export default defineEventHandler(async (event) => {
  // 1. Extract ID and authenticate
  const schoolId = getRouterParam(event, 'id')
  const user = await requireAuth(event)

  if (!schoolId) {
    throw createError({ statusCode: 400, message: 'School ID required' })
  }

  // 2. Parse body
  const body = await readBody(event)

  // 3. Validate ownership (critical for security)
  const { data: existingSchool, error: fetchError } = await querySingle<School>(
    'schools',
    { filters: { id: schoolId, user_id: user.id } },
    { context: 'verifyOwnership' }
  )

  if (fetchError || !existingSchool) {
    throw createError({ statusCode: 404, message: 'School not found' })
  }

  // 4. Update with partial data
  const { data: updated, error: updateError } = await queryUpdate<School>(
    'schools',
    {
      ...body,
      updated_at: new Date().toISOString(),
    },
    { id: schoolId, user_id: user.id },
    { context: 'updateSchool' }
  )

  if (updateError || !updated || updated.length === 0) {
    throw createError({ statusCode: 500, message: 'Failed to update school' })
  }

  // 5. Return updated resource
  return {
    success: true,
    data: updated[0],
  }
})
```

**Response Codes:**
- `200 OK` - Updated successfully
- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - No permission to update
- `404 Not Found` - Resource not found

### DELETE (Remove)

**Purpose:** Delete resource

```typescript
// server/api/schools/[id].delete.ts
export default defineEventHandler(async (event) => {
  // 1. Extract ID and authenticate
  const schoolId = getRouterParam(event, 'id')
  const user = await requireAuth(event)

  if (!schoolId) {
    throw createError({ statusCode: 400, message: 'School ID required' })
  }

  // 2. Verify ownership
  const { data: school, error: fetchError } = await querySingle<School>(
    'schools',
    { filters: { id: schoolId, user_id: user.id } },
    { context: 'verifyDeletePermission' }
  )

  if (fetchError || !school) {
    throw createError({ statusCode: 404, message: 'School not found' })
  }

  // 3. Clean up related resources (if needed)
  // Example: Delete associated documents
  await queryDelete(
    'documents',
    { school_id: schoolId },
    { context: 'deleteSchoolDocuments', silent: true }
  )

  // 4. Delete resource
  const { error: deleteError } = await queryDelete(
    'schools',
    { id: schoolId, user_id: user.id },
    { context: 'deleteSchool' }
  )

  if (deleteError) {
    throw createError({ statusCode: 500, message: 'Failed to delete school' })
  }

  // 5. Return success (204 or 200 with empty body acceptable)
  return {
    success: true,
    message: 'School deleted',
  }
})
```

**Response Codes:**
- `200 OK` or `204 No Content` - Deleted successfully
- `400 Bad Request` - Invalid ID
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - No permission
- `404 Not Found` - Resource not found

---

## 3. QUERY PARAMETERS & FILTERING

### Pagination Pattern

```typescript
// GET /api/schools?page=1&limit=20
const query = getQuery(event)
const page = parseInt(query.page as string) || 1
const limit = parseInt(query.limit as string) || 20

if (limit > 100) {
  throw createError({ statusCode: 400, message: 'Limit cannot exceed 100' })
}

const offset = (page - 1) * limit

const { data, error, count } = await querySelect<School>(
  'schools',
  {
    select: '*',
    filters: { user_id: user.id },
    order: { column: 'created_at', ascending: false },
    offset,
    limit,
  },
  { context: 'listSchools' }
)

return {
  success: true,
  data,
  pagination: {
    page,
    limit,
    total: count,
    pages: Math.ceil((count || 0) / limit),
  },
}
```

### Filtering Pattern

```typescript
// GET /api/coaches?schoolId=school-123&sport=baseball
const query = getQuery(event)

const filters: Record<string, any> = { user_id: user.id }

if (query.schoolId) {
  filters.school_id = query.schoolId
}

if (query.sport) {
  filters.sport = query.sport
}

const { data, error } = await querySelect<Coach>(
  'coaches',
  {
    select: '*',
    filters,
    order: { column: 'last_name' },
  },
  { context: 'filterCoaches' }
)
```

### Search Pattern

```typescript
// GET /api/schools/search?q=stanford
const query = getQuery(event)
const searchTerm = query.q as string

if (!searchTerm || searchTerm.length < 2) {
  throw createError({
    statusCode: 400,
    message: 'Search term must be at least 2 characters',
  })
}

// Use ilike for case-insensitive LIKE
const { data, error } = await querySelect<School>(
  'schools',
  {
    select: '*',
    filters: { user_id: user.id },
    order: { column: 'name' },
    limit: 20,
  },
  { context: 'searchSchools' }
)

// Filter in-memory (or use Supabase full-text search for better performance)
const results = data.filter(s =>
  s.name.toLowerCase().includes(searchTerm.toLowerCase())
)
```

---

## 4. ERROR HANDLING

### Error Response Format

All errors should follow consistent format:

```typescript
// ✅ Good: Descriptive error with context
throw createError({
  statusCode: 400,
  statusMessage: 'Bad Request',
  data: {
    field: 'email',
    message: 'Invalid email format',
    hint: 'Must be a valid email address (e.g., name@example.com)',
  },
})

// ✅ Good: Simple error message
throw createError({
  statusCode: 404,
  message: 'School not found',
})

// ❌ Bad: Generic error
throw new Error('Error')

// ❌ Bad: Leaking sensitive info
throw createError({
  statusCode: 500,
  message: `Database query failed: ${dbError.details}`,
})
```

### Common HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-----------|
| 200 | OK | Request succeeded (default for GET, PUT, PATCH) |
| 201 | Created | Resource created (use for POST) |
| 204 | No Content | Success but no content (optional for DELETE) |
| 400 | Bad Request | Invalid input, missing required fields |
| 401 | Unauthorized | Not authenticated, missing/invalid token |
| 403 | Forbidden | Authenticated but no permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (duplicate key) |
| 422 | Unprocessable Entity | Validation failed (alternative to 400) |
| 500 | Internal Server Error | Unexpected server error (log it!) |

---

## 5. AUTHENTICATION & AUTHORIZATION

### Require Authentication

```typescript
// Enforce user authentication (throws 401 if not logged in)
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  // User is authenticated; proceed

  // Alternative: optional auth
  const userOptional = await getSession(event)
  if (!userOptional) {
    // Guest access allowed
  }
})
```

### Ownership Check Pattern

**Critical:** Always verify user owns resource before returning/modifying

```typescript
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const schoolId = getRouterParam(event, 'id')

  // Verify ownership in query filter
  const { data: school, error } = await querySingle<School>(
    'schools',
    {
      filters: {
        id: schoolId,
        user_id: user.id, // ← Ensures user owns this school
      },
    },
    { context: 'getSchool' }
  )

  if (error || !school) {
    // Return 404 to prevent user from knowing resource exists
    throw createError({ statusCode: 404, message: 'School not found' })
  }

  return { success: true, data: school }
})
```

### Role-Based Authorization (Optional)

```typescript
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Example: Only admins can delete schools
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Only administrators can delete schools',
    })
  }

  // Proceed with deletion
})
```

---

## 6. REQUEST/RESPONSE EXAMPLES

### Example: Create School

**Request:**
```
POST /api/schools
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "name": "Florida State University",
  "location": "Tallahassee, FL",
  "division": "D1",
  "notes": "Strong baseball program"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "school-123",
    "user_id": "user-456",
    "name": "Florida State University",
    "location": "Tallahassee, FL",
    "division": "D1",
    "notes": "Strong baseball program",
    "created_at": "2026-01-21T10:00:00Z",
    "updated_at": "2026-01-21T10:00:00Z"
  }
}
```

**Error Response (400):**
```json
{
  "statusCode": 400,
  "statusMessage": "Bad Request",
  "message": "School name is required"
}
```

### Example: Fit Score Calculation

**Request:**
```
POST /api/schools/school-123/fit-score
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "athleticFit": 35,
  "academicFit": 22,
  "opportunityFit": 18,
  "personalFit": 12
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "schoolId": "school-123",
    "schoolName": "Florida State University",
    "fitScore": 87,
    "breakdown": {
      "athleticFit": 35,
      "academicFit": 22,
      "opportunityFit": 18,
      "personalFit": 12
    },
    "matchBadge": "Excellent"
  }
}
```

---

## 7. API ENDPOINT INVENTORY

### Schools

- `GET /api/schools` - List schools (with pagination)
- `POST /api/schools` - Create school
- `GET /api/schools/:id` - Get single school
- `PUT /api/schools/:id` - Update school
- `DELETE /api/schools/:id` - Delete school
- `GET /api/schools/:id/fit-score` - Get fit score for school
- `POST /api/schools/:id/fit-score` - Calculate/update fit score
- `GET /api/schools/:id/coaches` - List coaches at school
- `GET /api/schools/search` - Search schools

### Coaches

- `GET /api/coaches` - List coaches (with pagination)
- `POST /api/coaches` - Create coach
- `GET /api/coaches/:id` - Get single coach
- `PUT /api/coaches/:id` - Update coach
- `DELETE /api/coaches/:id` - Delete coach
- `GET /api/coaches/:id/analytics` - Get coach analytics
- `GET /api/coaches/search` - Search coaches

### Interactions

- `GET /api/interactions` - List interactions
- `POST /api/interactions` - Create interaction
- `GET /api/interactions/:id` - Get single interaction
- `PUT /api/interactions/:id` - Update interaction
- `DELETE /api/interactions/:id` - Delete interaction
- `POST /api/interactions/:id/attachments` - Add attachment

### Documents

- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id` - Get document details
- `PUT /api/documents/:id` - Update document metadata
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/share` - Share document
- `DELETE /api/documents/:id/share/:recipientId` - Revoke access

### Performance

- `GET /api/performance/metrics` - List performance metrics
- `POST /api/performance/metrics` - Log performance metric
- `GET /api/performance/analytics` - Get aggregated analytics
- `GET /api/performance/phase` - Get recruiting phase

---

## 8. DOCUMENTATION TEMPLATE

For each new endpoint, document in this format:

```typescript
/**
 * @route GET /api/schools/:id
 * @auth Required (JWT token)
 * @param id (path) - School ID (uuid)
 * 
 * @description
 * Retrieve a single school by ID. Returns 404 if school not owned by user.
 *
 * @response 200 OK
 * {
 *   "success": true,
 *   "data": { School object }
 * }
 *
 * @response 400 Bad Request - Invalid school ID format
 * @response 401 Unauthorized - Not authenticated
 * @response 404 Not Found - School not found or not owned by user
 *
 * @example
 * GET /api/schools/school-123
 * Authorization: Bearer eyJhbGc...
 *
 * Response: { "success": true, "data": { ... } }
 */
export default defineEventHandler(async (event) => {
  // Implementation
})
```

---

## 9. MIGRATION PATH: OLD → NEW PATTERNS

### Before (Direct Supabase)

```typescript
// ❌ OLD: Duplicated error handling, no logging
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    
    if (error) throw error
    return data
  } catch (err) {
    throw createError({ statusCode: 500, message: 'Error' })
  }
})
```

### After (Query Service Layer)

```typescript
// ✅ NEW: Centralized query layer, consistent error handling
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  
  const { data, error } = await querySingle<School>(
    'schools',
    { filters: { id, user_id: user.id } },
    { context: 'getSchool' }
  )
  
  if (error || !data) {
    throw createError({ statusCode: 404, message: 'School not found' })
  }
  
  return { success: true, data }
})
```

**Benefits:**
- Single error handling location (queryService)
- Automatic console logging with context
- Type-safe results
- Cleaner endpoint code

---

## 10. DEPLOYMENT & MONITORING

### Pre-Deployment Checklist

- [ ] All endpoints have authentication checks
- [ ] All ownership checks in place (for user resources)
- [ ] Error responses don't leak sensitive info
- [ ] Query parameters validated & limits enforced
- [ ] All endpoints documented with JSDoc
- [ ] Tests passing (`npm run test`)
- [ ] Build successful (`npm run build`)

### Logging in Production

All endpoints should log important actions:

```typescript
// Log successful operations
console.log(`[${new Date().toISOString()}] Created school ${schoolId} for user ${user.id}`)

// Log errors with context
console.error(`[${new Date().toISOString()}] Failed to create school: ${error.message}`)

// Note: Use queryService logger which already includes context
// No need to duplicate logging if using queryService layer
```

---

## 11. PERFORMANCE OPTIMIZATION

### Pagination Requirements

All list endpoints **must** include pagination:

```typescript
// GET /api/coaches?page=1&limit=20
const { page = 1, limit = 20 } = getQuery(event)

if (limit > 100) {
  throw createError({ statusCode: 400, message: 'Limit max 100' })
}

const offset = (page - 1) * limit
```

### Caching for List Endpoints (Optional)

```typescript
// Cache GET /api/schools for 5 minutes
setResponseHeader(event, 'Cache-Control', 'public, max-age=300')
```

### Eager Loading (Prevent N+1)

```typescript
// ✅ Good: Join related data in single query
const { data } = await querySelect<SchoolWithCoaches>(
  'schools',
  {
    select: `
      *,
      coaches (
        id, name, email, responsiveness_score
      )
    `,
    filters: { user_id: user.id },
  }
)

// ❌ Bad: Query coaches separately for each school (N+1)
for (const school of schools) {
  const coaches = await querySelect('coaches', { school_id: school.id })
}
```

---

## Next Steps (Phase 3)

1. **Migrate existing endpoints** to new patterns (non-blocking)
2. **Standardize documentation** for all endpoints
3. **Add request/response logging** middleware
4. **Create rate limiting** per user/IP
5. **Implement request validation** middleware

---

**For questions:** Refer to [Supabase Integration](../.github/copilot-instructions.md#supabase-integration) section in copilot instructions.
