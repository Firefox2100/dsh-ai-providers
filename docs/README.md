# DSH AI Providers documentation

English | [简体中文](./README.zh-CN.md)

The project documentation is a bilingual [Docusaurus](https://docusaurus.io/) site. English source pages live in `docs/`; Simplified Chinese translations live under `i18n/zh-Hans/`.

## Install dependencies

```bash
pnpm install
```

## Local development

```bash
pnpm start
```

The development server watches the English site by default. Use Docusaurus's locale option when checking the Chinese site:

```bash
pnpm start -- --locale zh-Hans
```

## Validate the site

```bash
pnpm typecheck
pnpm build
```

The production build checks both locales and fails on broken links. Generated files are written to `build/`.

## Deployment

The repository workflow in `.github/workflows/deploy-docs.yml` builds and deploys the site to GitHub Pages. Normal documentation changes do not require a manual `docusaurus deploy` run.

Update English and Simplified Chinese pages together. Check commands, package names, compatibility ranges, and capability claims against the current source before publishing.
