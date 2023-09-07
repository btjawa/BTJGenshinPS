echo off
chcp 65001>nul
echo.

cd ..\GateServer\MongoDB
echo 正在启动数据库...
.\mongod --dbpath data --port 27017
exit