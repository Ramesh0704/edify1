var express = require('express');
const session = require('express-session');
var app = express();
var bodyParser = require('body-parser');
app.use(express.static(__dirname + "/../public"));
const router = express.Router();
app.use(express.static('public'));
const mongoose = require('mongoose');
var urlencodedParser = bodyParser.urlencoded({ extended: true });
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
router.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
}));

// Authorization Middleware
function requireUser(req, res, next) {
  if (req.session.user && req.session.user.verify === "2") {
      next(); // User is authorized, continue to the next middleware or route handler
  } else {
      res.status(403).send('Unauthorized'); // User is not authorized
  }
}

// MongoDB connection

const url = 'mongodb://localhost:27017';
const dbName = 'edify';
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  }
}

connectDB();

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.get('/getUsers', async (req, res) => {
 
  const collectionName = 'users';
  await client.connect();
  db = client.db(dbName);
  try {
    const collection = db.collection(collectionName);
    const users = await collection.find({ verify: "0" }).toArray();

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>User Verification</title>
          <link rel="icon" href="/icon.jpg">
          <script>
        function goBack() {
            window.history.back();
        }
    </script> 
          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #b8e7f9;
              }
              .main {
                   margin: 0 auto;
            padding: 30px;
            background-color: #ececec;
            border-radius: 15px;
            box-shadow: 0 0 20px rgba(11, 1, 1, 0.2);
            width: 90%;
            max-width: 1000px;
        }
              }
              .main h2 {
                  color: #3f65c7;
                  margin-bottom: 20px;
              }
              img {
                  float: left;
              }
              .edify {
                  clear: left;
                  padding: -30%;
              }
              .submit {
                  color: #ffffff;
                  background-color: #1B4CFB;
                  padding: 4%;
              }
              .goback {
            position: fixed;
            right: 20px;
            bottom: 20px;
            height: 9%;
            width: 5%;
        }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
              }
              table, th, td {
                  border: 1px solid #ccc;
              }
              th, td {
                  padding: 8px;
                  text-align: left;
              }
                    .submit1{
                  color: #ffffff;
                  background-color: #1B4CFB;
                  border: none;
                  padding: 4% 8%;
                  cursor: pointer;
                  }a {
            float: right;
            margin-right: 3%;
        }
        .headtag {
            float: right;
        }
        .tag {
            margin-right: 2%;
            float: right;
        }
        .tag1 {
            margin-right: 0.5%;
            float: right;
        }
    </style>
    <script>
        // Push a new state to the history stack
        history.pushState(null, null, location.href);

        window.addEventListener('popstate', function(event) {
            // Redirect to the logout endpoint or any other desired page
            window.location.href = '/admin/logout';
        });

        // Optional: Prevent default action for backspace key to avoid navigating back
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Backspace' && event.target.nodeName !== 'INPUT' && event.target.nodeName !== 'TEXTAREA') {
                event.preventDefault();
            }
        });
    </script>
    <script>
        function goBack() {
        }
    </script>
</head>
      <body>
         <br><br>
          <h2  style="color: #123F49;" align="center">User Verification</h2>
              <br><br>
          <div class="main">
             
              <table border="1">
                  <thead>
                      <tr>
                          <th>Sl No</th>
                          <th>User Name</th>
                          <th>Emp ID</th>
                          <th>Email</th>
                          <th>Level</th>
                          <th>Action</th>
                      </tr>
                  </thead>
                  ${users.map((user, index) => `
                    <tr>
                        <td>${index + 1}</td>
                          <td>${user.username}</td>
                          <td>${user.empid}</td>
                          <td>${user.email}</td>
                          <td>User</td>
                          <td><button class="submit1" onclick="approveUser('${user.empid}')" style="padding: 12%;">Approve</button></td>
                        </tr>
                      `).join('')}
                  </tbody>
              </table>
          </div>
          
          <script>
              function approveUser(empId) {
              console.log(empId);
                  fetch('/admin/approveUser', { // Ensure the route is correct
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ empId })
                  }).then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('User approved successfully');
                            location.reload(); // Reload the page to see the updated user list
                        } else {
                            alert('Error approving user');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Error approving user');
                    });
              }
          </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).send('Error retrieving users');
  }
});

// Route to handle user approval
router.post('/approveUser', async (req, res) => {
  const collectionName = 'users';

  try {
    const empId = req.body.empId;
    const collection = db.collection(collectionName);
  
    await collection.updateOne({ empid: empId }, { $set: { verify: "1" } });
    res.status(200).send({ success: true });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).send({ success: false, message: 'Error approving user' });
  }
});

router.get('/prform', requireUser, async (req, res) => {
   
  const username = req.session.user.username;
  res.render('prform1', {  username: username });
});
router.get('/prform2', requireUser, async (req, res) => {
   
  const username = req.session.user.username;
  res.render('adhoc', {  username: username });
});

