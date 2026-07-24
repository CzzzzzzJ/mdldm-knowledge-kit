# Release 流程

## 版本规则

- 使用 Semantic Versioning；
- 正式版本使用 `vMAJOR.MINOR.PATCH` 标签；
- Release 标签只指向已经通过 CI、全新安装演练和安全扫描的 `main` 提交；
- 不移动或重建已经公开的标签。

## 发布清单

1. 更新 `CHANGELOG.md`、README 状态、文档和 `.env.example`；
2. 运行 `npm ci`；
3. 运行 `npm run check-config`、`npm run check`、`npm run release:audit`；
4. 在空数据库执行 `create-admin`、`seed-demo` 和完整 E2E；
5. 从远端仓库克隆到隔离目录，完成 15 分钟安装演练；
6. 确认 `npm audit --audit-level=moderate` 为 0；
7. 确认 GitHub CI 与 CodeQL 通过；
8. 创建带签名说明的 annotated tag；
9. 推送标签并创建 GitHub Release；
10. 再次核对 Release 源码、许可证、文档链接和健康检查。

## 命令

```bash
git status --short
git tag -a v0.1.0 -m "mdldm Knowledge Kit v0.1.0"
git push origin main --follow-tags
gh release create v0.1.0 \
  --repo CzzzzzzJ/mdldm-knowledge-kit \
  --title "mdldm Knowledge Kit v0.1.0" \
  --notes-file RELEASE_NOTES.md
```

发布说明至少包含功能范围、已知限制、升级/回滚入口和验证结果。发布前使用 `git ls-remote` 确认标签指向预期提交。
