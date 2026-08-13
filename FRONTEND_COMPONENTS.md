# Composables y componentes genéricos — WorkPlace Manager (frontend/)

> Inventario de utilidades transversales (no ligadas a un módulo de negocio como menu/orders/cash) y su nivel de adopción real en `pages/` y `components/`. Generado a partir de una auditoría del código el 2026-08-12.
>
> `frontend/composables/` está organizado en subcarpetas por dominio: `admin/`, `auth/`, `catalog/`, `commerce/`, `core/`, `customers/`, `dashboard/`, `delivery/`, `jobs/`, `kyc/`, `location/`, `notifications/`, `receipts/`, `search/`, `services/`, `ui/`, `users/`, `wallets/`. Los genéricos viven sobre todo en **`core/`**, **`ui/`** y **`location/`**; el resto contiene composables de dominio y queda fuera de este inventario.

## 1. Composables genéricos

| Composable | Ruta | Qué hace | API pública | Adopción |
|---|---|---|---|---|
| **useApi** | `core/useApi.ts` | Cliente HTTP central: headers de auth, refresh de token en 401, parseo JSON/blob, logout forzado por inactividad (403). | `apiFetch, get, post, put, patch, del` | Núcleo de la app — 23 pages + 7 components directos, y usado indirectamente por 52 de 74 composables de dominio |
| **useToast** | `ui/useToast.ts` | Wrapper sobre `vue-sonner` (toasts no bloqueantes), montado 1 vez en `app.vue`. | `success, error, warning, info, loading, dismiss` | 7 components (modales/inputs), **0 pages** |
| **useAlert** | `ui/useAlert.ts` | Wrapper sobre SweetAlert2 (modales bloqueantes). | `success, error, warning, info, confirm, loading, close` | 1 archivo (`profile.vue`) — casi abandonado a favor de `useConfirm` |
| **useConfirm** | `ui/useConfirm.ts` | Store singleton que alimenta `<ConfirmModal>`; confirmaciones tipo promesa con loading/error inline, soporta `onConfirm` async que puede dejar el modal abierto mostrando error. | `confirm(options): Promise<boolean>`, `state`, `settle` | Patrón estándar de confirmación de la app — se disparó desde ~15 pages/components a lo largo de la migración de `window.confirm()`/SweetAlert2 |
| **useFormValidation** | `ui/useFormValidation.ts` | Reglas atómicas (`required`, `email`, `phone`, `minLength`...) + runner `validate`/`validateAll` + medidor de fuerza de contraseña. | `required, email, minLength, maxLength, passwordStrength, matches, phone, validate, validateAll, passwordScore, strengthLabel, strengthColor` | Solo los 5 formularios de auth (`register`, `login`, `onboarding`, `reset-password`, `recover-password`) |
| **useTouchGestures** / **usePullToRefresh** | `ui/useTouchGestures.ts` (ambos exports viven en el mismo archivo) | Detección de swipe / pull-to-refresh sobre un elemento. | `touchStart, touchEnd` / `isRefreshing, pullDistance, isPulling` | **0 usos en toda la app** |
| **useColorMode** | `ui/useColorMode.ts` | Dark/light mode global (singleton), persistido en localStorage, SSR-safe. | `isDark (readonly), toggle, setMode` | Plugin + layout + 4 components |
| **useApiErrors** | `core/useApiErrors.ts` | Traduce mensajes técnicos de error de API (rate-limit, throttler) al idioma activo. | `getApiErrorMessage(err, fallback)`, `getRateLimitSeconds(err)` | 7 pages de auth + `TwoFactorSettings.vue` |
| **useAssetUrl** | `core/useAssetUrl.ts` | Construye URLs completas de assets (avatars/uploads) a partir de `apiUrl`. | `getAssetUrl(path)`, `baseUrl` | 3 pages + 5 components (widgets, sidebar, header) |
| **usePlatformDetect** | `core/usePlatformDetect.ts` | Detecta plataforma (android/ios/desktop) por user-agent. | `platform (state), init()` | `download.vue` + `AppDownloadButton.vue` |
| **useRelativeTime** | `core/useRelativeTime.ts` | `timeAgo(date)` → "hace 5 min" (implementación propia, español hardcodeado). | `timeAgo` | Solo 5 widgets de dashboard, **0 pages** |
| **useCamera** | `core/useCamera.ts` | Toma foto vía Capacitor Camera (nativo) o `<input capture>` (web). | `takePhoto()` | `profile.vue` + `ProductModal.vue` + `ExpenseModal.vue` |
| **useNavigation** | `core/useNavigation.ts` | Estructura/estado del menú lateral de navegación. | — | `AppSidebar` y layout |
| **useGlobalSearch** | `search/useGlobalSearch.ts` | Buscador global con debounce, cache LRU, cancelación de requests, navegación por teclado, recientes en localStorage. | `query, suggestions, counts, loading, highlightedIndex, recentTerms, search, clear, moveHighlight, getHighlighted, goToSuggestion, goToTabWithQuery, applyRecentTerm, removeRecentTerm` | Solo vía `GlobalSearchBar.vue` |
| **useAppLock** | `auth/useAppLock.ts` | Estado global de bloqueo de app (PIN/biometría al reabrir). | `isLocked, lock, unlock` | Plugin + `AppLockScreen.vue` |
| **useBiometric** | `auth/useBiometric.ts` | Wrapper sobre Capacitor biometric-auth + flag "app lock habilitado". | `isNative, isAvailable, getBiometryType, authenticate, isAppLockEnabled, setAppLockEnabled` | `settings.vue` + plugin + `AppLockScreen.vue` |
| **useRecaptcha** | `auth/useRecaptcha.ts` | reCAPTCHA v3 invisible, no-op si no hay site key. | `executeRecaptcha(action), isLoaded, isEnabled` | `register.vue`, `login.vue` |
| **useNominatim** | `location/useNominatim.ts` | Geocoding/autocompletado de direcciones (OpenStreetMap, sin API key), debounced. | `searchPlaces, reverseGeocode, getCurrentLocation, isGeoAvailable` | Solo vía `PlaceAutocomplete.vue` |
| **useVeLocations** | `location/useVeLocations.ts` | Catálogo territorial Venezuela (Estado→Municipio→Ciudad→Parroquia). | `getStates, getMunicipios, getCiudades, getParroquias` | `settings.vue`, `profile.vue`, `locations.vue` |
| **useLocationData** | `location/useLocationData.ts` | Catálogo mundial país/estado/ciudad (`country-state-city`, import dinámico). | `getCountries, getStatesByCountry, getCitiesByState, findCountryByName, findStateByName` | `settings.vue`, `profile.vue`, `locations.vue` + `LocationFilter.vue` |

