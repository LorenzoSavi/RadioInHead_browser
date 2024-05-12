import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/Favorite',
    name: 'Favorite',

    component: () => import(/* webpackChunkName: "about" */ '../views/FavoriteView.vue')
  },  {
    path: '/World',
    name: 'World',

    component: () => import(/* webpackChunkName: "about" */ '../views/WorldView.vue')
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router