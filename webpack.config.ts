import { Configuration } from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";

const config: Configuration = {
  devtool: 'cheap-eval-source-map',
  entry: './src/index.tsx',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?/,
        loader: 'ts-loader',
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
    new HtmlWebpackPlugin(),
  ],
  resolve: {
    extensions: [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
    ],
  },
};
export = config;
