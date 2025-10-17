# =====================================================
# Find All References to Old Audit Column Names
# =====================================================
# Run this script to find all code that needs updating
# after running the audit columns migration
# =====================================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Searching for OLD audit column references" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Searching for 'added_at' in TypeScript/JavaScript files..." -ForegroundColor Yellow
Write-Host "-----------------------------------------------------------" -ForegroundColor Yellow
Get-ChildItem -Path frontend,backend -Recurse -Include *.ts,*.tsx,*.js,*.jsx -Exclude node_modules,dist,build |
  Select-String -Pattern "added_at" |
  Select-Object Path,LineNumber,Line |
  Format-Table -AutoSize

Write-Host ""
Write-Host "2. Searching for 'added_by' in TypeScript/JavaScript files..." -ForegroundColor Yellow
Write-Host "-----------------------------------------------------------" -ForegroundColor Yellow
Get-ChildItem -Path frontend,backend -Recurse -Include *.ts,*.tsx,*.js,*.jsx -Exclude node_modules,dist,build |
  Select-String -Pattern "added_by" |
  Select-Object Path,LineNumber,Line |
  Format-Table -AutoSize

Write-Host ""
Write-Host "3. Searching for 'addedAt' (camelCase) in TypeScript/JavaScript files..." -ForegroundColor Yellow
Write-Host "-----------------------------------------------------------------------" -ForegroundColor Yellow
Get-ChildItem -Path frontend,backend -Recurse -Include *.ts,*.tsx,*.js,*.jsx -Exclude node_modules,dist,build |
  Select-String -Pattern "addedAt" |
  Select-Object Path,LineNumber,Line |
  Format-Table -AutoSize

Write-Host ""
Write-Host "4. Searching for 'addedBy' (camelCase) in TypeScript/JavaScript files..." -ForegroundColor Yellow
Write-Host "-----------------------------------------------------------------------" -ForegroundColor Yellow
Get-ChildItem -Path frontend,backend -Recurse -Include *.ts,*.tsx,*.js,*.jsx -Exclude node_modules,dist,build |
  Select-String -Pattern "addedBy" |
  Select-Object Path,LineNumber,Line |
  Format-Table -AutoSize

Write-Host ""
Write-Host "5. Searching in SQL migration files..." -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Yellow
if (Test-Path "backend/migrations") {
  Get-ChildItem -Path backend/migrations -Include *.sql -Recurse |
    Select-String -Pattern "added_at|added_by" |
    Select-Object Path,LineNumber,Line |
    Format-Table -AutoSize
} else {
  Write-Host "No backend/migrations folder found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "6. Searching in Supabase migration files..." -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Yellow
if (Test-Path "supabase/migrations") {
  Get-ChildItem -Path supabase/migrations -Include *.sql -Recurse |
    Select-String -Pattern "added_at|added_by" |
    Select-Object Path,LineNumber,Line |
    Format-Table -AutoSize
} else {
  Write-Host "No supabase/migrations folder found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Search complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Files to update after migration:" -ForegroundColor White
Write-Host "- Any files listed above" -ForegroundColor White
Write-Host "- Replace 'added_at' with 'created_at'" -ForegroundColor White
Write-Host "- Replace 'added_by' with 'created_by'" -ForegroundColor White
Write-Host "- Replace 'addedAt' with 'createdAt'" -ForegroundColor White
Write-Host "- Replace 'addedBy' with 'createdBy'" -ForegroundColor White
Write-Host ""
