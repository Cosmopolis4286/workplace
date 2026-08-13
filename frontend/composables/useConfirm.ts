import { reactive } from 'vue'

export type ConfirmVariant = 'danger' | 'primary'

/** Devuelve un string de error para dejar el modal abierto mostrándolo; cualquier otro valor (o lanzar) cierra el modal en éxito/con excepción. */
export type ConfirmAction = () => Promise<string | void>

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  onConfirm?: ConfirmAction
}

interface ConfirmState extends Required<Omit<ConfirmOptions, 'message' | 'onConfirm'>> {
  visible: boolean
  message: string
  loading: boolean
  error: string | null
  onConfirm: ConfirmAction | null
  resolve: ((value: boolean) => void) | null
}

const state = reactive<ConfirmState>({
  visible: false,
  title: '',
  message: '',
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  variant: 'primary',
  loading: false,
  error: null,
  onConfirm: null,
  resolve: null,
})

function confirm(options: ConfirmOptions): Promise<boolean> {
  state.title = options.title
  state.message = options.message ?? ''
  state.confirmText = options.confirmText ?? 'Confirmar'
  state.cancelText = options.cancelText ?? 'Cancelar'
  state.variant = options.variant ?? 'primary'
  state.loading = false
  state.error = null
  state.onConfirm = options.onConfirm ?? null
  state.visible = true

  return new Promise<boolean>((resolve) => {
    state.resolve = resolve
  })
}

function close(result: boolean) {
  state.visible = false
  state.loading = false
  state.error = null
  state.onConfirm = null
  state.resolve?.(result)
  state.resolve = null
}

async function settle(result: boolean) {
  if (!result || !state.onConfirm) {
    close(result)
    return
  }

  state.loading = true
  state.error = null
  try {
    const errorMessage = await state.onConfirm()
    if (errorMessage) {
      state.error = errorMessage
      state.loading = false
      return
    }
    close(true)
  } catch (e: any) {
    state.error = e?.data?.message ?? e?.message ?? 'Ocurrió un error inesperado'
    state.loading = false
  }
}

export function useConfirm() {
  return { state, confirm, settle }
}
