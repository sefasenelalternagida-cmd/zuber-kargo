const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

const CLIENT_ID = 'b3130305bceb6150a0c01f0fd1cd1714';
const CLIENT_SECRET = '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';
const SHOP = 'zuber.myshopify.com';
const SCOPES = 'read_orders,read_customers';
const HOST = process.env.HOST || 'https://zuber-kargo.onrender.com';

// Token'ı bellekte saklıyoruz
let accessToken = null;

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// OAuth başlat
app.get('/auth', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${HOST}/auth/callback`;
  const authUrl = `https://${SHOP}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${redirectUri}&state=${state}`;
  res.redirect(authUrl);
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const response = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });
    
    const data = await response.json();
    console.log('OAuth response:', JSON.stringify(data));
    
    if (data.access_token) {
      accessToken = data.access_token;
      console.log('Token alındı:', accessToken.substring(0, 10));
      res.redirect('/');
    } else {
      res.send('Token alınamadı: ' + JSON.stringify(data));
    }
  } catch (err) {
    res.send('Hata: ' + err.message);
  }
});

// Token durumu
app.get('/auth/status', (req, res) => {
  res.json({ 
    authenticated: !!accessToken,
    authUrl: `${HOST}/auth`
  });
});

// Shopify GraphQL proxy
app.post('/api/shopify', async (req, res) => {
  if (!accessToken) {
    return res.status(401).json({ 
      error: 'Not authenticated',
      authUrl: `${HOST}/auth`
    });
  }

  try {
    const { query, variables } = req.body;

    const response = await fetch(`https://${SHOP}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    console.log('Shopify status:', response.status);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

