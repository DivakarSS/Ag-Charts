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
                "customer_name_parent": "DIVAKAR",
                "cost_per_unit_sum": "9345.3256",
                "price_per_unit_sum": "8903.9834",
                "list_price_per_unit_sum": "5394.3333",
                "list_price_percent": "22.35",
                "cm_percent": "12.89",
                "cost_total": "50321.06000000",
                "list_price_total": "67384.00000000",
                "sales_total": "98345.88000000"
            },
            {
                "customer_name_parent": "YASHWANTH",
                "cost_per_unit_sum": "98432.8900",
                "price_per_unit_sum": "43945.7500",
                "list_price_per_unit_sum": "104256.4000",
                "list_price_percent": "22.18",
                "cm_percent": "21.60",
                "cost_total": "8982323.23000000",
                "list_price_total": "3245672.94000000",
                "sales_total": "2347182.29000000"
            },
            {
                "customer_name_parent": "JACK",
                "cost_per_unit_sum": "100234.4400",
                "price_per_unit_sum": "152783.0000",
                "list_price_per_unit_sum": "289111.6000",
                "list_price_percent": "42.88",
                "cm_percent": "44.42",
                "cost_total": "493456.48000000",
                "list_price_total": "8067674.34000000",
                "sales_total": "3821673.58000000"
            },
            {
                "customer_name_parent": "John",
                "cost_per_unit_sum": "24879.9000",
                "price_per_unit_sum": "40219.9600",
                "list_price_per_unit_sum": "70457.9500",
                "list_price_percent": "38.11",
                "cm_percent": "30.20",
                "cost_total": "49198.80000000",
                "list_price_total": "143457.90000000",
                "sales_total": "82093.92000000"
            }
        ],
        "nonCapitalGlobalData": [
            {
                "customer_name_parent": "JAMES",
                "cost_per_unit_sum": "179345.3400",
                "price_per_unit_sum": "145321.1100",
                "list_price_per_unit_sum": "523458.4400",
                "list_price_percent": "39.13",
                "cm_percent": "-27.26",
                "cost_total": "395545.67000000",
                "list_price_total": "1193456.40000000",
                "sales_total": "327654.15000000"
            },
            {
                "customer_name_parent": "ROBERT",
                "cost_per_unit_sum": "41722.1800",
                "price_per_unit_sum": "47044.7400",
                "list_price_per_unit_sum": "133323.4500",
                "list_price_percent": "23.06",
                "cm_percent": "17.63",
                "cost_total": "48243.39000000",
                "list_price_total": "189737.31000000",
                "sales_total": "84499.42000000"
            },
            {
                "customer_name_parent": "TONY",
                "cost_per_unit_sum": "164324.9200",
                "price_per_unit_sum": "184573.8400",
                "list_price_per_unit_sum": "422900.5300",
                "list_price_percent": "33.74",
                "cm_percent": "11.77",
                "cost_total": "455017.56800000",
                "list_price_total": "1407094.10000000",
                "sales_total": "777668.83800000"
            },
            {
                "customer_name_parent": "STEVE",
                "cost_per_unit_sum": "28915.7300",
                "price_per_unit_sum": "45341.7100",
                "list_price_per_unit_sum": "91183.9500",
                "list_price_percent": "48.89",
                "cm_percent": "25.81",
                "cost_total": "111333.37000000",
                "list_price_total": "340889.43000000",
                "sales_total": "137187.49000000"
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
