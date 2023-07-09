const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const {
  updateUserList,
  getCurrentUser,
  getUserList,
  generateUniqueUserId,
} = require("./utils/userDetails");
const { generateUniqueRoomId } = require("./utils/generateRoomId");

const userDetails = new Map();
const userIdList = [];

app.use(
  cors({
    origin: "http://ec2-3-135-237-158.us-east-2.compute.amazonaws.com:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());

const sessionMiddleware = session({
  secret: "PokerTestingApplication",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: false,
    expires: 1000 * 60 * 60 * 24,
  },
});
// Configure session middleware
app.use(sessionMiddleware);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://ec2-3-135-237-158.us-east-2.compute.amazonaws.com:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cookieParser()); //Inorder to bring cookies object to session

io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res, next);
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("room-users", (callback) => {
    const session = socket.request.session;
    if (session && session.user && session.user.roomId) {
      socket.join(session.user.roomId);
      const userList = userDetails.get(session.user.roomId);
      callback({
        status: 201,
        message: "success",
        data: userList
      });
    } else {
      callback({
        status: 401,
        message: "Invalid Session",
      });
    }
  })

  socket.on("join-room", (callback) => {
    const { user } = socket.request.session;
    if (user && user.roomId) {
      socket.join(user.roomId);
      callback({
              status: 201,
              message: "success",
      })
    } else {
      callback({
          status: 401,
          message: "Invalid Session",
      });
    }
  })

  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
  });

});

const port = 8080;

//Rest Call Info

app.get("/", (req, res) => {
  console.log("Server is up and running")
  res.send("Server is up and running");
})

app.post("/create-room", (req, res) => {
  const roomId = generateUniqueRoomId(8, userDetails);
  const userId = generateUniqueUserId(8, userIdList);
  const result = {
    roomId,
    userId,
    admin: true,
    ...req.body,
  };
  userDetails.set(roomId, [result]);
  userIdList.push(userId);
  req.session.user = result;
  

  //TODO: Do we need to send result or success msg will be enough ?
  //As roomId and username can be fetched from cookies in client side
  //as we have already saved the details in session above.
  res.send(result);
});

app.post("/join-room", (req, res) => {
  const roomId = req.body.roomId;
  const userId = generateUniqueUserId(8, userIdList);
  if (userDetails.has(roomId)) {
    const result = {
      admin: false,
      userId,
      ...req.body,
    };

    const roomUsers = userDetails.get(roomId);
    roomUsers.push(result);
    userDetails.set(roomId, roomUsers);
    userIdList.push(userId);

    req.session.user = result;

    //Send Message to all users in room
    emitOnUpdateRoom("users-update", roomId, roomUsers);

    res.status(201).send({...result, userList: roomUsers});
  } else {
    res.status(201).send({
      status: 501,
      message: "Room Id Does Not Exist",
    });
  }
});

app.post("/cast-vote", (req, res) => {
  console.log(req.session);
  const { user } = req.session;
  if (user && user.roomId) {
    const roomUsers = userDetails.get(user.roomId);
    roomUsers.map((user) => {
      if (user.userId === req.body.userId) {
        user.voted = true;
        user.vote = req.body.vote;
      }
      return user;
    });
    req.session.user = user;
    userDetails.set(user.roomId, roomUsers);
    
    const updatedRoomUsers = [...roomUsers];

    updatedRoomUsers.forEach(user => {
      delete user.vote;
    });

    //Send Info to all users who have voted
    emitOnUpdateRoom("vote-casted", user.roomId, {"userDetails": updatedRoomUsers});
    
    res.status(201).send({
      status: 201,
      message: "success",
    });
  } else {
    res.status(201).send({
      status: 401,
      message: "Invalid Session",
    });
  }
})

app.get("/user-details", (req, res) => {
  const { roomId } = req.query;
  const { user } = req.session;

  if (user) {
    if(userDetails.has(roomId)) {
      const users = userDetails.get(roomId);
      res.status(201).send({
        status: 201,
        message: "success",
        users: users
      });
    } else {
      res.status(201).send({
        status: 501,
        message: "Room Id Does Not Exist",
      });
    }
  } else {
    res.status(201).send({
      status: 401,
      message: "Invalid Session",
    });
  }
})

app.get('/reveal-card', (req, res) => {
  const { user } = req.session;
  if(user && user.admin) {
    const usersData = userDetails.get(user.roomId);
    io.to(user.roomId).emit('card-revealed', {usersData}); //To send all the members of the room
    res.status(200).send({
      status : 200,
      data : {usersData},
      message : "user points fetched successfully"
    })
  } else {
    res.status(200).send({ 
      status: 401,
      message : "Oops!! You're not the admin :(" 
    });
  }
})

app.get('/leave-room', (req, res) => {
  console.log("Leave Room Method Called");
  const {user} = req.session;
    if(user && user.roomId){
      const userList = userDetails.get(user.roomId);
      const index = userList.findIndex((activeUser) => activeUser.userId === user.userId);
      userList.splice(index, 1);
      if(userList.length === 0) {
        io.socketsLeave(user.roomId);
      }
      userDetails.set(user.roomId, userList);
      emitOnUpdateRoom('users-update', user.roomId, userList);
    }
    
    res.status(201).send({
      status: 201,
      message: "success",
    });
})


const emitOnUpdateRoom = (event, roomId, data) => {
  io.to(roomId).emit(event, {
    status: 201,
    message: "success",
    data
  });
} 

server.listen(port, () => {
  console.log("SERVER RUNNING on port: ", port);
});