router.post('/save', urlencodedParser, async (req, res) => {
  const date = new Date();
  const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`; // Format: dd-mm-yyyy
 

  const url = 'mongodb://localhost:27017';
  const client = new MongoClient(url);
  const dbName = 'edify';
  const collectionName = 'draft';

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const response = {
       Date:formattedDate,
        Customer: req.body.Customer,
        Requisitor: req.session.user.username,
        Pro_id: req.body.Pro_id,
        Part_No: req.body.part_no,
        description: req.body.description,
        manufacture: req.body.manufacture,
        supplier: req.body.supplier,
        Qty: req.body.qty,
        Need_by_date: req.body.NEED,
      };


    await collection.insertOne(response);
    const username = req.session.user.username;
    res.render('adminportal', { username: username});
  } catch (error) {
    console.error('Error during sbmission:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});

router.post('/submit', urlencodedParser, async (req, res) => {
  const date = new Date(); 
  const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`; // Format: dd-mm-yyyy
  const formattedDate1 = 
  `${String(date.getDate()).padStart(2, '0')}-` +
  `${String(date.getMonth() + 1).padStart(2, '0')}-` +
  `${date.getFullYear()} ` +
  `${String(date.getHours()).padStart(2, '0')}:` +
  `${String(date.getMinutes()).padStart(2, '0')}:` +
  `${String(date.getSeconds()).padStart(2, '0')}`;
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'edify';
const collectionName = 'info';

try {
  await client.connect();
  
  const db = client.db(dbName);
  const collection = db.collection(collectionName);
  const latestNumber = await collection.countDocuments();
  const Requisitionnum = latestNumber + 1;
  const response = {
      Requisition: Requisitionnum,
      date: formattedDate,
      date1:formattedDate1,
      Customer: req.body.Customer,
      Requisitor: req.body.Requisitor,
      Pro_id: req.body.Pro_id,
      Part_No: req.body.part_no,
      description: req.body.description,
      manufacture: req.body.manufacture,
      supplier: req.body.supplier,
      Qty: req.body.qty,
      Need_by_date: req.body.NEED,
      Status: req.body.status,
       adhoc: 'New PO'
    };


  await collection.insertOne(response);
  res.redirect(`/admin/details/${response.Requisition}`);
 
} catch (error) {
  console.error('Error during submission:', error);
  res.status(500).send('Internal Server Error');
} finally {
  await client.close();
}
});
























