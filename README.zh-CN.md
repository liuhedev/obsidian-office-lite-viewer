[English](README.md) · 中文

# Office View

在 Obsidian 中预览 **CSV、XLSX、JSON**。只读、本地解析、不发网络请求。

- **CSV / XLSX**： 搜索、排序、分页、工作表切换；CSV 支持 UTF-8、UTF-16、GBK。
- **JSON**： 格式化文本，可选中复制，保留原始数字与字符串转义。
- 直接打开文件，或在右键菜单选择 **Open in Office View**，也可使用 **Office View: Open document** 命令。

## 安装

尚未上架社区市场。在 [Releases](https://github.com/liuhedev/obsidian-office-view/releases) 下载 ZIP，把 `office-view/` 解压到笔记库的 `.obsidian/plugins/`，重新加载 Obsidian 后启用 **Office View**。扩展名被其他插件接管时，可通过右键菜单打开。

## 笔记内嵌

````markdown
```office-view
data/budget.xlsx
```
````

## 限制

- 不支持编辑。XLSX 展示已保存的值，不重算公式，不还原样式、图表、图片和合并布局；不支持 XLS、DOC/DOCX、加密工作簿。隐藏工作表可能显示。
- 文件最大 20 MiB；表格每张表最多 10,000 行、100 列、20 张表，整个工作簿最多 500,000 个单元格。搜索、排序仅覆盖已加载数据，解析超时 15 秒。
- JSON 仅支持标准 UTF-8 JSON，格式化输出最多 40 MiB，缩进最多 40 层。CSV 编码识别不准时，可在 **⋯** 中切换。
- 移动端尚未真机验证。

## 开发

Node.js 22+：`npm ci` → `npm run build` → `npm run package`。

[参与开发](CONTRIBUTING.md) · [MIT 协议](LICENSE) · [第三方许可](THIRD_PARTY_NOTICES.md)
