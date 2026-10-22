export function prepare(raw: string): { text: string; problem?: string } {
  let s = raw.normalize("NFC").replace(/[-_‐-―]/g, " ").replace(/[‘’]/g, "'")
  s = s.replace(/[.,!?;:"“”()]/g, " ")
  if (/[^\p{L}\p{N}'\s]/u.test(s)) return { text: s, problem: "Use letters and numbers only." }
  s = s.replace(/\s+/g, " ").trim()
  if (!/[\p{L}\p{N}]/u.test(s)) return { text: s, problem: "Type a word." }
  return { text: s }
}
