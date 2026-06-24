# IBookingAdapter Interface Documentation

Standard interface defining the contract that all booking platform adapters must implement.

---

## 📋 Overview

The `IBookingAdapter` interface ensures consistency across all platform implementations (Mindbody, Arketa, WellnessLiving, Momence). Any developer can implement a new platform by fulfilling this contract.

**Location:** `src/types/index.ts`

**Implemented by:**
- ✅ MindbodyAdapter
- ✅ ArketaAdapter
- ✅ WellnessLivingAdapter
- ✅ MomenceAdapter

---

## 🔧 Interface Definition

```typescript
export interface IBookingAdapter {
  /**
   * Check availability for a class on a given date and type.
   */
  checkAvailability(
    date: string,
    classType: string,
  ): Promise<AvailabilityResponse>;

  /**
   * Book a class slot for a client.
   */
  bookSlot(
    clientInfo: ClientDetails,
    slotId: string,
  ): Promise<BookingResponse>;
}
```

---

## 📝 Method Signatures

### `checkAvailability(date: string, classType: string): Promise<AvailabilityResponse>`

Retrieve available classes for a given date and type.

**Parameters:**
- `date` (string) — Class date in ISO format (YYYY-MM-DD) or flexible format
  - Examples: "2026-06-25", "tomorrow", "Friday"
- `classType` (string) — Type of class
  - Examples: "Pilates", "Mat Pilates", "Reformer", "Fusion"

**Returns:** `Promise<AvailabilityResponse>`

```typescript
{
  success: boolean;          // Whether the check succeeded
  date?: string;             // The date that was checked
  classId?: string;          // Unique class identifier
  maxCapacity?: number;      // Total capacity of the class
  currentEnrollment?: number; // Currently enrolled students
  availableSpots?: number;   // Calculated: maxCapacity - currentEnrollment
  waitlistAvailable?: boolean; // Whether waitlist is accepting
  waitlistCount?: number;    // Number on waitlist
  error?: string;            // Error message if not successful
}
```

**Example:**
```typescript
const availability = await adapter.checkAvailability('2026-06-25', 'Pilates');

if (availability.success) {
  console.log(`${availability.availableSpots}/${availability.maxCapacity} spots`);
  console.log(`Waitlist: ${availability.waitlistCount}`);
}
```

### `bookSlot(clientInfo: ClientDetails, slotId: string): Promise<BookingResponse>`

Book a specific class slot for a client.

**Parameters:**
- `clientInfo` (ClientDetails) — Client information
  ```typescript
  {
    email: string;           // Required
    firstName?: string;      // Client's first name
    lastName?: string;       // Client's last name
    phoneNumber?: string;    // Contact phone
    customerPhone?: string;  // Alternative phone field
    customerName?: string;   // Alternative name field
    clientId?: string;       // Existing client ID (if known)
    [key: string]: unknown;  // Additional fields
  }
  ```

- `slotId` (string) — Unique identifier for the class slot
  - Examples: "class-mat-001", "class-reformer-1", "12345"

**Returns:** `Promise<BookingResponse>`

```typescript
{
  success: boolean;           // Whether booking succeeded
  classId?: string;           // The class that was booked
  bookingId?: string;         // Unique booking identifier
  confirmationNumber?: string; // Human-readable confirmation (e.g., "BK12345")
  confirmationCode?: string;  // Alternative confirmation field
  bookingUrl?: string;        // Direct booking confirmation link (Momence)
  bookedAt?: string;          // Timestamp of booking
  classTime?: string;         // Class start time
  error?: string;             // Error message if not successful
}
```

**Example:**
```typescript
const booking = await adapter.bookSlot(
  {
    email: 'student@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phoneNumber: '555-0100'
  },
  'class-mat-001'
);

if (booking.success) {
  console.log(`✅ Booked! Confirmation: ${booking.confirmationNumber}`);
  console.log(`   Booking ID: ${booking.bookingId}`);
}
```

---

## ✅ Implementation Verification

### Mindbody Adapter

**File:** `src/services/adapters/MindbodyAdapter.ts`

```typescript
export class MindbodyAdapter implements IBookingAdapter {
  async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
    // Mindbody public API v6
    // GET /class/classes with parameters
  }

  async bookSlot(clientInfo: ClientInfo, slotId: string): Promise<BookingResponseData> {
    // Mindbody public API v6
    // POST /booking/addclient
  }
}
```

**Status:** ✅ Implements interface correctly

---

### Arketa Adapter

**File:** `src/services/adapters/ArketaAdapter.ts`

```typescript
export class ArketaAdapter implements IBookingAdapter {
  async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
    // Arketa REST API
    // GET /classes with date and classId filters
  }

  async bookSlot(clientInfo: ClientInfo, slotId: string): Promise<BookingResponseData> {
    // Arketa REST API
    // POST /bookings or /enrollments
  }
}
```

**Status:** ✅ Implements interface correctly

---

### WellnessLiving Adapter

**File:** `src/services/adapters/WellnessLivingAdapter.ts`

```typescript
export class WellnessLivingAdapter implements IBookingAdapter {
  async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
    // WellnessLiving session-based API
    // Auto-creates/refreshes session
    // GET /API/class/availability
  }

  async bookSlot(clientInfo: ClientInfo, slotId: string): Promise<BookingResponseData> {
    // WellnessLiving session-based API
    // Auto-ensures session before booking
    // POST /API/class/booking/create
  }
}
```

**Status:** ✅ Implements interface correctly (with bonus: session management)

---

### Momence Adapter

**File:** `src/services/adapters/MomenceAdapter.ts`

