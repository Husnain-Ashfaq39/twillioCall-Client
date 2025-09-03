import { NextApiRequest, NextApiResponse } from 'next';
import { jwt } from 'twilio';

const AccessToken = jwt.AccessToken;
const VoiceGrant = jwt.AccessToken.VoiceGrant;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accountSid, apiKey, apiSecret, appSid } = req.body;

  if (!accountSid || !apiKey || !apiSecret || !appSid) {
    return res.status(400).json({ 
      error: 'Missing required Twilio credentials in request body' 
    });
  }

  try {
    const identity = 'web-client';
    
    // Create an access token
    const accessToken = new AccessToken(accountSid, apiKey, apiSecret, {
      identity: identity,
      ttl: 3600, // Token valid for 1 hour
    });

    // Create a Voice grant and add to the access token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: appSid,
      incomingAllow: false, // We only want outgoing calls
    });

    accessToken.addGrant(voiceGrant);

    // Serialize the token to a JWT string
    const jwt = accessToken.toJwt();

    res.status(200).json({
      token: jwt,
      identity: identity
    });
  } catch (error) {
    console.error('Error generating access token:', error);
    res.status(500).json({ 
      error: 'Failed to generate access token' 
    });
  }
}
