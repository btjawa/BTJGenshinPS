import{_ as o}from"./plugin-vue_export-helper-c27b6911.js";import{r as i,o as n,c,d as t,e,b as s,a as p,f as r}from"./app-a04f4451.js";const l={},d={class:"hint-container tip"},h=r('<p class="hint-container-title">澄清</p><p>私服 即 私人服务器，是指玩家或团体私自搭建的、旨在模拟官方游戏服务器功能的服务器。主要特点是不受官方控制（这意味着可以在私服中测试挂、MOD等等）</p><p>原神的私服，本质上是违法的，但这东西和梯子一样，只要你不大规模传播，而且只是为了体验一下，再加上官方现在睁一只眼闭一只眼的态度，米哈游是不会上你家送温暖的（）</p><p>你可能会在B站上看到许多类似于 &quot;单机版&quot; &quot;破解版&quot; 这些字眼，实际大多数都只是搞标题党，扔几个名词让你觉得很牛逼</p><p>Grasscutter 是仿照、模拟原神服务端逻辑进行的一个<strong>重现（Reimplementation）</strong>，全部功能都是手搓的，包括任务；GC本身支持联机，只是不完善 你只需要把端扔到你的windows/linux服务器上，改些参数，你的朋友就可以通过dispatch和你一起玩；配置要求中等（内存1~4G）</p><p>真端 有些歧义，但是一般是指 ≈v3.2 <strong>泄漏</strong> 出来的服务端，并可通过 hk4e 登录。拥有与官服完全同步的剧情与交互，但是永远停留在3.2，想更新就等再次泄漏（概率小的不得了）；<strong>理论</strong>上是可以实现联机的，我个人还没有摸索清楚；配置需求比较高（内存20G+）</p><p>剧情服与指令服：剧情服一般指的是剧情/任务完整且不会卡死，以剧情为主的端（真端是真正意义上的剧情服，但是3.2不动了，GC4.0至今还有任务，只是很容易卡死）指令服指的就是Grasscutter，以指令为主的端（/tp，/spawn 等）</p>',7),u={href:"https://github.com/btjawa/BGP-docs/edit/master/src/docs/feature.md",target:"_blank",rel:"noopener noreferrer"},m=r('<p>BGP使用Grasscutter，因此是以指令为主，剧情有概率卡死/不完整</p><h2 id="grasscutter目前实现" tabindex="-1"><a class="header-anchor" href="#grasscutter目前实现" aria-hidden="true">#</a> Grasscutter目前实现：</h2><ul><li>登录</li><li>战斗</li><li>好友</li><li>传送</li><li>祈愿</li><li>多人游戏 <em>部分</em> 可用</li><li>从控制台生成魔物</li><li>背包功能（接收或升级物品、角色等）。</li></ul><h2 id="把这套系统拆解一下" tabindex="-1"><a class="header-anchor" href="#把这套系统拆解一下" aria-hidden="true">#</a> 把这套系统拆解一下</h2><ul><li>Grasscutter - 服务端</li><li>MongoDB - 数据库</li><li>Mitm - 代理</li></ul><p>Grasscutter 又可细分为 <code>Dispatch Server</code> 与 <code>Game Server</code>，前者可以理解为前端，接收到请求后转发至 Game Server “后端” ，Game Server 就是真正给你提供大世界等服务的模块了</p>',6),_={href:"https://www.mongodb.com/try/download/compass",target:"_blank",rel:"noopener noreferrer"},f=r('<p>Mtim 起到的是代理的作用，本质上是 “中间人攻击” ，即劫持流量并进行操作（可以转发，篡改等），这里是转发流量至 Dispatch Server</p><h2 id="交换数据过程" tabindex="-1"><a class="header-anchor" href="#交换数据过程" aria-hidden="true">#</a> 交换数据过程</h2><p>客户端 -&gt; 向米哈游子域发送请求 -&gt; Mitm拦截*<sub>1</sub> 并转发至Dispatch*<sub>2</sub> -&gt; Dispatch将token等内容传递至GameServer -&gt; GameServer返回至客户端</p><p>* 是需要证书验证的地方，*<sub>1</sub> 需要信任Mitm CA根证书，*<sub>2</sub> 需要让Dispatch与本地都信任签发 <code>keystore.p12</code> 的CA根证书</p><p>对于家用带宽443被封了、穿透不能用443这种情况，可以修改Dispatch的端口，并在 <code>客户端代理</code> 一栏将端口改为你修改的端口</p><div class="hint-container warning"><p class="hint-container-title">注意</p><p>切记不可以将Dispatch穿透为HTTP服务！穿透与防火墙是一样的，Dispatch开放/穿透 TCP，GameServer开放/穿透 UDP</p></div>',6);function g(G,b){const a=i("ExternalLinkIcon");return n(),c("div",null,[t("div",d,[h,t("p",null,[e("我个人的理解可能也有些误差，也欢迎大家来"),t("a",u,[e("Github"),s(a)]),e("修正")])]),p(" more "),m,t("p",null,[e("MongoDB 则是数据库，存储着你的一切游戏数据，包括圣遗物、角色、材料等等，可使用官方的 "),t("a",_,[e("Compass"),s(a)]),e(" 可视化编辑")]),f])}const x=o(l,[["render",g],["__file","feature.html.vue"]]);export{x as default};
