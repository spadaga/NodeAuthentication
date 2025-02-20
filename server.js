
const express = require("express");
const dotEnv = require("dotenv");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require("express-session");
const MongoDBStore = require('connect-mongodb-session')(session);
const bcrypt = require('bcrypt');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 8000;
dotEnv.config();

// Redirect from / to /register
app.get('/', (req, res) => {
  res.redirect('/register');
});

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const userstore = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: 'Mysession'
});

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
  store: userstore
}));

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log(`Connected to MongoDB on port ${PORT}`);
  })
  .catch((error) => {
    console.error(`Error occurred: ${error}`);
  });

app.set("view engine", 'ejs');

// --- Authentication Middleware ---
function requireAuth(req, res, next) {
  console.log("Checking authentication...");
  console.log("Request name:", req.session.username);
  console.log("Request ID:", req.session.userId);
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/register');
  }
}
// --- End of Authentication Middleware ---

app.get('/login', (req, res) => {
  if (req.session.isregister && req.session.isAuthenticated) {
    return res.redirect('/dashboard');
  }
  if (req.session.isregister) {
    return res.render('login');
  } else {
    return res.redirect('/register');
  }
});

app.get('/dashboard', requireAuth, (req, res) => {
  console.log("Authentication successful...");
  if (req.session.isregister && req.session.isAuthenticated) {
    return res.render("dashboard");
  } else {
    res.render("dashboard", { username: req.session.username });
    return res.redirect('/register');
  }
});

app.get('/register', (req, res) => {
  if (req.session.isregister && req.session.isAuthenticated) {
    return res.redirect('/dashboard');
  }
  if (req.session.isregister) {
    return res.render('login');
  }
  res.render("register");
});

// Registration Route (with bcrypt and improved error handling)
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    req.session.isregister = true;
    req.session.username = newUser.username;
    req.session.userId = newUser._id;

    console.log('User created successfully');
    res.redirect("/login");
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Logout Route
app.post('/logout', (req, res) => {
  console.log("Logging out...");
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      res.redirect('/dashboard');
    } else {
      res.redirect('/register');
    }
  });
});

// Login Route
app.post('/login', async (req, res) => {
  console.log(req.body);
  try {
    const { email, password } = req.body;
    const useremail = await User.findOne({ email });
    if (!useremail) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, useremail.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.session.isAuthenticated = true;
    req.session.username = useremail.username;
    req.session.userId = useremail._id;

    console.log('Login successful');
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Server error during login' });
  }
});


