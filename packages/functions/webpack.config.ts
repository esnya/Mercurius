import { Configuration } from "webpack";
import webpackNodeExternals from "webpack-node-externals";

const config: Configuration = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'node',
  entry: ['source-map-support/register', './src/index.ts'],
  output: {
    filename: 'index.js',
    libraryTarget: 'commonjs2',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
    ],
  },
  externals: [
    webpackNodeExternals({
      whitelist: [/mercurius-core/],
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
export default config;
