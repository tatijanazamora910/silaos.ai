# Booking Platform Adapters

This directory contains adapter implementations for various studio management platforms, providing a unified interface for availability checks and class bookings.

## Overview

All adapters implement the standard `IBookingAdapter` interface (`../IBookingAdapter.ts`):

```typescript
interface IBookingAdapter {
  checkAvailability(date: string, classType: string): Promise<AvailabilityResponse>;
  bookSlot(clientInfo: ClientInfo, slotId: string): Promise<BookingResponseData>;
}
```

## Adapters

### MindbodyAdapter.ts (212 lines)

Connects to **Mindbody by Zenoti** public API for class scheduling and bookings.

**Key Features:**
- Public REST API integration
- Sandbox testing support (SiteID -99)
- API key authentication via Bearer token

**Configuration:**
- Requires: `MINDBODY_API_KEY` environment variable

**Endpoints to Implement:**
- `GET /class/classes` — Fetch class availability
- `POST /booking/addclient` — Create booking

**TODO Sections:**
1. Implement `checkAvailability()` API call to fetch class data
2. Parse response: `maxCapacity`, `currentEnrollment`, `waitlistCount`
3. Implement `bookSlot()` API call to create client booking
4. Parse booking response: `bookingId`, `confirmationNumber`
5. Handle response field variations (classlimit, enrolled, etc.)

---

### ArketaAdapter.ts (210 lines)

Connects to **Arketa** event-based scheduling API.

**Key Features:**
- Event-driven availability updates
- Webhook-based class information
- RESTful booking creation

**Configuration:**
- Requires: `ARKETA_API_KEY` environment variable (placeholder)

**Endpoints to Implement:**
- `GET /classes` — Fetch class availability
- `POST /bookings` or `/enrollments` — Create enrollment/booking

**TODO Sections:**
1. Implement `checkAvailability()` API call with date and classId filters
2. Parse Arketa event response structure for capacity/enrollment
3. Implement `bookSlot()` API call to enroll client
4. Parse enrollment response: `enrollmentId`, `status`, `confirmationCode`
5. Handle Arketa-specific field names and structures

---

### WellnessLivingAdapter.ts (324 lines)

Connects to **WellnessLiving** (Zen Planner) session-based API.

**Key Features:**
- Session-based authentication
- 30-minute session expiry with automatic refresh
- Username/password login
- Cookie-based state management

**Configuration:**
- Requires: `WL_USERNAME`, `WL_PASSWORD` environment variables

**Authentication Flow:**
1. POST to `/API/auth/login` with username/password
2. Extract session token from response
3. Set `X-Wellness-Session` header for authenticated requests
4. Implement session expiry tracking and auto-refresh

**Endpoints to Implement:**
- `POST /API/auth/login` — Authenticate and create session
- `GET /API/class/availability` — Fetch availability with session
- `POST /API/class/booking/create` — Create booking with session

**TODO Sections:**
1. Implement `createSession()` method for login
2. Parse session token and set expiry (30 min)
3. Implement `ensureSession()` for auto-refresh logic
4. Implement availability and booking with session headers
5. Parse field variations (classlimit, enrolled, id, confirmationCode)

**Session Management:**
- `getSessionInfo()` returns session data with token redacted
- `clearSession()` removes session on logout
- `WLSessionData` interface tracks session state

---

### MomenceAdapter.ts (248 lines)

Connects to **Momence** modern studio management REST API.

**Key Features:**
- Clean REST API design
- Multi-tenant support via Business ID
- Stateless API (no sessions required)
- Direct API key authentication

**Configuration:**
- Requires: `MOMENCE_API_KEY`, `MOMENCE_BUSINESS_ID` environment variables

**Headers:**
- `Authorization: Bearer ${apiKey}`
- `X-Business-ID: ${businessId}`

**Endpoints to Implement:**
- `GET /classes` — Fetch class availability
- `POST /bookings` — Create booking

**TODO Sections:**
1. Implement `checkAvailability()` API call with classId and date
2. Parse class response: `maxCapacity`, `currentEnrollment`, `waitlistCount`, `nextAvailableSlot`
3. Implement `bookSlot()` API call with customer object
4. Parse booking response: `bookingId`, `confirmationNumber`, `bookingUrl`
5. Handle nested customer structure in booking payload

