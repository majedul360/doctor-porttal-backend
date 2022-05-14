const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

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

const doctorCollection = client.db("doctorServices").collection("services");
const bookingCollection = client.db("doctorServices").collection("bookings");

const run = async () => {
  try {
    await client.connect();
    // load doctor services from database
    app.get("/services", async (req, res) => {
      const filter = doctorCollection.find({});
      const services = await filter.toArray();
      res.send(services);
    });

    // load data with update by using mongoDB aggression
    app.get("/available/:id", async (req, res) => {
      const date = req.params.id;
      // load all services
      const services = await doctorCollection.find({}).toArray();

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

    // data loaded by use email
    app.get("/user/:id", async (req, res) => {
      const email = req.params.id;
      const query = { email };
      const filter = bookingCollection.find(query);
      const appoinemts = await filter.toArray();
      res.send(appoinemts);
    });
  } finally {
  }
};
run().catch(console.dir);
app.listen(port, () => {
  console.log("server port", port);
});
