import { Configuration } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import WorkboxPlugin from 'workbox-webpack-plugin';
import firebaseInitMiddleware from './src/build/firebaseInitMiddleware'

export default async function config(): Promise<Configuration> {
  const initMiddleware = await firebaseInitMiddleware();
  return {
    devServer: {
      host: '0.0.0.0',
      historyApiFallback: true,
      before: (app) => {
        app.use(initMiddleware);
      },
    },
    devtool: 'cheap-eval-source-map',
    entry: './src/index.tsx',
    mode: 'development',
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.[tj]sx?$/,
          loader: 'eslint-loader',
          options: {
            fix: true,
          },
        },
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
          test: /\.(ttf|woff2?|eot|png|svg|mp3|wav)$/,
          loaders: ['file-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        title: 'Mercurius',
      }),
      new WorkboxPlugin.GenerateSW({}),
    ],
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
  };
}
