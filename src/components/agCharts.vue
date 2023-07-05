<template>
    <div class="gepChartCustomerHistoricalComparison">
        <div style="display: flex; justify-content: right;">
            <b-form-select :options="technologies" label="title" v-model="selectedTechnology"
                style="width: 200px; margin-top: 0px; margin-bottom: 0px; margin-right: 10px;"
            ></b-form-select>
            <b-form-select :options="dates" label="title" v-model="selectedTimeframe"
            style="width: 200px; margin-top: 0px; margin-bottom: 0px; margin-right: 10px;"
            ></b-form-select>
            <b-form-select :options="regions" v-model="selectedRegion"
            style="width: 150px; margin-top: 0px; margin-bottom: 0px;"
            ></b-form-select>
            <b-button size="sm" id="btnTriggerChartCustomerHistoricalComparison" @click="applyFilters()" style="margin-left: 10px;white-space: nowrap;">Apply Filters
            </b-button>
        </div>
        <div class="dgSingleReportLargeContainer text-center">
            <b-spinner class="justify-content-center" v-if="isLoading"  label="Loading..."></b-spinner>
            <ag-charts-vue :options="customerHistoricalComparisonOptionsCapital" ></ag-charts-vue>
        </div>
        <div class="dgSingleReportLargeContainer">
            <ag-charts-vue :options="customerHistoricalComparisonOptionsNonCapital"></ag-charts-vue>
        </div>

    </div>
</template>

<script>

import { AgChartsVue } from "ag-charts-vue3";
import * as agCharts from "ag-charts-community";
import _ from "underscore";
import axios from "axios";
import percentileRank from "./percentileRank.js";

