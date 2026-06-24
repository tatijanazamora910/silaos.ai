# BookingRouter Service Guide

High-level routing service for handling bookings in DEMO and LIVE modes.

---

## 📋 Overview

The `BookingRouter` provides a single interface for booking operations that automatically routes between:

- **DEMO Mode:** Mock class data from `data/mockSchedule.json`
- **LIVE Mode:** Real platform adapters (Mindbody, Arketa, WellnessLiving, Momence)

### Key Features

✅ **Single Interface** — Same methods work in both modes  
✅ **Mode Agnostic** — Automatically detects `MODE` or `OPERATING_MODE` env var  
✅ **Platform Routing** — Routes to correct adapter based on `STUDIO_PLATFORM`  
✅ **Easy Switching** — Switch between DEMO ↔ LIVE at runtime  
✅ **Singleton Pattern** — One instance manages all bookings  

---

## 🚀 Quick Start

### Import and Initialize

```typescript
import { bookingRouter } from '../services';

// Or get the singleton:
import { getBookingRouter } from '../services';
const router = getBookingRouter();
```

### Check Availability

```typescript
// Simple usage
const availability = await bookingRouter.checkAvailability(
  '2026-06-25',
  'Pilates'
);

if (availability.success) {
  console.log(`${availability.availableSpots} spots available!`);
}
```

### Book a Class

```typescript
const booking = await bookingRouter.bookSlot(
  {
    email: 'student@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phoneNumber: '555-0100'
  },
  'class-mat-001'
);

if (booking.success) {
  console.log(`Booked! Confirmation: ${booking.confirmationNumber}`);
}
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Operating Mode (defaults to 'demo')
MODE=demo              # or 'live'
OPERATING_MODE=demo    # Alternative variable name

# Studio Platform Selection (only used in LIVE mode)
STUDIO_PLATFORM=mindbody  # mindbody, arketa, wellnessliving, momence
```

### Example .env

```env
# DEMO mode with mock data
MODE=demo
STUDIO_PLATFORM=mindbody

# OR LIVE mode with real credentials
MODE=live
STUDIO_PLATFORM=mindbody
MINDBODY_API_KEY=sk_live_abc123...
```

---

## 📖 API Reference

### Class: BookingRouter

#### Constructor

```typescript
constructor()
```

Auto-initializes based on `MODE` and `STUDIO_PLATFORM` environment variables.

#### Methods

##### `async checkAvailability(date, classType): Promise<AvailabilityResponse>`

Check class availability.

**Parameters:**
- `date` (string) — Class date in YYYY-MM-DD or flexible format
- `classType` (string) — Type of class (e.g., 'Pilates', 'Mat Pilates')

**Returns:**
```typescript
{
  success: boolean;
  classId: string;
  maxCapacity: number;
  currentEnrollment: number;
  availableSpots: number;
  waitlistAvailable: boolean;
  waitlistCount?: number;
  error?: string;
}
```

**Example:**
```typescript
const result = await bookingRouter.checkAvailability('2026-06-25', 'Pilates');
if (result.success) {
  console.log(`Available: ${result.availableSpots}/${result.maxCapacity}`);
}
```

##### `async bookSlot(clientInfo, slotId): Promise<BookingResponseData>`

Create a booking.

**Parameters:**
- `clientInfo` (ClientInfo) — Client details
- `slotId` (string) — Class slot ID

**Returns:**
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

**Example:**
```typescript
const booking = await bookingRouter.bookSlot(
  {
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Smith'
  },
  'class-mat-001'
);
```

##### `getMode(): BookingMode`

Get current operating mode.

```typescript
const mode = bookingRouter.getMode();
// Returns: BookingMode.DEMO or BookingMode.LIVE
```

##### `getPlatform(): string`

Get current platform.

```typescript
const platform = bookingRouter.getPlatform();
// Returns: 'mindbody', 'arketa', 'wellnessliving', or 'momence'
```

##### `isDemoMode(): boolean`

Check if running in DEMO mode.

```typescript
if (bookingRouter.isDemoMode()) {
  console.log('Using mock data');
}
```

##### `isLiveMode(): boolean`

Check if running in LIVE mode.

```typescript
if (bookingRouter.isLiveMode()) {
  console.log('Connected to real studio platform');
}
```

