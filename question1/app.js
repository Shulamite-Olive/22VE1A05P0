import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { nanoid } from 'nanoid';



const app = express();
const port = 3000;
app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());
const links = new Map();
app.post('/shorturls', (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid JSON body' });
  }

  const { url: longLink, validity = 30, shortcode } = req.body;

  if (!longLink) {
    return res.status(400).json({ error: 'Long link (url) is required' });
  }
  const shortName = shortcode || nanoid(6);
  if (links.has(shortName)) {
    return res.status(400).json({ error: 'Short name already exists' });
  }
  const expiresAt = new Date(Date.now() + validity * 60 * 1000); 
  links.set(shortName, {
    longLink,
    createdAt: new Date(),
    expiresAt,
    clicks: [],
  });

  res.status(201).json({
    shortLink: `http://localhost:${port}/${shortName}`,
    expiry: expiresAt.toISOString()
  });
});
app.get('/:shortName', (req, res) => {
  const data = links.get(req.params.shortName);

  if (!data) {
    return res.status(404).json({ error: 'Short name not found' });
  }

  if (new Date() > data.expiresAt) {
    return res.status(410).json({ error: 'Link has expired' });
  }

  data.clicks.push({
    time: new Date().toISOString(),
    ip: req.ip,
    referrer: req.get('referer') || null
  });

  res.redirect(data.longLink);
});
app.get('/shorturls/:shortName', (req, res) => {
  const data = links.get(req.params.shortName);

  if (!data) {
    return res.status(404).json({ error: 'Short name not found' });
  }

  res.json({
    originalLink: data.longLink,
    createdAt: data.createdAt.toISOString(),
    expiry: data.expiresAt.toISOString(),
    totalClicks: data.clicks.length,
    clickDetails: data.clicks
  });
});
app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to ShoertURL</h1>
    <p>Use this service to shorten and track our links</p>
    <ul>
      <li><strong>POST</strong> /shorturls – Create a short URL</li>
      <li><strong>GET</strong> /:shortName – Redirect to original link</li>
      <li><strong>GET</strong> /shorturls/:shortName – View stats</li>
    </ul>
  `);
});
app.listen(port, () => {
  console.log(`URL Shortener running at http://localhost:${port}`);
});
