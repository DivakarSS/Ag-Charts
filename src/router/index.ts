import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import AgCharts from '../views/AgCharts.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'charts',
    component: AgCharts
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
