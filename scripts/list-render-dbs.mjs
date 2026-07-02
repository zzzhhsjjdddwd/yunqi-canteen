const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';

async function listDatabases() {
  console.log('🔍 获取数据库列表...');
  
  const res = await fetch('https://api.render.com/v1/postgres', {
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json'
    }
  });
  
  console.log('状态码:', res.status);
  const data = await res.json();
  console.log('数据库列表:', JSON.stringify(data, null, 2));
}

listDatabases().catch(err => {
  console.error('检查失败:', err.message);
  process.exit(1);
});
