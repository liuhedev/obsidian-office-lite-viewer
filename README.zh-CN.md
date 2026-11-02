# Office View：在 Obsidian 里查看办公文件

首版支持 **CSV、XLSX 只读预览**。文件在本机解析，插件不发网络请求，也不修改原文件。

## 已支持

- 从文件列表、右键菜单或命令面板打开 CSV / XLSX。
- Excel 多工作表切换，展示数字、日期的格式化文本与已保存的公式结果。
- 搜索当前工作表、列排序、每页 100 行、固定表头与原始行号。
- CSV 编码自动识别与手动切换：UTF-8、UTF-16、GB18030 / GBK。
- 自动或手选逗号、制表符、分号、竖线分隔符；保留编号前导零。
- 在笔记中用 `office-view` 代码块嵌入文件预览。
- 文件修改后自动重新读取，支持手动 Reload。

## 安装

在 [Releases](https://github.com/liuhedev/obsidian-office-view/releases) 下载 `office-view-0.1.0.zip`，把里面的 `office-view/` 解压到笔记库的 `.obsidian/plugins/`，重新加载 Obsidian 后，在「设置 → 第三方插件」启用 **Office View**。

这是早期版本，尚未提交社区插件市场。如果已有插件接管 CSV / XLSX，关闭冲突插件后可默认打开；也可以从文件右键菜单选 **Open in Office View**。

笔记内嵌示例：

````markdown
```office-view
data/budget.xlsx
```
````

## 边界

只读；搜索、排序、编码切换不会写回。最多预览 20 MiB 文件、每张表 10,000 行（含表头）、100 列、20 张表、整个文件 500,000 个单元格；截断时会提示，搜索和排序只覆盖已加载的数据。解析超过 15 秒会停止。

不重新计算公式、不执行宏、不读取外部链接。不支持图表、图片、批注、合并单元格布局、Excel 样式、透视表、编辑、加密文件、XLS、DOC、DOCX。隐藏工作表可能出现在预览中。当前优先验证桌面端，移动端待真机验证。

源码开发、完整限制与后续计划见 [README](README.md)。MIT 开源协议。
