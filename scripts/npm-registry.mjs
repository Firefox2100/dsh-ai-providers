const registry = 'https://registry.npmjs.org/'

export async function isPublished(name, version) {
  const response = await fetch(new URL(`${encodeURIComponent(name)}/${encodeURIComponent(version)}`, registry))
  if (response.ok) return true
  if (response.status === 404) return false
  const detail = (await response.text()).trim()
  throw new Error(`Could not query ${name}@${version}: ${response.status} ${response.statusText}${detail === '' ? '' : `\n${detail}`}`)
}
