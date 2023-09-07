# BTJGenshinPS

开发中！现在放到Github是因为让我commit多一点（

处于Dev阶段，暂时不接受PR

由于打包app时会使用asar加密，所以GateServer与app.config.json将会放置在上一级

GateServer 请从以后的Release中获取

打包后结构

resources/

├── app.asar

└── GateServer/

## Building

使用NPM构建

**Requirements:**

 - [Node.js](https://registry.npmmirror.com/binary.html?path=node/v18.16.1/) >= 18.16.1
 > npm >= 9.5.1
 - [Git](https://git-scm.com/downloads)

```shell
git clone https://github.com/btjawa/BTJGenshinPS.git
cd BTJGenshinPS
npm install # 安装依赖
```

**Scripts**

```shell
npm run start # 预览
npm run package # 打包
```