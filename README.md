# BTJGenshinPS

![preview.png](https://socialify.git.ci/btjawa/BTJGenshinPS/image?description=1&font=Inter&forks=1&issues=1&language=1&logo=https%3A%2F%2Fs2.loli.net%2F2023%2F09%2F23%2F2XdQyJNUho3O6kT.png&name=1&owner=1&pattern=Plus&pulls=1&stargazers=1&theme=Dark)

<div class="shields" align="center">
    <a><img src="https://img.shields.io/badge/-HTML5-EF652A?style=flat&logo=HTML5&logoColor=white"></a>
    <a><img src="https://img.shields.io/badge/-CSS3-3C9CD7?style=flat&logo=CSS3&logoColor=white"></a>
    <a><img src="https://img.shields.io/badge/-JavaScript-FFDA3E?style=flat&logo=JavaScript&logoColor=white"></a>
    <a><img src="https://img.shields.io/badge/-Node.js-3C873A?style=flat&logo=Node.js&logoColor=white"></a>
    <br>
    <a><img src="https://img.shields.io/badge/-Electron-2F3242?style=flat&logo=Electron&logoColor=white"></a>
    <a href="https://github.com/Grasscutters/Grasscutter"><img src="https://img.shields.io/badge/-Grasscutter-010409?style=flat&logo=Github&Color=white"></a>
    <a href="https://www.mongodb.com"><img src="https://img.shields.io/badge/-MongoDB-E5E5E5?style=flat&logo=MongoDB&Color=white"></a>
</div>

基于Node.js，Electron，后期可能会尝试优化Electron体积。

GateServer请从Release中获取，repo中只包含APP

## To Do

- [x] 修复console输出中文锟斤拷

- [x] 十分详细的文档

- [x] 实现一键更新资源

- [x] 实现一键更新本体

- [x] 联机模式

- [ ] 免代理模式

- [ ] 静默启动 

- [ ] 可视化编辑shop.json等

- [ ] 自由选择服务端版本

- [ ] API

## Development

若package后想要用命令行运行，请先使用 `chcp 65001` 将代码页改为 UTF-8

可直接在 `resources/log` 文件夹内查看日志

Using NPM

**Requirements:**

 - [Node.js](https://registry.npmmirror.com/binary.html?path=node/v18.16.1/) >= 18.16.1
 > npm >= 9.5.1
 - [Git](https://git-scm.com/downloads)

```shell
git clone https://github.com/btjawa/BTJGenshinPS.git
cd BTJGenshinPS-master
npm install
```

**Scripts**

```shell
npm run start # Preview
npm run package # Package
```

## Update

### Update App

自动更新：将会在每次启动应用时自动检测新版本

手动更新：下载Release中带有 `app` 的zip，替换掉除 `resources` 文件夹以外的所有文件

然后替换掉 `resources` 文件夹中的 `app.asar`

### Update GateServer

可切换到 主页 选项卡后点击 “更新资源”

<a title="Copyright" target="_blank" href="https://btjawa.top/"><img src="https://img.shields.io/badge/Copyright%20%C2%A9%202020--2023-%E7%99%BD%E5%BC%B9%E6%B1%B2-red"></a>