import dotenv from 'dotenv';
dotenv.config();

import { app, httpServer } from './app.js';
import { prisma } from './app.js';

const PORT = process.env.PORT || 3001;

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

    httpServer.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`WebSocket server is ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
