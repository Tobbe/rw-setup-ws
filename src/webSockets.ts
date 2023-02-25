const description = 'Set up WebSockets'
const builder = (yargs) => {
  yargs.option('force', {
    alias: 'f',
    default: false,
    description: 'Overwrite existing configuration',
    type: 'boolean',
  })
}
const handler = async (options) => {
  const { handler } = await import('./webSocketsHandler')
  return handler(options)
}

require('yargs')
  .scriptName("rw-setup-ws")
  .command('$0', description, builder, handler)
  .help()
  .argv
