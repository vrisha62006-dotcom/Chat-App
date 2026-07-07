const http = require('http');
const app = require('./app');
const config = require('../../config');
const websocket = require('../../websocket');

const PORT = config.PORT;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io server using websocket module
websocket.init(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
