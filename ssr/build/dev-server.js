const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const MFS = require('memory-fs');
const clientConfig = require('./webpack.client.config');
const serverConfig = require('./webpack.server.config');
const { createBundleRenderer } = require('vue-server-renderer');
const proxy = require('http-proxy-middleware');
const resolve = file => path.resolve(__dirname, file);
const config = require('../config');
const Express = require('express');

const readFile = (fs, file) => {
  try {
    return fs.readFileSync(path.join(clientConfig.output.path, file), 'utf-8')
  } catch (e) {}
}

function setupDevServer (app, cb) {
  let bundle, clientManifest
  let resolve
  const readyPromise = new Promise(r => { resolve = r })
  const ready = (...args) => {
    resolve()
    cb(...args)
  }

  // modify client config to work with hot middleware
  clientConfig.entry.app = ['webpack-hot-middleware/client', clientConfig.entry.app]
  clientConfig.output.filename = '[name].js'
  clientConfig.plugins.push(
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin()
  )

  // dev middleware
  const clientCompiler = webpack(clientConfig)
  const devMiddleware = require('webpack-dev-middleware')(clientCompiler, {
    publicPath: clientConfig.output.publicPath,
    noInfo: true
  })
  app.use(devMiddleware)
  clientCompiler.plugin('done', stats => {
    stats = stats.toJson()
    stats.errors.forEach(err => console.error(err))
    stats.warnings.forEach(err => console.warn(err))
    if (stats.errors.length) return

    clientManifest = JSON.parse(readFile(
      devMiddleware.fileSystem,
      'vue-ssr-client-manifest.json'
    ))
    if (bundle) {
      ready(bundle, {
        clientManifest
      })
    }
  })

  // hot middleware
  app.use(require('webpack-hot-middleware')(clientCompiler, { heartbeat: 5000 }))

  // watch and update server renderer
  const serverCompiler = webpack(serverConfig)
  const mfs = new MFS()
  serverCompiler.outputFileSystem = mfs
  serverCompiler.watch({}, (err, stats) => {
    if (err) throw err
    stats = stats.toJson()
    if (stats.errors.length) return

    // read bundle generated by vue-ssr-webpack-plugin
    bundle = JSON.parse(readFile(mfs, 'vue-ssr-server-bundle.json'))
    if (clientManifest) {
      ready(bundle, {
        clientManifest
      })
    }
  })

  return readyPromise
}

//dev server
const devServer = Express();
const serverBundle = require('../dist/vue-ssr-server-bundle.json');
const clientManifest = require('../dist/vue-ssr-client-manifest.json');
const template = fs.readFileSync('./src/index.template.html', 'utf-8');

function createRenderer(bundle, options) {
  return createBundleRenderer(bundle, Object.assign(options, {
    template, 
    basedir: resolve('../dist'),
    runInNewContext: false
  }))
}

let renderer;
let readyPromise = setupDevServer(devServer, (bundle, options) => {
  renderer = createRenderer(bundle, options)
})

const serve = (path, cache) => Express.static(resolve(path), {
  maxAge: cache //&& isProd ? 1000 * 60 * 60 * 24 * 30 : 0
})
devServer.use('/dist', serve('../dist', true));
devServer.use('/api', proxy(config.PROXY_OPTIONS));

devServer.get('*', (req, res) => {
  readyPromise.then(() => {
    const context = {
      title: 'yeahz博客',
      url: req.url
    }
    renderer.renderToString(context, (err, html) => {
      if(err) {
        res.status(500).end('Internal server error');
        console.log(err);
        return;
      }
      res.end(html);
    })
  })
})

devServer.listen(65432, () => {
  console.log('dev server started on ' + 65432);
})