import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

/**
 * Operating mode determines whether to use mock data or real platform adapters
 */
const OPERATING_MODE = (process.env.OPERATING_MODE || 'demo').toLowerCase();
const IS_DEMO_MODE = OPERATING_MODE === 'demo' || OPERATING_MODE === 'development' || OPERATING_MODE === 'test';

export interface AppConfig {
  node_env: string;
  port: number;
  log_level: string;
  operating_mode: string;
  manychat: {
    api_key: string | null;
    webhook_secret: string | null;
  };
  schedulingkit: {
    api_key: string | null;
    business_id: string | null;
  };
  mindbody: {
    api_key: string | null;
  };
  arketa: {
    api_key: string | null;
  };
  momence: {
    api_key: string | null;
    business_id: string | null;
  };
  wellnessLiving: {
    username: string | null;
    password: string | null;
  };
  database: {
    host: string;
    port: number;
    user: string | null;
    password: string | null;
    name: string;
  };
}

/**
 * Validate required environment variable
 * @throws Error if variable is missing and no default provided
 */
function validateRequiredEnvVar(varName: string, defaultValue?: string): string {
  const value = process.env[varName] || defaultValue;
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${varName}\n` +
      `Please check your .env file or set the environment variable.`
    );
  }
  return value;
}

/**
 * Get optional environment variable (null if missing)
 */
function getOptionalEnvVar(varName: string): string | null {
  return process.env[varName] || null;
}

/**
 * Load application configuration from environment variables
 * Credentials are optional in DEMO mode but required for LIVE mode
 */
export const config: AppConfig = {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  log_level: process.env.LOG_LEVEL || 'info',
  operating_mode: OPERATING_MODE,

  // Optional integrations (can work with mock implementations)
  manychat: {
    api_key: getOptionalEnvVar('MANYCHAT_API_KEY'),
    webhook_secret: getOptionalEnvVar('MANYCHAT_WEBHOOK_SECRET'),
  },
  schedulingkit: {
    api_key: getOptionalEnvVar('SCHEDULINGKIT_API_KEY'),
    business_id: getOptionalEnvVar('SCHEDULINGKIT_BUSINESS_ID'),
  },

  // Studio platform credentials - required in LIVE mode, optional in DEMO mode
  mindbody: {
    api_key: IS_DEMO_MODE
      ? getOptionalEnvVar('MINDBODY_API_KEY')
      : validateRequiredEnvVar('MINDBODY_API_KEY'),
  },
  arketa: {
    api_key: IS_DEMO_MODE
      ? getOptionalEnvVar('ARKETA_API_KEY')
      : validateRequiredEnvVar('ARKETA_API_KEY'),
  },
  momence: {
    api_key: IS_DEMO_MODE
      ? getOptionalEnvVar('MOMENCE_API_KEY')
      : validateRequiredEnvVar('MOMENCE_API_KEY'),
    business_id: IS_DEMO_MODE
      ? getOptionalEnvVar('MOMENCE_BUSINESS_ID')
      : validateRequiredEnvVar('MOMENCE_BUSINESS_ID'),
  },
  wellnessLiving: {
    username: IS_DEMO_MODE
      ? getOptionalEnvVar('WL_USERNAME')
      : validateRequiredEnvVar('WL_USERNAME'),
    password: IS_DEMO_MODE
      ? getOptionalEnvVar('WL_PASSWORD')
      : validateRequiredEnvVar('WL_PASSWORD'),
  },

  // Database - optional (mock data used if not configured)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: getOptionalEnvVar('DB_USER'),
    password: getOptionalEnvVar('DB_PASSWORD'),
    name: process.env.DB_NAME || 'pilates_studio',
  },
};

// Log configuration status at startup
if (IS_DEMO_MODE) {
  logger.info('Starting in DEMO mode - using mock studio data');
} else {
  logger.info(`Starting in LIVE mode - using ${OPERATING_MODE} platform adapters`);
}
