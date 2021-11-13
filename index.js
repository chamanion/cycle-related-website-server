const express = require('express');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
// const axios = require('axios');
require('dotenv').config();
const cors = require('cors');
const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 5000;

const serviceAccount = require('./cycle-website-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tr3su.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
console.log(uri)

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}


    async function run() {
        try {
           
        await client.connect()
        console.log('database is connected')
        const database = client.db("cycle-products");
        const productsCollection = database.collection("Products");
        const usersCollection=database.collection("users")
        // GET API
        app.get('/products', async(req, res)=>{
            const cursor= productsCollection.find({})
            const products= await cursor.toArray()
            res.json(products)
        })
        app.get('/products', async(req, res)=>{
            const email=req.query.email;
            const query= {email:email}
          const cursor= productsCollection.find(query)
          const products =await cursor.toArray()
          res.json(products)
        })
        app.post('/products', async(req, res)=>{
            const product=req.body
            const result =await productsCollection.insertOne(product)
            res.json(result)
        })
        app.delete('/products/:id', async(req, res)=>{
            const id =req.params.id
            const query = {_id:ObjectId(id)}
            const result =await productsCollection.deleteOne(query)
            res.json(result)
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })
        app.post('/users', async(req, res)=>{
            const user=req.body
            const result =await usersCollection.insertOne(user)
            console.log(result)
            res.json(result)
        })

              app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin',verifyToken, async (req, res) => {
             const user = req.body;
            const requester=req.decodedEmail;
            if(requester){
                const requesterAccount= await usersCollection.findOne({enail:requester});
                if(requesterAccount.role==='admin'){
                    const filter = { email: user.email };
                    const updateDoc = { $set:{role: 'admin'}};
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else{
                res.status(403).json({ message: 'you do not have access to make admin' })
            }
           
        })

     
        }
        finally {
            // await client.close();
        }
    }
    
    run().catch(console.dir);




    app.get('/', (req, res) => {
        res.send('Assignment 12 is running now');
    });
    
    app.listen(port, () => {
        console.log('Server running at port', port);
    })