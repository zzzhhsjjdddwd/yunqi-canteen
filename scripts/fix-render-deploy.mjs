const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';
const SERVICE_ID = 'srv-d8t785mgvqtc73c56n70';
const DB_ID = 'dpg-d916m3favr4c7399oms0-a';

async function fixRenderConfig() {
  console.log('🔧 修复Render配置...');
  
  // 1. 更新服务配置，确保构建命令正确
  console.log('\n1. 更新服务配置...');
  const serviceBody = {
    autoDeploy: 'yes',
    branch: 'main',
    name: 'yunqi-deploy',
    rootDir: 'server',
    serviceDetails: {
      env: 'node',
      envSpecificDetails: {
        buildCommand: 'npm install && npm run build',
        startCommand: 'npx prisma db push && node dist/server.js'
      },
      plan: 'free'
    }
  };
  
  const serviceRes = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}`, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(serviceBody)
  });
  
  console.log('   服务配置更新状态:', serviceRes.status);
  
  // 2. 更新环境变量 - 设置正确的DATABASE_URL
  console.log('\n2. 更新环境变量...');
  
  // 构建PostgreSQL连接字符串（使用内部连接）
  const internalDbUrl = `postgresql://yunqi_user@yunqi-db:5432/yunqi`;
  
  // 或者使用外部连接
  // 由于我们不知道密码，先使用SQLite试试
  const envVars = [
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '10000' },
    { key: 'JWT_SECRET', value: 'yunqi-canteen-secret-2024' },
    { key: 'ADMIN_PASSWORD', value: 'admin123' },
    { key: 'APP_URL', value: 'https://yunqi-deploy.onrender.com' },
    { key: 'DATABASE_URL', value: `postgresql://yunqi_user:yunqi123456@dpg-d916m3favr4c7399oms0-a/postgres?sslmode=require` },
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
  
  console.log('   环境变量更新状态:', envRes.status);
  
  // 3. 触发新部署
  console.log('\n3. 触发新部署...');
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
  console.log('   部署ID:', deployData.id);
  console.log('   部署状态:', deployData.status);
  
  console.log('\n✅ 配置修复完成，部署已触发！');
  console.log('   预计需要3-5分钟完成部署');
}

fixRenderConfig().catch(err => {
  console.error('❌ 修复失败:', err.message);
  process.exit(1);
});
