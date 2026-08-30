# dsh-changelog-gen

> DeepSeek Harness CHANGELOG 生成器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 功能特性

- 📝 **Conventional Commits**: 自动解析 feat/fix/docs/refactor 等提交类型
- 🏷️ **版本管理**: 自动检测 semver 版本号，推荐版本升级类型
- 📋 **CHANGELOG 生成**: 按类别分组生成 Markdown 格式 changelog
- 🏷️ **自动打 tag**: 生成 changelog 后自动创建 git tag
- 📊 **提交统计**: 按类型统计、贡献者排名、文件变更

## 📦 安装

```bash
npm install dsh-changelog-gen
```

## 🛠️ 工具

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `changelog_generate` | 生成 changelog | `from`, `to`, `output` |
| `changelog_preview` | 预览 changelog | `from`, `to` |
| `changelog_release` | 生成 + 版本升级 + 打 tag | `cwd` |
| `commit_stats` | 提交统计 | `from`, `to` |

## 📋 命令

- `/changelog generate` — 生成 changelog
- `/changelog preview` — 预览
- `/changelog release` — 发布
- `/changelog stats` — 统计

## ⚙️ 配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enabled` | boolean | `true` | 启用插件 |
| `commitsCount` | number | `50` | 解析提交数量 |
| `includeAuthors` | boolean | `true` | 包含作者信息 |
| `includeLinks` | boolean | `true` | 包含 commit 链接 |
| `unreleased` | boolean | `true` | 包含未发布的变更 |

## 📄 License

MIT
