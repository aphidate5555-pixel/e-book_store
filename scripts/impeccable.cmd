@echo off
setlocal
for %%I in ("%~dp0..") do set "PROJECT_ROOT=%%~fI"
set "IMPECCABLE_HOME=%PROJECT_ROOT%\.impeccable-cache"
call "%PROJECT_ROOT%\.agents\skills\impeccable\scripts\impeccable.cmd" %*
exit /b %errorlevel%
