let epoch = 0
export const currentEpoch = () => epoch
export const cancelled = (ep: number) => ep !== epoch
export function stopAll() {
  epoch++
}
