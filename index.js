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

// Connect to MongoDB
mongoose.connect(process.env.DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define URL schema and model
const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortUrl: { type: Number, required: true, unique: true },
});
const Url = mongoose.model('Url', urlSchema);

// POST endpoint to shorten URL
app.post('/api/shorturl', async (req, res) => {
  const { url } = req.body;

  // Validate URL format
  const regex = /^(https?:\/\/)(www\.)?([a-z0-9]+\.[a-z]{2,6})(\/.*)?$/i;
  if (!regex.test(url)) {
    return res.status(400).json({ error: 'invalid url' });
  }

  // Extract the hostname and check if it exists
  const hostname = new URL(url).hostname;
  dns.lookup(hostname, async (err) => {
    if (err) {
      return res.status(400).json({ error: 'invalid url' });
    }

    try {
      // Check if the URL already exists in the database
      let foundUrl = await Url.findOne({ originalUrl: url }).exec();
      if (foundUrl) {
        return res.json({ original_url: foundUrl.originalUrl, short_url: foundUrl.shortUrl });
      }

      // Create a new entry
      const count = await Url.countDocuments().exec();
      const newUrl = new Url({ originalUrl: url, shortUrl: count + 1 });

      const savedUrl = await newUrl.save();
      res.json({ original_url: savedUrl.originalUrl, short_url: savedUrl.shortUrl });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
});

// GET endpoint to redirect to the original URL
app.get('/api/shorturl/:shortUrl', async (req, res) => {
  const shortUrl = req.params.shortUrl;

  try {
    const foundUrl = await Url.findOne({ shortUrl: shortUrl }).exec();
    if (!foundUrl) {
      return res.status(404).json({ error: 'No short URL found for the given input' });
    }
    res.redirect(foundUrl.originalUrl);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', (req, res) => {
  res.json({ greeting: 'hello API' });
});

// Start the server
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
