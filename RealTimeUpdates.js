const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws'); // Import the WebSocket library
const { LiquidationAuction, Position } = require('./models');

// Set up the Express app
const app = express();
app.use(bodyParser.json());

// Create a WebSocket server using the Express server
const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

const wss = new WebSocket.Server({ noServer: true }); // Create WebSocket server

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

const updateAuctionStatus = async (auctionId, status) => {
  try {
    // Update the auction status in the database
    await LiquidationAuction.findByIdAndUpdate(auctionId, { status });

    // Notify connected clients about the status update
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({ auctionId, status }));
    });

    console.debug(`Auction status updated: ${auctionId} - ${status}`);
  } catch (error) {
    console.error('Error updating auction status:', error);
  }
};
