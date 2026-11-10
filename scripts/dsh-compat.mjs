/** The DSH releases the packages are tested against, oldest first: the one list every constraint is derived from. */
export const DSH_RELEASES = ['0.2.2-rc.1']
/** The release the workspace is developed against: dev dependencies pin it exactly. */
export const DSH_DEVELOPMENT = DSH_RELEASES.at(-1)
/**
 * Compatibility explicitly offered beyond the exact releases used by the test matrix.
 *
 * DSH ships alphas and release candidates, and a patch bump has carried breaking changes before, so every range stops
 * before the next patch line. Opening a new line is a deliberate release after the plugin has been run against it, not
 * something an upgrade slips past: widening a range requires a manual check plus a new version of these packages.
 */
const DSH_COMPATIBILITY = [
  { packages: '>=0.2.2-rc.1 <0.2.3', engines: '>=0.2.2-rc.1 <0.2.3' },
]
/** Peer range of the `@deepseek-ai/dsh-*` packages, which share the runtime's version. */
export const DSH_PACKAGE_PEERS = DSH_COMPATIBILITY.map(({ packages }) => packages).join(' || ')

/** `engines.dsh` of the plugin packages: each supported patch tuple, stopping before the next patch. */
export const DSH_ENGINES = DSH_COMPATIBILITY.map(({ engines }) => engines).join(' || ')
