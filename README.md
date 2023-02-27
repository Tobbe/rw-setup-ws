rw-setup-ws
===========

Command for setting up WebSocket support in a RedwoodJS project

Usage
-----

```
npx -y rw-setup-ws
```

Run the command above inside your RW project and it'll configure your Fastify (dev) server and add a React Context to the web side you can use to communicate over a WebSocket.
To actually send something you'll need to use the `sendMessage` method on that context.

Here's a very basic example page you can use to get started. Run `yarn rw g page WebSocket` and then paste the code below in the generated page.

```
import { useState } from 'react'

import { useWsContext } from 'src/components/WsContext/WsContext'

const WebSocketPage = () => {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const ws = useWsContext()

  return (
    <>
      <label>
        Name:{' '}
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
      </label>
      <br />
      <br />
      <label>
        Score:{' '}
        <input
          value={message}
          onChange={(event) => {
            const message = event.target.value

            // Set the message in component state to make the input
            // value update immediately
            setMessage(message)

            // Send to the server to update all clients (including
            // this one)
            ws.sendMessage(name, message)
          }}
        />
      </label>
      <hr />
      <ul>
        {Object.entries(ws.clients).map(([clientId, clientMessage]) => (
          <li key={clientId}>
            {clientId}: {clientMessage}
          </li>
        ))}
      </ul>
    </>
  )
}

export default WebSocketPage
```

Note
----

Currently this only works for TS projects. (Also see below 😉)

Contributing
------------

If you want to add JS support, or contribute any other changes an easy way to test this locally is:
```
npx -y tsx src/webSockets --cwd ../rw-example-project --force
```
