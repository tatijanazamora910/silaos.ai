import { IBookingAdapter, BookingAdapterRegistry, AdapterHealthStatus } from './IBookingAdapter';
import { logger } from '../utils/logger';

/**
 * Central registry for managing booking platform adapters.
 * Provides a single point for adapter registration, lookup, and health monitoring.
 */
export class BookingAdapterRegistryImpl implements BookingAdapterRegistry {
  private adapters: Map<string, IBookingAdapter> = new Map();
  private healthStatus: Map<string, AdapterHealthStatus> = new Map();

  register(name: string, adapter: IBookingAdapter): void {
    if (!name || name.trim().length === 0) {
      logger.error('Cannot register adapter: name is required');
      throw new Error('Adapter name is required');
    }

    if (!adapter) {
      logger.error(`Cannot register adapter '${name}': adapter instance is required`);
      throw new Error('Adapter instance is required');
    }

    if (!this.isValidAdapter(adapter)) {
      logger.error(`Cannot register adapter '${name}': does not implement IBookingAdapter`);
      throw new Error(
        'Adapter must implement IBookingAdapter interface (checkAvailability, bookSlot)',
      );
    }

    this.adapters.set(name, adapter);

    this.healthStatus.set(name, {
      name,
      healthy: true,
      lastCheck: new Date().toISOString(),
      uptime: 100,
      errorCount: 0,
      successCount: 0,
    });

    logger.info(`Adapter '${name}' registered successfully`);
  }

  get(name: string): IBookingAdapter | undefined {
    if (!name) {
      logger.warn('Adapter lookup attempted with empty name');
      return undefined;
    }

    const adapter = this.adapters.get(name);
    if (!adapter) {
      logger.debug(`Adapter '${name}' not found in registry`);
      return undefined;
    }

    return adapter;
  }

  getAll(): Map<string, IBookingAdapter> {
    return new Map(this.adapters);
  }

  has(name: string): boolean {
    return this.adapters.has(name);
  }

  /**
   * Record successful operation for an adapter.
   * Updates health metrics and uptime calculations.
   */
  recordSuccess(name: string): void {
    const status = this.healthStatus.get(name);
    if (!status) {
      logger.warn(`Attempting to update health for unregistered adapter '${name}'`);
      return;
    }

    status.successCount += 1;
    status.lastCheck = new Date().toISOString();
    this.calculateUptime(status);
  }

  /**
   * Record failed operation for an adapter.
   * Updates health metrics and marks adapter as potentially unhealthy.
   */
  recordError(name: string, error: Error): void {
    const status = this.healthStatus.get(name);
    if (!status) {
      logger.warn(`Attempting to update health for unregistered adapter '${name}'`);
      return;
    }

    status.errorCount += 1;
    status.lastCheck = new Date().toISOString();
    status.failureReason = error.message;

    this.calculateUptime(status);

    if (status.uptime < 50) {
      status.healthy = false;
      logger.warn(`Adapter '${name}' marked as unhealthy (${status.uptime}% uptime)`);
    }
  }

  /**
   * Get health status for a specific adapter.
   */
  getHealth(name: string): AdapterHealthStatus | undefined {
    return this.healthStatus.get(name);
  }

  /**
   * Get health status for all adapters.
   */
  getAllHealth(): AdapterHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * List all registered adapter names.
   */
  listAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Remove an adapter from the registry.
   */
  unregister(name: string): boolean {
    const removed = this.adapters.delete(name);
    this.healthStatus.delete(name);

    if (removed) {
      logger.info(`Adapter '${name}' unregistered`);
    } else {
      logger.warn(`Attempted to unregister non-existent adapter '${name}'`);
    }

    return removed;
  }

  /**
   * Clear all registered adapters.
   */
  clear(): void {
    const count = this.adapters.size;
    this.adapters.clear();
    this.healthStatus.clear();
    logger.info(`Adapter registry cleared (${count} adapters removed)`);
  }

  /**
   * Get a summary of the registry state.
   */
  getSummary(): {
    totalAdapters: number;
    healthyAdapters: number;
    unhealthyAdapters: number;
    adapterNames: string[];
  } {
    const allHealth = Array.from(this.healthStatus.values());
    return {
      totalAdapters: this.adapters.size,
      healthyAdapters: allHealth.filter((h) => h.healthy).length,
      unhealthyAdapters: allHealth.filter((h) => !h.healthy).length,
      adapterNames: this.listAdapters(),
    };
  }

  /**
   * Validate that an object implements IBookingAdapter.
   */
  private isValidAdapter(adapter: unknown): adapter is IBookingAdapter {
    if (typeof adapter !== 'object' || adapter === null) {
      return false;
    }

    const obj = adapter as Record<string, unknown>;

    return (
      typeof obj.checkAvailability === 'function' && typeof obj.bookSlot === 'function'
    );
  }

  /**
   * Calculate uptime percentage based on success and error counts.
   */
  private calculateUptime(status: AdapterHealthStatus): void {
    const total = status.successCount + status.errorCount;

    if (total === 0) {
      status.uptime = 100;
      return;
    }

    status.uptime = Math.round((status.successCount / total) * 100);
  }
}

/**
 * Global singleton instance of the adapter registry.
 */
export const adapterRegistry = new BookingAdapterRegistryImpl();
