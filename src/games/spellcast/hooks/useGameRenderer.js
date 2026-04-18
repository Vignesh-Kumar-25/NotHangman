import { useEffect, useRef, useState, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { SpellcastRenderer } from '../renderer/SpellcastRenderer'
import { GRID_WIDTH, GRID_HEIGHT, COLORS } from '../renderer/constants'

export function useGameRenderer() {
  const appRef = useRef(null)
  const rendererRef = useRef(null)
  const [containerNode, setContainerNode] = useState(null)

  const containerCallbackRef = useCallback((node) => {
    setContainerNode(node)
  }, [])

  useEffect(() => {
    if (!containerNode) return
    if (appRef.current) return

    const app = new PIXI.Application({
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      backgroundColor: COLORS.background,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    containerNode.appendChild(app.view)
    app.view.style.maxWidth = '100%'
    app.view.style.height = 'auto'

    const renderer = new SpellcastRenderer(app.stage)
    appRef.current = app
    rendererRef.current = renderer

    return () => {
      renderer.destroy()
      app.destroy(true, { children: true })
      appRef.current = null
      rendererRef.current = null
    }
  }, [containerNode])

  return { appRef, rendererRef, containerCallbackRef }
}