##### `switchMode(newMode): void`

Switch between DEMO and LIVE modes at runtime.

```typescript
bookingRouter.switchMode(BookingMode.LIVE);
// Now routes to real platform adapters
```

##### `switchPlatform(platform): void`

Switch to a different platform (LIVE mode only).

```typescript
bookingRouter.switchPlatform('arketa');
// Now uses Arketa adapter
```

**Throws:** Error if in DEMO mode

##### `getStatus(): { mode, platform, isDemo, isLive }`

Get complete status information.

```typescript
const status = bookingRouter.getStatus();
console.log(`${status.mode} mode, using ${status.platform}`);
```

---

## 🔄 Mode Routing Logic

### DEMO Mode

When `MODE=demo`:

```
User Input
    ↓
bookingRouter.checkAvailability()
    ↓
platformController (DEMO mode)
    ↓
MockStudioAdapter
    ↓
Load: config/mockStudioData.ts
    ↓
Return mock classes
```

**Data Source:** `src/config/mockStudioData.ts`

**Behavior:**
- Returns 8 realistic mock Pilates classes
- Simulates enrollment and waitlist
- No external API calls
- Instant response

### LIVE Mode

When `MODE=live`:

```
User Input
    ↓
bookingRouter.checkAvailability()
    ↓
platformController (LIVE mode)
    ↓
AdapterFactory.getAdapter(STUDIO_PLATFORM)
    ↓
[Mindbody | Arketa | WellnessLiving | Momence] Adapter
    ↓
Real API call to studio platform
    ↓
Return actual class data
```

**Data Source:** Real studio's platform (API)

**Behavior:**
- Requires valid platform credentials
- Makes actual API calls
- Real studio's classes and availability
- Creates actual bookings in their system

---

## 💡 Usage Examples

### Example 1: Basic Availability Check

```typescript
import { bookingRouter } from '../services';

async function showAvailableClasses() {
  const availability = await bookingRouter.checkAvailability(
    '2026-06-25',
    'Pilates'
  );

  if (availability.success) {
    console.log(`Classes available on 2026-06-25:`);
    console.log(`- Max capacity: ${availability.maxCapacity}`);
    console.log(`- Currently enrolled: ${availability.currentEnrollment}`);
    console.log(`- Available spots: ${availability.availableSpots}`);
    console.log(`- Waitlist available: ${availability.waitlistAvailable}`);
  } else {
    console.error(`Error: ${availability.error}`);
  }
}
```

### Example 2: Complete Booking Flow

```typescript
async function completeBooking(email: string, classDate: string) {
  // Step 1: Check availability
  const availability = await bookingRouter.checkAvailability(
    classDate,
    'Mat Pilates'
  );

  if (!availability.success || availability.availableSpots === 0) {
    console.log('No spots available');
    return;
  }

  // Step 2: Book the class
  const booking = await bookingRouter.bookSlot(
    {
      email: email,
      firstName: 'John',
      lastName: 'Student',
      phoneNumber: '555-0100'
    },
    availability.classId
  );

  if (booking.success) {
    console.log(`✅ Booking confirmed!`);
    console.log(`   ID: ${booking.bookingId}`);
    console.log(`   Confirmation: ${booking.confirmationNumber}`);
    if (booking.bookingUrl) {
      console.log(`   Link: ${booking.bookingUrl}`);
    }
  } else {
    console.error(`❌ Booking failed: ${booking.error}`);
  }
}
```

### Example 3: Mode Switching for Testing

```typescript
import { bookingRouter, BookingMode } from '../services';

async function testBothModes() {
  // Start in DEMO mode
  console.log(`Current mode: ${bookingRouter.getMode()}`);
  
  const demoResult = await bookingRouter.checkAvailability(
    '2026-06-25',
    'Pilates'
  );
  console.log(`DEMO: ${demoResult.availableSpots} spots`);

  // Switch to LIVE mode
  bookingRouter.switchMode(BookingMode.LIVE);
  console.log(`Current mode: ${bookingRouter.getMode()}`);
  
  const liveResult = await bookingRouter.checkAvailability(
    '2026-06-25',
    'Pilates'
  );
  console.log(`LIVE: ${liveResult.availableSpots} spots`);

  // Back to DEMO
  bookingRouter.switchMode(BookingMode.DEMO);
}
```

