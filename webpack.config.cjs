const path = require('path');
const webpack = require('webpack');  

module.exports = {
  target: 'node',
  mode: 'development',
  entry: './out/index.js',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ["babel-loader"],
        resolve: {
    		fullySpecified: false,
		},
      },
    ],
  },
  devServer: {
  	publicPath : '/dist'
    },
  resolve: {
    extensions: [ '.js' ],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    minimize: false
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    }),
  ]
};