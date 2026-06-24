import { Router, Request, Response } from 'express';
import { manychatService } from '../services';

const router = Router();

interface WebhookPayload {
  subscriber_id: string;
  text: string;
  [key: string]: unknown;
}

router.post('/manychat', (req: Request, res: Response): void => {
  const signature = req.headers['x-manychat-signature'] as string;
  const body = JSON.stringify(req.body);

  if (!manychatService.verifyWebhookSignature(body, signature)) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const payload = req.body as WebhookPayload;

  try {
    // Route incoming messages for processing
    handleIncomingMessage(payload)
      .then(() => {
        res.status(200).json({ success: true });
      })
      .catch((error) => {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      });
  } catch (error) {
    console.error('Webhook routing error:', error);
    res.status(400).json({ error: 'Bad request' });
  }
});

async function handleIncomingMessage(payload: WebhookPayload): Promise<void> {
  // Placeholder for message processing logic
  console.log('Processing message from subscriber:', payload.subscriber_id);
  console.log('Message text:', payload.text);
}

export default router;
