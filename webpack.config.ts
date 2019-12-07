import { Configuration, Plugin } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import WorkboxPlugin from 'workbox-webpack-plugin';
import firebaseInitMiddleware from './src/build/firebaseInitMiddleware';
import e from 'express';
import FaviconsWebpackPlugin from 'favicons-webpack-plugin';

function isPlugin(plugin: Plugin | null): plugin is Plugin {
  return plugin !== null;
}

async function devServerBefore(): Promise<
  ((app: e.Application) => void) | undefined
> {
  try {
    const initMiddleware = await firebaseInitMiddleware();
    return (app: e.Application) => {
      app.use(initMiddleware);
    };
  } catch {
    return;
  }
}

export default async function config(): Promise<Configuration> {
  const production = process.env.NODE_ENV === 'production';
  return {
    devServer: {
      host: '0.0.0.0',
      historyApiFallback: true,
      before: await devServerBefore(),
    },
    output: {
      publicPath: '/',
    },
    devtool: 'cheap-eval-source-map',
    entry: './src/index.ts',
    mode: production ? 'production' : 'development',
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
        template: './src/views/template.html',
      }),
      production ? new WorkboxPlugin.GenerateSW({}) : null,
      new FaviconsWebpackPlugin({
        logo: './src/assets/icon.png',
        favicons: {
          lang: 'ja-JP',
          // eslint-disable-next-line @typescript-eslint/camelcase
          theme_color: '#1976d2',
          orientation: 'portrait',
        },
      }),
    ].filter<Plugin>(isPlugin),
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
  };
}