### Example 4: In a Route Handler

```typescript
import { Router, Request, Response } from 'express';
import { bookingRouter } from '../services';

const router = Router();

router.post('/availability', async (req: Request, res: Response) => {
  const { date, classType } = req.body;

  const availability = await bookingRouter.checkAvailability(date, classType);

  res.json({
    ...availability,
    mode: bookingRouter.getMode(),
    platform: bookingRouter.getPlatform()
  });
});

export default router;
```

### Example 5: Conditional Logic Based on Mode

```typescript
async function handleBooking(userEmail: string, classId: string) {
  if (bookingRouter.isDemoMode()) {
    console.log('DEMO mode: Using mock booking');
    // Could add demo-specific logging or UI
  } else if (bookingRouter.isLiveMode()) {
    console.log(`LIVE mode: Booking with ${bookingRouter.getPlatform()}`);
    // Could add live-specific notifications
  }

  const booking = await bookingRouter.bookSlot(
    { email: userEmail },
    classId
  );

  return booking;
}
```

---

## 🔍 Logging and Debugging

The BookingRouter logs all operations with mode labels:

```bash
# DEMO mode logs
[DEMO] Checking availability for Pilates on 2026-06-25
[DEMO] Availability check result: 5 spots available

# LIVE mode logs
[LIVE:MINDBODY] Checking availability for Pilates on 2026-06-25
[LIVE:MINDBODY] Processing booking for student@example.com on slot class-mat-001
[LIVE:MINDBODY] Booking successful: booking-123456
```

### Enable Debug Logging

```bash
LOG_LEVEL=debug npm start
```

---

## 🧪 Testing

### Test DEMO Mode

```bash
MODE=demo npm run dev

# In another terminal
curl -X POST http://localhost:3000/api/platform/availability \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-06-25", "classType": "Pilates"}'
```

### Test LIVE Mode (with mock credentials)

```bash
MODE=live
STUDIO_PLATFORM=mindbody
MINDBODY_API_KEY=test_key_here

npm run dev
```

### Test Mode Switching

```bash
curl -X POST http://localhost:3000/api/platform/mode/switch \
  -H "Content-Type: application/json" \
  -d '{"mode": "live"}'

# Check status
curl http://localhost:3000/api/platform/status
```

---

## 🔐 Security Considerations

### Credentials in LIVE Mode

- Only required in LIVE mode
- Stored in `.env` (never committed)
- Not exposed in logs
- Validated at startup

### DEMO Mode Data Privacy

- Mock data is synthetic and anonymized
- No real student data
- Safe for public demos
- Can be customized in `data/mockSchedule.json`

---

## 📊 Migration from Direct Adapter Usage

If you were using adapters directly:

**Before:**
```typescript
import { AdapterFactory } from '../services';

const adapter = AdapterFactory.getAdapter('mindbody');
const result = await adapter.checkAvailability(date, classType);
```

**After (using BookingRouter):**
```typescript
import { bookingRouter } from '../services';

const result = await bookingRouter.checkAvailability(date, classType);
// Automatically routes based on MODE
```

**Benefits:**
- ✅ No need to manage AdapterFactory
- ✅ Automatic DEMO/LIVE switching
- ✅ Cleaner API
- ✅ Better logging with mode labels

---

## 🚀 Production Deployment Checklist

- [ ] Set `MODE=live` in production `.env`
- [ ] Set `STUDIO_PLATFORM` to correct platform
- [ ] Add platform-specific credentials to `.env`
- [ ] Test connectivity: `curl /api/platform/status`
- [ ] Verify first real booking works
- [ ] Monitor logs for errors
- [ ] Set up credential rotation schedule

---

## 📚 Related Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) — Credential configuration
- [ONBOARDING_CHECKLIST.md](ONBOARDING_CHECKLIST.md) — Studio setup process
- [MANYCHAT_INTEGRATION.md](MANYCHAT_INTEGRATION.md) — ChatBot integration
- [src/config/platformConfig.ts](src/config/platformConfig.ts) — Core implementation

---

**Last Updated:** June 24, 2026  
**Status:** Production Ready
