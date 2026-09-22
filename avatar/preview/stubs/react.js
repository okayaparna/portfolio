// Minimal stand-in so the Framer component module can load outside Framer.
export const useRef = (v) => ({ current: v })
export const useEffect = () => {}
export const createElement = () => null
export default { useRef, useEffect, createElement }
