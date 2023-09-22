import{_ as r}from"./plugin-vue_export-helper-c27b6911.js";import{r as a,o as s,c as n,e as d,a as t,b as e,d as p,f as o}from"./app-59986980.js";const i={},h=t("p",null,"证书信任问题",-1),l=o('<h2 id="解决方案" tabindex="-1"><a class="header-anchor" href="#解决方案" aria-hidden="true">#</a> 解决方案</h2><p>搞远程端时天天遇到这个问题</p><p>一般是 <code>400 Invalid SNI</code></p><p>即证书信任问题，原理部分复制粘贴一下</p><hr><p>客户端 -&gt; 向米哈游子域发送请求 -&gt; Mitm拦截*<sub>1</sub> 并转发至Dispatch*<sub>2</sub> -&gt; Dispatch将token等内容传递至GameServer -&gt; GameServer返回至客户端</p><p>* 是需要证书验证的地方，*<sub>1</sub> 需要信任Mitm CA根证书，*<sub>2</sub> 需要让Dispatch与本地都信任签发 <code>keystore.p12</code> 的CA根证书</p><hr><div class="hint-container warning"><p class="hint-container-title">注意</p><p><code>Grasscutter v1.6.0</code> 及更新版本官方提供的 <code>keystore.p12</code> 已经不能被本地默认信任了，需要使用自签或者去买天价SSL</p></div>',9),m={href:"https://blog.btjawa.top/?p=675",target:"_blank",rel:"noopener noreferrer"},_=o('<p>按照教程你应该可以得到 <code>keystore.p12</code> 与 <code>ca.crt</code> ，前者扔到gc目录并替换掉，后者在服务器导入后下载到本地去导入</p><p>这是服务端host dispatch的证书，另外还有一个mitm的证书</p><p>linux在 <code>~/.mitmproxy/mitmproxy-ca-cert.cer</code> ，windows在 <code>%USERPROFILE%\\.mitmproxy\\mitmproxy-ca-cert.cer</code> ，在服务器导入后下载到本地去导入</p><p>导入方式：linux请自行搜索，windows右键crt点击 <code>安装证书(I)</code> -&gt; 本地计算机 -&gt; 将所有的证书都放入下列存储 -&gt; 浏览...受信任的根证书颁发机构 -&gt; 完成</p><h2 id="原理" tabindex="-1"><a class="header-anchor" href="#原理" aria-hidden="true">#</a> 原理</h2><p>使用文档里的置顶</p>',6);function u(b,x){const c=a("ExternalLinkIcon");return s(),n("div",null,[h,d(" more "),l,t("p",null,[e("我博客写了"),t("a",m,[e("一篇自签的教程"),p(c)]),e("，可以去看看")]),_])}const k=r(i,[["render",u],["__file","400-4201.html.vue"]]);export{k as default};
