const path = require('path');

// Separate "client portal" build (G3). This config is read ONLY by craco
// invocations — i.e. the `build:client` script. The default `start`/`build`/
// `test` stay on react-scripts and are completely unaffected.
//
// When REACT_APP_TARGET=client, swap the webpack entry to client-index.js and
// the HTML template to public/client.html, so the produced bundle contains ONLY
// the funder app — none of the internal TTA/CSR page code is reachable, so none
// of it ships to an external client.
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      if (process.env.REACT_APP_TARGET !== 'client') return webpackConfig;

      webpackConfig.entry = path.resolve(__dirname, 'src/client-index.js');

      const htmlPlugin = webpackConfig.plugins.find(
        (p) => p.constructor && p.constructor.name === 'HtmlWebpackPlugin'
      );
      if (htmlPlugin && htmlPlugin.options) {
        htmlPlugin.options.template = path.resolve(__dirname, 'public/client.html');
      }

      return webpackConfig;
    },
  },
};
