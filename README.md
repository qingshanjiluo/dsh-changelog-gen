# dsh-changelog-gen

> DeepSeek Harness CHANGELOG 生成器插件

## 功能

- 📝 **Conventional Commits**: 自动解析 feat/fix/docs/refactor 等提交类型
- 🏷️ **版本管理**: 自动检测 semver 版本号，推荐版本升级类型
- 📋 **CHANGELOG 生成**: 按类别分组生成 Markdown 格式 changelog
- 🏷️ **自动打 tag**: 生成 changelog 后自动创建 git tag
- 📊 **提交统计**: 按类型统计、贡献者排名、文件变更

## 工具

| 工具名 | 说明 |
|--------|------|
| `changelog_generate` | 生成 changelog |
| `changelog_preview` | 预览 changelog |
| `changelog_release` | 生成 + 版本升级 + 打 tag |
| `commit_stats` | 提交统计 |

## 命令

- `/changelog generate|preview|release|stats`

## License

MIT
