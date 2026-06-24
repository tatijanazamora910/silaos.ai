import { Router } from 'express';
import webhookRoutes from './webhooks';
import mindbodyRoutes from './mindbody';
import arketaRoutes from './arketa';
import momenceRoutes from './momence';
import wellnessLivingRoutes from './wellnessLiving';
import adaptersRoutes from './adapters';
import platformRoutes from './platform';
import manychatWebhookRoutes from './manychatWebhook';
import emailRoutes from './email';
import smsRoutes from './sms';
import webformRoutes from './webform';
import googleRoutes from './google';
import leadsRoutes from './leads-dashboard';

const router = Router();

// Original routes
router.use('/webhooks', webhookRoutes);
router.use('/mindbody', mindbodyRoutes);
router.use('/arketa', arketaRoutes);
router.use('/momence', momenceRoutes);
router.use('/wellnessliving', wellnessLivingRoutes);
router.use('/adapters', adaptersRoutes);
router.use('/platform', platformRoutes);
router.use('/manychat', manychatWebhookRoutes);

// New 5-channel lead capture system
router.use('/email', emailRoutes);
router.use('/sms', smsRoutes);
router.use('/webform', webformRoutes);
router.use('/google', googleRoutes);
router.use('/leads', leadsRoutes);

export default router;
