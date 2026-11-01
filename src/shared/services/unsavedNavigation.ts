const dirtyForms = new Set<symbol>()

export function setFormUnsaved(owner: symbol, dirty: boolean): void {
  if (dirty) dirtyForms.add(owner)
  else dirtyForms.delete(owner)
}

export function hasUnsavedForms(): boolean {
  return dirtyForms.size > 0
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (event) => {
    if (!hasUnsavedForms()) return
    event.preventDefault()
    event.returnValue = ''
  })
}
