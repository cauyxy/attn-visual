import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import VTooltip from 'v-tooltip'

const app = createApp(App)

app.use(VTooltip)
app.use(ElementPlus)
app.mount('#app')