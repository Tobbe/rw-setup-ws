import fs from 'fs'
import path from 'path'

import chalk from 'chalk'
import execa from 'execa'
import { Listr } from 'listr2'

import { colors, getPaths, writeFile } from '@redwoodjs/cli-helpers'

interface ErrorWithExitCode extends Error {
  exitCode?: number
}

function isErrorWithExitCode(e: unknown): e is ErrorWithExitCode {
  return typeof (e as ErrorWithExitCode)?.exitCode !== 'undefined'
}

const addWsContextComponent = (appTsx: string) => {
  var content = appTsx.split('\n')
  const index = content.findIndex((value) => /<Routes .*\/>/.test(value))
  const routesLine = content[index]
  if (!routesLine) {
    throw new Error('Could not find "<Routes />"')
  }

  const routesIndent = routesLine.match(/^\s*/)?.[0].length
  if (typeof routesIndent === 'undefined') {
    throw new Error('Could not find <Routes /> indentation')
  }
  
  const indent = ' '.repeat(routesIndent)

  content.splice(
    index,
    1,
    indent + '<WsContextProvider>',
    "  " + routesLine,
    indent + '</WsContextProvider>'
  )

  return content.join(`\n`)
}

const wsContextPath = () => {
  const wsContextPath = path.join(
    getPaths().web.components,
    'WsContext',
    'WsContext.tsx'
  )
  return wsContextPath
}

const wsContextExists = () => {
  // TODO: js support
  return fs.existsSync(wsContextPath())
}

export const handler = async ({ force }: { force: boolean }) => {
  const tasks = new Listr(
    [
      {
        title: 'Installing packages...',
        task: () => {
          return new Listr(
            [
              {
                title: 'Install @fastify/websocket',
                task: () => {
                  execa.commandSync(
                    'yarn workspace api add @fastify/websocket',
                    process.env['RWJS_CWD']
                      ? {
                          cwd: process.env['RWJS_CWD'],
                        }
                      : {}
                  )
                },
              },
            ],
            { rendererOptions: { collapse: false } }
          )
        },
      },
      {
        title: 'Configure Fastify...',
        task: () => {
          /**
           * Update api/server.config.js
           *  - Add the ws plugin
           *  - Add /ws websocket route handler
           * If existing config is detected an error will be thrown
           */

          const configPath = path.join(getPaths().api.base, 'server.config.js')
          const serverConfigJs = fs.readFileSync(configPath, 'utf-8')

          if (!force && serverConfigJs.includes('@fastify/websocket')) {
            throw new Error(
              '@fastify/websocket config already exists.\n' +
                'Use --force to override existing config.'
            )
          }

          const defaultServerConfigJs = fs.readFileSync(
            path.resolve(
              __dirname,
              '..',
              'templates',
              'server.config.js.default'
            ),
            'utf-8'
          )

          if (!force && serverConfigJs !== defaultServerConfigJs) {
            throw new Error(
              'It looks like you have modified the Fastify configuration.\n' +
                'Use --force to override existing config.'
            )
          }

          const newServerConfigJs = fs.readFileSync(
            path.resolve(
              __dirname,
              '..',
              'templates',
              'server.config.js.template'
            ),
            'utf-8'
          )

          return writeFile(
            path.join(getPaths().api.base, 'server.config.js'),
            newServerConfigJs,
            { existingFiles: 'OVERWRITE' }
          )
        },
      },
      {
        title: 'Adding WebSocket Context...',
        task: () => {
          /**
           * Create web/src/components/WsContext/WsContext.tsx
           * Throw an error if it already exists
           *
           * Add <WsContext> to App.tsx
           */

          if (!force && wsContextExists()) {
            throw new Error(
              'WsContext already exists.\nUse --force to override existing config.'
            )
          }

          const wsContextTemplatePath = path.resolve(
            __dirname,
            '..',
            'templates',
            'WsContext.tsx.template'
          )
          writeFile(
            wsContextPath(),
            // TODO: ts-to-js if needed
            fs.readFileSync(wsContextTemplatePath, 'utf-8'),
            { existingFiles: 'OVERWRITE' }
          )

          const appTsxPath = getPaths().web.app
          const appTsx = fs.readFileSync(appTsxPath, 'utf-8')
          const newAppTsx = addWsContextComponent(appTsx).replace(
            "import Routes from 'src/Routes'",
            "import Routes from 'src/Routes'\n\nimport WsContextProvider from './components/WsContext/WsContext'"
          )
          fs.writeFileSync(appTsxPath, newAppTsx)
        },
      },
      {
        title: 'One more thing...',
        task: (_ctx, task) => {
          task.title = `One more thing...\n
          ${colors.green('Read more about WebSockets in Redwood:')}\n
          ${chalk.hex('#e8e8e8')(
            'https://community.redwoodjs.com/t/experiment-websockets-with-redwoodjs/4648'
          )}
        `
        },
      },
    ],
    { rendererOptions: { collapse: false } }
  )

  try {
    await tasks.run()
  } catch (e) {
    if (e instanceof Error) {
      console.error(colors.error(e.message))
    } else {
      console.error(colors.error('Unknown error when running yargs tasks'))
    }

    if (isErrorWithExitCode(e)) {
      process.exit(e.exitCode)
    }

    process.exit(1)
  }
}