No existen `usePagination`, `useDebounce` ni `useLocalStorage` genéricos — la lógica de debounce está reimplementada por separado en 3 sitios distintos (ver §3).

**Nota sobre imports**: verificar siempre la ruta real por subcarpeta (`~/composables/ui/useConfirm`, `~/composables/core/useApi`, etc.) — no asumir rutas planas `~/composables/useX`.

## 2. Componentes genéricos (`frontend/components/`)

### `components/ui/`

| Componente | Qué hace | Props/Emits | Adopción |
|---|---|---|---|
| **PageHeader.vue** | Header hero (título, descripción, icono, breadcrumb, stats), envuelve `HeaderActionBar`. | `title, description, icon, breadcrumb, stats`; slot `actions` | **45 de 64 pages** — el más adoptado de todos |
| **HeaderActionBar.vue** | Contenedor flex para acciones del header. | slot default | Interno a PageHeader |
| **HeaderActionButton.vue** | Botón/link de acción con icono + loading + variant. | `icon, variant, to, disabled, loading, title` | 1 archivo (`verification.vue`) |
| **BaseButton.vue** | Botón base con variantes y loading spinner. | `variant, size, loading, disabled` | **0 usos** |
| **AppTable.vue** | Tabla genérica tipada con selección múltiple y paginación. | `rows, selectable, rowKey, selected, total, pageSize, currentPage, totalLabel`; emits `update:selected, page-change` | **0 usos** |
| **MobileCard.vue** | Card táctil con variantes y feedback de press. | `variant, padding, clickable, hoverable, rounded`; emit `click` | **0 usos** |
| **SearchableSelect.vue** | Combobox con búsqueda sobre lista de strings. | `modelValue, options, placeholder, disabled`; emit `update:modelValue` | `settings.vue`, `profile.vue` |
| **ImageDropInput.vue** | Input de imagen con preview y drop. | `modelValue, label, required`; emit `update:modelValue` | `verification.vue` |
| **TagsInput.vue** | Input de tags con autocompletado desde endpoint. | `modelValue, suggestionsEndpoint, placeholder, maxTags, maxTagLength`; emit `update:modelValue` | `my-services.vue`, `jobs.vue`, `ProductModal.vue` |

### `components/modals/`

