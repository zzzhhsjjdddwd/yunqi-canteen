const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';
const SERVICE_ID = 'srv-d8t785mgvqtc73c56n70';

async function checkStatus() {
  console.log('🔍 检查Render后端部署状态...');
  
  // 获取最新的部署
  const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys?limit=3`, {
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json'
    }
  });
  
  console.log('API状态码:', res.status);
  
  const deploys = await res.json();
  console.log('返回数据:', JSON.stringify(deploys, null, 2));
}

checkStatus().catch(err => {
  console.error('检查失败:', err.message);
  process.exit(1);
});
