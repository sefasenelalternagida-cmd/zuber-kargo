const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-shopify-store, x-shopify-token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/api/shopify', async (req, res) => {
  try {
    const store = req.headers['x-shopify-store'];
    const token = req.headers['x-shopify-token'];

    console.log('Request received - store:', store, 'token prefix:', token ? token.substring(0,10) : 'MISSING');

    if (!store || !token) {
      return res.status(400).json({ error: 'Missing store or token' });
    }

    const { query, variables } = req.body;
    const url = `https://${store}/admin/api/2024-10/graphql.json`;
    
    console.log('Fetching:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    });

    console.log('Shopify response status:', response.status);
    
    const text = await response.text();
    console.log('Shopify response:', text.substring(0, 200));

    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      return res.status(500).json({ error: 'Invalid JSON', raw: text.substring(0, 500) });
    }

    res.json(data);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

