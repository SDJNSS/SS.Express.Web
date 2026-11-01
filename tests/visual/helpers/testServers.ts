// Dedicated ports keep the test runner from depending on a developer-owned server.
export const appPort = 4373
export const previewPort = 4374
export const sourcePort = 4375
export const productionPort = 4380
export const appHost = `http://127.0.0.1:${appPort}`
export const previewHost = `http://127.0.0.1:${previewPort}`
export const sourceHost = `http://127.0.0.1:${sourcePort}`
export const productionHost = `http://127.0.0.1:${productionPort}`
