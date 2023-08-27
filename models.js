// models.js

const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  traderID: {
    type: String,
    required: true,
  },
  asset: {
    type: String,
    required: true,
  },
  leverage: {
    type: Number,
    required: true,
    min: 1,
    max: 100,  // Adjusted leverage limit
  },
  positionSize: {
    type: Number,
    required: true,
  },
  entryPrice: {
    type: Number,
    required: true,
  },
  marginLevel: {
    type: Number,
    default: 1,  // Initial margin level
  },
  status: {
    type: String,
    default: 'active',  // Initial position status
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Add more fields as needed
});

positionSchema.index({ traderID: 1, asset: 1 });

const Position = mongoose.model('Position', positionSchema);

module.exports = {
  Position,
};
