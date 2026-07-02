const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';
const DB_ID = 'dpg-d916m3favr4c7399oms0-a';

async function getDbConnection() {
  console.log('🔍 获取数据库连接信息...');
  
  const res = await fetch(`https://api.render.com/v1/postgres/${DB_ID}`, {
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json'
    }
  });
  
  console.log('状态码:', res.status);
  const data = await res.json();
  console.log('数据库信息:', JSON.stringify(data, null, 2));
}

getDbConnection().catch(err => {
  console.error('检查失败:', err.message);
  process.exit(1);
});
