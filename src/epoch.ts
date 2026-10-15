// Leaving a screen must stop anything that screen started (a camera loop, a spoken
// prompt waiting to play). stopAll() bumps the epoch, so loops started on the old
// screen see cancelled(theirEpoch) and quit.
let epoch = 0
export const currentEpoch = () => epoch
export const cancelled = (ep: number) => ep !== epoch
export function stopAll() {
  epoch++
}
