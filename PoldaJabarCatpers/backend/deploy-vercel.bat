@echo off
echo ========================================
echo  Deploy Polda Jabar Catpers API
echo  ke Vercel Production
echo ========================================
echo.

echo [1/3] Login ke Vercel (akan buka browser)...
call vercel login
if %errorlevel% neq 0 (
    echo GAGAL login ke Vercel!
    pause
    exit /b 1
)

echo.
echo [2/3] Link project ke polda-jabar-catpers-api...
cd /d "%~dp0"
call vercel link --project polda-jabar-catpers-api --yes
if %errorlevel% neq 0 (
    echo GAGAL link project. Coba jalankan: vercel link --project polda-jabar-catpers-api
    pause
    exit /b 1
)

echo.
echo [3/3] Deploy ke production...
call vercel --prod --yes
if %errorlevel% neq 0 (
    echo GAGAL deploy!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  DEPLOY SELESAI!
echo  Cek: https://polda-jabar-catpers-api.vercel.app/
echo ========================================
pause
