# 关于本更新

## 适配Grasscutter v1.7.3，游戏版本REL v4.0.1

1.0.3 Release 修订版本

此次有重要的逻辑更新！仅需要更新app，不需要更新 `GateServer`

下次次版本(1.1.0)更新：游戏版本REL v4.2.0

# 更新日志

- **fix: 启动服务时会有部分变量未及时更新 #96eb5c**

- fix/feat: 让代理模块的判断逻辑更加严格

- **fix: 读写3DMigoto配置时未及时更新target**

- fix/feat: 测试连接 部分更加严格

- fix: 修复部分逻辑错误；优化性能

- **feat: 更新服务端版本至v1.7.3**
    - 见 [Grasscutter | v1.7.3](https://github.com/Grasscutters/Grasscutter/releases/tag/v1.7.3)

- **feat: 自定义JVM参数**
    - 现在可以在 设置 选项卡中设定JVM启动参数！
    - `java ${JVM头} -jar grasscutter.jar ${JVM尾}`

- **feat: MongoDB Compass支持**
    - 现在可以在 工具/扩展 选项卡中下载/启动MongoDB Compass！
    - 安装路径：`${应用路径}\resources\data\MongoDB Compass`

### [Full Changelog](https://github.com/btjawa/BTJGenshinPS/compare/3701e89d3debaaae4b2344c12479ea82db90c438...8bfe18e1d5d85168fea0dc666bc9990fe8351ffe)

# 如何更新

`BTJGenshinPS-xxx` 为完整版，带GateServer（即完整服务），适用于完整更新

`BTJGenshinPS-xxx-app` 为纯app，只有本体，适用于手动更新app

下载Release中带有 `app` 的zip，替换掉除 `resources` 文件夹以外的所有文件 (可保留logs文件夹)

然后替换掉 `resources` 文件夹中的 `app.asar` ，替换掉 `data` 文件夹