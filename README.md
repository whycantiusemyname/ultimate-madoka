# Ultimate Madoka · 圆环之理

《魔法少女小圆》Ultimate Madoka 同人数字雕塑展。可以欣赏 Blender 成图，也可以进入三维展厅，旋转、缩放及查看作品背面。

[访问作品展](https://ultimate.madoka.site/) · [下载未经网页优化的原版 GLB](https://github.com/whycantiusemyname/ultimate-madoka/releases/tag/v1.0.0)

| 模型 | 三角面 | 文件大小 |
| --- | ---: | ---: |
| [高精压缩版](https://ultimate.madoka.site/assets/madoka.glb) | 2,865,173 | 24.02 MB |
| [无损完整版](https://ultimate.madoka.site/assets/madoka-full.glb) | 3,115,201 | 46.05 MB |
| Release 原版 GLB | 3,115,201 | 79.50 MB |

两版都保留原始的 15 张贴图及其材质。无损完整版解码后的所有几何缓冲区均与原版逐字节一致。高精压缩版采用 19 位位置量化、12 位八面体法线编码和 18 位 UV 量化。模型只在访客点击加载后下载。

高精压缩版剔除了不透明手套和长袜下方的 250,028 个身体三角面。候选面经局部射线检查及 210 个机位筛选，再以另外 135 个机位比较受检皮肤和遮挡衣物的面编号图。768 × 768 检查中，剔除前后的像素差异为零。

卡面和作品图录使用 Blender 渲染，交互视图使用浏览器实时照明。网页通过 GitHub Pages 部署，本地预览可在仓库根目录运行 `python -m http.server 8000`。

首屏人物来自雕塑原场景的透明渲染，星空背景取自模型裙衬。大小错落的同心环与折线按用户提供的「圆环之理」高清参考绘制，魔女文字形参照《Production Note》新版第 187 页。三维展厅可单独试装圆形底座，底座有独立的 [GLB](assets/pedestal.glb) 和 [Blender 源文件](assets/pedestal.blend)。[魔女文字资料](https://wiki.puella-magi.net/Witch_Runes) · [Good Smile 圆神手办摄影](https://www.goodsmile.com/en/product/1408/Ultimate%2BMadoka)

角色出自《魔法少女小圆》，造型参考《魔法纪录》四星 Ultimate Madoka 卡面。本展为非官方同人创作。网页查看器使用 Google 的 model-viewer，解码器使用 meshoptimizer，许可随组件保存在 `vendor/`。