router.get('/details/:id', requireUser, async (req, res) => {
  const prId = req.params.id;
  const dbName = 'edify';
  const collectionName = 'info';
  
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const query = { Requisition: parseInt(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }

    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
const partNos = Array.isArray(prDetails.Part_No) ? prDetails.Part_No : [];
const manufactures = Array.isArray(prDetails.manufacture) ? prDetails.manufacture : [];
const suppliers = Array.isArray(prDetails.supplier) ? prDetails.supplier : [];
const qtys = Array.isArray(prDetails.Qty) ? prDetails.Qty : [];
const needByDates = Array.isArray(prDetails.Need_by_date) ? prDetails.Need_by_date : [];
const rate = Array.isArray(prDetails.rate) ? prDetails.rate : [];
const total = Array.isArray(prDetails.total) ? prDetails.total : [];
const invoiceno = Array.isArray(prDetails.invoice_no) ? prDetails.invoice_no : [];
const files = Array.isArray(prDetails.invoice_file) ? prDetails.invoice_file : [];


const tableRows = descriptions.map((desc, index) => {
  return `
    <tr>
      <td>${index + 1}</td>
      <td><input type="text" class="part_no" name="part_no[]" value="${partNos[index] || ''}" disabled></td>
      <td><input type="text" class="description" name="description[]" value="${desc || ''}" required disabled></td>
      <td><input type="text" class="manufacture" name="manufacture[]" value="${manufactures[index] || ''}" disabled></td>
      <td><input type="text" class="supplier" name="supplier[]" value="${suppliers[index] || ''}" disabled></td>
      <td><input type="text" class="NEED" name="NEED[]" value="${needByDates[index] || ''}" disabled></td>
      <td><input type="number" class="qty" name="qty[]" min="1" value="${qtys[index] || 0}" required disabled></td>
      <td><input type="number" class="rate" name="rate[]" value="${rate[index] || 0}" required disabled></td>
      <td><input type="number" class="total" name="total[]" value="${total[index] || 0}" required disabled></td>
      <td>
          ${files[index] && files[index].filename ? `<a href="/uploads/${files[index].filename}" target="_blank">View</a>` : 'N/A'}
      </td>
      <td><input type="text" class="invoice_no" name="invoice_no[]" value="${invoiceno[index] || 'N/A'}" required disabled></td>
    </tr>
  `;
}).join('');


    // Render detailed PR information
    let htmlResponse = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PR Details</title>
      <link rel="icon" href="/icon.jpg">
      <style>
  body {
    font-family: Arial, sans-serif;
    background-color: #b8e7f9;
  }

  .main {
    margin: 0 auto;
    padding: 20px;
    background-color: #ececec;
    border-radius: 15px;
    box-shadow: 0 0 20px rgba(190, 156, 18, 0.2);
    width: 85%;
  }

  .main h2 {
    color: #3f65c7;
    margin-bottom: 20px;
  }

  label {
    display: block;
    margin-bottom: 5px;
    color: #555;
    font-weight: bold;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }

  th, td {
    padding: 8px;
    text-align: center;
    border: 1px solid #ccc;
  }

  .no-border-table, .no-border-table th, .no-border-table td {
    border: none;
  }

  input[type="text"], input[type="number"], input[type="date"], input[type="file"] {
    width: 100%;
    box-sizing: border-box;
  }

  .submit, button {
    background-color: #094af1;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }

  .submit:hover, button:hover {
    background-color: #2f4aa8;
  }

  .goback {
    position: fixed;
    right: 20px;
    bottom: 20px;
  }

  a {
    float: right;
    margin-right: 3%;
  }

  .headtag {
    float: right;
  }

  .tag {
    margin-right: 2%;
    float: right;
  }

  .tag1 {
    margin-right: 0.5%;
    float: right;
  }

  .dateformat {
    padding-left: 6%;
    padding-right: 6%;
    border: 1px solid black;
  }

  </style>
      <script>
          // Prevent going back to the previous page
          history.pushState(null, null, location.href);
          window.addEventListener('popstate', function(event) {
              window.location.href = '/admin/logout';
          });

          function goBack() {
          }
      </script>
    </head>
    <body>
        <div>
            
            <br><br><h2 style="color: #123F49;" align="center">Purchase Request Received</h2>
            <br><br>
            <div class="main">
                
                <h2>Requisition #:<span class="span1">${prDetails.Requisition}</span></h2>
                <form id="purchaseForm">
                    <table class="no-border-table">
                        <tr>
                            <td><label for="Customer">Customer Name:</label></td>
                            <td><input type="text" name="Customer" required value="${prDetails.Customer}" disabled></td>
                            <td><label for="date">Date:</label></td>
                            <td><input type="text" name="date" required value="${prDetails.date}" disabled></td>
                        </tr>
                        <tr>
                            <td><label for="Requisitor">Requisitor:</label></td>
                            <td><input type="text" name="Requisitor" required value="${prDetails.Requisitor}" disabled></td>
                            <td><label for="Pro_id">Project ID:</label></td>
                            <td><input type="text" name="Pro_id" required value="${prDetails.Pro_id}" disabled></td>
                        </tr>
                    </table>
                    <br><br><br>
                    <table class="details-table">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Part No</th>
                                <th>Description</th>
                                <th>Manufacture</th>
                                <th>Supplier</th>
                                <th>Need By Date</th>
                                <th>Quantity</th>
                                <th>Rate</th>
                                <th>Total</th>
                                <th>Invoice</th>
                                <th>Invoice No</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </form>
                <br>
                <div align="center">
                    <button class="submit" onclick="window.location.href='/admin/welcome2'">Go Back</button>
                </div>
            </div>
        </div>
    </body>
    </html>`;

    res.send(htmlResponse);
  } catch (error) {
    console.error("Error fetching PR details:", error);
    res.status(500).send('Error fetching data from the database');
  } finally {
    await client.close();
  }
});











router.get('/viewpr', async (req, res) => {
  
  const collectionName = 'draft';
  

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const username = req.session.user.username;
    const query =  ({ Requisitor:username });
    const pendingPRs = await collection.find(query).toArray();


    let htmlResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pending PR</title>
        <link rel="icon" href="/icon.jpg">
        <style>
          body { font-family: Arial, sans-serif; background-color: #b8e7f9; }
          .main { margin: 0 auto; padding: 20px; background-color: #ececec; border-radius: 15px; box-shadow: 0 0 20px rgba(190, 156, 18, 0.2); width: 90%; }
          .main h2 { color: #3f65c7; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          table, th, td { border: 1px solid #ccc; }
          th, td { text-align: center; padding: 8px; }
          .button1 { background-color: #094af1; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
          .button1:hover { background-color: #2f4aa8; }
          .goback { position: fixed; right: 20px; bottom: 20px; height: 9%; width: 5%; }
          a { text-decoration: none; color: black; }
           a{
            float:right;
            margin-right: 3%;
        }
        .headtag{
            float:right;
        }
        .tag{
            margin-right: 2%;
            float:right;
        }
        .tag1{
            margin-right: 0.5%;
            float:right;
        }
        </style>
      </head>
      <body>
        
    
 <br> <br> <h2 style="color: #123F49;" align="center">Purchase Requisition Draft</h2>
 <br> <br> <br><br>
        <div class="main">
         
          <table id="dataTable">
            <thead>
              <tr>
              <th>Sl No</th>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Project Id</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
    `;

    // Append each PR to the HTML response
    pendingPRs.forEach((pr,index) => {
      htmlResponse += `
        <tr>
           <td>${index+1}</td>
          <td>${pr.Date}</td>
          <td>${pr.Customer}</td>
          <td>${pr.Pro_id}</td>
          <td><button class="button1"><a href="/admin/viewpr/details/${pr._id}">View</a></button></td>
        </tr>
      `;
    });

    // Close the HTML structure
    htmlResponse += `
            </tbody>
          </table>
        </div>
       
        <script>
          function goBack() {
            window.history.back();
          }
        </script>
      </body>
      </html>
    `;

    // Send the HTML response to the client
    res.send(htmlResponse);

  } catch (error) {
    console.error('Error fetching pending PRs:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});






router.get('/viewpr/details/:id', async (req, res) => {
  const url = 'mongodb://localhost:27017';
    const dbName = 'edify';
    const collectionName = 'draft';
    
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
  
    const prId = req.params.id;

  try {
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Query MongoDB to fetch details by _id
    const query = { _id: ObjectId(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }

    // Ensure the description field is an array
    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
     res.render('viewpr-details1', {
      username: req.session.user.username,
      prDetails: prDetails,
      descriptions: descriptions
  });
  await collection.deleteOne(query);

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  }
});











router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          return res.status(500).send('Internal Server Error');
      }
      res.redirect('/'); // Redirect to the login page
  });
});

router.get('/', (req, res) => {
  const username = req.session.user.username;
  res.render(path.join(__dirname, '..', 'views', 'adminportal'), { username: username });
});


router.get('/status', async (req, res) => {
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';

  const client = new MongoClient(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    const info = db.collection('info');
    const over = db.collection('over');

    // Get threshold from 'over' collection
    const thresholdDoc = await over.findOne({});
    const threshold = thresholdDoc ? thresholdDoc.overdueThreshold : 7;

    // Calculate the date threshold
    const currentDate = new Date();
    const overdueDate = new Date(currentDate);
    overdueDate.setDate(overdueDate.getDate() - threshold);
    const overdueFormatted = overdueDate.toISOString().split('T')[0];

    // Update entries that are overdue
    await info.updateMany(
      {
        date: { $lt: overdueFormatted },
        Status: { $nin: ['adhoc', 'conform','close'] }
      },
      { $set: { status: 'overdue' } }
    );

   
      await info.updateMany(

        { 
          date: { $gt: overdueFormatted },Status: { $nin: ['adhoc', 'conform','close'] } },
        { $set: { status: '' } }
      );
    

    // Ensure conform entries are not marked overdue
    await info.updateMany(
      {
        Status: { $in: ['adhoc', 'conform','close'] },
        status: 'overdue'
      },
      { $set: { status: '' } }
    );

    // Fetch all status entries
    const statusEntries = await info.find({}).toArray();
    statusEntries.reverse();
    console.log('Threshold:', threshold);

    // Render the EJS template and send both data sets
    res.render('11', {
      username: req.session.user.username,
      statusEntries: statusEntries,
      threshold: threshold
    });

  } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
  }
});