export default ({
    name: "gepChartCustomerHistoricalComparison",
    components: {
        "ag-charts-vue": AgChartsVue,
    },
    props: {
        customerHistoricalComparisonComponentKey: { type: Number, default: 0 }
    },
    data() {
        return {
            regions: [
                { text: "GLOBAL", value: "GLOBAL" },
                { text: "CHINA", value: "CHINA" },
                { text: "ASIA", value: "ASIA" },
                { text: "EUROPE", value: "EUROPE" },
                { text: "NAM", value: "NAM" },
                { text: "LATAM", value: "LATAM" },
                { text: "SSA", value: "SSA" },
                { text: "INDIA", value: "INDIA" },
                { text: "MEA", value: "MEA" }
            ],
            selectedTechnology: "All Technologies",
            technologies: [
                { text: "All Technologies", value: "All Technologies" },
                { text: "Gas", value: "Gas" },
                { text: "Steam", value: "Steam" },
                { text: "Generator", value: "Generator" }
            ],
            selectedRegion: "GLOBAL",
            selectedTimeframe: "Last 36 Months",
            dates: [
                { text: "Last 12 Months", value: "Last 12 Months" },
                { text: "Last 24 Months", value: "Last 24 Months" },
                { text: "Last 36 Months", value: "Last 36 Months" },
                { text: "Last 48 Months", value: "Last 48 Months" }
            ],
            customerHistoricalComparisonOptions: {},
            isLoading: false,
            capitalData: [],
            nonCapitalData: [],
            customerHistoricalComparisonOptionsCapital: {},
            customerHistoricalComparisonOptionsNonCapital: {},
            totalData: {},
            customerNameParent: "",
            currentCustomerArray: []
        }
    },
    methods: {
        setUpCharts(data, optionsKey, title) {
            this.customerHistoricalComparisonOptions = {
                title: {
                    text: title,
                },
                legend: {
                    position: 'bottom',
                },
                series: [
                    {
                        // grouped: false,
                        type: 'scatter',
                        data: data,
                        xKey: 'list_price_percent',
                        xName: 'List Price Percentile',
                        yKey: 'cm_percent',
                        yName: 'CM Percentile',
                        sizeKey: 'sales_total',
                        sizeName: 'Total Sales',
                        marker: {
                            shape: 'circle',
                            fill: "#093161",
                            stroke: '#093161',
                        },

                        tooltip: {
                            renderer: (params) => {
                                return {
                                    title: "Customer Details",
                                    content:
                                        "Customer Name (Parent): <b>" + params.datum.customer_name_parent + "</b></br>" +
                                        "List Price % Percentile: <b>" + params.datum.list_price_percent + '%' + "</b></br>" +
                                        "CM % Percentile: <b>" + Math.trunc(params.datum.cm_percent).toLocaleString() + '%' + "</b></br>" +
                                        "Total Cost: <b>" + '$' + Math.trunc(params.datum.cost_total).toLocaleString() + " (USD)</b></br>" +
                                        "Avg Sales Per Year: <b>" + '$' + Math.trunc(dgtCustomerHistoricalAverageSales(params.datum.sales_total)).toLocaleString() + " (USD)</b></br>" +
                                        "Total Sales: <b>" + '$' + Math.trunc(params.datum.sales_total).toLocaleString() + " (USD)</b>"
                                };
                            },
                        },
                        showInLegend: false,
                    },
                ],
                axes: [
                    {
                        type: 'number',
                        position: 'bottom',
                        title: {
                            enabled: true,
                            text: 'List Price % Percentile',
                        },
                        label: {
                            rotation: 0,
                            formatter: function (params) {
                                return params.value.toLocaleString() + "%";
                            },
                        },
                    },
                    {
                        type: 'number',
                        position: 'left',
                        label: {
                            formatter: function (params) {
                                return params.value.toLocaleString() + "%";
                            },
                        },
                        title: {
                            enabled: true,
                            text: 'CM % Percentile',
                        },
                    },
                ],
            };
            this[optionsKey] = this.customerHistoricalComparisonOptions;
            this[optionsKey].title.text = title;

        },
        normaliseObject(arr, percentages, el) {
            const range = [0, 100];
            const min = Math.min.apply(Math, percentages);
            const max = Math.max.apply(Math, percentages);
            const variation = (range[1] - range[0]) / (max - min);

            arr.forEach(item => {
                const val = (range[0] + ((item[el] - min) * variation)).toFixed(2);
                item[el] = +val;
            });
            return arr;
        },
        calculatePercentileAndNormalize(cmPercentagesByCustomerData, key) {
            _.each(cmPercentagesByCustomerData, function (row) {
                row.list_price_percent = parseFloat(row.list_price_percent);
                row.sales_total = parseFloat(row.sales_total);
                return row;
            });

            let cmPercentages = [];
            let listPricePercentages = [];
           // let instance = this;
            // Set negative numbers to 0 for the percentages
            cmPercentagesByCustomerData.forEach(item => {
                if (item.cm_percent < 0) {
                    item.cm_percent = 0;
                }
                if (item.list_price_percent < 0) {
                    item.list_price_percent = 0;
                }
            });
            cmPercentagesByCustomerData.forEach(element => {
                let result = percentileRank(element.cm_percent, cmPercentagesByCustomerData, cmPercentagesByCustomerData => cmPercentagesByCustomerData.cm_percent);
                cmPercentages.push(result);
                element.cm_percent = result;
                result = percentileRank(element.list_price_percent, cmPercentagesByCustomerData, cmPercentagesByCustomerData => cmPercentagesByCustomerData.list_price_percent);
                element.list_price_percent = result;
                listPricePercentages.push(result);
                if (element.customer_name_parent == this.customerNameParent) {
                    this.currentCustomerArray = [];
                    this.currentCustomerArray.push(element);
                }
            });

            // Normalize cm_percent
            let dataAfterNormalizingCMPercentages = this.normaliseObject(cmPercentagesByCustomerData, cmPercentages, "cm_percent");

            // Normalize list_price_percent 
            let finalData = this.normaliseObject(cmPercentagesByCustomerData, listPricePercentages, "list_price_percent");
            this[key] = finalData;
        },
        addCurrentCustomerToSeries(chartKey) {
            //let instance = this;
            if (this.currentCustomerArray == null || this.currentCustomerArray == undefined || this.currentCustomerArray.length == 0) {
                return
            }
            this.currentCustomerArray[0].name = "Current Customer";

            this[chartKey].series.push({
                type: 'scatter',
                data: this.currentCustomerArray,
                xKey: 'list_price_percent',
                xName: 'List Price Percentile',
                yKey: 'cm_percent',
                yName: 'Current Customer',
                sizeKey: 'sales_total',
                sizeName: 'Total Sales',
                showInLegend: true,
                marker: {
                    shape: 'circle',
                    fill: 'red',
                    stroke: 'black',
                },
                tooltip: {
                    renderer: (params) => {
                        return {
                            title: "Customer Details", 
                            content:
                                "Customer Name (Parent): <b>" + params.datum.customer_name_parent + "</b></br>" +
                                "List Price % Percentile: <b>" + params.datum.list_price_percent + '%' + "</b></br>" +
                                "CM % Percentile: <b>" + Math.trunc(params.datum.cm_percent).toLocaleString() + '%' + "</b></br>" +
                                "Total Cost: <b>" + '$' + Math.trunc(params.datum.cost_total).toLocaleString() + " (USD)</b></br>" +
                                "Avg Sales Per Year: <b>" + '$' + Math.trunc(dgtCustomerHistoricalAverageSales(params.datum.sales_total)).toLocaleString() + " (USD)</b></br>" +
                                "Total Sales: <b>" + '$' + Math.trunc(params.datum.sales_total).toLocaleString() + " (USD)</b>"
                        };
                    },
                },

            });

        },
        getDealGuidanceCustomerHistoricalComparisonData(selectedOptions) {
            try {
                this.isLoading = true;
                //let this = this;
                let callGetDealGuidanceCustomerHistoricalComparison = true;
                    if (callGetDealGuidanceCustomerHistoricalComparison) {
                        setTimeout(() => {
                            let dealGuidanceCustomerHistoricalComparisonJsonStr = {
    "customerHistoricalComparisonTotalData": {
        "capitalGlobalData": [
            {
                "customer_name_parent": "Termobarranquilla S.A. E.S.P.",
                "cost_per_unit_sum": "8358.5100",
                "price_per_unit_sum": "9912.9800",
                "list_price_per_unit_sum": "35016.5000",
                "list_price_percent": "28.31",
                "cm_percent": "15.68",
                "cost_total": "50151.06000000",
                "list_price_total": "210099.00000000",
                "sales_total": "59477.88000000"
            },
            {
                "customer_name_parent": "EASTERN POWER DISTRIBUTION COMPANY",
                "cost_per_unit_sum": "32173.8900",
                "price_per_unit_sum": "47036.7500",
                "list_price_per_unit_sum": "146169.4000",
                "list_price_percent": "32.18",
                "cm_percent": "31.60",
                "cost_total": "840769.23000000",
                "list_price_total": "3964631.94000000",
                "sales_total": "1793824.29000000"
            },
            {
                "customer_name_parent": "EMIRATES GLOBAL ALUMINIUM [EGA]",
                "cost_per_unit_sum": "100256.4400",
                "price_per_unit_sum": "152873.0000",
                "list_price_per_unit_sum": "289100.6000",
                "list_price_percent": "52.88",
                "cm_percent": "34.42",
                "cost_total": "4084235.48000000",
                "list_price_total": "8066477.34000000",
                "sales_total": "3866780.58000000"
            },
            {
                "customer_name_parent": "RWE GENERATION UK PLC",
                "cost_per_unit_sum": "24527.9000",
                "price_per_unit_sum": "41013.9600",
                "list_price_per_unit_sum": "70578.9500",
                "list_price_percent": "58.11",
                "cm_percent": "40.20",
                "cost_total": "49055.80000000",
                "list_price_total": "141157.90000000",
                "sales_total": "82027.92000000"
            },
            {
                "customer_name_parent": "RTA Yarwun Pty Ltd",
                "cost_per_unit_sum": "20137.3900",
                "price_per_unit_sum": "35960.9500",
                "list_price_per_unit_sum": "125526.1900",
                "list_price_percent": "28.65",
                "cm_percent": "44.00",
                "cost_total": "787673.52000000",
                "list_price_total": "5083048.80000000",
                "sales_total": "1449918.00000000"
            },
            {
                "customer_name_parent": "PETRÓLEO BRASILEIRO S/A. -",
                "cost_per_unit_sum": "45323.5300",
                "price_per_unit_sum": "89443.1200",
                "list_price_per_unit_sum": "243904.5100",
                "list_price_percent": "36.67",
                "cm_percent": "49.33",
                "cost_total": "301533.26000000",
                "list_price_total": "1324085.14000000",
                "sales_total": "415554.65000000"
            },
            {
                "customer_name_parent": "Rocksavage Power Company, Ltd.",
                "cost_per_unit_sum": "67331.7500",
                "price_per_unit_sum": "140694.0600",
                "list_price_per_unit_sum": "219134.4700",
                "list_price_percent": "64.20",
                "cm_percent": "52.14",
                "cost_total": "194315.33000000",
                "list_price_total": "658756.10000000",
                "sales_total": "449693.08000000"
            },
            {
                "customer_name_parent": "The Power Generation Company Of",
                "cost_per_unit_sum": "460.8100",
                "price_per_unit_sum": "985.2300",
                "list_price_per_unit_sum": "3129.2600",
                "list_price_percent": "31.48",
                "cm_percent": "53.23",
                "cost_total": "41933.71000000",
                "list_price_total": "284762.66000000",
                "sales_total": "89655.93000000"
            },
            {
                "customer_name_parent": "MISSISSIPPI POWER COMPANY",
                "cost_per_unit_sum": "40702.3500",
                "price_per_unit_sum": "107600.1000",
                "list_price_per_unit_sum": "206889.8500",
                "list_price_percent": "52.01",
                "cm_percent": "62.17",
                "cost_total": "1935365.70000000",
                "list_price_total": "9507406.30000000",
                "sales_total": "4430002.40000000"
            },
            {
                "customer_name_parent": "WISCONSIN POWER AND LIGHT COMPANY",
                "cost_per_unit_sum": "3978.5500",
                "price_per_unit_sum": "10704.3000",
                "list_price_per_unit_sum": "17303.2000",
                "list_price_percent": "61.86",
                "cm_percent": "62.83",
                "cost_total": "55699.70000000",
                "list_price_total": "242244.80000000",
                "sales_total": "149860.20000000"
            },
            {
                "customer_name_parent": "PJB UBP Muara Tawar",
                "cost_per_unit_sum": "2435.4200",
                "price_per_unit_sum": "6643.5200",
                "list_price_per_unit_sum": "15669.6100",
                "list_price_percent": "42.40",
                "cm_percent": "63.34",
                "cost_total": "153431.46000000",
                "list_price_total": "987185.43000000",
                "sales_total": "418541.76000000"
            }
        ],
        "nonCapitalGlobalData": [
            {
                "customer_name_parent": "GE Steam Power (Thailand) Ltd",
                "cost_per_unit_sum": "179624.3400",
                "price_per_unit_sum": "153179.1100",
                "list_price_per_unit_sum": "525839.4400",
                "list_price_percent": "29.13",
                "cm_percent": "-17.26",
                "cost_total": "394525.67000000",
                "list_price_total": "1199316.40000000",
                "sales_total": "327326.15000000"
            },
            {
                "customer_name_parent": "NORTH BATTLEFORD POWER L.P.",
                "cost_per_unit_sum": "40714.1800",
                "price_per_unit_sum": "44077.7400",
                "list_price_per_unit_sum": "133323.4500",
                "list_price_percent": "33.06",
                "cm_percent": "7.63",
                "cost_total": "47143.39000000",
                "list_price_total": "189637.31000000",
                "sales_total": "89399.42000000"
            },
            {
                "customer_name_parent": "EASTERN POWER DISTRIBUTION COMPANY",
                "cost_per_unit_sum": "164687.9200",
                "price_per_unit_sum": "184573.8400",
                "list_price_per_unit_sum": "422000.5300",
                "list_price_percent": "43.74",
                "cm_percent": "10.77",
                "cost_total": "455017.56800000",
                "list_price_total": "1406093.10000000",
                "sales_total": "666228.83800000"
            },
            {
                "customer_name_parent": "GENERAL ELECTRIC ALGERIA TURBINES",
                "cost_per_unit_sum": "29815.7300",
                "price_per_unit_sum": "35414.7100",
                "list_price_per_unit_sum": "91073.9500",
                "list_price_percent": "38.89",
                "cm_percent": "15.81",
                "cost_total": "111365.37000000",
                "list_price_total": "340996.43000000",
                "sales_total": "137197.49000000"
            },
            {
                "customer_name_parent": "TGS Finland Oy",
                "cost_per_unit_sum": "80197.3600",
                "price_per_unit_sum": "113513.9700",
                "list_price_per_unit_sum": "396186.5500",
                "list_price_percent": "28.65",
                "cm_percent": "29.35",
                "cost_total": "128094.23000000",
                "list_price_total": "650544.51000000",
                "sales_total": "185855.72000000"
            },
            {
                "customer_name_parent": "THE ISRAEL ELECTRIC CORPORATION",
                "cost_per_unit_sum": "19933.7600",
                "price_per_unit_sum": "29065.5600",
                "list_price_per_unit_sum": "80054.8300",
                "list_price_percent": "36.31",
                "cm_percent": "31.42",
                "cost_total": "32975.03000000",
                "list_price_total": "146006.78000000",
                "sales_total": "62854.00000000"
            },
            {
                "customer_name_parent": "EMIRATES GLOBAL ALUMINIUM [EGA]",
                "cost_per_unit_sum": "1007857.6600",
                "price_per_unit_sum": "1531621.7100",
                "list_price_per_unit_sum": "2094931.1500",
                "list_price_percent": "73.11",
                "cm_percent": "34.20",
                "cost_total": "3085074.02200000",
                "list_price_total": "3936279.36400000",
                "sales_total": "2945750.43300000"
            },
            {
                "customer_name_parent": "The Power Generation Company Of",
                "cost_per_unit_sum": "58254.8100",
                "price_per_unit_sum": "92934.1700",
                "list_price_per_unit_sum": "205774.8300",
                "list_price_percent": "45.16",
                "cm_percent": "37.32",
                "cost_total": "156560.49000000",
                "list_price_total": "662265.81000000",
                "sales_total": "238001.08000000"
            },
            {
                "customer_name_parent": "SAMRA ELECTRIC POWER CO (SEPCO)",
                "cost_per_unit_sum": "271809.3300",
                "price_per_unit_sum": "471929.2400",
                "list_price_per_unit_sum": "866345.3500",
                "list_price_percent": "54.47",
                "cm_percent": "42.40",
                "cost_total": "519551.61500000",
                "list_price_total": "1808322.95080000",
                "sales_total": "1003024.22720000"
            },
            {
                "customer_name_parent": "KENTUCKY UTILITIES COMPANY",
                "cost_per_unit_sum": "46992.9500",
                "price_per_unit_sum": "81708.1000",
                "list_price_per_unit_sum": "139495.0000",
                "list_price_percent": "58.57",
                "cm_percent": "42.49",
                "cost_total": "46992.95000000",
                "list_price_total": "139495.00000000",
                "sales_total": "81708.10000000"
            },
            {
                "customer_name_parent": "COLBUN S.A.",
                "cost_per_unit_sum": "15097.6100",
                "price_per_unit_sum": "26813.0600",
                "list_price_per_unit_sum": "33687.3000",
                "list_price_percent": "79.59",
                "cm_percent": "43.69",
                "cost_total": "33811.74000000",
                "list_price_total": "83577.87000000",
                "sales_total": "66182.97000000"
            },
            {
                "customer_name_parent": "SEPCO III ELECTRIC POWER",
                "cost_per_unit_sum": "22405.3400",
                "price_per_unit_sum": "41340.0800",
                "list_price_per_unit_sum": "82545.2300",
                "list_price_percent": "50.08",
                "cm_percent": "45.80",
                "cost_total": "37570.47000000",
                "list_price_total": "161525.19800000",
                "sales_total": "87087.18600000"
            },
            {
                "customer_name_parent": "PJB UBP Muara Tawar",
                "cost_per_unit_sum": "3007.2600",
                "price_per_unit_sum": "5550.4800",
                "list_price_per_unit_sum": "9055.5800",
                "list_price_percent": "61.29",
                "cm_percent": "45.82",
                "cost_total": "66208.47000000",
                "list_price_total": "240165.92000000",
                "sales_total": "166163.27000000"
            },
            {
                "customer_name_parent": "BERKSHIRE POWER COMPANY LLC",
                "cost_per_unit_sum": "205419.7000",
                "price_per_unit_sum": "384477.5500",
                "list_price_per_unit_sum": "673019.4000",
                "list_price_percent": "57.13",
                "cm_percent": "46.57",
                "cost_total": "205419.70000000",
                "list_price_total": "673019.40000000",
                "sales_total": "384477.55000000"
            },
            {
                "customer_name_parent": "Qatar Electricity & Water Co.",
                "cost_per_unit_sum": "77997.4100",
                "price_per_unit_sum": "146931.3700",
                "list_price_per_unit_sum": "248688.1600",
                "list_price_percent": "59.08",
                "cm_percent": "46.92",
                "cost_total": "261856.42000000",
                "list_price_total": "938413.11000000",
                "sales_total": "601287.28000000"
            },
            {
                "customer_name_parent": "FIRST NATIONAL COMPANY FOR",
                "cost_per_unit_sum": "71681.0600",
                "price_per_unit_sum": "135198.9300",
                "list_price_per_unit_sum": "213256.6900",
                "list_price_percent": "63.40",
                "cm_percent": "46.98",
                "cost_total": "76344.96000000",
                "list_price_total": "234286.84000000",
                "sales_total": "148550.59000000"
            },
            {
                "customer_name_parent": "South Houston Green Power LP",
                "cost_per_unit_sum": "7333.1500",
                "price_per_unit_sum": "14015.8000",
                "list_price_per_unit_sum": "24354.5000",
                "list_price_percent": "57.55",
                "cm_percent": "47.68",
                "cost_total": "28454.05000000",
                "list_price_total": "94564.85000000",
                "sales_total": "54310.00000000"
            },
            {
                "customer_name_parent": "HAYS ENERGY LIMITED PARTNERSHIP",
                "cost_per_unit_sum": "11054.7500",
                "price_per_unit_sum": "21341.7500",
                "list_price_per_unit_sum": "33776.7000",
                "list_price_percent": "63.18",
                "cm_percent": "48.20",
                "cost_total": "29638.90000000",
                "list_price_total": "185888.35000000",
                "sales_total": "145629.30000000"
            },
            {
                "customer_name_parent": "Enel Generacion Piura S.A,",
                "cost_per_unit_sum": "62584.1300",
                "price_per_unit_sum": "122675.9000",
                "list_price_per_unit_sum": "257641.4200",
                "list_price_percent": "47.61",
                "cm_percent": "48.98",
                "cost_total": "139820.38200000",
                "list_price_total": "594496.45600000",
                "sales_total": "310115.53600000"
            },
            {
                "customer_name_parent": "TERMOELÉCTRICA DE MEXICALI, S DE",
                "cost_per_unit_sum": "108335.3100",
                "price_per_unit_sum": "218066.2900",
                "list_price_per_unit_sum": "422144.9000",
                "list_price_percent": "51.66",
                "cm_percent": "50.32",
                "cost_total": "135196.06750000",
                "list_price_total": "582643.53210000",
                "sales_total": "286416.38500000"
            },
            {
                "customer_name_parent": "LAKE ROAD GENERATING COMPANY, L.P.",
                "cost_per_unit_sum": "588688.6500",
                "price_per_unit_sum": "1200686.1500",
                "list_price_per_unit_sum": "1956349.9000",
                "list_price_percent": "61.37",
                "cm_percent": "50.97",
                "cost_total": "841534.93000000",
                "list_price_total": "2767104.14000000",
                "sales_total": "1742449.59000000"
            },
            {
                "customer_name_parent": "TNB REPAIR & MAINTENANCE SDNBHD",
                "cost_per_unit_sum": "72595.0300",
                "price_per_unit_sum": "151258.9100",
                "list_price_per_unit_sum": "234771.8700",
                "list_price_percent": "64.43",
                "cm_percent": "52.01",
                "cost_total": "82885.07000000",
                "list_price_total": "265440.86000000",
                "sales_total": "175693.03000000"
            },
            {
                "customer_name_parent": "HIDD POWER CO. B.S.C.",
                "cost_per_unit_sum": "592277.9000",
                "price_per_unit_sum": "1248487.9500",
                "list_price_per_unit_sum": "2283628.9500",
                "list_price_percent": "54.67",
                "cm_percent": "52.56",
                "cost_total": "910342.84000000",
                "list_price_total": "3576442.12000000",
                "sales_total": "1913481.62000000"
            }
        ],
        "capitalRegionalData": [],
        "nonCapitalRegionalData": []
    },
    "customerNameParent": "TOSHIBA ENERGY SYSTEMS & SOLUTIONS CORPORATION"
};
                            if (dealGuidanceCustomerHistoricalComparisonJsonStr) {
                                let parsedData = dealGuidanceCustomerHistoricalComparisonJsonStr;
                                this.customerNameParent = parsedData.customerNameParent;
                                this.totalData = parsedData.customerHistoricalComparisonTotalData;
                                let { capitalGlobalData, nonCapitalGlobalData, capitalRegionalData, nonCapitalRegionalData } = parsedData.customerHistoricalComparisonTotalData;
                                capitalGlobalData = this.removeCustomers(capitalGlobalData);
                                nonCapitalGlobalData = this.removeCustomers(nonCapitalGlobalData);
                                this.processData(capitalGlobalData, nonCapitalGlobalData);
                                this.isLoading = false;
                            }
                        }, 100);
                        callGetDealGuidanceCustomerHistoricalComparison = false;
                    }
                

                // let postBody = '{ "criteria" : {' +
                // '"fields": ["dealGuidanceCustomerHistoricalComparisonJson_quote"]' +
                // '}}';
                // if(selectedOptions) {
                //     let selectedOptionsStr = (JSON.stringify(selectedOptions)).replaceAll('"', '\\"');
                //     postBody = '{ "criteria" : {' +
                //         '"fields": ["dealGuidanceCustomerHistoricalComparisonJson_quote"]' +
                //         '},' +
                //         '"documents": {"dealGuidanceSelectedPartNumbers_quote":"' + selectedOptionsStr + '"}}';

                // }
                // let restAPIUrl = "https://newtempge.bigmachines.com/" + "/rest/v8/commerceDocumentsQuotes_process_bmClone_16Quote_process";
                // axios(
                //     {
                //         method: "POST",
                //         data: postBody,
                //         url: restAPIUrl + "/" + "452168044" + "/actions/getDealGuidanceCustomerHistoricalComparison",
                //         headers: { 'Content-Type': 'application/json' }
                //     }).then(response => {
                //         if (response.status === 200) {
                //             let dealGuidanceCustomerHistoricalComparisonJson = response.data.documents.dealGuidanceCustomerHistoricalComparisonJson_quote;
                //             let parsedData = JSON.parse(dealGuidanceCustomerHistoricalComparisonJson)
                //             instance.customerNameParent = parsedData.customerNameParent;
                //             this.totalData = parsedData.customerHistoricalComparisonTotalData;
                //             let { capitalGlobalData, nonCapitalGlobalData, capitalRegionalData, nonCapitalRegionalData } = parsedData.customerHistoricalComparisonTotalData;

                //             // Remove specific customers from the data.
                //             capitalGlobalData = this.removeCustomers(capitalGlobalData);
                //             nonCapitalGlobalData = this.removeCustomers(nonCapitalGlobalData);
                //             this.processData(capitalGlobalData, nonCapitalGlobalData);
                //         }
                //         this.isLoading = false;
                //     }).catch(err => {
                //         this.isLoading = false;
                //         console.log("dealGuidanceCustomerHistoricalComparisonJson err- ", err);
                //     });
            } catch (error) {
                this.isLoading = false;
                console.log(error);
            }
        },
        removeCustomers(customerList) {
            let finalCustomerList = [];
            _.each(customerList, function (row) {
                if (row.customer_name_parent != null && !row.customer_name_parent.startsWith("GE ") && row.customer_name_parent != "GE"
                    && !row.customer_name_parent.startsWith("GENERAL ELECTRIC ")) {
                    finalCustomerList.push(row);
                }
            });
            return finalCustomerList;
        },
        applyFilters() {
            let selectedOptions = {};
            if (this.selectedTechnology==null || !this.selectedTechnology.startsWith("All"))  {
                selectedOptions["technology"] = this.selectedTechnology;
            }
            switch (this.selectedTimeframe) {
                case 'Last 12 Months':
                    dgtCustomerHistoricalAverageSalesMonths = 12;
                    break;
                case 'Last 24 Months':
                    dgtCustomerHistoricalAverageSalesMonths = 24;
                    break;
                case 'Last 36 Months':
                    dgtCustomerHistoricalAverageSalesMonths = 36;
                    break;
                case 'Last 48 Months':
                    dgtCustomerHistoricalAverageSalesMonths = 48;
                    break;
            }
            selectedOptions["timeframe"] = dgtCustomerHistoricalAverageSalesMonths;
            if (this.selectedRegion != "GLOBAL") {
                selectedOptions["region"] = this.selectedRegion;
            }

            if (this.selectedTechnology != "All Technologies") {
                selectedOptions["technology"] = this.selectedTechnology;
            }
            this.getDealGuidanceCustomerHistoricalComparisonData([selectedOptions]);
        },
        processData(capitalData, nonCapitalData) {
            try {
                this.calculatePercentileAndNormalize(capitalData, "capitalData");
                this.calculatePercentileAndNormalize(nonCapitalData, "nonCapitalData");
                this.setUpCharts(this.capitalData, "customerHistoricalComparisonOptionsCapital", "Capital Parts");
                this.addCurrentCustomerToSeries("customerHistoricalComparisonOptionsCapital");
                this.setUpCharts(this.nonCapitalData, "customerHistoricalComparisonOptionsNonCapital", "Non-Capital Parts");
                this.addCurrentCustomerToSeries("customerHistoricalComparisonOptionsNonCapital");
            } catch (error) {
                console.log(error);
            }
        },
        getRegions(data) {
            try {
                let regionsArr = [];
                _.each(data, ({ region }) => {
                    if (!regionsArr.includes(region)) {
                        regionsArr.push(region);
                    }
                    this.regions = ["GLOBAL", ...regionsArr];
                    //sthis.selectedRegion = "GLOBAL";
                });
            } catch (error) {
                console.log(error);
            }
        }
    },
    beforeMount() {
        this.getDealGuidanceCustomerHistoricalComparisonData();
    },
    // watch: {
    //     customerHistoricalComparisonComponentKey: {
    //         handler() {
    //             this.getDealGuidanceCustomerHistoricalComparisonData();
    //         },
    //     },
    // }

})


// the following is needed to execute a function via the tooltip generation
var dgtCustomerHistoricalAverageSalesMonths = 36;
function dgtCustomerHistoricalAverageSales(totalSales) {
    let totalSalesByYear = totalSales;
    if (totalSales != null && totalSales != 0) {
        totalSalesByYear = (totalSales / (dgtCustomerHistoricalAverageSalesMonths / 12));
    }
    return totalSalesByYear;
}

</script>

<style >
    .gepChartCustomerHistoricalComparison {
        margin-top: 10px;
        padding: 5px;
        border-style: solid;
        border-width: 1px;
        border-color: #bdc3c7;
        background-color: #c3bebe;
        max-width: 765px;
    }
</style>
