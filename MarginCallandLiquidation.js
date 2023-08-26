const mongoose = require('mongoose');

const databaseURI = process.env.DATABASE_URI || 'mongodb://localhost:27017/positions';
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // useCreateIndex: true,
  // useFindAndModify: false,
};

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

// Functions for margin call and liquidation

const handleMarginCall = async (position) => {
  try {
    if (position.marginLevel < 1.2) {
      // Trigger margin call
      console.debug('Margin Call for Position', position._id);

      // Notify the user about the margin call
      await notifyUserAboutMarginCall(position);

      // Reduce position size
      await reducePositionSize(position, 0.5);

      // Update position's margin level after handling margin call
      position.marginLevel = await calculateMarginLevel(position);
      await position.save();
    }
  } catch (error) {
    console.error('Error handling margin call:', error);
  }
};

const handleLiquidation = async (position) => {
  try {
    if (position.marginLevel < 1.0) {
      // Liquidate the position
      console.debug('Liquidating Position', position._id);

      // Perform position closure, deduct fees, etc.
      // Implement your logic here

      // Update position status after liquidation
      position.status = 'liquidated';
      await position.save();
    }
  } catch (error) {
    console.error('Error during liquidation:', error);
  }
};

// Notify user about margin call (placeholder implementation)
const notifyUserAboutMarginCall = async (position) => {
  // Implement your notification mechanism here
  // You can send an email, SMS, or any other notification
  // to the user about the margin call event.
  // Example: Simulated notification
  console.debug('Notifying user about margin call for Position', position._id);
};

// Reduce position size (placeholder implementation)
const reducePositionSize = async (position, reductionFactor) => {
  // Implement logic to reduce the position size
  // based on the provided reduction factor.
  // Example: Reduce position size by a certain factor
  position.positionSize *= reductionFactor;

  // Update position size in the database
  await position.save();
};

// Calculate margin level
const calculateMarginLevel = async (position) => {
  // Implement logic to calculate margin level based on position details
  const equity = await calculateEquity(position);
  const usedMargin = await calculateUsedMargin(position);
  return equity / usedMargin;
};

// Calculate equity (placeholder implementation)
const calculateEquity = async (position) => {
  // Implement logic to calculate equity based on position details
  // Equity = (Account Balance) + (Floating P/L)
  // In this example, assume equity is equal to the account balance
  // Additional logic can be implemented based on available data
  return position.positionSize * position.entryPrice * position.leverage;
};

// Calculate used margin (placeholder implementation)
const calculateUsedMargin = async (position) => {
  // Implement logic to calculate used margin based on position details
  // Used Margin = (Position Size) / (Leverage)
  return position.positionSize / position.leverage;
};

// Trigger margin call based on a defined threshold
const triggerMarginCall = async (position) => {
  try {
    // Define the margin call threshold (e.g., 1.2)
    const marginCallThreshold = 1.2;

    // Check if the position's margin level is below the threshold
    if (position.marginLevel < marginCallThreshold) {
      // Trigger margin call
      console.debug('Margin Call Triggered for Position', position._id);

      // Notify the user about the margin call (placeholder, implement your notification logic)
      await notifyUserAboutMarginCall(position);

      // Implement additional actions like reducing position size or requesting additional collateral
      await reducePositionSize(position, 0.5);

      // Update the position's margin level after handling margin call
      position.marginLevel = await calculateMarginLevel(position);
      await position.save();
    }
  } catch (error) {
    console.error('Error triggering margin call:', error);
  }
};

// Function to monitor margin calls and liquidations
const monitorMargins = async () => {
  try {
    const positions = await Position.find().cursor();

    for await (const position of positions) {
      // Calculate margin level for each position
      position.marginLevel = await calculateMarginLevel(position);

      if (position.marginLevel < 1.2) {
        // Handle margin call
        await handleMarginCall(position);
      }

      if (position.marginLevel < 1.0) {
        // Handle liquidation
        await handleLiquidation(position);
      }
    }
  } catch (error) {
    console.error('Error monitoring margins:', error);
  }
};

// Connect to the database and start margin monitoring
const connectDatabase = async () => {
  try {
    await mongoose.connect(databaseURI, mongooseOptions);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const startMarginMonitoring = () => {
  setInterval(monitorMargins, 5000); // Check every 5 seconds
};

connectDatabase();
startMarginMonitoring();