router.get('/welcome2', requireUser, async (req, res) => {
  const url = 'mongodb://localhost:27017';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    
    
    res.render('welcome2', { username:  req.session.user.username});

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});

router.get('/check/:id', requireUser, async (req, res) => {
  const prId = req.params.id;
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const collectionName = 'info';

  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const query = { Requisition: parseInt(prId), Status: 'open' };
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const formattedDate1 = 
  `${String(date.getDate()).padStart(2, '0')}-` +
  `${String(date.getMonth() + 1).padStart(2, '0')}-` +
  `${date.getFullYear()} ` +
  `${String(date.getHours()).padStart(2, '0')}:` +
  `${String(date.getMinutes()).padStart(2, '0')}:` +
  `${String(date.getSeconds()).padStart(2, '0')}`;
    let prDetails = await collection.findOne(query);

    if (prDetails) {
      // Update the PR status to 'floatRFQ' and record the update date
      await collection.updateOne(query, { 
        $set: { Status: 'floatRFQ', updatedOn: formattedDate, floatrfq: formattedDate1, floatrfqraiser: req.session.user.username } 
      });
      const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
      res.render('quotation1', { username: req.session.user.username, descriptions, prDetails });
    } else {
      // If no PR found with 'open' status, query without status filter
      const queryNoStatus = { Requisition: parseInt(prId) };
      prDetails = await collection.findOne(queryNoStatus);
      if (prDetails) {
        // Update the PR status to 'floatRFQ'
        await collection.updateOne(queryNoStatus, { $set: { Status: 'floatRFQ' } });
        const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
        res.render('quotation1', { username: req.session.user.username, descriptions, prDetails });
      } else {
        // Handle case when PR is not found at all
        res.status(404).send('PR not found');
      }
    }

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});

