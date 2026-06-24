# Pilates Studio Chat Booker

WhatsApp/Messenger chatbot integration for booking pilates classes using ManyChat and SchedulingKit APIs.

## Project Structure

```
src/
├── config/          # Environment and application configuration
├── services/        # ManyChat and SchedulingKit API integration
├── routes/          # Webhook endpoints and request routing
├── utils/           # Shared utilities (logger, etc.)
└── server.ts        # Express server with error handling boundaries
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your ManyChat, SchedulingKit, and database credentials
   ```

3. **Build:**
   ```bash
   npm run build
   ```

4. **Development:**
   ```bash
   npm run dev
   ```

5. **Production:**
   ```bash
   npm run build && npm start
   ```

## API Endpoints

- `GET /health` - Server health check
- `POST /api/webhooks/manychat` - ManyChat webhook receiver

## Error Handling

The server implements explicit error boundaries at:
- Request logging middleware
- Route handlers with try-catch
- Global 404 handler
- Global error handler with environment-aware responses
- Process-level handlers for unhandled rejections and exceptions
