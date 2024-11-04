const express = require('express')
const cors = require('cors')
require('dotenv').config()

const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const port = process.env.PORT || 5000
const app = express()

const corsOptions = {
    origin: [
        "http://localhost:5173",
        "https://job-word.firebaseapp.com",
        "https://job-word.web.app"
    ],
    credentials: true,
}
// middleware
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ejfr6xk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
// middleware
const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token
    console.log("token in the middleware ", token)

    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err){
                console.log(err)
                return res.status(401).send({ message: 'unauthorized access' })
            }
            console.log(decoded)
            req.user = decoded
            next()
        })
    }
}
async function run() {
    try {

        const assignmentCollection = client.db('JobWord').collection('allAssignment')

        const mySubmissionCollection = client.db('JobWord').collection('mySubmissionDb')

        // jwt
        //creating Token
        app.post("/jwt", (req, res) => {
            const user = req.body;
            console.log("user for token", user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            }).send({ success: true });
        });

        // Clear token on logout
        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                maxAge: 0,
            }).send({ success: true })
        })


        // get assignment from create user
        app.post('/assignment', async (req, res) => {
            const assignment = req.body
            const result = await assignmentCollection.insertOne(assignment)
            res.send(result)
        })

        // get all assignment 
        app.get('/allAssignment', async (req, res) => {

            const filter = req.query;
            console.log(filter)
            const query = {
                assignment_title: {"$regex": filter.search, $options: "i"}
            }
            const result = await assignmentCollection.find(query).toArray()
            res.send(result)
        })



        // delete one item
        app.delete("/delete/:id",async (req, res) => {

            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await assignmentCollection.deleteOne(query)
            res.send(result)
        })

        // get by id
        app.get('/updateData/:id', async (req, res) => {



            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await assignmentCollection.findOne(query)
            res.send(result)
        })
        // update a job in db
        app.put('/myUpdate/:id', async (req, res) => {

            const id = req.params.id
            const updateData = req.body
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {

                    assignment_title: updateData.assignment_title,
                    assignment_level: updateData.assignment_level,
                    marks: updateData.marks,
                    description: updateData.description,
                    due_date: updateData.due_date,
                    thumbnail: updateData.thumbnail,
                },
            }
            const result = await assignmentCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })

        // Save a mySubmission data in db
        app.post('/mySubmission', async (req, res) => {
            const submitData = req.body
            const result = await mySubmissionCollection.insertOne(submitData)
            res.send(result)
        })
        // get by email
        app.get('/myAssignment/:email',verifyToken, async (req, res) => {

    
            const myEmail = req.params.email
            console.log("token owner", myEmail)

            const tokenEmail = req?.user?.email
            console.log("token email vai", tokenEmail)

            if (myEmail !== tokenEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: (myEmail) }
            const result = await mySubmissionCollection.find(query).toArray()
            res.send(result)
        })

        // get by id for mark assignment
        app.get('/markAssignment/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await mySubmissionCollection.findOne(query)
            res.send(result)
        })
        // get all assignment 
        app.get('/allPending/:status', async (req, res) => {

            const findByTitle = req.params.status;
            const filter = { status: (findByTitle) }
            const result = await mySubmissionCollection.find(filter).toArray()
            res.send(result)
        })
        // update status
        app.patch('/statusUpdate/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const status = req.body
            console.log(status)
            const updateDoc = {
                $set: {
                    assignment_title: status.assignment_title,
                    assignment_level: status.assignment_level,
                    marks: status.marks,
                    description: status.description,
                    due_date: status.due_date,
                    thumbnail: status.thumbnail,
                    status: status.status,
                    pdfLink: status.pdfLink,
                    notes: status.notes,
                    giveMark: status.giveMark,
                    feedback: status.feedback,
                },
            }
            const result = await mySubmissionCollection.updateOne(query, updateDoc)
            res.send(result)
        })

    
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('JobWord is running....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
// https://job-word-server.vercel.app