router.get('/view/:id', requireUser, async (req, res) => {
  const prId = req.params.id;
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const collectionName = 'info';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const query = { Requisition: parseInt(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }
    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('userform1', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});





router.get('/revise1/:id', requireUser, async (req, res) => {
  const prId = req.params.id;
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const collectionName = 'info';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const query = { Requisition: parseInt(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }
    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('view1', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});
router.get('/dpcconform2/:id', requireUser, async (req, res) => {
  const prId = req.params.id;
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const collectionName = 'info';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const query = { Requisition: parseInt(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }
    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('piview', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});


router.get('/dc2/:id', requireUser, async (req, res) => {
  const prId = req.params.id;
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const collectionName = 'info';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const query = { Requisition: parseInt(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }
    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('dc22', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});

router.get('/revise/:id', requireUser, async (req, res) => {
  const prId = req.params.id;
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const collectionName = 'info';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const query = { Requisition: parseInt(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }

    // Ensure the description field is an array
    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('userform3', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});


router.get('/history/:id', requireUser, async (req, res) => {
  const prId = req.params.id;
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const collectionName = 'info';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const query = { Requisition: parseInt(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }

    // Ensure the description field is an array
    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('history', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});


router.get('/conform/:id', requireUser, async (req, res) => {
  const prId = req.params.id;
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const collectionName = 'info';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const query = { Requisition: parseInt(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }

    // Ensure the description field is an array
    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('userform4', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});




router.get('/dpcconform1/:id', requireUser, async (req, res) => {
  const prId = req.params.id;
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const collectionName = 'info';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const query = { Requisition: parseInt(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }

    // Ensure the description field is an array
    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('piverify', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});



router.get('/conform1/:id', requireUser, async (req, res) => {
  const prId = req.params.id;
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const collectionName = 'info';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const query = { Requisition: parseInt(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }

    // Ensure the description field is an array
    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('pi', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});











const multer = require('multer');
 urlencodedParser = express.urlencoded({ extended: true });

// Set Storage Engine
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = path.basename(file.originalname, ext) + '-' + uniqueSuffix + ext;
    cb(null, filename); 
  },
});

function checkFileType(file, cb) {
  const filetypes = /pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: PDFs Only!');
  }
}

// Init Upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).array('quote_pdf[]');


router.post('/upload/:id', urlencodedParser, async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Error during file upload:', err);
      return res.status(500).send('Internal Server Error');
    }

    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    const dbName = 'edify';
    const collectionName = 'info';
    const prId = req.params.id;

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      // Fetch the existing document
      const existingDoc = await collection.findOne({ Requisition: parseInt(prId) });

      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const formattedDate1 = 
  `${String(date.getDate()).padStart(2, '0')}-` +
  `${String(date.getMonth() + 1).padStart(2, '0')}-` +
  `${date.getFullYear()} ` +
  `${String(date.getHours()).padStart(2, '0')}:` +
  `${String(date.getMinutes()).padStart(2, '0')}:` +
  `${String(date.getSeconds()).padStart(2, '0')}`;
      const response = {
        oldrate: req.body.oldrate,
        rate: req.body.Rate,
        total: req.body.Total,
        grandtotal: req.body.gt,
      };

      // Ensure files are saved and filenames are properly mapped
      if (req.files.length > 0) {
        response.files = req.files.map(file => ({
          filename: file.filename,
        }));
      }

      const updateDoc = {
        $set: {
          oldrate: req.body.oldrate,
          Status: 'submitquote',
          updatedOn: formattedDate,
          rate: req.body.Rate,
          total: req.body.Total,
          grandtotal: req.body.gt,
          submitquoteraiser: req.session.user.username,
          submitquote: formattedDate1
        }
      };

      // Push the files to the database if any files were uploaded
      if (req.files.length > 0) {
        updateDoc.$push = {
          files: {
            $each: req.files.map(file => ({ filename: file.filename }))
          }
        };
        console.log("Files received:", req.files);
      }
// Initialize revisedItems
let revisedItems = [];

// Check if there are revisions
if (existingDoc && Array.isArray(existingDoc.part_Status)) {
  revisedItems = existingDoc.part_Status
    .map((item, index) => {
      console.log('Mapping item at index:', index); // Debugging to check the index
      if (item === "Revise") {
        console.log('Revise detected for index:', index);
        return {
          description: req.body.description?.[index] || "No description",  // Default if undefined
          oldrate: req.body.oldrate?.[index] || "0", // Default if undefined
          newrate: req.body.Rate?.[index] || "0", // Default if undefined
          remark: req.body.remark?.[index]?.trim() || "No remark",  // Default if undefined or empty
          modifiedBy: req.session.user.username
        };
      }
      return null;
    })
    .filter(item => item !== null);  // Remove null values
}

// If there are new revisions, append them
if (revisedItems.length > 0) {
  updateDoc.$push = updateDoc.$push || {};  // Make sure $push is initialized
  updateDoc.$push.revisions = {
    $each: revisedItems  // Append each new revision to the revisions array
  };
}

      console.log('Files:', req.files);
      console.log('Revisions to be pushed:', revisedItems);
      
      // Log the other body data before doing the update
      console.log('Description:', req.body.description);
      console.log('Old Rate:', req.body.oldrate);
      console.log('New Rate:', req.body.Rate);
      console.log('Remark:', req.body.remark);

      // Update the document in the database
      await collection.updateOne({ Requisition: parseInt(prId) }, updateDoc);

      res.redirect('/admin/status');
    } catch (error) {
      console.error('Error during submission:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      await client.close();
    }
  });
});

router.post('/saveDraft/:id', upload, async (req, res) => {
  const requisitionId = req.params.id;
  const { qty = [], Rate = [], Total = [], gt } = req.body;

  const fileDetails = req.files ? req.files.map(file => ({
    filename: file.filename,
    mimetype: file.mimetype,
    originalname: file.originalname,
    path: file.path
  })) : [];

  // MongoDB connection setup
  const mongoUrl = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const client = new MongoClient(mongoUrl);

  const query = { Requisition: parseInt(requisitionId) };

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('info');

    // Prepare the draft object to save the requisition data
    const draftObject = {
      Requisition: parseInt(requisitionId),
      qty: qty,
      rate: Rate,
      total: Total,
      grand_total: gt,
    };

  
    if (fileDetails.length > 0) {
 
      const existingDoc = await collection.findOne(query);
      const existingFiles = existingDoc && existingDoc.files ? existingDoc.files : [];

      const newFiles = fileDetails.filter(file =>
        !existingFiles.some(existingFile => existingFile.filename === file.filename)
      );

      if (newFiles.length > 0) {
       
        draftObject.files = [...existingFiles, ...newFiles];  
      } else {
        draftObject.files = existingFiles;
      }
    }

    await collection.updateOne(query, { $set: draftObject }, { upsert: true });

    res.status(200).send('Draft saved successfully');
  } catch (error) {
    console.error('Draft save error:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});



const storage1 = multer.diskStorage({
  destination: './uploads/', 
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = path.basename(file.originalname, ext) + '-' + uniqueSuffix + ext;
    cb(null, filename); // Save the file with a unique name
  },
});

function checkFileType(file, cb) {
  const filetypes = /pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: PDFs Only!'); // Reject files that aren't PDFs
  }
}

const upload1 = multer({
  storage: storage1,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb); 
  },
}).array('invoice_pdf[]'); // Expecting multiple files with the name 'invoice_pdf[]'

// Route to handle file upload and database submission
router.post('/conform/:id', urlencodedParser, (req, res) => {
  upload1(req, res, async (err) => {
    if (err) {
      console.error('Error during file upload:', err);
      return res.status(400).send('Error: PDFs Only or File too large'); // Provide better error response
    }

    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    const dbName = 'edify';
    const collectionName = 'info';
    const prId = req.params.id;

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

      // Prepare an array of invoice files (only PDFs)
      const invoiceFiles = req.files.filter(file => file.mimetype === 'application/pdf').map(file => ({
        filename: file.filename,
        mimetype: file.mimetype,
        originalname: file.originalname,
      }));

      const updateDoc = {
        $set: {
          Status: 'conform',
          updatedOn: formattedDate,
          in:formattedDate,
          inraiser:req.session.user.username,
          invoice_no: req.body.invoiceno,
        },
      };

      if (invoiceFiles.length > 0) {
        updateDoc.$set.invoice_file = invoiceFiles; // Add invoice files to document
      }

      // Query to find the document by requisition id
      const query = { Requisition: parseInt(prId) };
      const result = await collection.updateOne(query, updateDoc);

      if (result.matchedCount === 0) {
        return res.status(404).send('Requisition not found');
      }

      res.redirect('/admin/status'); // Redirect after successful update
    } catch (error) {
      console.error('Error during submission:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      await client.close();
    }
  });
});





router.post('/taxinvoice/:id', urlencodedParser, (req, res) => {
  upload1(req, res, async (err) => {
    if (err) {
      console.error('Error during file upload:', err);
      return res.status(400).send('Error: PDFs Only or File too large'); // Provide better error response
    }

    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    const dbName = 'edify';
    const collectionName = 'info';
    const prId = req.params.id;

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

      // Prepare an array of invoice files (only PDFs)
      const invoiceFiles = req.files.filter(file => file.mimetype === 'application/pdf').map(file => ({
        filename: file.filename,
        mimetype: file.mimetype,
        originalname: file.originalname,
      }));

      const updateDoc = {
        $set: {
          Status: 'conform',
          in:formattedDate,
          inraiser:req.session.user.username,
          updatedOn: formattedDate,
          invoice_no: req.body.invoiceno,
        },
      };

      if (invoiceFiles.length > 0) {
        updateDoc.$set.invoice_file = invoiceFiles; // Add invoice files to document
      }

      // Query to find the document by requisition id
      const query = { Requisition: parseInt(prId) };
      const result = await collection.updateOne(query, updateDoc);

      if (result.matchedCount === 0) {
        return res.status(404).send('Requisition not found');
      }

      res.redirect('/admin/status'); // Redirect after successful update
    } catch (error) {
      console.error('Error during submission:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      await client.close();
    }
  });
});
// Requisition submission route
router.post('/submit1', urlencodedParser, (req, res) => {
  upload1(req, res, async (err) => {
    if (err) {
      console.error('Error during file upload:', err);
      return res.status(400).send('Error: PDFs Only or File too large'); // Provide better error response
    }

    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`; // Format: yyyy-mm-dd
const formattedDate1 = 
  `${String(date.getDate()).padStart(2, '0')}-` +
  `${String(date.getMonth() + 1).padStart(2, '0')}-` +
  `${date.getFullYear()} ` +
  `${String(date.getHours()).padStart(2, '0')}:` +
  `${String(date.getMinutes()).padStart(2, '0')}:` +
  `${String(date.getSeconds()).padStart(2, '0')}`;
    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    const dbName = 'edify';
    const collectionName = 'info';

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      // Validation: Check if required fields are present
      if (!req.body.Customer || !req.body.Requisitor || !req.body.Pro_id) {
        return res.status(400).send('Missing required fields');
      }

      // Handle dynamic array fields
      const partNo = Array.isArray(req.body.part_no) ? req.body.part_no : [req.body.part_no];
      const description = Array.isArray(req.body.description) ? req.body.description : [req.body.description];
      const qty = Array.isArray(req.body.qty) ? req.body.qty : [req.body.qty];
      const rate = Array.isArray(req.body.Rate) ? req.body.Rate : [req.body.Rate];
      const total = Array.isArray(req.body.Total) ? req.body.Total : [req.body.Total];
      const invoiceNo = Array.isArray(req.body.invoice) ? req.body.invoice : [req.body.invoice];

      // Generate a unique Requisition number
      const latestRequisition = await collection.findOne({}, { sort: { Requisition: -1 } });
      const Requisitionnum = latestRequisition ? latestRequisition.Requisition + 1 : 1;

      // Prepare an array of invoice files (only PDFs)
      const invoiceFiles = req.files ? req.files.filter(file => file.mimetype === 'application/pdf').map(file => ({
        filename: file.filename,
        mimetype: file.mimetype,
        originalname: file.originalname,
      })) : [];

      // Prepare the response document
      const response = {
        Requisition: Requisitionnum,
        date: formattedDate,
        date1:formattedDate1,
        Customer: req.body.Customer,
        Requisitor: req.body.Requisitor,
        Pro_id: req.body.Pro_id,
        Part_No: partNo,
        description: description,
        manufacture: req.body.manufacture,
        supplier: req.body.supplier,
        Qty: qty,
        rate: rate,
        total: total,
        grandtotal: req.body.gt,
        invoice_no: invoiceNo,
        Need_by_date: req.body.NEED,
        Status: 'adhoc',
        adhoc: 'Adhoc',
      };

      // Add invoice files to the response document if any PDFs were uploaded
      if (invoiceFiles.length > 0) {
        response.invoice_file = invoiceFiles;
      }

      // Insert data into MongoDB
      await collection.insertOne(response);

      // Redirect to the details page of the newly created requisition
      res.redirect(`/admin/details/${response.Requisition}`);

    } catch (error) {
      console.error('Error during submission:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      await client.close();
    }
  });
});






router.post('/saveSliderValue', async (req, res) => {
    const { requisitionNumber, sliderValue } = req.body;
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

    // Connect to MongoDB and update the document
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('info'); // Assuming your collection is 'info'
       
        // Find the requisition and update the slider value
        const result = await collection.updateOne(
            { Requisition: requisitionNumber }, // Find the document by requisition number
            { $set: { DPC: sliderValue,pdraiser:req.session.user.username,pd:formattedDate } } // Update the DPC field with the new value
        );
        console.log(result.Requisition);
        if (result.modifiedCount > 0) {
            res.json({ success: true, message: 'Slider value updated successfully' });
        } else {
            res.json({ success: false, message: 'Requisition not found or no update made' });
        }
    } catch (error) {
        console.error('Error updating slider value:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
        await client.close();
    }
  });































// Multer setup for file upload (handling PDF files)
const storage2 = multer.diskStorage({
  destination: './uploads/', // Destination folder for uploaded files
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = path.basename(file.originalname, ext) + '-' + uniqueSuffix + ext;
    cb(null, filename); // Save the file with a unique name
  },
});

// File type check for PDFs only
function checkFileType(file, cb) {
  const filetypes = /pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: PDFs Only!'); // Reject files that aren't PDFs
  }
}
// Multer setup
const upload2 = multer({
  storage: storage2,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).single('performa_file'); // <--- match this with form input

// Route
router.post('/conform1/:id', urlencodedParser, (req, res) => {
  upload2(req, res, async (err) => {
    if (err) {
      console.error('Error during file upload:', err);
      return res.status(400).send('Error: PDFs Only or File too large');
    }

    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    const dbName = 'edify';
    const collectionName = 'info';
    const prId = req.params.id;

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

      const invoiceFile = req.file ? {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
      } : null; // <-- null instead of []

      const updateDoc = {
        $set: {
          updatedOn: formattedDate,
          dpcver:'no',
          p_invoiceno: req.body.p_invoiceno,
        },
      };

      if (invoiceFile) { // <--- simple check
        updateDoc.$set.performa_file = invoiceFile;
      }

      const query = { Requisition: parseInt(prId) };
      const result = await collection.updateOne(query, updateDoc);

      if (result.matchedCount === 0) {
        return res.status(404).send('Requisition not found');
      }

      res.redirect('/admin/status');
    } catch (error) {
      console.error('Error during submission:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      await client.close();
    }
  });
});









router.get('/conform2/:id', requireUser, async (req, res) => {
  const prId = req.params.id;
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const collectionName = 'info';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const query = { Requisition: parseInt(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }

    // Handle missing description field gracefully
    const descriptions = prDetails.description ? prDetails.description : [];
    
    res.render('dc', { username: req.session.user.username, descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});







// Multer setup for file upload (handling multiple PDF files)
const storage3 = multer.diskStorage({
  destination: './uploads/', // Destination folder for uploaded files
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = path.basename(file.originalname, ext) + '-' + uniqueSuffix + ext;
    cb(null, filename); // Save the file with a unique name
  },
});

// File type check for PDFs only
function checkFileType(file, cb) {
  const filetypes = /pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: PDFs Only!'); // Reject files that aren't PDFs
  }
}

// Multer setup for handling multiple file uploads (without file limit)
const upload3 = multer({
  storage: storage3,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb); // Check if the file is a PDF
  },
}).array('dc_pdf[]'); // No limit on the number of files\
router.post('/conform2/:id', urlencodedParser, (req, res) => {
  // Handle file uploads with Multer
  upload3(req, res, async (err) => {
    if (err) {
      console.error('Error during file upload:', err);
      return res.status(400).send('Error: PDFs Only or File too large');
    }

    // Retrieve form data
    const dcNumbers = req.body.dc_no;      // DC Numbers
    const products = req.body.products;    // Product quantities
    const amounts = req.body.amount;       // Amounts for each product
    const approvalStatus = req.body.delivered; // Approval status (image alt value)
    const remark1 = req.body.remark1;
    const totalProducts = req.body.totalProducts;
    const noprod = req.body.noofprod;

    // Log the values of totalProducts and noprod
    console.log('Total Products:', totalProducts);  // Prints totalProducts
    console.log('No of Products:', noprod);         // Prints noprod

    // Handle uploaded PDF files
    const dcPdfFiles = req.files.filter(file => file.mimetype === 'application/pdf').map(file => ({
      filename: file.filename,
      mimetype: file.mimetype,
      originalname: file.originalname,
    }));

    // MongoDB connection setup
    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    const dbName = 'edify';
    const collectionName = 'info';
    const prId = req.params.id; // Requisition ID from the URL parameter

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      // Format current date
      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

      // Prepare the update document
      const updateDoc = {
        $set: {
          updatedOn: formattedDate,
          remark1: remark1,
          approvalStatus: approvalStatus,
          dcNumber: dcNumbers,
          products: products,
          noamount: amounts,
        },
        $push: {
          dc_pdf: { $each: dcPdfFiles },
        }
      };
      
      // Check if totalProducts equals noprod, and update status to "conform"
      if (totalProducts == noprod) {
        updateDoc.$set.Status = 'conform';  // Update status to 'conform'
        updateDoc.$set.in = formattedDate;  // Set 'in' date
        updateDoc.$set.inraiser = req.session.user.username;  // Set the username of the person who confirmed
      }

      // Query to find the document by requisition ID
      const query = { Requisition: parseInt(prId) };
      const result = await collection.updateOne(query, updateDoc);

      // Check if document was found and updated
      if (result.matchedCount === 0) {
        return res.status(404).send('Requisition not found');
      }

      // Redirect after successful update
      res.redirect('/admin/status');  // Adjust this to the correct redirection URL

    } catch (error) {
      console.error('Error during submission:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      await client.close();
    }
  });
});



router.post('/dcconform1/:id', urlencodedParser, (req, res) => {
  upload3(req, res, async (err) => {
    if (err) {
      console.error('Error during file upload:', err);
      return res
        .status(400)
        .json({ success: false, message: 'Error: PDFs only or file too large (Max 5MB)' });
    }

    const client = new MongoClient('mongodb://localhost:27017');
    const prId = parseInt(req.params.id, 10);
    const submittedRowsCount = parseInt(req.body.totalProducts, 10);
    const { dc_no: dcNumber, products, amount } = req.body;
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

    try {
      await client.connect();
      const collection = client.db('edify').collection('info');

      // Fetch requisition
      const requisitionDoc = await collection.findOne({ Requisition: prId });
      if (!requisitionDoc) {
        return res
          .status(404)
          .json({ success: false, message: 'Requisition not found' });
      }

      // Ensure product fields exist
      const requiredFields = ['Part_No','description','manufacture','supplier','Qty','Need_by_date','rate','total'];
      if (requiredFields.some(f => !requisitionDoc[f] || !requisitionDoc[f].length)) {
        return res
          .status(400)
          .json({ success: false, message: 'Some product fields are missing or empty' });
      }

      const expectedRows = requisitionDoc.Part_No.length;
      const updateDoc = {
        $set: {
          updatedOn: new Date().toISOString().split('T')[0],
          dcNumber,
          products,
          noamount: amount,
        }
      };

      if (submittedRowsCount === expectedRows) {
        updateDoc.$set = {
          Status: 'conform',
          in: formattedDate,
          inraiser: req.session.user.username
        };
        

      } else {
        console.log(`Mismatch: expected ${expectedRows}, got ${submittedRowsCount}`);
      }

      // Attach PDFs if any
      if (req.files && req.files.length) {
        const invoiceFiles = req.files.map(f => ({
          filename: f.filename,
          mimetype: f.mimetype,
          originalname: f.originalname
        }));
        updateDoc.$push = { dc_pdf: { $each: invoiceFiles } };
      }

      const result = await collection.updateOne({ Requisition: prId }, updateDoc);
      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ success: false, message: 'Requisition not found on update' });
      }

      // Finally, always send JSON
      res.json({ success: true, message: 'Requisition updated successfully' });
    } catch (error) {
      console.error('Error during submission:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal Server Error' });
    } finally {
      await client.close();
    }
  });
});




router.post('/manualSubmit', urlencodedParser, async (req, res) => {
  upload3(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).send('File size too large, max size is 5MB');
      }
      if (err.message === 'Only PDFs are allowed') {
        return res.status(400).send('Only PDF files are allowed');
      }
      console.error('File upload error:', err);
      return res.status(400).send('Error during file upload');
    }

    const connectToDb = async () => {
      const url = 'mongodb://localhost:27017';
      const client = new MongoClient(url);
      await client.connect();
      return client.db('edify');
    };

    // Extract fields
    const prId = req.body.Requisition;  // Keep as string
    const dcNumber = req.body.dc_no;
    const products = req.body.products;
    const amount = req.body.amount;
    const remark1 = req.body.remark1;

    console.log('Received prId:', prId);
    const missingFields = [];

    if (!dcNumber || String(dcNumber).trim() === '') {
      missingFields.push("dc_no");
    }
    
    if (
      !products ||
      (Array.isArray(products) && products.filter(p => String(p).trim() !== '').length === 0) ||
      (typeof products === 'string' && products.trim() === '')
    ) {
      missingFields.push("products");
    }
    
    if (!amount || String(amount).trim() === '') {
      missingFields.push("amount");
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({ success: false, message: 'Missing fields: ' + missingFields.join(', ') });
    }
    


    try {
      const db = await connectToDb();
      const collection = db.collection('info');

      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

      const invoiceFiles = req.files ? req.files.map(file => ({
        filename: file.filename,
        mimetype: file.mimetype,
        originalname: file.originalname,
      })) : [];

      const updateDoc = {
        $set: {
          updatedOn: formattedDate,
          dcNumber: dcNumber,
          products: products,
          noamount: amount,
          in:formattedDate,
          inraiser:req.session.user.username,
          remark1: remark1,
          Status:'conform'
        },
      };

      if (invoiceFiles.length > 0) {
        updateDoc.$push = {
          dc_pdf: { $each: invoiceFiles }
        };
      }

      const query = { Requisition: parseInt(prId) }; // If it's stored as a number

      console.log('Query:', query); // Log query to verify

      const result = await collection.updateOne(query, updateDoc);
      console.log('Update result:', result); // Log result to verify

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Requisition not found' });
      }

      res.json({ success: true, message: 'Requisition updated successfully' });

    } catch (error) {
      console.error('Error during submission:', error);
      res.status(500).send('Internal Server Error');
    }
  });
});








module.exports = router;
