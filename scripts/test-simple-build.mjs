const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';
const SERVICE_ID = 'srv-d8t785mgvqtc73c56n70';

async function main() {
  console.log('=== 简化构建命令（移除prisma generate） ===');
  
  const body = {
    serviceDetails: {
      envSpecificDetails: {
        buildCommand: 'npm install && npx tsc',
        startCommand: 'node dist/server.js'
      }
    }
  };
  
  const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}`, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  console.log('更新:', res.ok ? '成功' : '失败');
  
  console.log('\n=== 触发新部署 ===');
  const deployRes = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clearCache: 'clear', branch: 'main' })
  });
  const deployData = await deployRes.json();
  console.log('Deploy ID:', deployData.id);
  console.log('Status:', deployData.status);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
