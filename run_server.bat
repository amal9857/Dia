@echo off
cd /d "%~dp0backend"
python manage.py runserver
pause
