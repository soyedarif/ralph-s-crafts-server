const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  let token = req.headers.authorization;
  if (!token) {
    return res.status(401).send({ error: true, message: "unauthorized access" });
  }
   token = token.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2l3te9a.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const usersCollection = client.db("ralphCrafsDB").collection("users");
    const classesCollection = client.db("ralphCrafsDB").collection("classes");
    const bookCollection = client.db("ralphCrafsDB").collection("books");


    // handle JWT
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
      res.send({ token });
    });

    //save user data
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      user.role = "student";
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //get users list
    app.get("/users", verifyJWT, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });



    app.get('/users/instructors', async(req,res)=>{
      const result= await usersCollection.find({role:"instructor"}).toArray()
      res.send(result)
    })

    //varify user role by email
    app.get("/users/:email", verifyJWT, async (req, res) => {
      const {email} = req.decoded;
      if (email !== req.params.email) {
        // res.send({ admin: false });
        return res.status(403).send({ error: "bad auth" });
      }
      const user = await usersCollection.findOne({email});
      const role = user.role
      res.send({role});
    });

    //update user to ADMIN
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateRole = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(query, updateRole);
      res.send(result);
    });


    //update user to instructor
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateRole = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollection.updateOne(query, updateRole);
      res.send(result);
    });

    //get all classes
    app.get("/classes", async (req, res) => {
      let query = { status: "approved" };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    // get class data by id for feedback
    app.get("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.findOne(query);
      res.send(result);
    });

    //get instructor posted classes
    app.get("/classes/:email", async (req, res) => {
      const email = req.query.email;
      const query = { instructorEmail: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    //update class status to approved
    app.patch("/classes/approve/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const statusApprove = {
        $set: {
          status: "approved",
        },
      };
      const result = await classesCollection.updateOne(query, statusApprove);
      res.send(result);
    });
    //update class status to denied
    app.patch("/classes/denied/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const statusDenied = {
        $set: {
          status: "denied",
        },
      };
      const result = await classesCollection.updateOne(query, statusDenied);
      res.send(result);
    });
    //update class with feedback
    app.patch("/classes/feedback/:id", async (req, res) => {
      const id = req.params.id;
      const message = req.body.feedback;
      const query = { _id: new ObjectId(id) };
      const feedback = {
        $set: {
          feedback: message,
        },
      };
      const result = await classesCollection.updateOne(query, feedback);
      res.send(result);
    });
    //post class by instructor
    app.post("/classes", async (req, res) => {
      const course = req.body;
      course.status = "pending";
      const result = await classesCollection.insertOne(course);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("ralph is on the run");
});

app.listen(port);
