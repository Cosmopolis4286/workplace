import { ref, computed } from 'vue'

const notifications = ref([])
const loading = ref(false)
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

export const useNotifications = () => {
  const fetchNotifications = async () => {
    loading.value = true
    try {
      const stored = localStorage.getItem('notifications')
      if (stored) {
        notifications.value = JSON.parse(stored)
      } else {
        notifications.value = generateMockNotifications()
        localStorage.setItem('notifications', JSON.stringify(notifications.value))
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      notifications.value = generateMockNotifications()
    } finally {
      loading.value = false
    }
  }

  const markAsRead = (id) => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.read = true
      localStorage.setItem('notifications', JSON.stringify(notifications.value))
    }
  }

  const markAllAsRead = () => {
    notifications.value.forEach(n => n.read = true)
    localStorage.setItem('notifications', JSON.stringify(notifications.value))
  }

  const deleteNotification = (id) => {
    notifications.value = notifications.value.filter(n => n.id !== id)
    localStorage.setItem('notifications', JSON.stringify(notifications.value))
  }

  const clearAll = () => {
    notifications.value = []
    localStorage.removeItem('notifications')
  }

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  }
}

function generateMockNotifications() {
  return [
    {
      id: '1',
      type: 'order',
      title: 'Nuevo pedido #1234',
      message: 'Se ha recibido un nuevo pedido de $45.50',
      read: false,
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      icon: 'ShoppingBagIcon',
      color: 'blue'
    },
    {
      id: '2',
      type: 'delivery',
      title: 'Pedido entregado',
      message: 'El pedido #1230 ha sido entregado exitosamente',
      read: false,
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      icon: 'TruckIcon',
      color: 'green'
    },
    {
      id: '3',
      type: 'inventory',
      title: 'Stock bajo',
      message: 'El producto "Hamburguesa Clásica" tiene stock bajo (5 unidades)',
      read: false,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      icon: 'ExclamationTriangleIcon',
      color: 'yellow'
    },
    {
      id: '4',
      type: 'system',
      title: 'Actualización disponible',
      message: 'Hay una nueva versión del sistema disponible',
      read: true,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      icon: 'BellIcon',
      color: 'gray'
    },
    {
      id: '5',
      type: 'order',
      title: 'Pedido cancelado',
      message: 'El cliente ha cancelado el pedido #1229',
      read: true,
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      icon: 'XCircleIcon',
      color: 'red'
    }
  ]
}
