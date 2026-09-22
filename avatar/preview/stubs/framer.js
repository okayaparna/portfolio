export const addPropertyControls = () => {}
export const ControlType = new Proxy({}, { get: (_, k) => k })
export const RenderTarget = { current: () => "preview", canvas: "canvas", preview: "preview" }