| Componente | Qué hace | API | Adopción |
|---|---|---|---|
| **ConfirmModal.vue** | Modal de confirmación genérico, 100% dirigido por `useConfirm()` (sin props propias). Montado 1 vez en `app.vue`. Soporta `state.loading`/`state.error` para acciones async que pueden fallar sin cerrar el modal. | Lee de `state`: `title, message, confirmText, cancelText, variant (danger/primary), loading, error` | Disparado desde numerosas pages y components tras la migración de `window.confirm()` y modales de confirmación hechos a mano |

### Otros genéricos (fuera de `ui/`/`modals/`)

| Componente | Qué hace | Adopción |
|---|---|---|
| **NotificationPanel.vue** | Panel de notificaciones (WebSocket + fallback offline). | Montado 1 vez en `AppHeader.vue` |
| **GlobalSearchBar.vue** | Barra de búsqueda global (desktop + overlay mobile). | 1 archivo (`AppHeader.vue`) |
| **SearchSuggestionsDropdown.vue** | Dropdown de resultados agrupados por tab. | Acoplado a `GlobalSearchBar.vue` |
| **PlaceAutocomplete.vue** | Input de dirección con autocompletado + geolocalización. | 2 archivos |
| **AppDownloadButton.vue** | CTA de descarga (APK directo Android / link a `/download`). | `app.vue` |
| **LanguageSwitcher.vue** | Selector de idioma vía `useI18n`. | `app.vue` |
| **StatsCard.vue** | Card de KPI (icono, valor, variación %, progreso). | 1 archivo (`rides.vue`) |
| **FilterBar.vue** | Barra de filtros (búsqueda + 2 selects + botones). | **0 usos** |
| **PlanUsageBanner.vue** | Banner de consumo de plan con barras de progreso. | `index.vue`, `AuthLayout.vue` |
| **charts/BarChart.vue, LineChart.vue, DoughnutChart.vue** | Wrappers de Chart.js con opciones por defecto. | Los 3 solo en `analytics.vue` |
| **shared/SharedIcon.vue** | Resuelve un nombre string a un ícono Heroicon (~14 mapeados). | 1 archivo (`DemoCredentials.vue`) |

## 3. Subutilización y duplicación detectada

### Componentes/composables genéricos con 0 usos (código muerto o design system abandonado)

- `components/ui/BaseButton.vue`
- `components/ui/AppTable.vue`
- `components/ui/MobileCard.vue`
- `components/FilterBar.vue`
- `useTouchGestures` / `usePullToRefresh` (`ui/useTouchGestures.ts`)

Los 4 componentes UI parecen un design system iniciado y nunca terminado de adoptar: cada page reimplementa tablas, botones y filtros a mano en su lugar.

### Genéricos infrautilizados (existen, funcionan, pero casi nadie los usa)

- `HeaderActionButton.vue` — 22 pages usan `HeaderActionBar` (el contenedor) pero rellenan botones a mano en vez de este.
- `StatsCard.vue` — solo `rides.vue`; `analytics.vue`, `index.vue` (dashboard) replican el patrón "card con icono + valor + %" manualmente.
- `charts/*` — solo `analytics.vue`; `reports.vue`, `cash-register.vue`, `exchange-rates.vue` muestran series en tablas de texto plano.
- `useToast` — 0 en pages; el feedback de éxito/error de operaciones CRUD en pages se resuelve de otras formas en vez de toast.
- `useAlert` — 1 uso; sigue como dependencia (SweetAlert2) por ese único caso residual.

### Patrones duplicados a mano que ya tienen equivalente

1. **Formateo de fechas** (el más costoso): 26+ archivos en `pages/` llaman `new Date(...).toLocaleDateString(...)` directamente, con **4 locales inconsistentes** (`es-MX`, `es-VE`, `es-CO`, `es-ES`) y funciones `formatDate`/`formatDateTime` reimplementadas caso por caso. `useRelativeTime` solo cubre "hace X tiempo" y nunca se usa en pages.
2. **URLs de assets construidas a mano** pese a existir `useAssetUrl`: `p/[username].vue` (líneas 313, 378, 1264), `search.vue` (líneas 1334, 1724, 1729) replican la misma concatenación `${apiUrl}${path}`.
3. **Validación de formularios manual**: fuera de los 5 formularios de auth, el resto (crear producto, empleado, sucursal, checkout) valida campos con `if (!field) error = '...'` inline en vez de usar `validateAll` de `useFormValidation` (que es genérico pese a estar documentado como "para auth").
4. **Debounce reimplementado 3 veces**: `useGlobalSearch`, `useNominatim` y `TagsInput.vue` cada uno con su propio `setTimeout`/`clearTimeout`.
5. **Gráficos en texto plano**: `reports.vue`, `cash-register.vue`, `exchange-rates.vue` muestran series temporales en tablas en vez de reutilizar `charts/LineChart.vue`/`BarChart.vue`.

