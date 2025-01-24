import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';

const PORT = 3000;
const HOST = '127.0.0.1';
const origin = `http://${HOST}:${PORT}`;

function createNodeServer(): Server<typeof IncomingMessage, typeof ServerResponse> {
  const server = createServer(
    {
      keepAlive: true,
    },
    (request, response) => {
      if (request.method === 'POST' && request.url === '/') {
        response.statusCode = 201;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ data: 'hello' }));
      }
      if (request.method === 'POST' && request.url === '/error') {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ data: 'error occurred' }));
      }
    },
  );

  server.listen(PORT, HOST, () => {
    console.log(`Server running`);
  });

  return server;
}

export { createNodeServer, PORT, HOST, origin };
