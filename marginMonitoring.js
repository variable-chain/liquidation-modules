const mongoose = require('mongoose');
const axios = require('axios');

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
  direction: {
    type: String,
    enum: ['long', 'short'],
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
  isHedge: {
    type: Boolean,
    default: false,
  },
  marginType: {
    type: String,
    enum: ['isolated', 'cross'],
    default: 'isolated',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

positionSchema.index({ traderID: 1, asset: 1 });

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

const calculateLiquidationThreshold = async (position) => {
  const { leverage, direction, isHedge } = position;
  const factor = isHedge ? 2 : 1; // Adjust for hedge mode
  const directionMultiplier = direction === 'long' ? -1 : 1;
  const liquidationThreshold = await position.liquidationThreshold;

  if (!liquidationThreshold) {
    liquidationThreshold = position.positionSize * leverage * factor * directionMultiplier;
    position.liquidationThreshold = liquidationThreshold;
    await position.save();
  }

  return liquidationThreshold;
};

const monitorMargins = async () => {
  try {
    const positions = await Position.find().cursor();

    for await (const position of positions) {
      const currentPrice = await fetchCurrentPrice(position.asset);
      const positionValue = position.positionSize * currentPrice;
      const liquidationThreshold = await calculateLiquidationThreshold(position);

      if (positionValue <= liquidationThreshold) {
        console.log(`Position ${position._id} is close to liquidation.`);
        // Notify user, initiate liquidation, etc.
      }
    }
  } catch (error) {
    console.error('Error monitoring margins:', error);
  }
};

const fetchCurrentPrice = async (asset) => {
  try {
    // Replace 'API_URL' with the actual URL of the price API
    const response = await axios.get(`API_URL/${asset}`);
    const currentPrice = response.data.price; // Assuming API response contains price
    return currentPrice;
  } catch (error) {
    console.error('Error fetching current price:', error);
    return 0; // Return a default price or handle the error as needed
  }
};

const liquidatePosition = async (position) => {
  try {
    // Fetch the latest real-time price
    const currentPrice = await fetchCurrentPrice(position.asset);

    // Calculate the position value at the current price
    const positionValue = position.positionSize * currentPrice;

    // Calculate the loss or gain based on the entry price and current price
    const directionMultiplier = position.direction === 'long' ? 1 : -1;
    const profitLoss = (currentPrice - position.entryPrice) * directionMultiplier;

    // Calculate fees and penalties
    const liquidationFees = calculateLiquidationFees(positionValue);
    const penalty = calculatePenalty(position);

    // Calculate the net amount after fees and penalties
    const netAmount = profitLoss - liquidationFees - penalty;

    // Update the user's balance
    await updateUserBalance(position.traderID, netAmount);

    // Close the position (update position status, mark as liquidated, etc.)
    position.status = 'liquidated';
    await position.save();

    console.log(`Position ${position._id} has been liquidated.`);
  } catch (error) {
    console.error('Error during liquidation:', error);
  }
};

const notifyUser = async (position) => {
  try {
    // Replace this comment with the actual notification process
    // Send a notification to the user about the liquidation event
    // Implement your notification mechanism here
  } catch (error) {
    console.error('Error during notification:', error);
  }
};

const calculateLiquidationFees = (positionValue) => {
  const feePercentage = 0.01;
  const fees = positionValue * feePercentage;
  return fees;
};

// Placeholder for penalty calculation logic
const calculatePenalty = (position) => {
  // Implement logic to calculate penalties based on position characteristics, margin type, etc.
  // Return the calculated penalty amount

  // Example: No penalty for now
  return 0;
};

// Placeholder for user balance update logic
const updateUserBalance = async (traderID, netAmount) => {
  // Example: Simulated balance update
  const user = await getUserByTraderID(traderID);
  if (user) {
    user.balance += netAmount;
    await user.save();
  }
};

const getUserByTraderID = async (traderID) => {
  // Example: Simulated user retrieval
  return {
    _id: 'user_id',
    balance: 1000, // Example initial balance
  };
};

const startMarginMonitoring = () => {
  setInterval(monitorMargins, 5000); // Check every 5 seconds
};

connectDatabase();
startMarginMonitoring();

//some parts of the code still contain placeholders, 
//such as the fee calculation, penalty logic, user balance updates, 
//and notifications. 