export function getNextPlayerUid(currentUid, playerOrder) {
  const currentIndex = playerOrder.indexOf(currentUid)
  const nextIndex = (currentIndex + 1) % playerOrder.length
  return playerOrder[nextIndex]
}
