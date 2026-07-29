@echo off
cd /d "C:\Users\prodz\OneDrive\Desktop\El Sabor Del Sur"
echo Sirviendo en http://192.168.1.157:3000
echo Presiona Ctrl+C para detener
python -m http.server 3000 --bind 0.0.0.0
pause