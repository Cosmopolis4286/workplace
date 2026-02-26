import Swal, { type SweetAlertResult } from 'sweetalert2'

export const useAlert = () => {
  const success = (title: string, message = ''): Promise<SweetAlertResult> =>
    Swal.fire({
      icon: 'success',
      title,
      text: message,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Aceptar',
    })

  const error = (title: string, message = ''): Promise<SweetAlertResult> =>
    Swal.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Aceptar',
    })

  const warning = (title: string, message = ''): Promise<SweetAlertResult> =>
    Swal.fire({
      icon: 'warning',
      title,
      text: message,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Aceptar',
    })

  const info = (title: string, message = ''): Promise<SweetAlertResult> =>
    Swal.fire({
      icon: 'info',
      title,
      text: message,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Aceptar',
    })

  const confirm = (
    title: string,
    message = '',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
  ): Promise<SweetAlertResult> =>
    Swal.fire({
      icon: 'question',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
    })

  const loading = (title: string): Promise<SweetAlertResult> =>
    Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    })

  const close = (): void => Swal.close()

  return { success, error, warning, info, confirm, loading, close }
}
