import {
  Chart as ChartJS,
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
} from 'chart.js'

export default defineNuxtPlugin((nuxtApp) => {
  ChartJS.register(
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

  nuxtApp.provide('chart', ChartJS)
})
