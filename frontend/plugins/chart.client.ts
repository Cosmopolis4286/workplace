let ChartJSPromise: Promise<typeof import('chart.js').Chart> | null = null

async function loadChart() {
  if (!ChartJSPromise) {
    ChartJSPromise = import('chart.js').then(({ Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, LineController, Title, Tooltip, Legend, ArcElement, Filler, DoughnutController }) => {
      Chart.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        BarController,
        LineController,
        Title,
        Tooltip,
        Legend,
        ArcElement,
        Filler,
        DoughnutController,
      )
      return Chart
    })
  }
  return ChartJSPromise
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide('chart', loadChart)
})
