/**
 * The testnet MVP universe. Prices are demo values in whole USD; the deploy
 * script converts them to the oracle's eight decimals.
 */
export const LAUNCH_STOCKS = [
  { ticker: 'NVDA', name: 'NVIDIA', usd: 140 },
  { ticker: 'MSFT', name: 'Microsoft', usd: 420 },
  { ticker: 'GOOGL', name: 'Alphabet', usd: 170 },
  { ticker: 'AMZN', name: 'Amazon', usd: 190 },
  { ticker: 'AAPL', name: 'Apple', usd: 230 },
  { ticker: 'TSLA', name: 'Tesla', usd: 250 },
  { ticker: 'META', name: 'Meta', usd: 600 },
] as const;
