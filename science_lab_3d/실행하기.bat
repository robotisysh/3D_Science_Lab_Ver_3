@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>&1
if not errorlevel 1 goto USE_PY
where python >nul 2>&1
if not errorlevel 1 goto USE_PYTHON
echo Python was not found. Please install Python 3 and try again.
echo Download: https://www.python.org/downloads/windows/
pause
exit /b 1
:USE_PY
start "LABVERSE Server" /D "%~dp0" cmd /k "py -m http.server 8000 --bind 127.0.0.1"
goto OPEN_BROWSER
:USE_PYTHON
start "LABVERSE Server" /D "%~dp0" cmd /k "python -m http.server 8000 --bind 127.0.0.1"
:OPEN_BROWSER
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8000"
exit /b 0
