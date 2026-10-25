/** The DSH releases the packages are tested against, oldest first: the one list every constraint is derived from. */
export const DSH_RELEASES = ['0.2.0-rc.2', '0.2.1-rc.2', '0.2.1-rc.3']
/** The release the workspace is developed against: dev dependencies pin it exactly. */
export const DSH_DEVELOPMENT = DSH_RELEASES.at(-1)
/** Compatibility explicitly offered beyond the exact releases used by the test matrix. */
const DSH_COMPATIBILITY = [
  { packages: '0.2.0-rc.2', engines: '>=0.2.0-rc.2 <0.2.1' },
  { packages: '>=0.2.1-0 <0.2.2', engines: '>=0.2.1-0 <0.2.2' },
]
/** Peer range of the `@deepseek-ai/dsh-*` packages, which share the runtime's version. */
export const DSH_PACKAGE_PEERS = DSH_COMPATIBILITY.map(({ packages }) => packages).join(' || ')

/** `engines.dsh` of the plugin packages: each supported patch tuple, stopping before the next patch. */
export const DSH_ENGINES = DSH_COMPATIBILITY.map(({ engines }) => engines).join(' || ')
