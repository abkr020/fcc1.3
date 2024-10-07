
const mongoose = require('mongoose');
require('dotenv').config();
const bodyParser = require('body-parser');
const dns = require('dns');
const express = require('express');
const cors = require('cors');
const app = express();
const urlparser = require('url');


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
  originalUrl: { type: String, required: true, unique: true },
  shortUrl: { type: Number, required: true, unique: true },
});
const Url = mongoose.model('Url', urlSchema);

app.post('/api/shorturl', async function (req, res) {
  console.log(req.body);

  const url = req.body.url;

  // Use dns.lookup to check if the hostname resolves
  const dnslookup = dns.lookup(urlparser.parse(url).hostname, async (err, address) => {
    if (!address) {
      // If DNS lookup fails, return "Invalid URL"
      res.json({ error: "invalid url" });
    } else {
      try {
        // Count the number of documents in the database
        const urlCount = await Url.countDocuments({});

        // Create a new URL document with original URL and short URL
        const urlDoc = {
          originalUrl: url,
          shortUrl: urlCount + 1
        };

        // Insert the new URL document into the database
        const result = await Url.create(urlDoc);
        console.log(result);

        // Return the original URL and the short URL
        res.json({ original_url: url, short_url: urlDoc.shortUrl });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
      }
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
    return res.status(500).send(error);
  }
});

// GET endpoint for the home page
app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

// Start the server
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
