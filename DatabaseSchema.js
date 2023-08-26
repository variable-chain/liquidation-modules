const mongoose = require('mongoose');
const express = require('express');
const expressMongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const pino = require('pino');
const validator = require('validator');
const { MongoClient } = require('mongodb');

const app = express();

const databaseURI = process.env.DATABASE_URI || 'mongodb://localhost:27017/positions';
const mongooseOptions = {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
  // useCreateIndex: true,
  // useFindAndModify: false,
  // poolSize: 10,
  // retryWrites: true,
};

const positionSchema = new mongoose.Schema({
  traderID: {
    type: String,
    required: true,
  },
  direction: {
    type: String,
    enum: ['long', 'short'],
    required: true,
  },
  entryPrice: {
    type: Number,
    required: true,
  },
  leverage: {
    type: Number,
    required: true,
    min: 1,
  },
  positionSize: {
    type: Number,
    required: true,
  },
  liquidationPrice: {
    type: Number,
    required: true,
  },
  tradeID: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

positionSchema.index({ traderID: 1 });
positionSchema.index({ tradeID: 1 }, { unique: true });

const Position = mongoose.model('Position', positionSchema);

const connectDatabase = async () => {
  try {
    await mongoose.connect(databaseURI, mongooseOptions);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const gracefulShutdown = () => {
  mongoose.connection.close(() => {
    console.log('Disconnected from MongoDB');
    // process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  console.error(error.stack);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error(error.stack);
  process.exit(1);
});

connectDatabase();

app.use(expressMongoSanitize());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Load Testing and Performance Optimization
// - Conduct load testing using Apache JMeter.
// - Optimize database queries and resource-intensive operations.
// - Utilize Chrome DevTools for frontend performance analysis.

// Security Measures
// - Implement authentication and authorization mechanisms using JWT.
// - Use validator.js for input validation.
// - Sanitize user inputs using express-mongo-sanitize.
// - Implement rate limiting with express-rate-limit.

// Logging Library
const logger = pino();
app.use((req, res, next) => {
  req.logger = logger.child({ requestId: req.id }); // Customize as needed
  next();
});

// Testing
// - Write comprehensive test cases using Jest.

// Monitoring and Metrics
// Set up Prometheus and Grafana for monitoring.

// Documentation
// - Document your code for maintainability and collaboration.

module.exports = Position;
