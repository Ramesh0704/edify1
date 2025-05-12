
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
const { MongoClient } = require('mongodb');
router.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
  }));
  
function requireUser(req, res, next) {
    if (req.session.user && req.session.user.verify === "3") {
        next(); 
    } else {
        res.status(403).send('Unauthorized'); 
    }
  }
  

  
router.get('/', (req, res) => {
    const username = req.session.user.username;
    res.render(path.join(__dirname, '..', 'views', 'superadminportal'), { username: username });
});

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
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';

  const client = new MongoClient(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    const info = db.collection('users');
      const users = await info.find({ verify: "0" }).toArray();
  
      res.render('userdetails1', { 
        users: users,
        username: req.session.user.username 
      });
    } catch (error) {
      console.error('Error retrieving users:', error);
      res.status(500).send('Error retrieving users');
    }
  });
  
 
router.post('/approveUser', async (req, res) => {
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  const collectionName = 'users';

  try {
    const { empId, level } = req.body;

    await client.connect(); 
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const result = await collection.updateOne(
      { empid: empId },
      { $set: { verify: level } }
    );

    if (result.modifiedCount > 0) {
      res.status(200).send({ success: true });
    } else {
      res.status(404).send({ success: false, message: 'User not found or already updated' });
    }

  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).send({ success: false, message: 'Error approving user' });
  } finally {
    await client.close(); 
  }
});



router.get('/userdetails', async (req, res) => {
  const url = 'mongodb://localhost:27017';
  const dbName = 'edify';

  const client = new MongoClient(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    const info = db.collection('users');
    const users = await info.find({
      $or: [
          { verify: "1" },
          { verify: "2" }, 
          { verify: "3" }  
      ]
  }).toArray();
  
        
        res.send(`
           <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Details</title>
    <link rel="icon" href="/icon.jpg">
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
        .main h2 {
            color: #3f65c7;
            margin-bottom: 20px;
            text-align: center;
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
        .submit1 {
            color: #ffffff;
            background-color: #1B4CFB;
            border: none;
            padding: 4% 8%;
            cursor: pointer;
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
        .goback {
            position: fixed;
            right: 20px;
            bottom: 20px;
            height: 9%;
            width: 5%;
        }
    </style>
    <script>
        // Push a new state to the history stack
        history.pushState(null, null, location.href);

        window.addEventListener('popstate', function(event) {
            // Redirect to the logout endpoint or any other desired page
            window.location.href = '/superadmin/logout';
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
     <br> <br>
      <h2 style="color: #123F49;" align="center">User Details</h2>
      <br> <br>
   
    <div class="main">
       
        <table border="1">
            <thead>
    <tr>
        <th>Sl No</th>
        <th>User Name</th>
        <th>Emp ID</th>
        <th>Email</th>
        <th>Level</th>
       
        <th>Change Level</th>
         <th>Action</th>
    </tr>
</thead>
<tbody>
    ${users.map((user, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${user.username}</td>
            <td>${user.empid}</td>
            <td>${user.email}</td>
            <td>
                ${
                    user.verify === "1" ? 'User 🙍' :
                    user.verify === "2" ? 'Admin 👑' :
                    'Superadmin 🔐'
                }
            </td>
            <td>
                ${
                    user.verify !== "3" ? `
                        <button 
                            class="submit1" 
                            style="background-color: green; width: 120px; height: 40px; border-radius: 8px; color: white; font-weight: bold; text-align: center;" 
                            title="Toggle user level"
                            onclick="toggleLevel('${user.empid}', '${user.verify}')"
                        >
                            change to ${user.verify === "1" ? 'Admin 👑' : 'User 🙍'}
                        </button>
                    ` : ''
                }
            </td>
            <td>
                ${
                    user.verify !== "3" ? `
                        <button 
                            class="submit1" 
                            style="background-color:red;padding: 12%;" 
                            onclick="kickout('${user.empid}')"
                        >Kickout</button>
                    ` : ''
                }
            </td>
        </tr>
    `).join('')}
</tbody>


        </table>
    </div>
  
   <script>
    function kickout(empId) {
        fetch('/superadmin/kickoutUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ empId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('User kicked out successfully');
                location.reload();
            } else {
                alert('Error kicking out user');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error kicking out user');
        });
    }

    function toggleLevel(empId, currentLevel) {
        const newLevel = currentLevel === "1" ? "2" : "1"; // 1=User, 2=Admin

        fetch('/superadmin/toggleLevel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ empId, newLevel })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('User level changed successfully');
                location.reload();
            } else {
                alert('Failed to change user level');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error changing user level');
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
router.post('/toggleLevel', async (req, res) => {
  const { empId, newLevel } = req.body;

  if (!empId || !newLevel) {
      return res.status(400).json({ success: false, message: "Missing data" });
  }

  const url = 'mongodb://localhost:27017';
  const client = new MongoClient(url);
  const dbName = 'edify';

  try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('users');

      const result = await collection.updateOne(
          { empid: empId },
          { $set: { verify: newLevel } }
      );

      if (result.modifiedCount === 1) {
          res.json({ success: true });
      } else {
          res.json({ success: false, message: "User not updated" });
      }
  } catch (error) {
      console.error('Error updating user level:', error);
      res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
      await client.close();
  }
});

router.post('/kickoutUser', async (req, res) => {
    const { empId } = req.body;

    try {
        const collection = db.collection('users');
        const result = await collection.deleteOne({ empid: empId });

        if (result.deletedCount === 1 ) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'User not found or could not be deleted' });
        }
    } catch (error) {
        console.error('Error kicking out user:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


  
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/'); 
    });
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

    const thresholdDoc = await over.findOne({});
    const threshold = thresholdDoc ? thresholdDoc.overdueThreshold : 7;

    const currentDate = new Date();
    const overdueDate = new Date(currentDate);
    overdueDate.setDate(overdueDate.getDate() - threshold);
    const overdueFormatted = overdueDate.toISOString().split('T')[0];

    const result = await info.updateMany(
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
        Status: { $in: ['adhoc', 'conform','close'] },
        status: 'overdue'
      },
      { $set: { status: '' } }
    );

    const statusEntries = await info.find({}).toArray();
    statusEntries.reverse();
    console.log('Threshold:', threshold);

    res.render('111', {
      username: req.session.user.username,
      statusEntries: statusEntries,
      threshold: threshold
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching data');
  } finally {
    await client.close();
  }
});