---

## 4. Recomendaciones priorizadas

### Alto impacto, bajo esfuerzo

1. **Crear `useDateFormat`** (en `core/`) que centralice `formatDate`/`formatDateTime`/`formatRelative` con un único locale configurable (elegir uno: `es-VE` es el más consistente con el resto del dominio — Venezuela). Migrar los 26+ archivos que hoy llaman `toLocaleDateString` a mano. Extender `useRelativeTime` para que viva junto a este composable en vez de aislado.
   - **Quién debe usarlo**: todas las pages con tablas de fecha (`orders.vue`, `customers.vue`, `employees.vue`, `wallet.vue`, `service-requests.vue`, `verification.vue`, `exchange-rates.vue`, etc.)

2. **Reemplazar las concatenaciones manuales de `apiUrl`** en `p/[username].vue` y `search.vue` por `useAssetUrl().getAssetUrl()`. Cambio mecánico, bajo riesgo, elimina 6 sitios de duplicación exacta.

3. **Decidir el destino de `useAlert`**: o se termina de migrar el único uso restante (`profile.vue`) a `useConfirm`/`useToast` y se remueve `sweetalert2` del `package.json` (menos peso de bundle), o se documenta por qué se mantiene. Ahora mismo es una dependencia externa cargada por un solo caso de uso.

### Impacto medio, esfuerzo medio

4. **Adoptar `HeaderActionButton.vue`** en las 22 pages que usan `HeaderActionBar` con botones hechos a mano — unifica loading state y estilos de los botones de header, reduce código repetido por page.

5. **Adoptar `StatsCard.vue`** en `analytics.vue` y `index.vue` (dashboard), que hoy repiten el patrón "icono + valor + variación %" manualmente. Consolidaría también el formato de números/moneda en un solo lugar.

6. **Reutilizar `charts/LineChart.vue`/`BarChart.vue`** en `reports.vue`, `cash-register.vue` y `exchange-rates.vue` para mostrar tendencias (ventas por día, tasa de cambio histórica) en vez de tablas de texto — mejora real de UX, el componente ya existe y está probado en `analytics.vue`.

7. **Generalizar `useFormValidation`** fuera de auth: usarlo en formularios de producto/empleado/sucursal/checkout que hoy validan campo por campo a mano. Requiere revisar que las reglas (`required`, `phone`, etc.) cubran los casos de esos formularios; puede necesitar 1-2 reglas nuevas (ej. `numeric`, `positiveNumber`). Si se generaliza, considerar mover el archivo de `ui/` a `core/` para reflejar que ya no es solo de auth.

### Impacto medio, esfuerzo mayor (arquitectura)

8. **Decidir sobre `AppTable.vue`, `BaseButton.vue`, `MobileCard.vue`, `FilterBar.vue`**: con 0 usos, son o (a) deuda de un design system abandonado que vale la pena terminar de adoptar en las pages con tablas/filtros manuales (`users.vue`, `orders.vue`, `customers.vue` son buenos primeros candidatos para `AppTable`), o (b) código muerto que debería eliminarse si no hay plan de usarlos. Mantenerlos sin decisión activa es el peor escenario: no se benefician y siguen apareciendo en búsquedas/mantenimiento.

9. **Extraer un `useDebounce` genérico** (`function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number)`, en `core/`) y usarlo en `useGlobalSearch`, `useNominatim` y `TagsInput.vue`, eliminando 3 implementaciones paralelas del mismo patrón `setTimeout`/`clearTimeout`.

10. **Investigar por qué `useTouchGestures`/`usePullToRefresh` tienen 0 usos** siendo una app con fuerte enfoque mobile/PWA (Capacitor, AppLockScreen, PwaPrompt ya existen). Si el plan es usarlos en listados largos (orders, delivery, notifications), priorizar esa integración; si no, eliminarlos.

---

### Núcleo sano de la app (no requiere intervención)

`useApi` (`core/`), `PageHeader`, `useConfirm`/`ConfirmModal` (`ui/`), `useAssetUrl` (`core/`), `useColorMode` (`ui/`) están bien adoptados y son la base real sobre la que corre el frontend — cualquier refactor futuro debe mantenerse compatible con estos sin duplicarlos.
