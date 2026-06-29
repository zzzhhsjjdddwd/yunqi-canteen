const RENDER_API_KEY = 'rnd_KXIzJiH1kB8bxTMOqQjCXBM0ey7F';
const SERVICE_ID = 'srv-d8t785mgvqtc73c56n70';

async function main() {
  console.log('=== 测试不同的 JSON 格式...');
  
  const tests = [
    { body: JSON.stringify([{ key: 'TEST', value: 'val' }]), desc: 'array of objects' },
    { body: JSON.stringify({ key: 'TEST', value: 'val' }), desc: 'single object' },
    { body: JSON.stringify({ envVar: { key: 'TEST', value: 'val' } }), desc: 'envVar wrapper' },
    { body: JSON.stringify({ name: 'TEST', value: 'val' }), desc: 'name instead of key' },
    { body: JSON.stringify([{ name: 'TEST', value: 'val' }]), desc: 'array with name' },
  ];
  
  for (const test of tests) {
    console.log(`\n--- ${test.desc} ---`);
    try {
      const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/env-vars`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${RENDER_API_KEY}`, 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: test.body
      });
      const text = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Response: ${text.substring(0, 300)}`);
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  }
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
