param(
  [string]$RootPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($RootPath)) {
  $RootPath = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
}
if (-not [System.IO.Path]::IsPathRooted($RootPath)) {
  $RootPath = Join-Path (Get-Location) $RootPath
}
if (-not (Test-Path -LiteralPath $RootPath -PathType Container)) {
  throw "Repository root was not found: $RootPath"
}

$excludedDirectoryNames = @(".git", ".cache", "dist", "node_modules")
$pathTrimChars = [char[]]@([char]92, [char]47)
$rootPrefix = $RootPath.TrimEnd($pathTrimChars)
$scriptFiles = @(
  Get-ChildItem -LiteralPath $RootPath -Recurse -File -Filter "*.ps1" |
    Where-Object {
      $relative = $_.FullName.Substring($rootPrefix.Length).TrimStart($pathTrimChars)
      $parts = @($relative -split "[\\/]")
      -not (@($parts | Where-Object { $excludedDirectoryNames -contains $_ }).Count -gt 0)
    } |
    Sort-Object FullName
)

if ($scriptFiles.Count -eq 0) {
  Write-Host "[PowerShell Syntax] No .ps1 files found." -ForegroundColor Yellow
  exit 0
}

$failures = @()

foreach ($file in $scriptFiles) {
  $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
  $hasUtf8Bom = (
    $bytes.Length -ge 3 -and
    $bytes[0] -eq 0xef -and
    $bytes[1] -eq 0xbb -and
    $bytes[2] -eq 0xbf
  )
  $hasNonAscii = $false
  $start = if ($hasUtf8Bom) { 3 } else { 0 }
  for ($index = $start; $index -lt $bytes.Length; $index += 1) {
    if ($bytes[$index] -gt 0x7f) {
      $hasNonAscii = $true
      break
    }
  }

  if ($hasNonAscii -and -not $hasUtf8Bom) {
    $failures += "$($file.FullName): BOM-less PowerShell source contains non-ASCII bytes. Windows PowerShell 5.1 can decode this incorrectly. Use ASCII-only source or UTF-8 with BOM."
    continue
  }

  $tokens = $null
  $parseErrors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile(
    $file.FullName,
    [ref]$tokens,
    [ref]$parseErrors
  )

  foreach ($parseError in @($parseErrors)) {
    $extent = $parseError.Extent
    $failures += "$($file.FullName):$($extent.StartLineNumber):$($extent.StartColumnNumber): $($parseError.Message)"
  }
}

# Release automation is defined in workflow YAML, so its inline PowerShell
# must be syntax-checked too; it cannot be exercised before the PR is merged.
$releaseWorkflow = Join-Path $RootPath ".github/workflows/release-on-merge.yml"
if (Test-Path -LiteralPath $releaseWorkflow -PathType Leaf) {
  $lines = @([System.IO.File]::ReadAllLines($releaseWorkflow))
  $releaseRunBlocks = 0
  for ($i = 0; $i -lt $lines.Count; $i += 1) {
    if ($lines[$i] -cnotmatch '^        run:\s*\|\s*
  Write-Host "[PowerShell Syntax] Failed." -ForegroundColor Red
  foreach ($failure in $failures) {
    Write-Host "  $failure" -ForegroundColor Red
  }
  throw "PowerShell syntax/encoding preflight failed with $($failures.Count) issue(s)."
}

Write-Host "[OK] PowerShell syntax/encoding preflight passed for $($scriptFiles.Count) script(s)." -ForegroundColor Green
) { continue }
    $releaseRunBlocks += 1
    $block = New-Object System.Collections.Generic.List[string]
    $firstLine = $i + 2
    $j = $i + 1
    while ($j -lt $lines.Count) {
      $line = [string]$lines[$j]
      if ($line.StartsWith("          ")) {
        $block.Add($line.Substring(10))
      } elseif ([string]::IsNullOrWhiteSpace($line)) {
        $block.Add("")
      } else {
        break
      }
      $j += 1
    }
    $tokens = $null
    $parseErrors = $null
    [void][System.Management.Automation.Language.Parser]::ParseInput(
      ($block -join "`n"),
      [ref]$tokens,
      [ref]$parseErrors
    )
    foreach ($parseError in @($parseErrors)) {
      $lineNumber = $firstLine + $parseError.Extent.StartLineNumber - 1
      $failures += "${releaseWorkflow}:${lineNumber}: $($parseError.Message)"
    }
    $i = $j - 1
  }
  if ($releaseRunBlocks -lt 2) {
    $failures += "$releaseWorkflow should contain at least two inline PowerShell run blocks."
  }
}

if ($failures.Count -gt 0) {
  Write-Host "[PowerShell Syntax] Failed." -ForegroundColor Red
  foreach ($failure in $failures) {
    Write-Host "  $failure" -ForegroundColor Red
  }
  throw "PowerShell syntax/encoding preflight failed with $($failures.Count) issue(s)."
}

Write-Host "[OK] PowerShell syntax/encoding preflight passed for $($scriptFiles.Count) script(s)." -ForegroundColor Green
