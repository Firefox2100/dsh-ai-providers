# Contributing

`main` contains stable, publishable releases. Development happens on short-lived branches and reaches `main` through a pull request.

- Use `dev/<package>` for work limited to one package, such as `dev/openai`.
- Use `feat/<topic>` for a change spanning packages or adding a repository-level feature.
- Keep every publishable package on the same version.
- Run `pnpm typecheck`, `pnpm test`, `pnpm release:build`, and `pnpm release:check` before merging. Build the documentation separately with `pnpm --dir docs build` when it changes.

## First npm publication

Create the `dsh-ai-providers` organization on npm and make sure your account can publish public packages in its scope. Enable two-factor authentication on the account, then authenticate the local npm CLI:

```bash
npm login --registry=https://registry.npmjs.org/
npm whoami
```

From the repository root, validate and publish:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm release:build
pnpm release:check
pnpm release:publish
```

The publishing script skips package versions that already exist, packs the remaining packages with pnpm so pinned workspace ranges become ordinary npm versions, then publishes them with npm in dependency order. Every manifest sets `publishConfig.access` to `public`, so the organization-scoped packages are created as public packages. npm may request a two-factor code during direct publication.

After every package exists on npm, configure an npm trusted publisher for `.github/workflows/publish.yml` in this repository. Every push to `main` then validates the workspace and publishes only package versions that do not already exist. Each existing package version has its publish step visibly skipped. The workflow can also be started manually on `main` and does not use an npm token.

Configure the trusted publisher separately on each of the eight npm package settings pages with:

- GitHub organization or user: `Firefox2100`
- Repository: `dsh-ai-providers`
- Workflow filename: `publish.yml`
- Environment: `npm`
- Allowed action: direct `npm publish`

The workflow uses GitHub-hosted runners and OIDC. Do not add an npm write token after trusted publishing is configured.
