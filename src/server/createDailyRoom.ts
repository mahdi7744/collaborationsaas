import { NextApiRequest, NextApiResponse } from 'next';

const DAILY_API_URL = 'https://api.daily.co/v1/rooms';
const DAILY_API_KEY = process.env.DAILY_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const response = await fetch(DAILY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            enable_screen_share: true,
            enable_chat: true,
          }
        })
      });
      
      const data = await response.json();

      if (!response.ok) {
        return res.status(500).json({ message: 'Failed to create room', error: data });
      }

      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ message: 'Room creation failed', error });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
