import { prisma } from '../src/app';

async function clearData() {
  console.log('Starting data cleanup...');
  
  await prisma.orderItem.deleteMany({});
  console.log('Deleted order items');
  
  await prisma.order.deleteMany({});
  console.log('Deleted orders');
  
  await prisma.address.deleteMany({});
  console.log('Deleted addresses');
  
  await prisma.user.deleteMany({
    where: {
      NOT: {
        phone: '13800138000'
      }
    }
  });
  console.log('Deleted test users');
  
  await prisma.$disconnect();
  console.log('Data cleanup completed!');
}

clearData().catch(console.error);