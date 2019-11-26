import { Configuration } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import WorkboxPlugin from 'workbox-webpack-plugin';

const config: Configuration = {
  devServer: {
    host: '0.0.0.0',
    historyApiFallback: true,
  },
  devtool: 'cheap-eval-source-map',
  entry: './src/index.tsx',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?/,
        loaders: ['ts-loader', 'eslint-loader'],
      },
      {
        test: /\.css?/,
        loaders: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ya?ml$/,
        loaders: ['js-yaml-loader'],
      },
      {
        test: /\.(ttf|woff2?|eot|png|svg)$/,
        loaders: ['file-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Rom Trading',
    }),
    new WorkboxPlugin.GenerateSW({}),
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
};
export default config;
