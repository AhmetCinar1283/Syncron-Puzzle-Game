@echo off
chcp 65001 >nul
echo ===================================================
echo   Syncron - Coklu Platform Asset Senkronizasyonu
echo ===================================================
echo.

cd /d "%~dp0"

python scripts/sync_assets.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [HATA] Senkronizasyon sirasinda bir sorun olustu.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [TAMAMLANDI] Tum gorseller basariyla guncellendi!
echo.
pause
