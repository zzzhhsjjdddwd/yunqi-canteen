const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';
const SERVICE_ID = 'srv-d8t785mgvqtc73c56n70';
const DEPLOY_ID = 'dep-d92q0i0k1i2s73d06630';

async function checkDeployLog() {
  console.log('🔍 获取部署日志...');
  
  // 获取部署详情
  const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys/${DEPLOY_ID}`, {
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json'
    }
  });
  
  console.log('部署详情状态码:', res.status);
  const deployData = await res.json();
  console.log('部署详情:', JSON.stringify(deployData, null, 2));
}

checkDeployLog().catch(err => {
  console.error('检查失败:', err.message);
  process.exit(1);
});
