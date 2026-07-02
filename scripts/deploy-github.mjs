import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

const GITHUB_TOKEN = process.argv[2];
const REPO_OWNER = 'zzzhhsjjdddwd';
const REPO_NAME = 'yunqi-canteen';
const BRANCH = 'main';
const DIST_PATH = './dist-static';

if (!GITHUB_TOKEN) {
  console.error('请提供 GitHub Token 作为参数');
  process.exit(1);
}

const api = async (path, options = {}) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`API Error ${res.status}:`, data);
    throw new Error(`GitHub API Error: ${res.status}`);
  }
  return data;
};

function getAllFiles(dirPath, basePath = '') {
  const files = [];
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const relPath = basePath ? `${basePath}/${entry}` : entry;
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, relPath));
    } else {
      files.push({ path: relPath, fullPath });
    }
  }
  return files;
}

async function deploy() {
  console.log('🚀 开始部署到 GitHub Pages...');
  console.log(`📦 仓库: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`🌿 分支: ${BRANCH}`);

  console.log('\n📁 读取构建产物...');
  const files = getAllFiles(DIST_PATH);
  console.log(`   找到 ${files.length} 个文件`);

  console.log('\n🔍 获取最新提交...');
  const ref = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${BRANCH}`);
  const latestCommit = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${ref.object.sha}`);
  console.log(`   最新提交: ${ref.object.sha.substring(0, 7)}`);

  console.log('\n⬆️  上传文件到 GitHub...');
  const treeItems = [];
  for (const file of files) {
    const content = readFileSync(file.fullPath);
    const base64 = content.toString('base64');
    
    const blob = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({
        content: base64,
        encoding: 'base64',
      }),
    });
    
    treeItems.push({
      path: `dist-static/${file.path}`,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
    process.stdout.write(`   ✓ ${file.path}\n`);
  }

  console.log('\n🌳 创建 Git Tree...');
  const tree = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: latestCommit.tree.sha,
      tree: treeItems,
    }),
  });

  console.log('\n📝 创建提交...');
  const commit = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: `deploy: 更新静态文件 (${new Date().toLocaleString('zh-CN')})`,
      tree: tree.sha,
      parents: [ref.object.sha],
    }),
  });
  console.log(`   提交: ${commit.sha.substring(0, 7)}`);

  console.log('\n🔄 更新分支引用...');
  await api(`/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({
      sha: commit.sha,
      force: false,
    }),
  });

  console.log('\n✅ 部署完成！');
  console.log(`\n🌐 访问链接:`);
  console.log(`   引导首页: https://${REPO_OWNER}.github.io/${REPO_NAME}/`);
  console.log(`   客户端:   https://${REPO_OWNER}.github.io/${REPO_NAME}/client/`);
  console.log(`   商家端:   https://${REPO_OWNER}.github.io/${REPO_NAME}/admin/`);
  console.log(`   二维码页: https://${REPO_OWNER}.github.io/${REPO_NAME}/qr.html`);
  console.log(`   安装引导: https://${REPO_OWNER}.github.io/${REPO_NAME}/install.html`);
}

deploy().catch(err => {
  console.error('❌ 部署失败:', err.message);
  process.exit(1);
});
