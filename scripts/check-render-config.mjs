const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';
const SERVICE_ID = 'srv-d8t785mgvqtc73c56n70';

async function checkServiceConfig() {
  console.log('🔍 获取服务配置...');
  
  const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}`, {
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json'
    }
  });
  
  console.log('状态码:', res.status);
  const data = await res.json();
  console.log('服务配置:', JSON.stringify(data, null, 2));
}

checkServiceConfig().catch(err => {
  console.error('检查失败:', err.message);
  process.exit(1);
});
