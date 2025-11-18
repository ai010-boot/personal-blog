
# Personal Blog Comments System - 完全前端版

## 集成步骤

1. 将 `comments/` 文件夹放入你的博客仓库。
2. 在 HTML 模板中添加：

```html
<link rel="stylesheet" href="/comments/comment.css">
<div id="gt-comments-container"></div>
<script src="/comments/comment.js"></script>
```

3. 系统特点：
- 完全前端，评论存储在 localStorage
- 支持本地头像上传
- Markdown 渲染
- 评论搜索 + 高亮
- 多级回复（基础版）
- Emoji 面板
- 分页
- 夜间模式
