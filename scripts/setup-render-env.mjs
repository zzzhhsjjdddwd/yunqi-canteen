const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';
const SERVICE_ID = 'srv-d8t785mgvqtc73c56n70';

async function main() {
  console.log('=== 设置 Render 环境变量...');
  
  const envVars = [
    { key: 'DATABASE_URL', value: 'file:./data/prisma.db' },
    { key: 'JWT_SECRET', value: 'yunqi-canteen-secret-2024' },
    { key: 'ADMIN_PASSWORD', value: 'admin123' },
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '10000' },
    { key: 'APP_URL', value: 'https://yunqi-deploy.onrender.com' },
  ];
  
  const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/env-vars`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(envVars)
  });
  const data = await res.json();
  
  if (res.ok) {
    console.log('成功设置环境变量:');
    data.forEach(e => console.log('  ' + e.envVar.key + '=' + e.envVar.value.substring(0, 20) + '...'));
  } else {
    console.log('失败:', res.status, JSON.stringify(data));
  }
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
