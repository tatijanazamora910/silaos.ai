/**
 * Leads Dashboard
 *
 * Unified dashboard showing all incoming leads from all channels:
 * - Chat (Facebook, WhatsApp, Instagram)
 * - Email
 * - SMS
 * - Web Forms
 * - Google Business
 *
 * Endpoints:
 * GET /api/leads/dashboard - HTML dashboard
 * GET /api/leads/api/recent - Recent leads (JSON)
 * GET /api/leads/api/stats - Statistics across all channels
 * GET /api/leads/api/by-channel - Breakdown by channel
 */

import { Router, Request, Response } from 'express';
import { getLeadIntakeService, LeadChannel } from '../services/leadIntake';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/leads/api/recent
 * Get recent leads as JSON
 */
router.get('/api/recent', (req: Request, res: Response): void => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
  const leadIntake = getLeadIntakeService();
  const recentLeads = leadIntake.getRecentLeads(limit);

  logger.info(`[Dashboard] Retrieved ${recentLeads.length} recent leads`);

  res.json({
    success: true,
    count: recentLeads.length,
    leads: recentLeads.map((lead) => ({
      id: lead.id,
      channel: lead.channel,
      timestamp: lead.timestamp,
      clientName: `${lead.clientInfo.firstName} ${lead.clientInfo.lastName}`,
      email: lead.clientInfo.email,
      phone: lead.clientInfo.phoneNumber,
      intent: lead.intent,
      message: lead.rawMessage.substring(0, 100),
      confidence: Math.round(lead.confidence * 100),
      date: lead.extractedDate,
      classType: lead.extractedClassType,
    })),
  });
});

/**
 * GET /api/leads/api/stats
 * Get statistics across all channels
 */
router.get('/api/stats', (req: Request, res: Response): void => {
  const leadIntake = getLeadIntakeService();
  const stats = leadIntake.getStats();

  logger.info('[Dashboard] Retrieved statistics');

  res.json({
    success: true,
    totalLeads: stats.totalLeads,
    byChannel: stats.byChannel,
    byIntent: stats.byIntent,
    averageConfidence: Math.round(stats.averageConfidence * 100),
    channelBreakdown: Object.entries(stats.byChannel).map(([channel, count]) => ({
      channel,
      count,
      percentage: stats.totalLeads > 0 ? Math.round((count / stats.totalLeads) * 100) : 0,
    })),
  });
});

/**
 * GET /api/leads/api/by-channel
 * Get leads filtered by channel
 */
router.get('/api/by-channel', (req: Request, res: Response): void => {
  const channel = req.query.channel as string;

  if (!channel || !Object.values(LeadChannel).includes(channel as LeadChannel)) {
    res.status(400).json({ error: 'Invalid channel parameter' });
    return;
  }

  const leadIntake = getLeadIntakeService();
  const leads = leadIntake.getLeadsByChannel(channel as LeadChannel);

  logger.info(`[Dashboard] Retrieved ${leads.length} leads from ${channel}`);

  res.json({
    success: true,
    channel,
    count: leads.length,
    leads: leads.map((lead) => ({
      id: lead.id,
      timestamp: lead.timestamp,
      clientName: `${lead.clientInfo.firstName} ${lead.clientInfo.lastName}`,
      email: lead.clientInfo.email,
      intent: lead.intent,
      confidence: Math.round(lead.confidence * 100),
    })),
  });
});

/**
 * GET /api/leads/dashboard
 * Full HTML dashboard
 */
