export function getNextPlayerUid(currentUid, playerOrder, players) {
  const connected = playerOrder.filter(uid => players[uid]?.connected !== false)
  if (connected.length === 0) return currentUid
  const currentIndex = connected.indexOf(currentUid)
  const nextIndex = (currentIndex + 1) % connected.length
  return connected[nextIndex]
}
