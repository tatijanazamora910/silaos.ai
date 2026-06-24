/**
 * Mock Studio Schedule Data
 *
 * Local fallback data used when STUDIO_API_KEY is not configured.
 * Provides realistic class schedule data for testing and development.
 */

export interface MockClass {
  id: string;
  name: string;
  instructorName: string;
  startTime: string;
  endTime: string;
  location: string;
  maxCapacity: number;
  currentEnrollment: number;
  waitlistCount: number;
  classType: string;
}

export interface MockStudio {
  studioId: string;
  studioName: string;
  address: string;
  phone: string;
  classes: MockClass[];
}

/**
 * Mock studio with realistic class schedule
 * Used as fallback when no real API is configured
 */
export const MOCK_STUDIO: MockStudio = {
  studioId: 'studio-demo-001',
  studioName: 'Harmony Pilates Studio (Demo)',
  address: '123 Wellness Ave, Fitness City, FC 12345',
  phone: '(555) 123-4567',
  classes: [
    {
      id: 'class-mat-001',
      name: 'Mat Pilates - Beginner',
      instructorName: 'Sarah Johnson',
      startTime: '2026-06-25T08:00:00Z',
      endTime: '2026-06-25T09:00:00Z',
      location: 'Studio A',
      maxCapacity: 20,
      currentEnrollment: 18,
      waitlistCount: 2,
      classType: 'Pilates',
    },
    {
      id: 'class-reformer-001',
      name: 'Reformer Intensive - Advanced',
      instructorName: 'Michael Chen',
      startTime: '2026-06-25T09:30:00Z',
      endTime: '2026-06-25T10:30:00Z',
      location: 'Studio B',
      maxCapacity: 15,
      currentEnrollment: 12,
      waitlistCount: 0,
      classType: 'Pilates',
    },
    {
      id: 'class-fusion-001',
      name: 'Pilates + Yoga Fusion',
      instructorName: 'Emma Rodriguez',
      startTime: '2026-06-25T10:45:00Z',
      endTime: '2026-06-25T11:45:00Z',
      location: 'Studio A',
      maxCapacity: 18,
      currentEnrollment: 15,
      waitlistCount: 0,
      classType: 'Fusion',
    },
    {
      id: 'class-mat-002',
      name: 'Mat Pilates - Intermediate',
      instructorName: 'Sarah Johnson',
      startTime: '2026-06-25T12:00:00Z',
      endTime: '2026-06-25T13:00:00Z',
      location: 'Studio A',
      maxCapacity: 20,
      currentEnrollment: 8,
      waitlistCount: 0,
      classType: 'Pilates',
    },
    {
      id: 'class-reformer-002',
      name: 'Reformer Basics',
      instructorName: 'David Patel',
      startTime: '2026-06-25T14:00:00Z',
      endTime: '2026-06-25T15:00:00Z',
      location: 'Studio B',
      maxCapacity: 15,
      currentEnrollment: 15,
      waitlistCount: 3,
      classType: 'Pilates',
    },
    {
      id: 'class-private-001',
      name: 'Private Session - One-on-One',
      instructorName: 'Michael Chen',
      startTime: '2026-06-25T15:30:00Z',
      endTime: '2026-06-25T16:30:00Z',
      location: 'Studio C',
      maxCapacity: 1,
      currentEnrollment: 0,
      waitlistCount: 0,
      classType: 'Private',
    },
    {
      id: 'class-mat-003',
      name: 'Evening Flow - All Levels',
      instructorName: 'Emma Rodriguez',
      startTime: '2026-06-25T17:00:00Z',
      endTime: '2026-06-25T18:00:00Z',
      location: 'Studio A',
      maxCapacity: 22,
      currentEnrollment: 20,
      waitlistCount: 1,
      classType: 'Pilates',
    },
    {
      id: 'class-reformer-003',
      name: 'Late Night Reformer',
      instructorName: 'David Patel',
      startTime: '2026-06-25T18:30:00Z',
      endTime: '2026-06-25T19:30:00Z',
      location: 'Studio B',
      maxCapacity: 12,
      currentEnrollment: 10,
      waitlistCount: 0,
      classType: 'Pilates',
    },
  ],
};

/**
 * Filter mock classes by date and class type
 */
export function getMockClassesByDateAndType(
  date: string,
  classType: string,
): MockClass[] {
  const filterDate = new Date(date).toDateString();

  return MOCK_STUDIO.classes.filter((cls) => {
    const classDate = new Date(cls.startTime).toDateString();
    const typeMatch = classType.toLowerCase() === 'all' || cls.classType.toLowerCase().includes(classType.toLowerCase());
    return classDate === filterDate && typeMatch;
  });
}

/**
 * Get a single mock class by ID
 */
export function getMockClassById(classId: string): MockClass | undefined {
  return MOCK_STUDIO.classes.find((cls) => cls.id === classId);
}

/**
 * Simulate booking by updating enrollment count
 * Returns a mock confirmation
 */
export function simulateBooking(classId: string): {
  bookingId: string;
  confirmationNumber: string;
  classId: string;
} {
  const mockClass = getMockClassById(classId);

  if (!mockClass) {
    throw new Error(`Class ${classId} not found in mock data`);
  }

  if (mockClass.currentEnrollment >= mockClass.maxCapacity) {
    throw new Error(`Class ${classId} is full (${mockClass.currentEnrollment}/${mockClass.maxCapacity})`);
  }

  // Simulate enrollment increment
  mockClass.currentEnrollment += 1;

  return {
    bookingId: `MOCK-${classId}-${Date.now()}`,
    confirmationNumber: `DEMO-${Math.random().toString(36).substring(7).toUpperCase()}`,
    classId,
  };
}

/**
 * Reset mock studio data (useful for testing)
 */
export function resetMockStudioData(): void {
  // Reset enrollments to initial state
  MOCK_STUDIO.classes = [
    { ...MOCK_STUDIO.classes[0], currentEnrollment: 18 },
    { ...MOCK_STUDIO.classes[1], currentEnrollment: 12 },
    { ...MOCK_STUDIO.classes[2], currentEnrollment: 15 },
    { ...MOCK_STUDIO.classes[3], currentEnrollment: 8 },
    { ...MOCK_STUDIO.classes[4], currentEnrollment: 15 },
    { ...MOCK_STUDIO.classes[5], currentEnrollment: 0 },
    { ...MOCK_STUDIO.classes[6], currentEnrollment: 20 },
    { ...MOCK_STUDIO.classes[7], currentEnrollment: 10 },
  ];
}
