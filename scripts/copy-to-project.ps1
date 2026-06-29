<#
.SYNOPSIS
  把 "D:\新建文件夹 (2)\" 下生成的静态部署产物复制到 "D:\云栖浅食1.0\" 项目根。

.DESCRIPTION
  本脚本由 agent 在受限的"中转"目录（d:\新建文件夹 (2)）创建静态构建产物后调用。
  会把 dist-static/、scripts/build-static.ps1、.gitignore、README.md 拷到项目根。

  执行后请在 D:\云栖浅食1.0\ 下手动运行：
      git init -b main
      git add .
      git commit -m "chore: 初始化静态部署产物"
      git remote add origin https://github.com/<your-username>/yunqi-canteen.git
      git push -u origin main
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$Staging = 'D:\新建文件夹 (2)'
$Project = 'D:\云栖浅食1.0'

if (-not (Test-Path $Project)) {
    throw "目标项目根不存在：$Project"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  复制静态部署产物到 $Project" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. dist-static/
$src = Join-Path $Staging 'dist-static'
$dst = Join-Path $Project 'dist-static'
if (Test-Path $dst) {
    Write-Host "  · 已存在 $dst，跳过复制" -ForegroundColor DarkYellow
} else {
    Copy-Item -Path $src -Destination $dst -Recurse -Force
    Write-Host "  ✔ dist-static/        -> $dst" -ForegroundColor Green
}

# 2. scripts/build-static.ps1
$scriptsDst = Join-Path $Project 'scripts'
New-Item -ItemType Directory -Force -Path $scriptsDst | Out-Null
Copy-Item -Path (Join-Path $Staging 'scripts\build-static.ps1') `
          -Destination (Join-Path $scriptsDst 'build-static.ps1') -Force
Write-Host "  ✔ scripts/build-static.ps1" -ForegroundColor Green

# 3. .gitignore
$gi = Join-Path $Project '.gitignore'
if (Test-Path $gi) {
    Write-Host "  · 已存在 $gi，请手工检查合并" -ForegroundColor DarkYellow
} else {
    Copy-Item -Path (Join-Path $Staging '.gitignore') -Destination $gi -Force
    Write-Host "  ✔ .gitignore" -ForegroundColor Green
}

# 4. README.md
$rm = Join-Path $Project 'README.md'
if (Test-Path $rm) {
    Write-Host "  · 已存在 $rm，请手工检查合并" -ForegroundColor DarkYellow
} else {
    Copy-Item -Path (Join-Path $Staging 'README.md') -Destination $rm -Force
    Write-Host "  ✔ README.md" -ForegroundColor Green
}

Write-Host "`n下一步（请在 $Project 下执行）：" -ForegroundColor Cyan
Write-Host "  cd $Project" -ForegroundColor White
Write-Host "  git init -b main" -ForegroundColor White
Write-Host "  git add ." -ForegroundColor White
Write-Host "  git commit -m 'chore: 初始化静态部署产物'" -ForegroundColor White
Write-Host "  git remote add origin https://github.com/<your-username>/yunqi-canteen.git" -ForegroundColor White
Write-Host "  git push -u origin main" -ForegroundColor White
Write-Host "`n然后到 GitHub → Settings → Pages：Branch=main, Folder=/dist-static" -ForegroundColor Cyan
Write-Host "完成后访问：https://<your-username>.github.io/yunqi-canteen/" -ForegroundColor Green
