const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const connectDB = require('./db'); // Import the connectDB function

const MONGO_URI = 'mongodb://localhost:27017'; // Ensure your connection string is correctly set here

// Connect to MongoDB
connectDB(MONGO_URI);
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Define User schema and model
const User = mongoose.model('User', {
    username: String,
    empid: String,
    email: String,
    password: String, // Hashed password
    role: String,
    verify: String
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, 'user', 'views'),
    path.join(__dirname, 'admin', 'views'),
    path.join(__dirname, 'superadmin', 'views')
]);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

// Login route
app.post('/login', async (req, res) => {
    const { empid, password } = req.body;

    try {
        const user = await User.findOne({ empid });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.sendFile(path.join(__dirname, 'login1.html'));
        }

        req.session.user = user;

        switch (user.verify) {
            case "1":
                res.redirect('/user');
                break;
            case "2":
                res.redirect('/admin');
                break;
            case "3":
                res.redirect('/superadmin');
                break;
            default:
                res.sendFile(path.join(__dirname, 'login1.html'));
        }
    } catch (error) {
        console.error('Error during user login:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Signup route
app.post('/signup', async (req, res) => {
    const { username, empid, email, password, role, verify } = req.body;

    try {
        const existingUser = await User.findOne({ empid });
        if (existingUser) {
            return res.send('Employee ID already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({ username, empid, email, password: hashedPassword, role, verify });
        res.sendFile(path.join(__dirname, 'login.html'));
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).send('Internal Server Error');
    }
});

// User route
app.get('/user', authorizeUser, (req, res) => {
    const username = req.session.user.username;
    res.render('userportal', { username: username });
});

const userRoutes = require('./user/routes/user');
app.use('/user', authorizeUser, userRoutes);

// Admin route
const adminRoutes = require('./admin/routes/admin');
app.use('/admin', authorizeAdmin, adminRoutes);

// Superadmin route
const superadminRoutes = require('./superadmin/routes/superadmin');
app.use('/superadmin', authorizeSuperadmin, superadminRoutes);

// Authorization middleware for user route
function authorizeUser(req, res, next) {
    if (req.session.user && req.session.user.verify === "1") {
        next(); // User is authorized, continue to the next middleware or route handler
    } else {
        res.status(403).send('Unauthorized'); // User is not authorized
    }
}

// Authorization middleware for admin route
function authorizeAdmin(req, res, next) {
    if (req.session.user && req.session.user.verify === "2") {
        next(); // Admin is authorized, continue to the next middleware or route handler
    } else {
        res.status(403).send('Unauthorized'); // Admin is not authorized
    }
}

// Authorization middleware for superadmin route
function authorizeSuperadmin(req, res, next) {
    if (req.session.user && req.session.user.verify === "3") {
        next(); // Superadmin is authorized, continue to the next middleware or route handler
    } else {
        res.status(403).send('Unauthorized'); // Superadmin is not authorized
    }
}

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/'); // Redirect to the login page
    });
});

const axios = require('axios');
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: true }));

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'forgot-password.html'));
});

app.post('/forgot-password', async (req, res) => {
    const { email, 'g-recaptcha-response': captcha } = req.body;

    if (!captcha) {
        return res.redirect('/forgot-password?msg=' + encodeURIComponent('Please complete the CAPTCHA.'));
    }

    const secretKey = '6LcyXSErAAAAACFmDQeTt4S50ywQaSin0Xn5KXAn';
    const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captcha}`;

    try {
        const response = await axios.get(verificationURL); // Changed to GET
        if (!response.data.success) {
            return res.redirect('/forgot-password?msg=' + encodeURIComponent('CAPTCHA verification failed.'));
        }
    } catch (error) {
        return res.redirect('/forgot-password?msg=' + encodeURIComponent('CAPTCHA error. Try again.'));
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.redirect('/forgot-password?msg=' + encodeURIComponent('Email not registered.'));
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    req.session.otp = otp;
    req.session.email = email;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'sramesh7a05@gmail.com',
            pass: 'eqhy xmwc ivjm yzja'
        }
    });

    try {
        await transporter.sendMail({
            from: 'sramesh7a05@gmail.com',
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP is ${otp}`
        });
    } catch (error) {
        console.error('Email error:', error);
        return res.redirect('/forgot-password?msg=' + encodeURIComponent('OTP email failed. Try again.'));
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Forgot Password</title>
        <link rel="icon" href="/icon.jpg">
        <script src="https://www.google.com/recaptcha/api.js" async defer></script>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #b8e7f9;
            }
            .main {
                margin: 3%;
                margin-left: 35%;
                padding: 0;
                background-color: #ececec;
                border-radius: 15px;
                box-shadow: 0 0 20px rgba(11, 1, 1, 0.2);
                padding: 20px;
                width: 500px;
            }

            .main h4 {
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

            .main input {
                margin: 5%;
            }

            button {
                color: #ffffff;
                background-color: #1B4CFB;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                width: 100%;
            }

            button:hover {
                background-color: #0e2bbf;
            }

            .submit {
                color: #ffffff;
                background-color: #1B4CFB;
            }

            .g-recaptcha {
                margin: 10px 0;
            }
            .goback {
                position: fixed;
                right: 20px;
                bottom: 20px;
                height: 9%;
                width: 5%;
            }
        </style>
        </head>
        <body>
            <div>
                <img src="/icon2.png" alt="" height="0%" width="15%" >
                <h2 class="edify" align="center">EDIFY ENGINEERING SOLUTION</h2>
            </div>
            <br><br><br>
            <div class="main">
                <h3 style="color: #123F49;" align="center">Reset Password</h3> <br><br> <br>  
                <form action="/verify-otp" method="POST">
                    <input type="text" name="otp" placeholder="Enter OTP" required>
                    <input type="password" name="newPassword" placeholder="New Password" required>
                    <button type="submit">Reset Password</button>
                </form>
                <div>
                <footer>
                    <button onclick="goBack()" style="display: none;"><img src="/goback.png" alt="loading" width="3%" height="5%" class="goback"></button>
                </footer>
                </div>
            </div>
        </body>
        </html>
    `);
});
app.post('/verify-otp', async (req, res) => {
    const { otp, newPassword } = req.body;

    if (otp === req.session.otp) {
        const hashed = await bcrypt.hash(newPassword, 10);
        await updateUserPassword(req.session.email, hashed); // Make sure this function updates the password

        req.session.destroy(() => {
            res.send(`
                <html>
                    <head>
                        <title>Password Reset Successful</title>
                        <script type="text/javascript">
                            alert('Password reset successful!');
                            window.location.href = '/login'; // Redirects to login page
                        </script>
                    </head>
                    <body></body>
                </html>
            `);
        });
    } else {
        res.send(`
            <html>
                <head>
                    <title>OTP Error</title>
                    <script type="text/javascript">
                        alert('Incorrect OTP! Please try again.');
                        window.location.href = '/forgot-password'; // Redirects back to the forgot-password page for another attempt
                    </script>
                </head>
                <body></body>
            </html>
        `);
    }
});


// Implement this function to update the user password in your database
async function updateUserPassword(email, newPassword) {
    await User.updateOne({ email }, { $set: { password: newPassword } });
}



// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
