# BTJGenshinPS

为Grasscutter制作的GUI一键端，基于Node.js，Electron。

如果你不是开发者，就不要再看下面了，请直接前往Release

GateServer 请从Release中获取

![preview.png](https://raw.githubusercontent.com/btjawa/btjawa.top/master/preview.png)

## To Do

- [x] 修复console输出中文锟斤拷

- [ ] 十分详细的文档

- [x] 实现一键更新资源

- [ ] 实现一键更新本体

- [x] 联机模式

- [ ] 免代理模式

- [ ] 静默启动 

- [ ] 可视化编辑shop.json等

- [ ] 自由选择服务端版本

- [ ] API

## Development

若package后想要用命令行运行，请先使用 `chcp 65001` 将代码页改为 UTF-8

Using NPM

**Requirements:**

 - [Node.js](https://registry.npmmirror.com/binary.html?path=node/v18.16.1/) >= 18.16.1
 > npm >= 9.5.1
 - [Git](https://git-scm.com/downloads)

```shell
git clone https://github.com/btjawa/BTJGenshinPS.git
cd BTJGenshinPS
npm install
```

**Scripts**

```shell
npm run start # Preview
npm run package # Package
```

## Update

### Update App

一键更新目前在 TODO

手动更新时只用下载Release中带有app的zip，替换掉除resources文件夹以外的所有文件

然后替换掉resources文件夹中的app.asar就更新完毕了

### Update GateServer

可切换到 主页 选项卡后点击 “更新资源”

<img src="https://img.shields.io/badge/-Node.js-3C873A?style=flat&logo=Node.js&logoColor=white">

<a title="Copyright" target="_blank" href="https://btjawa.top/"><img src="https://img.shields.io/badge/Copyright%20%C2%A9%202022--2023-%E7%99%BD%E5%BC%B9%E6%B1%B2-red"></a>