import { monitorPayments } from '@/jobs/monitor-payments';

/**
 * Vercel Cron Job Endpoint
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/monitor",
 *     "schedule": "*/5 * * * *"
 *   }]
 * }
 * 
 * Runs every 5 minutes
 */

export async function GET(request: Request) {
  // Verify cron secret (set in Vercel env vars)
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (authHeader !== expectedAuth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await monitorPayments();
    return Response.json({ 
      success: true,
      timestamp: new Date().toISOString(),
      ...result 
    });
  } catch (error: any) {
    console.error('[Cron] Monitor error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
