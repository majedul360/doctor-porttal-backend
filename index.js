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

const uri = `mongodb+srv://doctorUser:BcGyC7H66mZqOqLB@cluster0.8fgrq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const doctorCollection = client.db("doctorServices").collection("services");

const run = async () => {
  try {
    await client.connect();
    // load doctor services from database
    app.get("/services", async (req, res) => {
      const filter = doctorCollection.find({});
      const services = await filter.toArray();
      res.send(services);
    });
  } finally {
  }
};
run().catch(console.dir);
app.listen(port, () => {
  console.log("server port", port);
});
