# 3D Rubik's Cube Pro (Three.js)

这是一个基于 Three.js 构建的现代化 3D 魔方 Web 应用。它不仅具备逼真的 3D 渲染和流畅的交互，还集成了摄像头颜色识别、AR 姿态同步、自动求解教学等高级功能，并拥有移动端优化的响应式 UI。

## ✨ 特性亮点 (Features)

### 🎨 核心体验

- **逼真的渲染**: 使用 PBR 材质和 `RoundedBoxGeometry`，模拟真实魔方的光泽与手感。
- **现代化 UI**: 采用 **Glassmorphism (毛玻璃)** 设计风格，界面悬浮于 3D 场景之上，沉浸感极强。
- **响应式设计 (Responsive)**: 完美适配桌面端和移动端 (Mobile First)，支持 Bottom Sheet 操作模式。
- **国际化 (i18n)**: 自动检测浏览器语言，支持 **简体中文** 和 **English** 无缝切换。

### 🧠 智能教学

- **随机打乱 (Scramble)**: 一键生成标准打乱步骤并快速执行。
- **智能还原 (Solve)**:
  - 针对随机打乱：使用历史记录逆序还原 (Reverse Solve)，演示精确的复原步骤。
  - 针对手动状态：集成求解器 (Mock/Kociemba) 计算最优解。
- **分步演示**: 支持“上一步”、“下一步”、“自动播放”，手把手教学。

### 👁️ 计算机视觉 (CV)

- **色彩扫描**: 调用摄像头扫描实体魔方，识别颜色并同步到 3D 模型。
- **AR 姿态同步 (Orientation Sync)**: 实时检测画面中心的魔方颜色，自动调整 3D 视角，使其与手中魔方朝向一致。

## 🛠️ 技术栈 (Tech Stack)

- **Three.js**: 强大的 3D 渲染引擎。
- **Vanilla JS (ES Modules)**: 原生 JavaScript 模块化开发，无复杂的构建工具链 (No Bundler required)。
- **Modern CSS**:
  - `backdrop-filter: blur` (毛玻璃效果)
  - Flexbox & Grid 布局
  - CSS Variables / Media Queries
- **Web APIs**:
  - `navigator.mediaDevices.getUserMedia` (摄像头访问)
  - `CanvasRenderingContext2D` (图像处理)

## 🚀 快速开始 (Getting Started)

由于项目使用了 ES Modules 和摄像头 API，需要在本地服务器或 HTTPS 环境下运行。

### 方式 1: Python (推荐)

在项目根目录下打开终端：

```bash
# Python 3
python3 -m http.server 8000
```

访问: `http://localhost:8000`

### 方式 2: Node.js

```bash
npx http-server .
```

### 方式 3: VS Code

安装 **Live Server** 插件，右键点击 `index.html` 选择 "Open with Live Server"。

## 📱 移动端体验

为了获得最佳体验，请在手机浏览器中打开，并允许使用摄像头权限。

- **竖屏模式**: 相机距离会自动拉远，防止魔方被裁剪。
- **触控操作**: 优化的按钮尺寸和布局，方便单手操作。

## 📂 项目结构

```
.
├── index.html       # 入口文件，UI 结构 (Flex/Grid)
├── style.css        # 样式定义 (CSS Variables, Responsive)
├── main.js          # 核心入口，初始化 Three.js 场景与事件
├── i18n.js          # 国际化字典与逻辑
├── cameraData.js    # 摄像头管理、颜色识别、姿态同步
├── solver.js        # 求解器 (Mock/Implementation)
└── README.md        # 项目文档
```

## 📝 待办事项 (TODO)

- [ ] 集成完整的 `kociemba.js` 求解库以支持任意状态求解。
- [ ] 优化颜色识别算法（光照补偿、白平衡）。
- [ ] 添加更多动效（烟花庆祝、过渡动画）。

---

**Enjoy Cubing! 🧩**
