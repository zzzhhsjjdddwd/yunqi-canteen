const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';
const SERVICE_ID = 'srv-d8t785mgvqtc73c56n70';

async function triggerDeploy() {
  console.log('🚀 触发Render后端重新部署...');
  
  const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clearCache: 'clear', branch: 'main' })
  });
  
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Deploy ID:', data.id);
  console.log('Status:', data.status);
  
  if (res.ok) {
    console.log('✅ 部署已触发！预计需要3-5分钟完成');
  } else {
    console.log('❌ 部署触发失败');
    console.log(JSON.stringify(data, null, 2));
  }
}

triggerDeploy().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
