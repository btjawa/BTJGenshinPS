echo off
chcp 65001>nul
echo 将使用此命令来调用Java: %1
echo.

cd ..\GateServer\Grasscutter
echo 正在启动 Grasscutter ...
%1 -jar grasscutter.jar
exit