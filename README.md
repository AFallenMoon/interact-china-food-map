# 一省一菜 · 中国美食地图

一个交互式的中国美食数据可视化项目，展示中国34个省级行政区的代表性美食。
[https://afallenmoon.github.io/interact-china-food-map/](https://afallenmoon.github.io/interact-china-food-map/)

## 功能特性

- 🗺️ **交互式地图**：点击省份查看对应美食
- 📊 **知识图谱**：可视化美食、口味、食材之间的关系
- 📈 **统计图表**：口味分布、食材词云、起源时间分析
- 🔍 **搜索功能**：支持搜索美食、省份、菜系等
- 📱 **响应式设计**：适配不同屏幕尺寸

## 技术栈

- **前端框架**: HTML5 + 原生 JavaScript
- **样式框架**: Tailwind CSS (CDN)
- **可视化库**: ECharts 5.4.3 + echarts-wordcloud 插件
- **字体**: Google Fonts (Inter)
- **数据格式**: JSON (`foods.json`, `provinces.json`, `china.json`)
- **图标库**: Heroicons

## 本地运行

1. 克隆仓库
```bash
git clone <your-repo-url>
cd interact-china-food-map
```

2. 使用 Live Server 运行（推荐）

   - 在 VS Code 中安装 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) 插件
   - 右键点击 `index.html` 文件
   - 选择 "Open with Live Server"
   - 浏览器会自动打开并显示网站

   或者使用其他方式：

   使用 Python 3:
   ```bash
   # Python 3
   python -m http.server 8000
   ```

   使用 Node.js:
   ```bash
   npx http-server
   ```

## 部署

本项目已配置 GitHub Actions，推送到 `main` 分支后会自动部署到 GitHub Pages。

## 项目结构

```
interact-china-food-map/
├── index.html              # 主页面
├── app.js                  # 核心逻辑
├── data/                   # 数据文件
│   ├── foods.json          # 美食数据
│   ├── foods.schema.json   # 美食数据规范
│   ├── provinces.json      # 省份数据
|   └── china.json          # 地图数据
├── images/                 # 美食图片
└── .github/workflows/      # GitHub Actions 配置
```
