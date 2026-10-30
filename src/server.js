const { loadEnv } = require('./env');

loadEnv();

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { Enquiry, presentEnquiry } = require('./enquiry');
const { mailConfigError, sendEnquiryEmail } = require('./mail');
const { validateEnquiry } = require('./validate');

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGODB_URL;
const READ_API_KEY = process.env.READ_API_KEY || '';

const DEFAULT_ORIGINS = [
  'https://anmoljewellers.in',
  'https://www.anmoljewellers.in'
];

function allowedOrigins() {
  const fromEnv = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([...DEFAULT_ORIGINS, ...fromEnv]);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (allowedOrigins().has(origin)) return true;

  let hostname = '';
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (hostname.endsWith('.myshopify.com')) return true;
  if (hostname.endsWith('.shopifypreview.com')) return true;
  return false;
}

function clampInteger(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function requireReadKey(req, res, next) {
  if (!READ_API_KEY) {
    return res.status(503).json({ error: 'Read API key is not configured' });
  }

  const provided = req.get('x-api-key') || '';
  if (provided.length !== READ_API_KEY.length) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let mismatch = 0;
  for (let i = 0; i < provided.length; i += 1) {
    mismatch |= provided.charCodeAt(i) ^ READ_API_KEY.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  app.use(express.json({ limit: '16kb' }));
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept', 'x-api-key']
    })
  );

  const submitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: { error: 'Too many enquiries from this network. Please try again later.' }
  });

  const readLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: { error: 'Too many requests. Please try again shortly.' }
  });

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting'
    });
  });

  app.get('/', (_req, res) => {
    res.json({ service: 'amol-jewellers-form', ok: true });
  });

  app.post('/api/enquiries', submitLimiter, async (req, res, next) => {
    try {
      const result = validateEnquiry(req.body);
      if (result.honeypot) {
        return res.status(201).json({ message: 'Enquiry saved' });
      }
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }

      const enquiry = await Enquiry.create(result.value);
      try {
        await sendEnquiryEmail(enquiry);
      } catch (mailError) {
        console.error('Enquiry saved but email failed', enquiry._id.toString(), mailError);
        return res.status(502).json({
          error: 'We could not send your enquiry. Please try again.'
        });
      }

      return res.status(201).json({
        id: enquiry._id.toString(),
        message: 'Enquiry saved'
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/enquiries', readLimiter, requireReadKey, async (req, res, next) => {
    try {
      const page = clampInteger(req.query.page, 1, 1, 1000);
      const limit = clampInteger(req.query.limit, 12, 1, 50);
      const skip = (page - 1) * limit;

      const [enquiries, total] = await Promise.all([
        Enquiry.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
        Enquiry.countDocuments()
      ]);

      return res.json({
        enquiries: enquiries.map(presentEnquiry),
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit))
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    if (error && (error.type === 'entity.parse.failed' || error instanceof SyntaxError)) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    console.error(error);
    return res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}

async function start() {
  if (!MONGODB_URI) {
    console.error('Set MONGODB_URI (or MONGO_URL) before starting.');
    process.exit(1);
  }

  if (!READ_API_KEY) {
    console.error('Set READ_API_KEY before starting. The Shopify page uses it to read submissions.');
    process.exit(1);
  }

  const mailError = mailConfigError();
  if (mailError) {
    console.error(mailError);
    process.exit(1);
  }

  const options = { serverSelectionTimeoutMS: 10000 };
  if (process.env.MONGODB_DB) options.dbName = process.env.MONGODB_DB;

  await mongoose.connect(MONGODB_URI, options);
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Enquiry API listening on ${PORT}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { createApp };
