const { defineConfig } = require('@vue/cli-service')
const { BootstrapVueNextResolver } = require('unplugin-vue-components/resolvers')
const path = require('path');

module.exports = defineConfig({
    transpileDependencies: true,
    // pluginOptions: {
    //     vuetify: {
    //         // https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vuetify-loader
    //     }
    // },

    configureWebpack: {
        resolve: {
            symlinks: false,
            alias: {
                vue$: path.resolve(__dirname, 'node_modules/vue/dist/vue.esm-bundler.js'),
            }
        },
        plugins: [
            require('unplugin-vue-components/webpack')({ resolvers: [BootstrapVueNextResolver()] }),
        ],
    }
});
