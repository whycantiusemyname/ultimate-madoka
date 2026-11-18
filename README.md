# Ultimate Madoka · 圆环之理

《魔法少女小圆》Ultimate Madoka 同人数字雕塑展。可以欣赏 Blender 成图，也可以进入三维展厅，旋转、缩放及查看作品背面。

[访问作品展](https://ultimate.madoka.site/) · [下载未经网页优化的原版 GLB](https://github.com/whycantiusemyname/ultimate-madoka/releases/tag/v1.0.0)

| 模型 | 三角面 | 文件大小 |
| --- | ---: | ---: |
| 网页展示版 | 2,865,173 | 43.25 MB |
| 完整版（无损压缩） | 3,115,201 | 46.05 MB |
| Release 原版 GLB | 3,115,201 | 79.50 MB |

网页展示版剔除了紧贴不透明手套、长袜的 250,028 个身体三角面。候选面先经过局部射线检查，再从 210 个机位筛选；另用 135 个独立机位比较受检皮肤与遮挡衣物的面编号图，768 × 768 检查中两版的像素差异为零。两个网页版本都使用无损 Meshopt 编码，保留全部 15 张原尺寸贴图。模型在访客选择进入三维展厅后才加载。

卡面和作品图录使用 Blender 渲染，交互视图使用浏览器实时照明。网页通过 GitHub Pages 部署，本地预览可在仓库根目录运行 `python -m http.server 8000`。

展页的暖色逆光取自电视动画主视觉，拱形画框和靛紫展厅呼应圆神的白裙与星空裙衬。玫瑰窗刻线和宝石花饰为本页绘制。[电视动画主视觉](https://www.madoka-magica.com/tv/) · [《魔法纪录》周年影像](https://www.youtube.com/watch?v=g-174LSsrn8) · [Good Smile 圆神手办摄影](https://www.goodsmile.com/en/product/1408/Ultimate%2BMadoka)

角色出自《魔法少女小圆》，造型参考《魔法纪录》四星 Ultimate Madoka 卡面。本展为非官方同人创作。网页查看器使用 Google 的 model-viewer，解码器使用 meshoptimizer，许可随组件保存在 `vendor/`。
