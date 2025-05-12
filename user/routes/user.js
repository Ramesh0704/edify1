const express = require('express');
const session = require('express-session');
const router = express.Router();
const bodyParser = require('body-parser');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
var urlencodedParser = bodyParser.urlencoded({ extended: true });
const UserHistory = require('../../models/UserHistory'); 
router.use(bodyParser.urlencoded({ extended: true }));
router.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
}));

function requireUser(req, res, next) {
    if (req.session.user && req.session.user.verify === "1") {
        next();
    } else {
        res.status(403).send('Unauthorized');
    }
}


router.get('/login', (req, res) => {
   
    res.render('login');
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'user' && password === 'password') {
       
        const requisitionNumber = await generateRequisitionNumber();
        
        req.session.requisitionNumber = requisitionNumber;
        req.session.user = {
            username: username,
            verify: "1"
        };
        res.redirect('/user/dashboard');
    } else {
        res.status(401).send('Authentication failed');
    }
});

router.get('/dashboard', requireUser, (req, res) => {
    const requisitionNumber = req.session.requisitionNumber || 'N/A';
    res.render('dashboard', { requisitionNumber });
});

router.get('/prform', requireUser, async (req, res) => {
   
        const username = req.session.user.username;
        res.render('prform', {  username: username });
});


const url = 'mongodb://localhost:27017';
const dbName = 'edify';

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
    const thresholdDoc = await over.findOne({});
    const threshold = thresholdDoc ? thresholdDoc.overdueThreshold : 7;
    const currentDate = new Date();
    const overdueDate = new Date(currentDate);
    overdueDate.setDate(overdueDate.getDate() - threshold);
    const overdueFormatted = overdueDate.toISOString().split('T')[0];

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
    

    await info.updateMany(
      {
        Status:{ $in: ['adhoc', 'conform','close'] },
        

        status: 'overdue'
      },
      { $set: { status: '' } }
    );

    const statusEntries = await info.find({}).toArray();
    statusEntries.reverse();
    console.log('Threshold:', threshold);

    res.render('1', {
      username: req.session.user.username,
      statusEntries: statusEntries,
      threshold: threshold
    });

  } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
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
    
    const query = { Requisition: parseInt(prId) };
    const prDetails = await collection.findOne(query);

    if (!prDetails) {
      return res.status(404).json({ error: 'PR details not found' });
    }

    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('quotation', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});




router.get('/prform1', requireUser, async (req, res) => {
   
  const username = req.session.user.username;
  res.render('adhoc1', {  username: username });
});




router.get('/co', requireUser, (req, res) => {
         const username = req.session.user.username;
        res.render('userportal', {  username: username });
});