---

## Implementation Checklist

When implementing a new adapter or completing a skeleton:

### 1. API Integration
- [ ] Read platform API documentation
- [ ] Identify authentication method (API key, session, OAuth, etc.)
- [ ] Document required environment variables
- [ ] List all API endpoints needed

### 2. Availability Check
- [ ] Implement `checkAvailability(date, classType)` method
- [ ] Create API request with proper authentication
- [ ] Extract response fields: capacity, enrollment, spots, waitlist
- [ ] Handle response field name variations
- [ ] Implement error handling and logging

### 3. Booking Creation
- [ ] Implement `bookSlot(clientInfo, slotId)` method
- [ ] Validate client info (email required)
- [ ] Create API request with booking data
- [ ] Extract response: booking ID, confirmation code
- [ ] Handle booking-specific errors (full class, invalid slot, etc.)
- [ ] Implement error handling and logging

### 4. Error Boundaries
- [ ] Input validation with logger.warn()
- [ ] API call wrapped in try-catch with logger.error()
- [ ] Detailed error messages for each HTTP status
- [ ] Connection error handling (timeout, refused, etc.)
- [ ] Never throw exceptions to HTTP layer—always return structured response

### 5. Logging
- [ ] `logger.info()` on method entry and success
- [ ] `logger.warn()` on validation failures
- [ ] `logger.error()` on API errors with full error context
- [ ] Include classId, email, or other identifiers in log messages

### 6. Testing
- [ ] Test availability check with valid date/class
- [ ] Test booking with valid client info
- [ ] Test error cases (missing parameters, API failures, etc.)
- [ ] Verify logging at each error boundary
- [ ] Test with factory: `AdapterFactory.getAdapter('platform')`

---

## Response Types

### AvailabilityResponse
```typescript
{
  success: boolean;
  classId: string;
  maxCapacity: number;
  currentEnrollment: number;
  availableSpots: number;
  waitlistAvailable: boolean;
  waitlistCount?: number;
  nextAvailableSlot?: string; // ISO timestamp
  error?: string;
}
```

### BookingResponseData
```typescript
{
  success: boolean;
  classId: string;
  bookingId?: string;
  confirmationNumber?: string;
  bookingUrl?: string;
  error?: string;
}
```

---

## Platform-Specific Notes

### Mindbody
- Sandbox SiteID: -99
- API base: `https://api.mindbodyonline.com/public/v6`
- Response structure: `{ classes: [...] }`
- Check for alternate field names: classlimit, enrolled, etc.

### Arketa
- API base: `https://api.arketa.com/v1`
- Event-driven (integrates with webhook data)
- Enrollment vs. booking terminology varies
- Waitlist support built-in

### WellnessLiving
- API base: `https://kb.wellnessliving.com`
- Requires session before any API calls
- Session token in response: `sid` or `sessionId`
- Session header: `X-Wellness-Session`
- Session expiry: 30 minutes (implement refresh logic)

### Momence
- API base: `https://api.momence.com/v1`
- Multi-tenant: Always include X-Business-ID header
- No session management needed
- Clean, RESTful design
- Optional: `bookingUrl` for direct confirmation link

---

## Usage

### Via Factory
```typescript
import { AdapterFactory } from '../services';

const adapter = AdapterFactory.getAdapter('momence');
const availability = await adapter.checkAvailability('2026-06-25', 'Pilates');

if (availability.success) {
  console.log(`${availability.availableSpots} spots available`);
}
```

### Direct Import
```typescript
import { createMomenceAdapter } from '../adapters';

const adapter = createMomenceAdapter(apiKey, businessId);
const booking = await adapter.bookSlot(clientInfo, slotId);
```

---

## Contributing

When adding a new adapter:
1. Copy skeleton file structure from existing adapter
2. Replace TODOs with actual API implementation
3. Follow error boundary patterns
4. Add environment variables to `.env.example`
5. Update AdapterFactory switch statement
6. Test with factory and direct import
7. Update this README with platform-specific notes
