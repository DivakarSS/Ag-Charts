import { defineCustomElement } from 'vue'
import charts from './components/agCharts.vue';
const element = defineCustomElement(charts);
customElements.define("ag-charts", element);