router.post('/save', urlencodedParser, async (req, res) => {
    const date = new Date();
    const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`; 
   
  
    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    const dbName = 'edify';
    const collectionName = 'draft';
  
    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);
      const response = {
         date:formattedDate,
          Customer: req.body.Customer,
          Requisitor: req.session.user.username,
          Pro_id: req.body.Pro_id,
          Part_No: req.body.part_no,
          description: req.body.description,
          manufacture: req.body.manufacture,
          supplier: req.body.supplier,
          Qty: req.body.qty,
          Need_by_date: req.body.NEED,
          rate:req.body.Rate,
          total:req.body.Total,
         
          part_Status:req.body.status,
          Remark:req.body.remark


        };
  
  
      await collection.insertOne(response);
      const username = req.session.user.username;
      res.render('userportal', { username: username});
    } catch (error) {
      console.error('Error during sbmission:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      await client.close();
    }
  });

  router.post('/submit', urlencodedParser, async (req, res) => {
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`; 
    const url = 'mongodb://localhost:27017';
    const dbName = 'edify';
    const collectionName = 'info';
    const client = new MongoClient(url);
  const formattedDate1 = 
  `${String(date.getDate()).padStart(2, '0')}-` +
  `${String(date.getMonth() + 1).padStart(2, '0')}-` +
  `${date.getFullYear()} ` +
  `${String(date.getHours()).padStart(2, '0')}:` +
  `${String(date.getMinutes()).padStart(2, '0')}:` +
  `${String(date.getSeconds()).padStart(2, '0')}`;
    try {
      await client.connect();
      
      const db = client.db(dbName);
      const collection = db.collection(collectionName);
      const latestNumber = await collection.countDocuments();
      const Requisitionnum = latestNumber + 1;
  
      const response = {
        Requisition:Requisitionnum,
         Status:req.body.status1,
         date:formattedDate,
         date1:formattedDate1,
          Customer: req.body.Customer,
          Requisitor: req.session.user.username,
          Pro_id: req.body.Pro_id,
          Part_No: req.body.part_no,
          description: req.body.description,
          manufacture: req.body.manufacture,
          supplier: req.body.supplier,
          Qty: req.body.qty,
          Need_by_date: req.body.NEED,
          rate:req.body.Rate,
          total:req.body.Total,
          adhoc:'New PO',
          part_Status:req.body.status,
          Remark:req.body.remark
      };
  
      await collection.insertOne(response);
      res.redirect(`/user/details/${Requisitionnum}`);
     
    } catch (error) {
      console.error('Error during submission:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      await client.close();
    }
  });
  

  router.get('/details/:id', requireUser, async (req, res) => {
    const { MongoClient } = require('mongodb'); 
const client = new MongoClient('mongodb://localhost:27017'); 
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
                window.location.href = '/user/logout';
            });
  
            function goBack() {
                window.location.href = '/user/welcome';
            }
        </script>
      </head>
      <body>
       <br><br><br>
      <h2 style="color: #123F49;" align="center">Purchase Requisition Form</h2>
         
              <div class="main">
                  <h2>Purchase Request Received</h2>
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
                  
              </div>
          </div>
            <img src="/goback.png" alt="Go Back" width="3%" height="5%" class="goback" onclick="goBack()">
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
    const url = 'mongodb://localhost:27017';
    const dbName = 'edify';
    const collectionName = 'draft';
    
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
  
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
        <body> <br><br><br>
          <h2 style="color: #123F49;" align="center">Purchase Requisition Draft</h2>
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
  
      pendingPRs.forEach((pr,index) => {
        htmlResponse += `
          <tr>
             <td>${index+1}</td>
            <td>${pr.date}</td>
            <td>${pr.Customer}</td>
            <td>${pr.Pro_id}</td>
            <td><button class="button1"><a href="/user/viewpr/details/${pr._id}">View</a></button></td>
          </tr>
        `;
      });
  
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
      const query = { _id: ObjectId(prId) };
      const prDetails = await collection.findOne(query);
  
      if (!prDetails) {
        return res.status(404).json({ error: 'PR details not found' });
      }
  
      const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
       res.render('viewpr-details', {
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
    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('dc2', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});

router.get('/welcome', requireUser, async (req, res) => {
  const url = 'mongodb://localhost:27017';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    
    
    res.render('welcome', { username:  req.session.user.username});

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

    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('history2', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});




const multer = require('multer');
 urlencodedParser = express.urlencoded({ extended: true });
const storage1 = multer.diskStorage({
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
const upload1 = multer({
  storage: storage1,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).array('invoice_pdf[]');

router.post('/submit1', urlencodedParser, (req, res) => {
  upload1(req, res, async (err) => {
    if (err) {
      console.error('Error during file upload:', err);
      return res.status(400).send('Error: PDFs Only or File too large'); 
    }

    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`; 
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

      if (!req.body.Customer || !req.body.Requisitor || !req.body.Pro_id) {
        return res.status(400).send('Missing required fields');
      }

      const partNo = Array.isArray(req.body.part_no) ? req.body.part_no : [req.body.part_no];
      const description = Array.isArray(req.body.description) ? req.body.description : [req.body.description];
      const qty = Array.isArray(req.body.qty) ? req.body.qty : [req.body.qty];
      const rate = Array.isArray(req.body.Rate) ? req.body.Rate : [req.body.Rate];
      const total = Array.isArray(req.body.Total) ? req.body.Total : [req.body.Total];
      const invoiceNo = Array.isArray(req.body.invoice) ? req.body.invoice : [req.body.invoice];

      const latestRequisition = await collection.findOne({}, { sort: { Requisition: -1 } });
      const Requisitionnum = latestRequisition ? latestRequisition.Requisition + 1 : 1;

      const invoiceFiles = req.files ? req.files.filter(file => file.mimetype === 'application/pdf').map(file => ({
        filename: file.filename,
        mimetype: file.mimetype,
        originalname: file.originalname,
      })) : [];

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

      if (invoiceFiles.length > 0) {
        response.invoice_file = invoiceFiles;
      }

      await collection.insertOne(response);

      res.redirect(`/user/details/${response.Requisition}`);

    } catch (error) {
      console.error('Error during submission:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      await client.close();
    }
  });
});
  
  router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/'); 
    });
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
  
      const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
      
      res.render('piverify2', { username:  req.session.user.username,descriptions, prDetails });
  
    } catch (error) {
      console.error('Error fetching PR details:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      await client.close();
    }
  });
  

module.exports = router;
