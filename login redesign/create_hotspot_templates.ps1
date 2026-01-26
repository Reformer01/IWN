# create_hotspot_templates.ps1

$baseDir = "c:\Users\Rick Sanchez\Downloads\IWN"
$redesignDir = "$baseDir\login redesign"
$hotspot2Dir = "$redesignDir\hotspot2"
$assetsSource = "$baseDir\iworld_redesign_preview\Assets\img"

$schools = @(
    @{
        Name   = "Crescent University"
        Folder = "hotspot-crescent"
        Logo   = "CUAB.png"
    },
    @{
        Name   = "Achievers University"
        Folder = "hotspot-achievers"
        Logo   = "achievers-university-logo.png"
    },
    @{
        Name   = "JABU"
        Folder = "hotspot-jabu"
        Logo   = "JABU.jpg"
    }
)

foreach ($school in $schools) {
    $targetDir = "$redesignDir\$($school.Folder)"
    Write-Host "Creating hotspot for $($school.Name)..."
    
    # 1. Create target directory
    if (Test-Path $targetDir) { Remove-Item -Path $targetDir -Recurse -Force }
    New-Item -ItemType Directory -Path $targetDir -Force
    
    # 2. Copy all files from hotspot2 (Base functional files)
    Copy-Item -Path "$hotspot2Dir\*" -Destination $targetDir -Recurse -Exclude "login.html", "logo2.png"
    
    # 3. Copy our modern design and rename to login.html
    Copy-Item -Path "$redesignDir\alternative.html" -Destination "$targetDir\login.html"
    
    # 4. Copy current assets folder
    Copy-Item -Path "$redesignDir\assets" -Destination "$targetDir\assets" -Recurse
    
    # 5. Copy the specific school logo
    Copy-Item -Path "$assetsSource\$($school.Logo)" -Destination "$targetDir\assets\img\school-logo.png"
    
    # 6. Update the login.html (patching logo and titles)
    $content = Get-Content -Path "$targetDir\login.html" -Raw
    
    # Update Logo Source (Standardize to school-logo.png)
    $content = $content -replace './assets/img/JABU-Logo-n-Header.png', './assets/img/school-logo.png'
    $content = $content -replace './assets/img/ngfep no bg.png', './assets/img/ngfep no bg.png' # Ensure path is relative
    
    # Update Title
    $content = $content -replace '<title>.*?</title>', "<title>$($school.Name) | Login</title>"
    
    Set-Content -Path "$targetDir\login.html" -Value $content
    
    Write-Host "Successfully completed $($school.Name)."
}
