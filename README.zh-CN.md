[English](README.md) · 中文

# Office Lite Viewer

在 Obsidian 中预览 **CSV、XLS/XLSX、DOC/DOCX、JSON、HTML/HTM**。源文件保持只读；Office/JSON 本地解析，HTML 可按需启用脚本和 HTTP(S) 资源。

- **CSV / XLS / XLSX**： 搜索、排序、分页、工作表切换；CSV 支持 UTF-8、UTF-16、GBK。
- **DOC / DOCX**： 可选中复制的正文文本，保留段落换行，无需安装办公软件。
- **JSON**： 格式化文本，可选中复制，保留原始数字与字符串转义。
- **HTML / HTM**：隔离的渲染预览，可切换源码，保留完整网页的语言、正文样式及脚本模式下的加载事件；开启 **Scripts** 运行可信页面的按钮、滑块、Canvas 与图表，同一开关也允许 HTTP(S) 脚本、CSS、图片、字体及 fetch 请求；网页外链跳到浏览器，页内锚点留在文档中。
- 直接打开文件，或在右键菜单选择 **Open in Office Lite Viewer**，也可使用 **Office Lite Viewer: Open document** 命令。

## 安装

[社区页面](https://community.obsidian.md/plugins/office-lite-viewer) · [下载 ZIP](https://github.com/liuhedev/obsidian-office-lite-viewer/releases/latest)。

手动安装：把 `office-lite-viewer/` 解压到笔记库的 `.obsidian/plugins/`，重新加载 Obsidian 后启用 **Office Lite Viewer**。

## 笔记内嵌

````markdown
```office-lite-viewer
data/budget.xlsx
```
````

在 **⋯ → Copy path** 中复制 Obsidian URL、库内相对路径；桌面端还可复制绝对路径。菜单支持 Esc 或点击外部关闭。桌面端可通过 **⋯ → Open in default app** 使用系统默认应用打开文件。

## 限制

- 不支持编辑，不执行宏。XLS（Excel 97–2003 BIFF8）/ XLSX 展示已保存的值，不重算公式，不还原样式、图表、图片和合并布局。隐藏工作表可能显示；不支持加密文件。
- DOC（Word 97–2003 二进制）/ DOCX 仅提取正文，最多 2,000,000 字符；不还原版式、格式、图片、页眉页脚、脚注、批注，表格转为文本。隐藏文字和修订内容可能显示，不适合核对最终修订或脱敏结果。不支持更老的 DOC、改名为 DOC 的 RTF/HTML、UTF-16 DOCX XML；DOCX 正文 XML 解压后最多 20 MiB、嵌套最多 256 层。
- 文件最大 20 MiB；表格每张表最多 10,000 行、100 列、20 张表，整个工作簿最多 500,000 个单元格。搜索、排序仅覆盖已加载数据，解析超时 15 秒。
- JSON 仅支持标准 UTF-8 JSON，格式化输出最多 40 MiB，缩进最多 40 层。CSV 编码识别不准时，可在 **⋯** 中切换。
- HTML 仅支持 UTF-8。文档脚本和 HTTP(S) 资源默认关闭，**Scripts** 同时开启两者，重载或重新打开文件时重置。静态模式只运行预览器自带的外链转发代码，文档脚本与事件处理仍移除并阻止执行。普通 HTTP(S) 链接点击后在浏览器打开，不覆盖预览；页内锚点留在文档中。仅为可信文档启用脚本；脚本直接改变自身框架地址仍可能离开原页面。页面不能访问 Obsidian DOM、Node/Electron 或 localStorage；表单、文档弹窗、下载、内嵌框架和顶层导航保持禁用。不支持本地相对路径图片/CSS/JS 或持久浏览器存储；远程请求仍受 CORS 与宿主限制。
- 移动端尚未真机验证。

## 开发

Node.js 22+：`npm ci` → `npm run build` → `npm run package`。

[参与开发](CONTRIBUTING.md) · [MIT 协议](LICENSE) · [第三方许可](THIRD_PARTY_NOTICES.md)
