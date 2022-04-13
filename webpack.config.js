const webpack = require('webpack');
const { resolve } = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserWebpackPlugin = require('terser-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';

const common = {
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    fallback: {
      "stream": require.resolve("stream-browserify"),
      "path": require.resolve("path-browserify"),
      "fs": require.resolve("browserify-fs"),
      "crypto": require.resolve("crypto-browserify")
    },
  }
}

const config = {
  ...common,
  mode: isProd ? 'production' : 'development',
  entry: {
    index: './src/index.tsx',
  },
  output: {
    path: resolve(__dirname, 'dist'),
    filename: '[name].js',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
      test: /\.scss$/,
      use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader'
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            }
          },
        ]
      },{
        test: /\.tsx?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader',
        ],
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].bundle.css'
    }),
    new HtmlWebpackPlugin({
      title: 'Eth2 BLS Keygen | ChainSafe Systems',
      template: 'src/index.html',
    }),
  ],
};

const workerConfig = {
  ...common,
  name: "worker",
  entry: {
    index: './src/components/KeyGen/worker/index.ts',
  },
  output: {
    path: resolve(__dirname, 'dist'),
    filename: 'worker.js',
  },
  module: {
    rules: [
      {
        test: /worker?$/,
        loader: 'threads-webpack-plugin',
      },
      {
        test: /\.ts?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      }
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ]
}

if (isProd) {
  config.optimization = {
    minimizer: [
      new TerserWebpackPlugin(),
    ],
  };
} else {
  config.devServer = {
    port: 8080, // https://webpack.js.org/configuration/dev-server/#devserverport
    open: true, // https://webpack.js.org/configuration/dev-server/#devserveropen
    hot: true, // https://webpack.js.org/configuration/dev-server/#devserverhot
    compress: true, // https://webpack.js.org/configuration/dev-server/#devservercompress
    stats: 'errors-only', // https://webpack.js.org/configuration/dev-server/#devserverstats-
    overlay: true, // https://webpack.js.org/configuration/dev-server/#devserveroverlay
  };
}

module.exports = [config, workerConfig];