const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';

async function main() {
  console.log('=== 列出所有数据库 ===');
  
  const res = await fetch('https://api.render.com/v1/postgres?limit=20', {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json'
    }
  });
  
  const data = await res.json();
  
  if (res.ok) {
    console.log('找到', data.length, '个数据库:');
    data.forEach(item => {
      const db = item.postgres;
      console.log('  -', db.name, '(', db.id, ') plan:', db.plan, 'status:', db.status);
    });
  } else {
    console.log('失败:', res.status);
    console.log(JSON.stringify(data, null, 2));
  }
  
  console.log('\n=== 列出所有服务 ===');
  const sres = await fetch('https://api.render.com/v1/services?limit=20', {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json'
    }
  });
  
  const sdata = await sres.json();
  
  if (sres.ok) {
    console.log('找到', sdata.length, '个服务:');
    sdata.forEach(item => {
      const svc = item.service;
      console.log('  -', svc.name, '(', svc.id, ') type:', svc.serviceDetails?.type, 'env:', svc.serviceDetails?.env);
    });
  } else {
    console.log('失败:', sres.status);
    console.log(JSON.stringify(sdata, null, 2));
  }
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
