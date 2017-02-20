import Vue from 'vue'
import App from './App'
import Login from './components/Login/Login'
import Blogs from './components/Blog/Blogs'
import Edit from './components/Blog/Edit'
import NotFound from './components/NotFound/NotFound'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
	{ path: '/login', component: Login },
	{ path: '/', redirect: '/login' },
	{ path: '/blogs', component: Blogs },
	{ path: '/edit', component: Edit },
	{ path: '/edit/:blogId', component: Edit },
	{ path: '*', component: NotFound}
]

const router = new VueRouter({
	routes
})

new Vue({
	router,
	el: '#app',
    render: h => h(App)
})

