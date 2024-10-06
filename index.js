const mongoose = require('mongoose');
require('dotenv').config();
const bodyParser = require('body-parser');
const dns = require('dns');

const express = require('express');
const cors = require('cors');
const app = express();
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

mongoose.connect(process.env.DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortUrl: { type: Number, required: true, unique: true },
});
const Url = mongoose.model('Url', urlSchema);

app.post('/api/shorturl', async (req, res) => {
  const { url } = req.body;

  console.log('Received URL:', url); // Log the incoming URL

  // Validate URL format
  const regex = /^(https?:\/\/)([a-zA-Z0-9\-]+\.[a-zA-Z]{2,})(\/.*)?$/i;
  if (!regex.test(url)) {
    console.log('Invalid URL format');
    return res.status(400).json({ error: 'invalid url' });
  }

  // Extract the hostname and check if it exists
  const hostname = new URL(url).hostname;
  dns.lookup(hostname, async (err) => {
    if (err) {
      console.log('DNS lookup failed:', err.message);
      return res.status(400).json({ error: 'invalid url' });
    }

    try {
      // Check if the URL already exists in the database
      const foundUrl = await Url.findOne({ originalUrl: url });

      if (foundUrl) {
        return res.json({ original_url: foundUrl.originalUrl, short_url: foundUrl.shortUrl });
      }

      // Create a new entry
      const count = await Url.countDocuments({});
      const newUrl = new Url({ originalUrl: url, shortUrl: count + 1 });
      const savedUrl = await newUrl.save();
      res.json({ original_url: savedUrl.originalUrl, short_url: savedUrl.shortUrl });
    } catch (error) {
      console.error('Error saving URL:', error); // Log error
      return res.status(500).send(error);
    }
  });
});

// GET endpoint to redirect to the original URL
app.get('/api/shorturl/:shortUrl', async (req, res) => {
  const shortUrl = req.params.shortUrl;

  try {
    const foundUrl = await Url.findOne({ shortUrl: shortUrl });

    if (!foundUrl) {
      return res.status(404).json({ error: 'No short URL found for the given input' });
    }
    res.redirect(foundUrl.originalUrl);
  } catch (error) {
    console.error('Error retrieving URL:', error); // Log error
    return res.status(500).send(error);
  }
});

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
