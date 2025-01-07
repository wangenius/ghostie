param (
    [Parameter(Mandatory=$false)]
    [string]$Version
)

# 从 tauri.conf.json 获取当前版本号
$tauriConfig = Get-Content "src-tauri/tauri.conf.json" -Raw | ConvertFrom-Json
$currentVersion = $tauriConfig.version

if ($currentVersion -match '(\d+)\.(\d+)\.(\d+)') {
    $major = [int]$matches[1]
    $minor = [int]$matches[2]
    $patch = [int]$matches[3]
} else {
    Write-Host "错误：无法从 tauri.conf.json 中获取当前版本号。" -ForegroundColor Red
    exit 1
}

# 如果没有提供版本号，自动递增最后一位
if (-not $Version) {
    $patch++
    $Version = "$major.$minor.$patch"
    Write-Host "当前版本：$currentVersion" -ForegroundColor Cyan
    Write-Host "新版本：$Version" -ForegroundColor Green
}
# 如果提供了版本号，检查格式
elseif ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Host "错误：版本号格式不正确。应该是 x.y.z 格式，例如：1.0.0" -ForegroundColor Red
    exit 1
}

# 检查是否有未提交的更改
$status = git status --porcelain
if ($status) {
    Write-Host "错误：有未提交的更改。请先提交或存储这些更改。" -ForegroundColor Red
    git status
    exit 1
}

# 检查当前分支是否是 master
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "master") {
    Write-Host "错误：不在 master 分支上。请切换到 master 分支。" -ForegroundColor Red
    exit 1
}

try {
    # 创建 RELEASE_NOTES 目录（如果不存在）
    if (-not (Test-Path "RELEASE_NOTES")) {
        New-Item -ItemType Directory -Path "RELEASE_NOTES"
    }

    # 准备发布说明文件
    $releaseNotesFile = "RELEASE_NOTES/v$Version.md"
    
    # 提示用户填写发布说明
    Write-Host "`n请填写此版本的发布说明。" -ForegroundColor Cyan
    Write-Host "提示：可以包含新功能、bug修复、改进等内容。" -ForegroundColor Cyan
    Write-Host "输入空行（直接按 Enter）来结束输入。" -ForegroundColor Yellow
    
    $releaseNotes = @()
    while ($true) {
        $line = Read-Host
        if ($line -eq "") { break }
        $releaseNotes += $line
    }
    
    # 保存发布说明
    $releaseNotes | Set-Content $releaseNotesFile
    
    # 确认发布说明
    Write-Host "`n发布说明预览：" -ForegroundColor Cyan
    Get-Content $releaseNotesFile
    
    $confirm = Read-Host "`n确认发布说明是否正确？(Y/N)"
    if ($confirm -ne "Y") {
        Write-Host "已取消发布流程。" -ForegroundColor Yellow
        exit 0
    }

    # 更新 package.json 中的版本号
    Write-Host "正在更新 package.json 中的版本号..." -ForegroundColor Cyan
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $packageJson.version = $Version
    $packageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json"

    # 更新 tauri.conf.json 中的版本号
    Write-Host "正在更新 tauri.conf.json 中的版本号..." -ForegroundColor Cyan
    $tauriConfig.version = $Version
    $tauriConfig | ConvertTo-Json -Depth 100 | Set-Content "src-tauri/tauri.conf.json"

    # 提交更改
    Write-Host "正在提交更改..." -ForegroundColor Cyan
    git add package.json src-tauri/tauri.conf.json "RELEASE_NOTES/v$Version.md"
    git commit -m "bump version to $Version"

    # 推送更改
    Write-Host "正在推送更改..." -ForegroundColor Cyan
    git push

    # 创建并推送标签
    Write-Host "正在创建标签 v$Version..." -ForegroundColor Cyan
    git tag "v$Version"
    git push origin master "v$Version"

    Write-Host "`n✨ 发布流程完成！" -ForegroundColor Green
    Write-Host "版本号已更新为：$Version" -ForegroundColor Green
    Write-Host "标签 v$Version 已创建并推送" -ForegroundColor Green
    Write-Host "`n正在等待 GitHub Actions 构建..." -ForegroundColor Yellow
    Write-Host "你可以在这里查看构建进度：https://github.com/wangenius/echo/actions" -ForegroundColor Yellow

} catch {
    Write-Host "`n❌ 发布过程中出现错误：" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    # 尝试回滚更改
    Write-Host "`n正在尝试回滚更改..." -ForegroundColor Yellow
    git reset --hard HEAD^
    git tag -d "v$Version" 2>$null
    
    exit 1
} 