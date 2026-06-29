<#
.SYNOPSIS
  构建云栖浅食前端并合并到 dist-static/ 用于 GitHub Pages 部署。

.DESCRIPTION
  1. 在 client/ 和 admin/ 目录执行 npm run build
  2. 清空 dist-static/client/ 与 dist-static/admin/
  3. 复制 client/dist/* → dist-static/client/
  4. 复制 admin/dist/*  → dist-static/admin/
  5. 将 index.html、manifest.webmanifest、registerSW.js 中的绝对路径改为相对
  6. 把 client/icons/* 复制到 dist-static/icons/ 作为根级通用图标
  7. 如不存在，则创建占位 dist-static/index.html / install*.html / qr.html / 404.html / 根 sw.js / 根 manifest

.PARAMETER SkipBuild
  跳过 npm run build（仅做"复制 + 改路径"动作），适合反复调整 dist-static 静态资源时使用。

.PARAMETER Target
  仅处理一个子项目（client / admin），用于单端调试。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/build-static.ps1
  powershell -ExecutionPolicy Bypass -File scripts/build-static.ps1 -SkipBuild
  powershell -ExecutionPolicy Bypass -File scripts/build-static.ps1 -Target client
#>

[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [ValidateSet('all', 'client', 'admin')]
    [string]$Target = 'all'
)

$ErrorActionPreference = 'Stop'

# 路径解析：脚本所在目录的上两级 = 项目根
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir '..')
Set-Location $ProjectRoot

$DistStatic = Join-Path $ProjectRoot 'dist-static'
$ClientDir  = Join-Path $ProjectRoot 'client'
$AdminDir   = Join-Path $ProjectRoot 'admin'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  云栖浅食 · 静态构建 (dist-static)" -ForegroundColor Cyan
Write-Host "  项目根：$ProjectRoot" -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan

# ---------- 1. npm run build ----------
function Invoke-Build($name, $dir) {
    Write-Host "`n[1/4] 构建 $name ..." -ForegroundColor Yellow
    Push-Location $dir
    try {
        if (Test-Path 'node_modules') {
            npm run build
            if ($LASTEXITCODE -ne 0) { throw "构建 $name 失败" }
        } else {
            Write-Host "  ! 未找到 $dir/node_modules，跳过构建（请先 npm install）" -ForegroundColor DarkYellow
        }
    } finally {
        Pop-Location
    }
}

if (-not $SkipBuild) {
    if ($Target -in 'all', 'client') { Invoke-Build 'client' $ClientDir }
    if ($Target -in 'all', 'admin')  { Invoke-Build 'admin'  $AdminDir }
} else {
    Write-Host "`n[1/4] 已跳过 npm run build（-SkipBuild）" -ForegroundColor DarkYellow
}

# ---------- 2. 准备目录 ----------
Write-Host "`n[2/4] 准备 dist-static 目录 ..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $DistStatic | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DistStatic 'client') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DistStatic 'admin')  | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DistStatic 'icons')  | Out-Null

# 清理旧的 client/admin 内容
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue (Join-Path $DistStatic 'client\*')
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue (Join-Path $DistStatic 'admin\*')

# ---------- 3. 复制 + 改路径 ----------
function Sync-SubApp($name, $srcDir, $dstDir) {
    Write-Host "  · 复制 $name ..." -ForegroundColor Green
    if (-not (Test-Path $srcDir)) {
        Write-Host "  ! 未找到 $srcDir，请确认已构建" -ForegroundColor DarkYellow
        return
    }
    Copy-Item -Path (Join-Path $srcDir '*') -Destination $dstDir -Recurse -Force

    # index.html: 绝对路径 → 相对路径
    $indexHtml = Join-Path $dstDir 'index.html'
    if (Test-Path $indexHtml) {
        $c = Get-Content $indexHtml -Raw -Encoding utf8
        $c = $c -replace 'href="/',  'href="./'
        $c = $c -replace 'src="/',   'src="./'
        Set-Content -Path $indexHtml -Value $c -Encoding utf8
    }

    # manifest.webmanifest: start_url / scope / icons src → 相对
    $manifest = Join-Path $dstDir 'manifest.webmanifest'
    if (Test-Path $manifest) {
        $c = Get-Content $manifest -Raw -Encoding utf8
        $c = $c -replace '"start_url":"/"',  '"start_url":"./"'
        $c = $c -replace '"scope":"/"',       '"scope":"./"'
        $c = $c -replace '"/icons/',          '"./icons/'
        # shortcuts 内的 url "/xxx"
        $c = $c -replace '"url":"/',          '"url":"./'
        Set-Content -Path $manifest -Value $c -Encoding utf8
    }

    # registerSW.js: /sw.js → ./sw.js
    $reg = Join-Path $dstDir 'registerSW.js'
    if (Test-Path $reg) {
        $c = Get-Content $reg -Raw -Encoding utf8
        $c = $c -replace "'/sw\.js'",  "'./sw.js'"
        $c = $c -replace "scope: '/'", "scope: './'"
        Set-Content -Path $reg -Value $c -Encoding utf8
    }

    # sw.js: 已是 workbox 生成，使用相对路径，无需修改
}

Write-Host "`n[3/4] 复制并改写路径 ..." -ForegroundColor Yellow
if ($Target -in 'all', 'client') {
    Sync-SubApp 'client' (Join-Path $ClientDir 'dist') (Join-Path $DistStatic 'client')
}
if ($Target -in 'all', 'admin') {
    Sync-SubApp 'admin'  (Join-Path $AdminDir  'dist') (Join-Path $DistStatic 'admin')
}

# ---------- 4. 通用资源 ----------
Write-Host "`n[4/4] 同步根级资源（icons / 占位文件） ..." -ForegroundColor Yellow
$clientIcons = Join-Path $ClientDir 'dist\icons'
if (Test-Path $clientIcons) {
    Copy-Item -Path (Join-Path $clientIcons '*') `
              -Destination (Join-Path $DistStatic 'icons') -Recurse -Force
}

# 占位说明：如引导页/404/qr 不存在则创建空占位（实际项目里这些文件会从仓库根 checkout）
$placeholders = @{
    'index.html'         = '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./index.html">'
    'install.html'       = '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./install.html">'
    'install-client.html'= '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./install-client.html">'
    'install-admin.html' = '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./install-admin.html">'
    'qr.html'            = '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./qr.html">'
    '404.html'           = '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./404.html">'
}
foreach ($k in $placeholders.Keys) {
    $p = Join-Path $DistStatic $k
    if (-not (Test-Path $p)) {
        Set-Content -Path $p -Value $placeholders[$k] -Encoding utf8
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  完成 ✅  产物：$DistStatic" -ForegroundColor Green
Write-Host "  本地预览：cd dist-static && npx http-server -p 8080" -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan
