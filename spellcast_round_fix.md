## Spellcast Round Fix

Temporary fix added for the round-transition issue where selection could stop working after advancing to the next round.

Current client-side reset added in `src/games/spellcast/components/screens/GameScreen.jsx`:

```jsx
  useEffect(() => {
    endSelection()
    clearSelection()
    setInvalidPath([])
    setSwapOverlayOpen(false)
  }, [boardState?.version, currentRound, currentTurnUid])
```

Purpose:
- force-reset local drag/touch state when the board version changes
- clear stale path state between rounds
- remove leftover invalid-path flash state
- close the swap overlay during round/turn rollover

This file is only a temporary note so the fix can be reverted later if needed.
