# Script de PowerShell para crear el acceso directo de FoodAdmin con el icono del Gato Chef
# Ejecuta esto en PowerShell para generar el icono y crear el acceso directo en el escritorio.

$ErrorActionPreference = "Stop"

try {
    # Definir rutas absolutas basadas en la ubicación del script
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $JpgPath = Join-Path $ScriptDir "src\assets\gato_chef.jpg"
    $IcoPath = Join-Path $ScriptDir "src\assets\gato_chef.ico"
    $BatPath = Join-Path $ScriptDir "Iniciar_FoodAdmin.bat"

    Write-Host "--- Generador de Acceso Directo FoodAdmin ---" -ForegroundColor Cyan

    # 1. Validar que la imagen origen existe
    if (-not (Test-Path $JpgPath)) {
        Write-Error "No se encontró el archivo de imagen en: $JpgPath"
    }
    if (-not (Test-Path $BatPath)) {
        Write-Error "No se encontró el archivo por lotes en: $BatPath"
    }

    # 2. Convertir JPG a ICO (256x256 píxeles cuadrado) usando .NET Drawing
    Write-Host "Convirtiendo imagen a formato icono (.ico) de 256x256..." -ForegroundColor Yellow
    Add-Type -AssemblyName System.Drawing

    $srcImage = [System.Drawing.Image]::FromFile($JpgPath)
    
    # Crear un bitmap vacío de 256x256 (resolución estándar de iconos de Windows de alta calidad)
    $destBitmap = New-Object System.Drawing.Bitmap(256, 256)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    
    # Configurar renderizado de alta calidad
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # Dibujar la imagen estirada a 256x256 (o recortada, en este caso estirada/redimensionada)
    $graphics.DrawImage($srcImage, 0, 0, 256, 256)
    
    # Obtener el handle del icono y guardar
    $iconHandle = $destBitmap.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($iconHandle)
    $fileStream = New-Object System.IO.FileStream($IcoPath, [System.IO.FileMode]::Create)
    $icon.Save($fileStream)
    
    # Cerrar streams y liberar recursos
    $fileStream.Close()
    $graphics.Dispose()
    $destBitmap.Dispose()
    $srcImage.Dispose()
    
    Write-Host "Icono generado con éxito en: $IcoPath" -ForegroundColor Green

    # 3. Crear accesos directos
    $WshShell = New-Object -ComObject WScript.Shell
    
    # 3a. Acceso directo en el Escritorio
    Write-Host "Creando acceso directo en el escritorio..." -ForegroundColor Yellow
    $DesktopPath = [System.Environment]::GetFolderPath('Desktop')
    $DesktopShortcutPath = Join-Path $DesktopPath "Iniciar_FoodAdmin.lnk"
    
    $DesktopShortcut = $WshShell.CreateShortcut($DesktopShortcutPath)
    $DesktopShortcut.TargetPath = $BatPath
    $DesktopShortcut.WorkingDirectory = $ScriptDir
    $DesktopShortcut.IconLocation = $IcoPath
    $DesktopShortcut.Description = "Iniciar FoodAdmin de Escritorio"
    $DesktopShortcut.Save()
    Write-Host "Acceso directo creado con exito en tu Escritorio." -ForegroundColor Green
    Write-Host "Ruta: $DesktopShortcutPath" -ForegroundColor Green

    # 3b. Acceso directo en la Carpeta Local del Proyecto
    Write-Host "Creando acceso directo en la carpeta del proyecto..." -ForegroundColor Yellow
    $LocalShortcutPath = Join-Path $ScriptDir "Iniciar_FoodAdmin.lnk"
    
    $LocalShortcut = $WshShell.CreateShortcut($LocalShortcutPath)
    $LocalShortcut.TargetPath = $BatPath
    $LocalShortcut.WorkingDirectory = $ScriptDir
    $LocalShortcut.IconLocation = $IcoPath
    $LocalShortcut.Description = "Iniciar FoodAdmin"
    $LocalShortcut.Save()
    Write-Host "Acceso directo local creado con exito en la carpeta del proyecto." -ForegroundColor Green
    Write-Host "Ruta: $LocalShortcutPath" -ForegroundColor Green
}
catch {
    Write-Host "Ocurrió un error al crear el acceso directo: $_" -ForegroundColor Red
    exit 1
}
