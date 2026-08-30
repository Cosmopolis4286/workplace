// Redirect-and-resume: un visitante sin sesión que intenta pedir/solicitar
// algo en una página pública (/loja/:slug, /p/:username, /pro/:slug) se
// redirige a /login?redirect=...&intent=checkout en vez de recibir un 401
// silencioso — el checkout NO se vuelve guest (el backend sigue exigiendo
// JwtAuthGuard+KycApprovedGuard en /catalog/orders y /services/requests, ver
// WORKPLACE plan de páginas públicas), solo se preserva lo que ya llenó para
// no hacerlo repetir el formulario tras loguearse.
//
// sessionStorage (no localStorage): el borrador solo debe sobrevivir la
// vuelta de /login, no quedar pegado indefinidamente en el navegador.

const STORAGE_KEY = 'workplace_checkout_draft'

export interface CatalogOrderDraft {
  kind: 'catalog-order'
  productId: string
  form: Record<string, unknown>
}

export interface ServiceRequestDraft {
  kind: 'service-request'
  serviceId: string
  form: Record<string, unknown>
}

export type CheckoutDraft = CatalogOrderDraft | ServiceRequestDraft

export function useCheckoutResume() {
  function saveCheckoutDraft(draft: CheckoutDraft) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // sessionStorage puede lanzar en modo privado estricto — el draft es
      // una conveniencia, no debe romper el flujo de redirect a login.
    }
  }

  function consumeCheckoutDraft(): CheckoutDraft | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      sessionStorage.removeItem(STORAGE_KEY)
      return JSON.parse(raw) as CheckoutDraft
    } catch {
      return null
    }
  }

  return { saveCheckoutDraft, consumeCheckoutDraft }
}
