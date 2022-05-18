const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");

// middleware
app.use(cors());
app.use(express.json());

// verify token
const verifyJWT = (req, res, next) => {
  const headersToken = req.headers.authorization;
  if (!headersToken) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = headersToken.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Acess" });
    } else {
      req.decoded = decoded;
      next();
    }
  });
};

app.get("/", (req, res) => {
  res.send("hellow world");
});

// Connect with database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8fgrq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const serviceCollection = client.db("doctorServices").collection("services");
const bookingCollection = client.db("doctorServices").collection("bookings");
const usersCollection = client.db("doctorServices").collection("users");
const doctorsCollection = client.db("doctorServices").collection("doctors");

const run = async () => {
  try {
    await client.connect();
    // verify admin middleware  function
    const verifyADN = async (req, res, next) => {
      const requester = req.decoded.email;
      const accessAdmin = await usersCollection.findOne({ email: requester });
      if (accessAdmin.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden Access" });
      }
    };
    // load doctor services from database
    app.get("/services", async (req, res) => {
      const filter = serviceCollection.find({}).project({ name: 1 });
      const services = await filter.toArray();
      res.send(services);
    });

    // load data with update by using mongoDB aggression
    app.get("/available/:id", async (req, res) => {
      const date = req.params.id;
      // load all services
      const services = await serviceCollection.find({}).toArray();

      // load bookings
      const bookings = await bookingCollection.find({ date: date }).toArray();
      services.forEach((service) => {
        const serviceBookings = bookings.filter(
          (book) => book.treatment == service.name
        );
        const booked = serviceBookings.map((s) => s.slot);
        const available = service.slots.filter((s) => !booked.includes(s));
        service.slots = available;
      });
      res.send(services);
    });

    // post booking
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        email: booking.email,
      };
      const alreadyBooking = await bookingCollection.findOne(query);
      if (alreadyBooking) {
        res.send({ success: false, alreadyBooking });
      } else {
        const result = await bookingCollection.insertOne(booking);

        res.send({ success: true, result });
      }
    });

    // loaded bookin by individual id
    app.get("/booking/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingCollection.findOne(query);
      res.send(result);
    });

    // data loaded by use email
    app.get("/user/:id", verifyJWT, async (req, res) => {
      const docodedEmail = req.decoded;
      const email = req.params.id;
      const query = { email };
      if (docodedEmail.email == email) {
        const filter = bookingCollection.find(query);
        const appoinemts = await filter.toArray();
        res.send(appoinemts);
      } else {
        res.status(403).send({ message: "Forbidden Access" });
      }
    });

    // send token for all users
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });
      res.send({ accessToken, result });
    });

    // add admin
    app.put("/users/admin/:email", verifyJWT, verifyADN, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };

      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get admin role
    app.get("/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const searchAdmin = await usersCollection.findOne({ email });
      const admin = searchAdmin.role === "admin";
      res.send({ admin });
    });

    // load all users
    app.get("/users", verifyJWT, async (req, res) => {
      const result = await usersCollection.find({}).toArray();
      res.send(result);
    });

    // add doctors
    app.post("/doctors", verifyJWT, verifyADN, async (req, res) => {
      const doctor = req.body;
      const reselt = await doctorsCollection.insertOne(doctor);
      res.send(reselt);
    });

    // load doctors
    app.get("/doctors", verifyJWT, verifyADN, async (req, res) => {
      const result = await doctorsCollection.find({}).toArray();
      res.send(result);
    });

    // delete doctor
    app.delete("/doctor/:email", verifyJWT, verifyADN, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await doctorsCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
};
run().catch(console.dir);
app.listen(port, () => {
  console.log("server port", port);
});