router.get('/dashboard', (req: Request, res: Response): void => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Pilates Chat Booker - Leads Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #f5f3f0 0%, #ede9e3 100%);
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #8b9e88 0%, #7a8d7f 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid #8b9e88;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #8b9e88;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 14px;
      color: #64748b;
    }

    .channels {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-top: 15px;
    }
    .channel-badge {
      background: #f1f5f9;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      text-align: center;
    }
    .channel-badge strong { display: block; color: #1e293b; }
    .channel-badge span { color: #64748b; font-size: 11px; }

    .leads-table {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: #f8fafc;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    tr:hover { background: #f8fafc; }

    .channel-tag {
      display: inline-block;
      padding: 4px 8px;
      background: #e8dfd7;
      color: #6b7e70;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .channel-tag.chat { background: #dbeafe; color: #0c4a6e; }
    .channel-tag.email { background: #fef3c7; color: #78350f; }
    .channel-tag.sms { background: #dbeafe; color: #0c4a6e; }
    .channel-tag.web_form { background: #d1fae5; color: #065f46; }
    .channel-tag.google { background: #fee2e2; color: #7f1d1d; }

    .intent-tag {
      display: inline-block;
      padding: 4px 8px;
      background: #f1f5f9;
      color: #1e293b;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }
    .intent-tag.availability { background: #d1fae5; color: #065f46; }
    .intent-tag.booking { background: #fce7f3; color: #831843; }

    .confidence {
      display: inline-block;
      width: 40px;
      height: 24px;
      border-radius: 12px;
      background: #e8dfd7;
      color: #6b7e70;
      text-align: center;
      line-height: 24px;
      font-size: 11px;
      font-weight: 600;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: 1fr; }
      table { font-size: 12px; }
      th, td { padding: 8px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Leads Dashboard</h1>
      <p>Real-time overview of all incoming leads across all channels</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" id="totalLeads">0</div>
        <div class="stat-label">Total Leads</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="avgConfidence">0%</div>
        <div class="stat-label">Avg. Confidence</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Leads by Channel</div>
        <div class="channels" id="channelBreakdown"></div>
      </div>
    </div>

    <div class="leads-table">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Channel</th>
            <th>Name</th>
            <th>Email</th>
            <th>Intent</th>
            <th>Class Type</th>
            <th>Date</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody id="leadsBody">
          <tr><td colspan="8" class="loading">Loading leads...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    async function loadDashboard() {
      try {
        // Load stats
        const statsRes = await fetch('/api/leads/api/stats');
        const stats = await statsRes.json();

        document.getElementById('totalLeads').textContent = stats.totalLeads;
        document.getElementById('avgConfidence').textContent = stats.averageConfidence + '%';

        const channelHtml = stats.channelBreakdown
          .map(c => \`<div class="channel-badge"><strong>\${c.count}</strong><span>\${c.channel}</span></div>\`)
          .join('');
        document.getElementById('channelBreakdown').innerHTML = channelHtml;

        // Load recent leads
        const leadsRes = await fetch('/api/leads/api/recent?limit=50');
        const leads = await leadsRes.json();

        if (leads.count === 0) {
          document.getElementById('leadsBody').innerHTML = '<tr><td colspan="8" class="loading">No leads yet</td></tr>';
          return;
        }

        const rowsHtml = leads.leads
          .map(lead => \`
            <tr>
              <td>\${new Date(lead.timestamp).toLocaleString()}</td>
              <td><span class="channel-tag \${lead.channel}">\${lead.channel}</span></td>
              <td>\${lead.clientName}</td>
              <td>\${lead.email}</td>
              <td><span class="intent-tag \${lead.intent}">\${lead.intent}</span></td>
              <td>\${lead.classType || '—'}</td>
              <td>\${lead.date || '—'}</td>
              <td><span class="confidence">\${lead.confidence}%</span></td>
            </tr>
          \`)
          .join('');

        document.getElementById('leadsBody').innerHTML = rowsHtml;
      } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('leadsBody').innerHTML = '<tr><td colspan="8" class="loading">Error loading leads</td></tr>';
      }
    }

    // Load on page load and refresh every 10 seconds
    loadDashboard();
    setInterval(loadDashboard, 10000);
  </script>
</body>
</html>
  `.trim();

  logger.info('[Dashboard] Dashboard HTML served');
  res.type('text/html').send(html);
});

export default router;