```typescript
export class MomenceAdapter implements IBookingAdapter {
  async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
    // Momence REST API with multi-tenant support
    // GET /classes with X-Business-ID header
  }

  async bookSlot(clientInfo: ClientInfo, slotId: string): Promise<BookingResponseData> {
    // Momence REST API with multi-tenant support
    // POST /bookings with X-Business-ID header
  }
}
```

**Status:** ✅ Implements interface correctly (with bonus: multi-tenant support)

---

## 🔍 Interface Compliance Checklist

All adapters implement:

- ✅ **checkAvailability** method
  - ✅ Accepts `date: string` parameter
  - ✅ Accepts `classType: string` parameter
  - ✅ Returns `Promise<AvailabilityResponse>`
  - ✅ Handles errors gracefully
  - ✅ Logs all operations

- ✅ **bookSlot** method
  - ✅ Accepts `clientInfo: ClientInfo` parameter
  - ✅ Accepts `slotId: string` parameter
  - ✅ Returns `Promise<BookingResponse>`
  - ✅ Validates required fields (email)
  - ✅ Handles errors gracefully
  - ✅ Logs all operations

---

## 🔐 Error Handling

All adapters must handle errors in the response rather than throwing:

**Good (follows interface contract):**
```typescript
async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
  try {
    // API call
    return { success: true, classId, maxCapacity, /* ... */ };
  } catch (error) {
    logger.error('Availability check failed:', error);
    return {
      success: false,
      classId: classType,
      error: 'Failed to check availability'
    };
  }
}
```

**Bad (violates interface contract):**
```typescript
async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
  // API call
  const response = await fetch(...); // Could throw!
  return { success: true, /* ... */ };
}
```

---

## 🧪 Testing the Interface

### Direct Adapter Testing

```typescript
import { AdapterFactory } from '../services';

// Test Mindbody
const adapter = AdapterFactory.getAdapter('mindbody');

// Test checkAvailability
const availability = await adapter.checkAvailability('2026-06-25', 'Pilates');
console.assert(availability.success === true || availability.error !== undefined);
console.assert(typeof availability.classId === 'string');

// Test bookSlot
const booking = await adapter.bookSlot(
  { email: 'test@example.com' },
  'class-123'
);
console.assert(booking.success === true || booking.error !== undefined);
```

### Via Route Handler

```bash
# Test availability
curl -X POST http://localhost:3000/api/adapters/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "mindbody",
    "date": "2026-06-25",
    "classType": "Pilates"
  }'

# Test booking
curl -X POST http://localhost:3000/api/adapters/book \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "mindbody",
    "slotId": "class-123",
    "clientInfo": {
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User"
    }
  }'
```

---

## 📦 Type Exports

All types are exported from `src/types/index.ts`:

```typescript
// Core interface
export interface IBookingAdapter { ... }

// Request types
export interface ClientDetails { ... }
export interface AvailabilityRequest { ... }

// Response types
export interface AvailabilityResponse { ... }
export interface BookingResponse { ... }
export interface ClassInfo { ... }

// Platform types
export enum BookingPlatform { ... }
export enum OperatingMode { ... }
export interface StudioConfig { ... }

// Error types
export class BookingError { ... }
export class AuthenticationError { ... }
export class ConnectivityError { ... }
export class ValidationError { ... }

// Other utilities
export interface AdapterHealthStatus { ... }
export interface BookingAdapterRegistry { ... }
```

**Import in your code:**
```typescript
import {
  IBookingAdapter,
  AvailabilityResponse,
  BookingResponse,
  ClientDetails,
  BookingPlatform,
  OperatingMode,
} from '../types';
```

---

## 🚀 Implementing a New Adapter

To add a new platform, follow this checklist:

1. **Create adapter file** — `src/services/adapters/[Platform]Adapter.ts`

2. **Implement interface:**
   ```typescript
   import { IBookingAdapter, AvailabilityResponse, BookingResponse, ClientDetails } from '../../types';

   export class MyPlatformAdapter implements IBookingAdapter {
     async checkAvailability(date: string, classType: string): Promise<AvailabilityResponse> {
       // Implementation
     }

     async bookSlot(clientInfo: ClientDetails, slotId: string): Promise<BookingResponse> {
       // Implementation
     }
   }
   ```

3. **Export from services** — Update `src/services/index.ts`

4. **Add to AdapterFactory** — Update `src/services/AdapterFactory.ts`

5. **Add credentials to .env.example** — Document what's needed

6. **Add tests** — Create `src/services/adapters/[Platform]Adapter.test.ts`

---

## 📊 Interface Diagram

```
┌─────────────────────────────────────────┐
│      IBookingAdapter (Interface)        │
├─────────────────────────────────────────┤
│ + checkAvailability(date, classType)    │
│ + bookSlot(clientInfo, slotId)          │
└─────────────────────────────────────────┘
          ▲         ▲           ▲         ▲
          │         │           │         │
    ┌─────┴──┐  ┌───┴────┐  ┌───┴─────┐  │
    │ Mindbody   Arketa   WellnessLiving  Momence
    │ Adapter    Adapter   Adapter        Adapter
    │ (✅)       (✅)      (✅)           (✅)
    └──────     ─────     ──────────     ─────
```

---

## 🔗 Related Files

- **Interface Definition:** `src/types/index.ts`
- **Service Exports:** `src/services/index.ts`
- **Factory:** `src/services/AdapterFactory.ts`
- **Registry:** `src/services/adapterRegistry.ts`
- **Platform Controller:** `src/config/platformConfig.ts`
- **Implementations:** `src/services/adapters/`

---

**Last Updated:** June 24, 2026  
**Status:** Production Ready  
**Implementations:** 4/4 adapters ✅