router.get('/welcome1', requireUser, async (req, res) => {
  const url = 'mongodb://localhost:27017';
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    
    
    res.render('welcome1', { username:  req.session.user.username});

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});

async function checkAndUpdateOverdue() {
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
    const result = await info.updateMany(
      {
        date: { $lt: overdueFormatted },
        Status: { $nin: ['adhoc', 'conform','close'] }, 
      },
      { $set: { status: 'overdue' } }
    );
      await info.updateMany(
        { date: { $gt: overdueFormatted }, Status: { $nin: ['adhoc', 'conform','close'] } },
        { $set: { status: '' } }
      );
    
    
    await info.updateMany(
  {
    Status: { $in: ['adhoc', 'conform','close'] } ,
    status: 'overdue'
  },
  { $set: { status: '' } }
);

    console.log(`Marked ${result.modifiedCount} overdue items in 'info' collection based on threshold.`);
  } catch (err) {
    console.error('Overdue update error:', err);
  } finally {
    await client.close();
  }
}
checkAndUpdateOverdue();
router.post('/days', async (req, res) => {
  const days = parseInt(req.body.overdue); 
  const currentDate = new Date();
  const pastDate = new Date(currentDate); 
  pastDate.setDate(pastDate.getDate() - days);
  const pastDateFormatted = pastDate.toISOString().split('T')[0]; 
  try {
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const db = client.db(dbName);
    const collection = db.collection('info'); 
    const over = db.collection('over'); 
    await over.updateOne(
      {}, 
      { $set: { overdueThreshold: days } },
      { upsert: true }
    );

    const updatedThreshold = (await over.findOne({}))?.overdueThreshold;

    const result = await collection.updateMany(
      {
        date: { $lt: pastDateFormatted }, 
        Status: { $nin: ['adhoc', 'conform'] }, 
      },
      { $set: { status: 'overdue' } }
    );

    if (result.modifiedCount === 0) {
      await collection.updateMany(

        {
          date: { $gt: pastDateFormatted },
           Status: { $nin: ['adhoc', 'conform'] } },
        { $set: { status: '' } }
      );
    }

    await collection.updateMany(
      {
        Status: 'conform',
        status: 'overdue',
      },
      { $set: { status: '' } }
    );
    
    console.log(pastDateFormatted);
    console.log(`Marked ${result.modifiedCount} entries as overdue in 'info' collection.`);
    res.redirect('/superadmin/status');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
});


router.get('/view/:id', async (req, res) => {
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
      
      res.render('userform', { username:  req.session.user.username,descriptions, prDetails });
  
    } catch (error) {
      console.error('Error fetching PR details:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      await client.close();
    }
  });
router.get('/check/:id', async (req, res) => {
  const prId = req.params.id;
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
    
    res.render('quotation2', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});
router.post('/submit1/:id', urlencodedParser, async (req, res) => {
  const url = 'mongodb://localhost:27017';
  const client = new MongoClient(url);
  const dbName = 'edify';
  const collectionName = 'info';
  const prId = req.params.id;

  try {
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
const formattedDate1 = 
  `${String(date.getDate()).padStart(2, '0')}-` +
  `${String(date.getMonth() + 1).padStart(2, '0')}-` +
  `${date.getFullYear()} ` +
  `${String(date.getHours()).padStart(2, '0')}:` +
  `${String(date.getMinutes()).padStart(2, '0')}:` +
  `${String(date.getSeconds()).padStart(2, '0')}`;
    let partStatusArray = req.body.part_Status || [];
    let totalArray = req.body.total || [];
    let rateArray = req.body.rate || [];
    let descriptionArray = req.body.description || [];

    if (!Array.isArray(partStatusArray)) {
      partStatusArray = [partStatusArray];
    }

    if (!Array.isArray(totalArray)) {
      totalArray = [totalArray];
    }

    if (!Array.isArray(descriptionArray)) {
      descriptionArray = [descriptionArray];
    }

    partStatusArray = partStatusArray.map(status => status.trim() === '' ? 'Approved' : status);
    totalArray = totalArray.map(val => parseFloat(val)); 

    console.log(partStatusArray);
    console.log(totalArray);
    
    const response = {
      part_Status: partStatusArray,
      Remark: req.body.remark
    };

    const overallStatus = response.part_Status.includes('Revise') ? 'Revise' : 'close';
     
    const query = { Requisition: parseInt(prId) };

    let updateFields = {
      Status: overallStatus,
      updatedOn: formattedDate,
      ...response
    };

    if (overallStatus === 'close') {
      let reduction = 0;

      partStatusArray.forEach((status, index) => {
        if (status === 'Reject' && !isNaN(totalArray[index])) {
          reduction += totalArray[index];
        }
      });
      
      console.log(reduction);
      const gt = req.body.gt;
      const newGrandTotal = parseFloat(gt) - reduction;
      updateFields.grandtotal = newGrandTotal;
      updateFields.closeraiser = req.session.user.username;
      updateFields.close = formattedDate1;
      console.log(updateFields.grandtotal);
      
    }
      
     

    await collection.updateOne(query, {
      $set: updateFields,
    });

    res.redirect('/superadmin/status');
  } catch (error) {
    console.error('Error during submission:', error);
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
    
    res.render('history1', { username:  req.session.user.username,descriptions, prDetails });

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

    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('userform41', { username:  req.session.user.username,descriptions, prDetails });

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

    const descriptions = Array.isArray(prDetails.description) ? prDetails.description : [];
    
    res.render('pi1', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});



const multer = require('multer');
 urlencodedParser = express.urlencoded({ extended: true });


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

      res.redirect('/superadmin/status');
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

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('info'); 
        const result = await collection.updateOne(
            { Requisition: requisitionNumber },
            { $set: { DPC: sliderValue,pdraiser:req.session.user.username,pd:formattedDate } } 
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
        updateDoc.$set.invoice_file = invoiceFiles; 
      }

      const query = { Requisition: parseInt(prId) };
      const result = await collection.updateOne(query, updateDoc);

      if (result.matchedCount === 0) {
        return res.status(404).send('Requisition not found');
      }

      res.redirect('/superadmin/status'); 
    } catch (error) {
      console.error('Error during submission:', error);
      res.status(500).send('Internal Server Error');
    } finally {
      await client.close();
    }
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
    
    res.render('piverify1', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
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
    
    res.render('dc21', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});





router.post('/piapp/:id', async (req, res) => {
  

  try {
    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    const dbName = 'edify';
    const collectionName = 'info';
    const prId = req.params.id;
    await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

      const updateDoc = {
        $set: {
          updatedOn: formattedDate,
          p_inappro:'approved',
          dpcver:'yes',
          
        },
      };
      const query = { Requisition: parseInt(prId) };
      const result = await collection.updateOne(query, updateDoc);

      if (result.matchedCount === 0) {
        return res.status(404).send('Requisition not found');
      }

      res.redirect('/superadmin/status');

  } catch (error) {
      console.error('Error updating slider value:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
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
    
    res.render('piview1', { username:  req.session.user.username,descriptions, prDetails });

  } catch (error) {
    console.error('Error fetching PR details:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});





module.exports = router;
