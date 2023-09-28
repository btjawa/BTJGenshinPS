import{_ as e}from"./plugin-vue_export-helper-c27b6911.js";import{r as l,o as t,c as o,e as r,a as n,b as s,d as i}from"./app-b1c8cb10.js";const c={},p=n("p",null,"客户端配置问题",-1),d=n("h2",{id:"解决方案",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#解决方案","aria-hidden":"true"},"#"),s(" 解决方案")],-1),u=n("p",null,"关键词：原神语音直链",-1),h=n("p",null,"在例如B站专栏的地方找到你的客户端版本对应的语音包",-1),b=n("p",null,"此处使用 REL4.0.0 JAPANESE 做示例",-1),m={href:"https://autopatchcn.yuanshen.com/client_app/download/pc_zip/20230804185703_R1La3H9xIH1hBiHJ/Audio_Japanese_4.0.0.zip",target:"_blank",rel:"noopener noreferrer"},k=n("p",null,"下载好后，解压下载出来的文件，按照路径放到客户端对应的文件夹中",-1),_=n("p",null,[s("国际服可将 "),n("code",null,"YuanShen"),s(" 等字样替换为 "),n("code",null,"GenshinImpact")],-1),v=n("p",null,"示例",-1),g=n("h3",{id:"压缩包示例",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#压缩包示例","aria-hidden":"true"},"#"),s(" 压缩包示例")],-1),x=n("div",{class:"language-bash line-numbers-mode","data-ext":"sh"},[n("pre",{shell:"",class:"language-bash"},[n("code",null,[s(`Audio_Japanese_4.0.0.zip
`),n("span",{class:"token operator"},"|"),s(`
+-- YuanShen_Data
`),n("span",{class:"token operator"},"|"),s("   "),n("span",{class:"token operator"},"|"),s(`
`),n("span",{class:"token operator"},"|"),s(`   +-- StreamingAssets
`),n("span",{class:"token operator"},"|"),s("       "),n("span",{class:"token operator"},"|"),s(`
`),n("span",{class:"token operator"},"|"),s(`       +-- AudioAssets
`),n("span",{class:"token operator"},"|"),s("           "),n("span",{class:"token operator"},"|"),s(` 
`),n("span",{class:"token operator"},"|"),s(`           +-- Japanese
`),n("span",{class:"token operator"},"|"),s("               "),n("span",{class:"token operator"},"|"),s(`
`),n("span",{class:"token operator"},"|"),s("               +-- "),n("span",{class:"token number"},"1001"),s(`.pck
`),n("span",{class:"token operator"},"|"),s("               "),n("span",{class:"token punctuation"},"\\"),s("-- "),n("span",{class:"token punctuation"},".."),s(`.
`),n("span",{class:"token punctuation"},"\\"),s(`-- Audio_Japanese_pkg_version
`)])]),n("div",{class:"highlight-lines"},[n("br"),n("br"),n("br"),n("br"),n("br"),n("br"),n("br"),n("br"),n("div",{class:"highlight-line"}," "),n("br"),n("div",{class:"highlight-line"}," "),n("br"),n("br")]),n("div",{class:"line-numbers","aria-hidden":"true"},[n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"})])],-1),f=n("h3",{id:"游戏文件夹示例",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#游戏文件夹示例","aria-hidden":"true"},"#"),s(" 游戏文件夹示例")],-1),A=n("div",{class:"language-bash line-numbers-mode","data-ext":"sh"},[n("pre",{shell:"",class:"language-bash"},[n("code",null,[s(`Genshin Impact Game
`),n("span",{class:"token operator"},"|"),s(`
+-- YuanShen_Data
`),n("span",{class:"token operator"},"|"),s("   "),n("span",{class:"token operator"},"|"),s(`
`),n("span",{class:"token operator"},"|"),s(`   +-- Managed
`),n("span",{class:"token operator"},"|"),s(`   +-- Native
`),n("span",{class:"token operator"},"|"),s(`   +-- Persistent
`),n("span",{class:"token operator"},"|"),s("       "),n("span",{class:"token operator"},"|"),s(`
`),n("span",{class:"token operator"},"|"),s(`       +-- audio_lang_14
`),n("span",{class:"token operator"},"|"),s("       "),n("span",{class:"token punctuation"},"\\"),s("-- "),n("span",{class:"token punctuation"},".."),s(`.
`),n("span",{class:"token operator"},"|"),s("   "),n("span",{class:"token punctuation"},"\\"),s("-- "),n("span",{class:"token punctuation"},".."),s(`.
`),n("span",{class:"token operator"},"|"),s("-- "),n("span",{class:"token punctuation"},".."),s(`.
`),n("span",{class:"token punctuation"},"\\"),s(`-- YuanShen.exe
`)])]),n("div",{class:"highlight-lines"},[n("br"),n("br"),n("br"),n("br"),n("br"),n("br"),n("br"),n("br"),n("div",{class:"highlight-line"}," "),n("br"),n("br"),n("br"),n("br")]),n("div",{class:"line-numbers","aria-hidden":"true"},[n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"})])],-1),J=n("h3",{id:"合并后文件夹示例",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#合并后文件夹示例","aria-hidden":"true"},"#"),s(" 合并后文件夹示例")],-1),S=n("div",{class:"language-bash line-numbers-mode","data-ext":"sh"},[n("pre",{shell:"",class:"language-bash"},[n("code",null,[s(`Genshin Impact Game
`),n("span",{class:"token operator"},"|"),s(`
+-- YuanShen_Data
`),n("span",{class:"token operator"},"|"),s("   "),n("span",{class:"token operator"},"|"),s(`
`),n("span",{class:"token operator"},"|"),s(`   +-- Managed
`),n("span",{class:"token operator"},"|"),s(`   +-- Native
`),n("span",{class:"token operator"},"|"),s(`   +-- Persistent
`),n("span",{class:"token operator"},"|"),s("       "),n("span",{class:"token operator"},"|"),s(`
`),n("span",{class:"token operator"},"|"),s(`       +-- audio_lang_14
`),n("span",{class:"token operator"},"|"),s("       "),n("span",{class:"token punctuation"},"\\"),s("-- "),n("span",{class:"token punctuation"},".."),s(`.
`),n("span",{class:"token operator"},"|"),s(`   +-- StreamingAssets
`),n("span",{class:"token operator"},"|"),s("       "),n("span",{class:"token operator"},"|"),s(`
`),n("span",{class:"token operator"},"|"),s(`       +-- AudioAssets
`),n("span",{class:"token operator"},"|"),s("           "),n("span",{class:"token operator"},"|"),s(` 
`),n("span",{class:"token operator"},"|"),s(`           +-- Japanese
`),n("span",{class:"token operator"},"|"),s("               "),n("span",{class:"token operator"},"|"),s(`
`),n("span",{class:"token operator"},"|"),s("               +-- "),n("span",{class:"token number"},"1001"),s(`.pck
`),n("span",{class:"token operator"},"|"),s("               "),n("span",{class:"token punctuation"},"\\"),s("-- "),n("span",{class:"token punctuation"},".."),s(`.
`),n("span",{class:"token operator"},"|"),s("           "),n("span",{class:"token punctuation"},"\\"),s("-- "),n("span",{class:"token punctuation"},".."),s(`.
`),n("span",{class:"token operator"},"|"),s("       "),n("span",{class:"token punctuation"},"\\"),s("-- "),n("span",{class:"token punctuation"},".."),s(`.
`),n("span",{class:"token operator"},"|"),s("   "),n("span",{class:"token punctuation"},"\\"),s("-- "),n("span",{class:"token punctuation"},".."),s(`.
`),n("span",{class:"token operator"},"|"),s("-- "),n("span",{class:"token punctuation"},".."),s(`.
`),n("span",{class:"token operator"},"|"),s(`-- YuanShen.exe
`),n("span",{class:"token punctuation"},"\\"),s(`-- Audio_Japanese_pkg_version
`)])]),n("div",{class:"highlight-lines"},[n("br"),n("br"),n("br"),n("br"),n("br"),n("br"),n("br"),n("br"),n("div",{class:"highlight-line"}," "),n("br"),n("br"),n("br"),n("div",{class:"highlight-line"}," "),n("br"),n("div",{class:"highlight-line"}," "),n("br"),n("br"),n("br"),n("br"),n("br"),n("div",{class:"highlight-line"}," "),n("br"),n("br"),n("br")]),n("div",{class:"line-numbers","aria-hidden":"true"},[n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"})])],-1),I=n("p",null,[s("在做完这些后，用记事本打开 "),n("code",null,"YuanShen_Data\\Persistent\\audio_lang_14"),s(" ，并在其中添加语言，保存")],-1),N=n("p",null,"例如",-1),Y=n("div",{class:"language-text line-numbers-mode","data-ext":"text"},[n("pre",{text:"",class:"language-text"},[n("code",null,`Chinese
Japanese
`)]),n("div",{class:"highlight-lines"},[n("br"),n("div",{class:"highlight-line"}," ")]),n("div",{class:"line-numbers","aria-hidden":"true"},[n("div",{class:"line-number"}),n("div",{class:"line-number"})])],-1),B=n("h2",{id:"原理",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#原理","aria-hidden":"true"},"#"),s(" 原理")],-1),E=n("p",null,"已经在解决方案中写明",-1);function H(z,G){const a=l("ExternalLinkIcon");return t(),o("div",null,[p,r(" more "),d,u,h,b,n("p",null,[n("a",m,[s("https://autopatchcn.yuanshen.com/client_app/download/pc_zip/20230804185703_R1La3H9xIH1hBiHJ/Audio_Japanese_4.0.0.zip"),i(a)])]),k,_,v,g,x,f,A,J,S,I,N,Y,B,E])}const D=e(c,[["render",H],["__file","char-voice.html.vue"]]);export{D as default};
