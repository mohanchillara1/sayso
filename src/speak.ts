// Says a word with the browser's built-in voice. Prefers a voice that runs on the
// device (localService) so the word is not sent anywhere; whether every phone has
// one is unchecked. Returns false if this browser cannot speak at all.
let chosen: SpeechSynthesisVoice | null | undefined

function pickVoice(): SpeechSynthesisVoice | null {
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"))
  return vs.find((v) => v.localService && v.default) ?? vs.find((v) => v.localService) ?? vs[0] ?? null
}

export function canSpeak(): boolean {
  return typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined"
}

export function speak(text: string, rate = 0.8): boolean {
  if (!canSpeak()) return false
  try {
    if (chosen === undefined || chosen === null) chosen = pickVoice()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = rate
    if (chosen) u.voice = chosen
    u.lang = chosen?.lang ?? "en-US"
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
    return true
  } catch {
    return false
  }
}
