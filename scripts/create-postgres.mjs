const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';

async function main() {
  console.log('=== 创建 PostgreSQL 数据库 ===');
  
  const body = {
    name: 'yunqi-db',
    plan: 'free',
    region: 'ohio',
    postgresSpecificDetails: {
      highAvailability: 'no',
      postgresMajorVersion: '16'
    }
  };
  
  const res = await fetch('https://api.render.com/v1/postgres', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${RENDER_API_KEY}`, 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  const data = await res.json();
  
  if (res.ok) {
    console.log('创建成功!');
    console.log('ID:', data.id);
    console.log('Name:', data.name);
    console.log('Plan:', data.postgresSpecificDetails?.plan);
    console.log('Status:', data.status);
  } else {
    console.log('创建失败:', res.status);
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
