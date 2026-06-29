const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';
const SERVICE_ID = 'srv-d8t785mgvqtc73c56n70';

async function main() {
  console.log('=== 更新 Render 服务配置（简化构建命令） ===');
  
  const body = {
    autoDeploy: 'yes',
    branch: 'main',
    name: 'yunqi-deploy',
    rootDir: 'server',
    serviceDetails: {
      env: 'node',
      envSpecificDetails: {
        buildCommand: 'npm install && npm run build',
        startCommand: 'node dist/server.js'
      },
      plan: 'free'
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
  
  console.log('Status:', res.status);
  console.log('buildCommand:', data.serviceDetails?.envSpecificDetails?.buildCommand);
  console.log('startCommand:', data.serviceDetails?.envSpecificDetails?.startCommand);
  console.log('rootDir:', data.rootDir);
  
  // 更新环境变量
  console.log('\n=== 更新环境变量 ===');
  const envVars = [
    { key: 'DATABASE_URL', value: 'file:./prisma.db' },
    { key: 'JWT_SECRET', value: 'yunqi-canteen-secret-2024' },
    { key: 'ADMIN_PASSWORD', value: 'admin123' },
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '10000' },
    { key: 'APP_URL', value: 'https://yunqi-deploy.onrender.com' },
  ];
  
  const envRes = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/env-vars`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(envVars)
  });
  const envData = await envRes.json();
  console.log('环境变量更新:', envRes.ok ? '成功' : '失败');
  
  // 触发部署
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
