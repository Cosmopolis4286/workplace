import Swal from 'sweetalert2'

export const useAlert = () => {
  const success = (title, message = '') => {
    return Swal.fire({
      icon: 'success',
      title: title,
      text: message,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Aceptar'
    })
  }

  const error = (title, message = '') => {
    return Swal.fire({
      icon: 'error',
      title: title,
      text: message,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Aceptar'
    })
  }

  const warning = (title, message = '') => {
    return Swal.fire({
      icon: 'warning',
      title: title,
      text: message,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Aceptar'
    })
  }

  const info = (title, message = '') => {
    return Swal.fire({
      icon: 'info',
      title: title,
      text: message,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Aceptar'
    })
  }

  const confirm = (title, message = '', confirmText = 'Confirmar', cancelText = 'Cancelar') => {
    return Swal.fire({
      icon: 'question',
      title: title,
      text: message,
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: confirmText,
      cancelButtonText: cancelText
    })
  }

  const loading = (title) => {
    return Swal.fire({
      title: title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })
  }

  const close = () => {
    Swal.close()
  }

  return {
    success,
    error,
    warning,
    info,
    confirm,
    loading,
    close
  }
}
