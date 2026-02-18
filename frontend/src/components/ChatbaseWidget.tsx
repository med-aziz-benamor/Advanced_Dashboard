import { useEffect } from 'react'

/**
 * Chatbase Chatbot Widget
 * Loads the Chatbase chatbot script once globally
 * Can be disabled via VITE_CHATBASE_ENABLED=false
 */
export function ChatbaseWidget() {
  useEffect(() => {
    // Check if chatbase should be enabled
    const isEnabled = import.meta.env.VITE_CHATBASE_ENABLED !== 'false'
    const chatbaseId = import.meta.env.VITE_CHATBASE_ID || 'fhMrQLDuXD6phg6uW1EEW'

    if (!isEnabled) {
      console.log('[Chatbase] Disabled via VITE_CHATBASE_ENABLED')
      return
    }

    // Prevent double-loading
    if (window.chatbase && window.chatbase('getState') === 'initialized') {
      console.log('[Chatbase] Already initialized')
      return
    }

    // Initialize chatbase proxy
    if (!window.chatbase) {
      window.chatbase = (...args: any[]) => {
        if (!window.chatbase.q) {
          window.chatbase.q = []
        }
        window.chatbase.q.push(args)
      }

      window.chatbase = new Proxy(window.chatbase, {
        get(target: any, prop: string) {
          if (prop === 'q') {
            return target.q
          }
          return (...args: any[]) => target(prop, ...args)
        },
      })
    }

    // Load script
    const script = document.createElement('script')
    script.src = 'https://www.chatbase.co/embed.min.js'
    script.id = chatbaseId
    script.setAttribute('domain', 'www.chatbase.co')
    script.async = true
    script.defer = true

    document.body.appendChild(script)

    console.log('[Chatbase] Widget loaded')

    // Cleanup on unmount
    return () => {
      const existingScript = document.getElementById(chatbaseId)
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

  return null
}

// TypeScript declarations
declare global {
  interface Window {
    chatbase: any
  }
}
