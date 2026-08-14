import {
  ShoppingCartIcon, CubeIcon, ChartBarIcon, DocumentTextIcon, UsersIcon, TruckIcon,
  UserPlusIcon, CogIcon, RocketLaunchIcon,
} from '@heroicons/vue/24/outline'

// Resuelve el nombre de ícono (string, desde el backend) al componente Heroicons real
const ICON_MAP: Record<string, typeof ShoppingCartIcon> = {
  ShoppingCartIcon, CubeIcon, ChartBarIcon, DocumentTextIcon, UsersIcon, TruckIcon,
  UserPlusIcon, CogIcon, RocketLaunchIcon,
}

export function useLandingIcons() {
  function resolveIcon(name: string) {
    return ICON_MAP[name] ?? ShoppingCartIcon
  }
  return { resolveIcon }
}
