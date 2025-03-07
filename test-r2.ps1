# 设置环境变量（请替换为您的实际值）
$env:R2_ACCESS_KEY_ID = "e740ffcbc9a1677be270f26b0c3e7893"
$env:R2_SECRET_ACCESS_KEY = "8c42f6b88f9110ca8e0f451bde05b97de8c55bcae7444e526c01ccd41799b117"
$env:R2_ACCOUNT_ID = "7769d61fdeb06398f4563cd23675fd39"



# 配置 AWS CLI
aws configure set aws_access_key_id $env:R2_ACCESS_KEY_ID
aws configure set aws_secret_access_key $env:R2_SECRET_ACCESS_KEY
aws configure set default.region us-east-1
aws configure set default.output json

# 基本配置
aws configure set default.s3.addressing_style path
aws configure set default.s3.payload_signing_enabled false

# 创建测试文件
"This is a test file" | Out-File -FilePath "test.txt" -Encoding UTF8

Write-Host "开始测试 R2 连接..."

$endpoint = "https://${env:R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# 测试列出 bucket 内容
Write-Host "1. 测试列出 bucket 内容："
aws s3api list-objects --bucket product --endpoint-url $endpoint

# 测试上传文件
Write-Host "`n2. 测试上传文件："
aws s3api put-object `
    --bucket product `
    --key test.txt `
    --body test.txt `
    --endpoint-url $endpoint `
    --content-type "text/plain" `
    --content-length (Get-Item "test.txt").Length `
    --checksum-algorithm CRC32 `
    --debug

# 确认文件已上传
Write-Host "`n3. 确认文件已上传："
aws s3api head-object --bucket product --key test.txt --endpoint-url $endpoint

# 测试删除文件
Write-Host "`n4. 测试删除文件："
aws s3api delete-object --bucket product --key test.txt --endpoint-url $endpoint

# 清理本地测试文件
Remove-Item "test.txt"

Write-Host "`n测试完成！" 