/**
 * The cosine of the angle between two vectors, from -1 to 1.
 * @throws {RangeError} when they differ in length: they come from different models.
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new RangeError(`vectors of ${a.length} and ${b.length} dimensions are not comparable`)
  let dot = 0
  let normA = 0
  let normB = 0
  for (let index = 0; index < a.length; index++) {
    const x = a[index]!
    const y = b[index]!
    dot += x * y
    normA += x * x
    normB += y * y
  }
  return normA === 0 || normB === 0 ? 0 : dot / Math.sqrt(normA * normB)
}
