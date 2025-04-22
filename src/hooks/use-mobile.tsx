import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Create a MediaQueryList object to monitor changes in the viewport width
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Callback function to update the mobile state based on the current window width
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Add an event listener to handle changes in the media query
    mql.addEventListener("change", onChange)
    
    // Set the initial mobile state based on the current window width
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Cleanup function to remove the event listener when the component unmounts
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
