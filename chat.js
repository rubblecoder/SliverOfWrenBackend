const uuidv4 = require('uuid').v4;

const messages = new Set();
const users = new Map();

const defaultUser = {
  id: 'anon',
  name: 'Anonymous',
};

const messageExpirationTimeMS = 5*60 * 1000;

class Connection {
    constructor(io, socket) {
      this.socket = socket;
      this.io = io;
  
      socket.on('getMessages', () => this.getMessages());
      socket.on('message', (value) => this.handleMessage(value));
      socket.on('disconnect', () => this.disconnect());
      socket.on('connect_error', (err) => {
        console.log(`connect_error due to ${err.message}`);
      });
    }
    
    sendMessage(message) {
      this.io.sockets.emit('message', message);
    }
    
    getMessages() {
      messages.forEach((message) => this.sendMessage(message));
    }
  
    handleMessage(value) {
      const message = {
        id: uuidv4(),
        user: users.get(this.socket) || defaultUser,
        value,
        time: Date.now()
      };
  
      messages.add(message);
      this.sendMessage(message);
  
      setTimeout(
        () => {
          messages.delete(message);
          this.io.sockets.emit('deleteMessage', message.id);
        },
        messageExpirationTimeMS,
      );
    }
  
    disconnect() {
      users.delete(this.socket);
    }
  }

  async function authHandler(socket, next) {
    const {token = null} = socket.handshake.query || {};
    if (token) {
        try {
            const currUserCount = users.size + 1;
            const currUserName = 'User' + currUserCount;
            users.set(socket, {
                id: currUserCount,
                name: currUserName,
            });
            console.log(currUserName);
        } catch (error) {
            console.log(error);
        }
    }
    next();
  }
  
  function chat(io) {
    io.use(authHandler);
    io.on('connection', (socket) => {
      new Connection(io, socket);   
    });
  };
  
  module.exports = chat;