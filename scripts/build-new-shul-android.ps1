$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $taskRoot
& npm.cmd run new-shul:build
if ($LASTEXITCODE -ne 0) { throw 'New Shul web build failed' }
$taskAndroid = Join-Path $taskRoot 'android-new-shul'
$taskSdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
if (-not (Test-Path (Join-Path $taskSdk 'platforms/android-36'))) { throw 'Android SDK 36 is required' }
[IO.File]::WriteAllText((Join-Path $taskAndroid 'local.properties'), 'sdk.dir=' + $taskSdk.Replace('\','/'))
$taskAssets = Join-Path $taskAndroid 'app/src/main/assets/www'
# Keep packaging restricted to this app's isolated web bundle.
if (Test-Path -LiteralPath $taskAssets) {
    $taskResolvedAssets = (Resolve-Path -LiteralPath $taskAssets).Path
    $taskExpectedAssets = [IO.Path]::GetFullPath((Join-Path $taskAndroid 'app/src/main/assets/www'))
    if ($taskResolvedAssets -ne $taskExpectedAssets) { throw 'Refusing to clean assets outside this Android project' }
    Remove-Item -LiteralPath $taskResolvedAssets -Recurse -Force
}
New-Item -ItemType Directory -Path $taskAssets -Force | Out-Null
Copy-Item -Path (Join-Path $taskRoot 'dist-new-shul/*') -Destination $taskAssets -Recurse -Force
Push-Location -LiteralPath $taskAndroid
try {
    & ./gradlew.bat --no-daemon assembleDebug
    if ($LASTEXITCODE -ne 0) { throw 'New Shul Android build failed' }
} finally { Pop-Location }
$taskOut = Join-Path (Split-Path $taskRoot -Parent) 'outputs'
New-Item -ItemType Directory -Path $taskOut -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $taskAndroid 'app/build/outputs/apk/debug/app-debug.apk') -Destination (Join-Path $taskOut 'New-Shul-0.1.3.apk') -Force
Write-Output (Join-Path $taskOut 'New-Shul-0.1.3.apk')
