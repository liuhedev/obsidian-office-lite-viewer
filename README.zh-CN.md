[English](README.md) · 中文

# Office Lite Viewer

在 Obsidian 中预览 **CSV、XLS/XLSX、DOC/DOCX、JSON、HTML/HTM**。只读、本地解析、不发网络请求。

- **CSV / XLS / XLSX**： 搜索、排序、分页、工作表切换；CSV 支持 UTF-8、UTF-16、GBK。
- **DOC / DOCX**： 可选中复制的正文文本，保留段落换行，无需安装办公软件。
- **JSON**： 格式化文本，可选中复制，保留原始数字与字符串转义。
- **HTML / HTM**：隔离的静态预览，可切换源码；支持内联 CSS、SVG 和嵌入式位图。
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

桌面端可通过 **⋯ → Open in default app** 使用系统默认应用打开文件。

## 限制

- 不支持编辑，不执行宏。XLS（Excel 97–2003 BIFF8）/ XLSX 展示已保存的值，不重算公式，不还原样式、图表、图片和合并布局。隐藏工作表可能显示；不支持加密文件。
- DOC（Word 97–2003 二进制）/ DOCX 仅提取正文，最多 2,000,000 字符；不还原版式、格式、图片、页眉页脚、脚注、批注，表格转为文本。隐藏文字和修订内容可能显示，不适合核对最终修订或脱敏结果。不支持更老的 DOC、改名为 DOC 的 RTF/HTML、UTF-16 DOCX XML；DOCX 正文 XML 解压后最多 20 MiB、嵌套最多 256 层。
- 文件最大 20 MiB；表格每张表最多 10,000 行、100 列、20 张表，整个工作簿最多 500,000 个单元格。搜索、排序仅覆盖已加载数据，解析超时 15 秒。
- JSON 仅支持标准 UTF-8 JSON，格式化输出最多 40 MiB，缩进最多 40 层。CSV 编码识别不准时，可在 **⋯** 中切换。
- HTML 仅支持 UTF-8。禁用脚本、事件处理、表单、内嵌框架、外部链接与资源、相对路径图片/CSS 和远程字体；暂不支持依赖 JavaScript 的交互页面。可信交互文档可通过 **⋯ → Open in default app** 打开。HTML 不会注入 Obsidian 页面，文件修改后自动刷新预览。
- 移动端尚未真机验证。

## 开发

Node.js 22+：`npm ci` → `npm run build` → `npm run package`。

[参与开发](CONTRIBUTING.md) · [MIT 协议](LICENSE) · [第三方许可](THIRD_PARTY_NOTICES.md)
