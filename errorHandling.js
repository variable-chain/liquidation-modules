const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const { LiquidationAuction, Position } = require('./models');

const app = express();
app.use(bodyParser.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'An internal error occurred' });
});

const updateAuctionStatus = async (auctionId, status) => {
  try {
    await LiquidationAuction.findByIdAndUpdate(auctionId, { status });
    console.debug(`Auction status updated: ${auctionId} - ${status}`);
  } catch (error) {
    console.error('Error updating auction status:', error);
    throw error; // Rethrow the error for centralized error handling
  }
};

const handleAuctionBids = async (auctionId, bid) => {
  try {
    console.debug(`Received bid for auction ${auctionId}:`, bid);
    await LiquidationAuction.findByIdAndUpdate(
      auctionId,
      {
        $push: { bids: bid },
      },
      { new: true }
    );
  } catch (error) {
    console.error('Error handling auction bid:', error);
    throw error; // Rethrow the error for centralized error handling
  }
};

const handleAuctionResults = async (auctionId) => {
  try {
    const auction = await LiquidationAuction.findById(auctionId);
    if (auction.bids.length > 0) {
      const winningBid = auction.bids.reduce(
        (maxBid, bid) => (bid.amount > maxBid.amount ? bid : maxBid),
        auction.bids[0]
      );
      await updateAuctionStatus(auctionId, 'closed');
    } else {
      await updateAuctionStatus(auctionId, 'cancelled');
    }
  } catch (error) {
    console.error('Error handling auction results:', error);
    throw error; // Rethrow the error for centralized error handling
  }
};

app.post('/auctions/:auctionId/bid', async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { amount, bidder } = req.body;
    await handleAuctionBids(auctionId, { amount, bidder });
    res.status(200).json({ message: 'Bid received successfully' });
  } catch (error) {
    console.error('Error receiving bid:', error);
    res.status(500).json({ error: 'An error occurred while processing the bid' });
  }
});

app.post('/auctions/:auctionId/finalize', async (req, res) => {
  try {
    const { auctionId } = req.params;
    await handleAuctionResults(auctionId);
    res.status(200).json({ message: 'Auction finalized successfully' });
  } catch (error) {
    console.error('Error finalizing auction:', error);
    res.status(500).json({ error: 'An error occurred while finalizing the auction' });
  }
});

mongoose.connect(databaseURI, mongooseOptions)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  });

const initiateLiquidationAuction = async (positionId) => {
  try {
    const position = await Position.findById(positionId);
    if (!position) {
      console.error('Position not found:', positionId);
      return;
    }
    const newAuction = new LiquidationAuction({
      position: positionId,
      asset: position.asset,
      openingPrice: position.entryPrice,
      status: 'active',
    });
    await newAuction.save();
    console.debug('Liquidation auction initiated for position:', positionId);
  } catch (error) {
    console.error('Error initiating liquidation auction:', error);
    throw error; // Rethrow the error for centralized error handling
  }
};

initiateLiquidationAuction('positionId123'); // Example: Initiate a liquidation auction
