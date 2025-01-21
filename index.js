var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.use(express.static(__dirname + '/public'));

var allclients = new Set(); // Use a Set to store unique client IDs
var connectionPairs = new Map(); // Use a Map to store connection pairs

io.on('connection', (socket) => {
    console.log(`A connection made by ${socket.id}`);
    allclients.add(socket.id); // Use add method for Set

    // Send the list of all connected clients to the new client
    io.emit('allclientList', Array.from(allclients));

    // Send a welcome message to the newly connected client
    socket.emit('welcome', socket.id);

    // Handle incoming messages
    socket.on('message', (msg) => {
        console.log(`Message from ${socket.id}:`, msg);
        sendMessage(socket, 'message', msg);
    });

    // Handle chat messages
    socket.on('chatMessage', (chat) => {
        console.log(`Chat message from ${socket.id}:`, chat);
        sendMessage(socket, 'chatMessage', chat);
    });

    // Handle connection requests
    socket.on('makeConnection', (id) => {
        console.log(`Connection request from ${socket.id} to ${id}`);
        if (id !== socket.id && allclients.has(id)) {
            makeConnection(socket.id, id);
        } else {
            socket.emit('toast', "Enter your friend's ID");
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`${socket.id} disconnected`);
        allclients.delete(socket.id); // Use delete method for Set
        io.emit('allclientList', Array.from(allclients));

        // Notify the partner that the user has disconnected
        sendMessage(socket, 'disconnected', socket.id);

        // Remove the connection pair
        removeConnection(socket.id);
    });
});

// Function to send a message to the connected partner
function sendMessage(socket, event, message) {
    const partnerId = getPartner(socket.id);
    if (partnerId) {
        io.to(partnerId).emit(event, message);
    }
}

// Function to create a connection pair
function makeConnection(client1, client2) {
    connectionPairs.set(client1, client2);
    connectionPairs.set(client2, client1);

    console.log(`Connection made between ${client1} and ${client2}`);
    io.to(client1).emit('connected', client2);
    io.to(client2).emit('connected', client1);
}

// Function to remove a connection pair
function removeConnection(client) {
    const partnerId = connectionPairs.get(client);
    if (partnerId) {
        connectionPairs.delete(client);
        connectionPairs.delete(partnerId);
        console.log(`Connection removed for ${client} and ${partnerId}`);
    }
}

// Function to get the partner of a client
function getPartner(client) {
    return connectionPairs.get(client) || null;
}

http.listen(5000, function(){
    console.log('listening on *:5000');
});
