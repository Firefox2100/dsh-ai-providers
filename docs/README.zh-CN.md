# DSH AI Providers 文档站

[English](./README.md) | 简体中文

项目文档使用 [Docusaurus](https://docusaurus.io/) 构建，并提供英文和简体中文版本。英文源文件位于 `docs/`，简体中文译文位于 `i18n/zh-Hans/`。

## 安装依赖

```bash
pnpm install
```

## 本地开发

```bash
pnpm start
```

开发服务器默认监视英文站点。检查中文站点时，请指定 Docusaurus 语言：

```bash
pnpm start -- --locale zh-Hans
```

## 验证站点

```bash
pnpm typecheck
pnpm build
```

生产构建会检查两种语言，并在遇到无效链接时失败。生成的文件写入 `build/`。

## 部署

仓库中的 `.github/workflows/deploy-docs.yml` 会构建站点并部署到 GitHub Pages。普通文档修改不需要手动运行 `docusaurus deploy`。

英文和简体中文页面应同步更新。发布前，请根据当前源代码核对命令、包名、兼容范围和功能说明。
