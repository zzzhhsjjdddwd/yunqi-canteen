const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';
const SERVICE_ID = 'srv-d8t785mgvqtc73c56n70';

async function main() {
  console.log('=== 删除现有服务 yunqi-deploy ===');
  
  const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json'
    }
  });
  
  if (res.ok) {
    console.log('删除成功');
  } else {
    console.log('删除失败:', res.status);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
