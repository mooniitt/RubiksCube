# 3D Rubik's Cube (Three.js)

这是一个使用 Three.js 实现的 3D 魔方项目，具备现代化的视觉风格和基础交互功能。

## 功能特性

- **逼真的渲染**：使用 PBR 材质和圆角立方体 (`RoundedBoxGeometry`)，模拟真实魔方的塑料质感。
- **光照系统**：包含环境光、主平行光和补光，营造丰富的阴影和立体感。
- **交互控制**：集成 `OrbitControls`，支持鼠标拖拽旋转视角、滚轮缩放。
- **自动演示**：默认开启自动旋转展示效果。

## 如何运行

由于项目使用了 ES Modules，直接在浏览器打开 `index.html` 可能会遇到 CORS (跨域) 错误。请使用本地服务器运行：

1.  **Python (推荐)**
    在项目根目录下打开终端：

    ```bash
    python3 -m http.server 8000
    ```

    然后访问：http://localhost:8000

2.  **Node.js (http-server)**

    ```bash
    npx http-server .
    ```

3.  **VS Code**
    安装 "Live Server" 插件，右键点击 `index.html` 选择 "Open with Live Server"。

## 项目结构

- `index.html`: 入口文件，定义依赖映射 (Import Map)。
- `style.css`: 样式文件，深色背景主题。
- `main.js`: 核心逻辑，包含 Three.js 场景初始化、魔方生成和渲染循环。

## 技术栈

- **Three.js**: 核心 3D 引擎。
- **Vanilla JS**: 原生 JavaScript，无编译步骤，KISS 原则。
