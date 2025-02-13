import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/config/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // For GET requests (tracking pixel)
  if (req.method === 'GET') {
    const { quotation_id, event_type } = req.query;

    if (!quotation_id || !event_type) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      // Record the event
      const { error } = await supabase
        .from('email_tracking')
        .insert({
          quotation_id,
          event_type,
          recipient_email: 'unknown', // Since this is from tracking pixel
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          user_agent: req.headers['user-agent']
        });

      if (error) throw error;

      // Return a 1x1 transparent GIF
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } catch (error: any) {
      console.error('Error recording tracking event:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  // For POST requests (explicit tracking)
  else if (req.method === 'POST') {
    const { quotation_id, event_type, recipient_email } = req.body;

    if (!quotation_id || !event_type || !recipient_email) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const { error } = await supabase
        .from('email_tracking')
        .insert({
          quotation_id,
          event_type,
          recipient_email,
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          user_agent: req.headers['user-agent']
        });

      if (error) throw error;
      res.status(200).json({ message: 'Event recorded successfully' });
    } catch (error: any) {
      console.error('Error recording tracking event:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 