/*
 * Helpers
 */
const sliceArgs = Function.prototype.call.bind(Array.prototype.slice);
const toString = Function.prototype.call.bind(Object.prototype.toString);
const NODE_ENV = process.env.NODE_ENV || 'production';
const pkg = require('./package.json');

// Node
const path = require('path');

// NPM
const webpack = require('webpack');

// Webpack Plugins
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const DefinePlugin = webpack.DefinePlugin;
const MergeJsonWebpackPlugin = require("merge-jsons-webpack-plugin");
const AngularCompilerPlugin = require('@ngtools/webpack').AngularCompilerPlugin

/**
 * CROSS-BROWSER COMPATIBILITY (and other builds)
 * We use different build configurations depending on browser (or other builds, like canary).
 * For example, browsers have different support for properties on manifest.json
 */

// versions we produce
const BUILD = {
  FIREFOX: 'FIREFOX',
  CHROME: 'CHROME',
  CANARY: 'CANARY',
}

// browser/build-specific manifest file created during build.
// `merge-jsons-webpack-plugin` needs relative paths from the build folder.
const MANIFEST_OUTPUT = `../manifest.json`

// manifest.json properties shared by all builds
const BASE_MANIFEST = `manifest/base.manifest.json`

// target BUILD parameter is case insensitive (default chrome)
const interpretTargetBuild = (requested = '') => {
  return Object.keys(BUILD)
    .find(build => build == requested.toUpperCase())
    || BUILD.CHROME
}

// each build can extend the base manifest with a file of this form
const getManifestExtension = (targetBuild) =>
  `manifest/${targetBuild.toLowerCase()}.manifest.json`

// grab target build parameter (passed as command arg)
const targetBuild = interpretTargetBuild(process.env.BUILD)

// grab manifest extension
const manifestExtension = getManifestExtension(targetBuild)

/*
 * Config
 */
module.exports = {
  devtool: 'source-map',
  mode: NODE_ENV,
  cache: true,
  context: __dirname,
  stats: {
    colors: true,
    reasons: true
  },

  entry: {
    'frontend': [
      './webpack.vendor',
      './src/frontend/module'
    ],
    'backend': ['./src/backend/backend'],
    'ng-validate': ['./src/utils/ng-validate'],
    'devtools': ['./src/devtools/devtools'],
    'content-script': ['./src/content-script'],
    'background': [
      './src/channel/channel',
      './src/sentry-connection/sentry-connection',
      './src/gtm-connection/gtm-connection'
    ]
  },

  // Config for our build files
  output: {
    path: root('build'),
    filename: '[name].js',
    sourceMapFilename: '[name].js.map',
    chunkFilename: '[id].chunk.js'
  },

  resolve: {
    extensions: ['.ts', '.js', '.json']
  },

  // Opt-in to the old behavior with the resolveLoader.moduleExtensions
  // - https://webpack.js.org/guides/migrating/#automatic-loader-module-name-extension-removed
  resolveLoader: {
    moduleExtensions: ['-loader']
  },

  module: {
    rules: [
      {
        test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
        use: '@ngtools/webpack',
      },
      {
        test: /\.css$/,
        use: [
          'to-string-loader',
          'css-loader',
          'postcss-loader',
        ],
      },
      {
        test: /\.png$/,
        use: 'url-loader?mimetype=image/png',
      },
      {
        test: /\.html$/,
        use: 'raw-loader',
      },
    ],

    noParse: [
      /rtts_assert\/src\/rtts_assert/,
      /reflect-metadata/,
      /.+zone\.js\/dist\/.+/,
      /.+angular2\/bundles\/.+/,
    ],
  },

  plugins: [
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
      'PRODUCTION': JSON.stringify(process.env.NODE_ENV !== 'development'),
      'VERSION': JSON.stringify(pkg.version),
      'SENTRY_KEY': JSON.stringify(process.env.SENTRY_KEY),
    }),
    new AngularCompilerPlugin({
      tsConfigPath: 'tsconfig.json',
      entryModule: './src/frontend/module#FrontendModule',
      sourceMap: true,
    }),
    new MergeJsonWebpackPlugin({
      "files": [
        BASE_MANIFEST,
        manifestExtension,
      ],
      "output": {
        "fileName": MANIFEST_OUTPUT,
      },
    }),
  ].concat((NODE_ENV == 'production') ?  [
    new UglifyJsPlugin({
      sourceMap: true
    }),
  ] : [
    // ... dev-only plugins
  ]),

  /*
   * When using `templateUrl` and `styleUrls` please use `__filename`
   * rather than `module.id` for `moduleId` in `@View`
   */
  node: {
    crypto: false,
    __filename: true,
  },
};

/**
 * Utils
 */
function env(configEnv) {
  if (configEnv === undefined) {
    return configEnv;
  }
  switch (toString(configEnv[NODE_ENV])) {
    case '[object Object]'    :
      return Object.assign({}, configEnv.all || {}, configEnv[NODE_ENV]);
    case '[object Array]'     :
      return [].concat(configEnv.all || [], configEnv[NODE_ENV]);
    case '[object Undefined]' :
      return configEnv.all;
    default                   :
      return configEnv[NODE_ENV];
  }
}

function root(args) {
  args = sliceArgs(arguments, 0);
  return path.join.apply(path, [__dirname].concat(args));
}
