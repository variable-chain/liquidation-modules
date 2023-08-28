// Monitoring External Price Feeds

//required npm packages (axios, pino, ioredis) by running npm install axios pino ioredis.

const axios = require('axios');
const pino = require('pino');
const Redis = require('ioredis');

// CoinMarketCap API endpoint for price data
const CMC_API_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';

// CoinMarketCap API Key (Replace with your actual API key)
const CMC_API_KEY = '209ff4f0-6260-49ec-9b1d-faa73b98affe';

// Monitored assets
const MONITORED_ASSETS = ['BTC','ethereum'];

// Price fetch interval (3 seconds)
const FETCH_INTERVAL_MS = 3000;

// Price caching with Redis (3 minutes cache duration)
const CACHE_DURATION_SEC = 180;
const redis = new Redis();

// Initialize Pino logger
const logger = pino();

const fetchPriceData = async () => {
  try {
    const response = await axios.get(CMC_API_URL, {
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY,
      },
      params: {
        symbol: MONITORED_ASSETS.join(','),
      },
    });

    const { data } = response;
    if (data && data.status && data.status.error_code === 0) {
      const priceData = data.data;
      for (const asset of MONITORED_ASSETS) {
        const assetInfo = priceData.find((entry) => entry.symbol === asset);
        if (assetInfo && assetInfo.quote && assetInfo.quote.USD && assetInfo.quote.USD.price) {
          const price = assetInfo.quote.USD.price;
          // Store the price in Redis with a 3-minute expiration
          await redis.set(asset, price, 'EX', CACHE_DURATION_SEC);
          logger.debug(`Price of ${asset}: ${price}`);
        } else {
          logger.error(`Error fetching price for ${asset}`);
        }
      }
    } else {
      logger.error('CoinMarketCap API response error');
    }
  } catch (error) {
    logger.error('Error fetching price data from CoinMarketCap:', error);
  }
};

const startPriceMonitoring = () => {
  fetchPriceData();
  setInterval(fetchPriceData, FETCH_INTERVAL_MS);
};

// Connect to Redis
redis.on('connect', () => {
  logger.info('Connected to Redis');
  startPriceMonitoring();
});

redis.on('error', (error) => {
  logger.error('Error connecting to Redis:', error);
  process.exit(1);
});
