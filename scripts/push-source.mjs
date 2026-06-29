/**
 * 推送源代码到 GitHub
 * 用法: node scripts/push-source.mjs <GITHUB_TOKEN>
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';

const GITHUB_TOKEN = process.argv[2];
const REPO_OWNER = 'zzzhhsjjdddwd';
const REPO_NAME = 'yunqi-canteen';
const BRANCH = 'main';
const ROOT_DIR = '.';

if (!GITHUB_TOKEN) {
  console.error('❌ 请提供 GitHub Token 作为参数');
  console.log('用法: node scripts/push-source.mjs <GITHUB_TOKEN>');
  process.exit(1);
}

// 忽略的文件和目录
const IGNORE_PATTERNS = [
  'node_modules',
  'dist',
  '.git',
  '.github',
  '.env',
  '.env.local',
  '.env.production',
  '*.log',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  '.cache',
  '.parcel-cache',
  '.vite',
  '.turbo',
  'coverage',
  '.nyc_output',
  'dist-static',
  '*.db',
  '*.db-journal',
  'uploads',
  '.DS_Store',
  'Thumbs.db',
  '.idea',
  '.vscode',
  '*.swp',
  '*.swo',
  '*~',
];

function shouldIgnore(filePath, isDir) {
  // 提取文件名或目录名
  const parts = filePath.split(/[/\\]/);
  const name = parts[parts.length - 1];
  const parentPath = parts.slice(0, -1).join('/');
  
  // 检查是否是顶层被忽略的目录
  if (parts.length === 1) {
    const topLevelIgnore = ['node_modules', 'dist', '.git', 'dist-static', 'uploads', 'coverage', '.cache', '.parcel-cache', '.vite', '.turbo'];
    if (topLevelIgnore.includes(name)) return true;
  }
  
  // 检查是否在任何父目录中被忽略
  const ignoreParents = ['node_modules', '.git', 'dist', '.cache', '.parcel-cache', '.vite', '.turbo', 'coverage'];
  for (const parent of ignoreParents) {
    if (parentPath.includes(parent) || parts.includes(parent)) return true;
  }
  
  // 检查文件名模式
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      if (name.endsWith(ext)) return true;
    } else if (name === pattern || name.startsWith(pattern.slice(0, -1))) {
      return true;
    }
  }
  
  // 检查隐藏文件
  if (name.startsWith('.') && name !== '.gitignore' && name !== '.github') return true;
  
  return false;
}

const api = async (path, options = {}) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 422) { // 422 可能是文件未变化
    console.error(`API Error ${res.status}:`, JSON.stringify(data, null, 2));
    throw new Error(`GitHub API Error: ${res.status}`);
  }
  return data;
};

function getAllFiles(dirPath, basePath = '') {
  const files = [];
  if (!existsSync(dirPath)) return files;
  
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const relPath = basePath ? `${basePath}/${entry}` : entry;
    
    try {
      const stat = statSync(fullPath);
      
      if (shouldIgnore(relPath, stat.isDirectory())) continue;
      
      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath, relPath));
      } else {
        files.push({ path: relPath, fullPath });
      }
    } catch (err) {
      console.warn(`⚠️ 无法读取 ${relPath}:`, err.message);
    }
  }
  return files;
}

async function getFileSha(path) {
  try {
    const data = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`);
    return data.sha || null;
  } catch {
    return null;
  }
}

async function pushToGitHub() {
  console.log('🚀 开始推送源代码到 GitHub...');
  console.log(`📦 仓库: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`🌿 分支: ${BRANCH}`);

  console.log('\n📁 扫描源代码文件...');
  const files = getAllFiles(ROOT_DIR);
  console.log(`   找到 ${files.length} 个文件`);

  console.log('\n🔍 获取最新提交...');
  const ref = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${BRANCH}`);
  const latestCommit = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${ref.object.sha}`);
  console.log(`   最新提交: ${ref.object.sha.substring(0, 7)}`);

  console.log('\n⬆️  上传文件到 GitHub...');
  const treeItems = [];
  let uploaded = 0;
  let skipped = 0;
  
  for (const file of files) {
    try {
      const content = readFileSync(file.fullPath);
      const existingSha = await getFileSha(file.path);
      
      // 检查文件是否真的变化了
      if (existingSha) {
        const base64 = content.toString('base64');
        const existingData = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs/${existingSha}`);
        if (existingData.content === base64) {
          skipped++;
          process.stdout.write(`   ⊘ ${file.path}\n`);
          treeItems.push({
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: existingSha,
          });
          continue;
        }
      }
      
      const blob = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({
          content: content.toString('base64'),
          encoding: 'base64',
        }),
      });
      
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
      uploaded++;
      process.stdout.write(`   ✓ ${file.path}\n`);
    } catch (err) {
      console.warn(`   ✗ ${file.path}: ${err.message}`);
    }
  }

  console.log(`\n   上传: ${uploaded} 文件, 跳过: ${skipped} 文件`);

  if (treeItems.length === 0) {
    console.log('\n✅ 没有新文件需要上传');
    return;
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
      message: `chore: 更新源代码 (${new Date().toLocaleString('zh-CN')})`,
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

  console.log('\n✅ 源代码推送完成！');
  console.log(`\n📋 下一步操作:`);
  console.log(`   1. 访问 https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/secrets/actions`);
  console.log(`   2. 添加以下 Secrets:`);
  console.log(`      - RAILWAY_TOKEN: Railway API Token`);
  console.log(`      - RAILWAY_PROJECT_ID: Railway 项目 ID`);
  console.log(`      - JWT_SECRET: JWT 密钥`);
  console.log(`      - ADMIN_PASSWORD: 管理员密码`);
  console.log(`      - DATABASE_URL: 数据库连接字符串`);
  console.log(`   3. GitHub Actions 将自动部署后端到 Railway`);
}

pushToGitHub().catch(err => {
  console.error('❌ 推送失败:', err.message);
  process.exit(1);
});
