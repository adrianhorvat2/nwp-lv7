var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var bcrypt = require('bcrypt');

const DATA_FILE = path.join(__dirname, '../data/users.json');

// Helper function to read users
function readUsers() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper function to write users
function writeUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

// Helper function to find user by email
function findUserByEmail(email) {
  const users = readUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

// Helper function to find user by ID
function findUserById(id) {
  const users = readUsers();
  return users.find(u => u.id === id);
}

// GET - Registration form
router.get('/register', function (req, res, next) {
  // If already logged in, redirect to projects
  if (req.session && req.session.userId) {
    return res.redirect('/projects');
  }
  res.render('users/register', { title: 'Registracija', error: null });
});

// POST - Handle registration
router.post('/register', function (req, res, next) {
  const { name, email, password, confirmPassword } = req.body;

  // Validation
  if (!name || !email || !password || !confirmPassword) {
    return res.render('users/register', {
      title: 'Registracija',
      error: 'Sva polja su obavezna'
    });
  }

  if (password !== confirmPassword) {
    return res.render('users/register', {
      title: 'Registracija',
      error: 'Lozinke se ne poklapaju'
    });
  }

  if (password.length < 6) {
    return res.render('users/register', {
      title: 'Registracija',
      error: 'Lozinka mora imati najmanje 6 znakova'
    });
  }

  // Check if user already exists
  if (findUserByEmail(email)) {
    return res.render('users/register', {
      title: 'Registracija',
      error: 'Korisnik s ovom email adresom već postoji'
    });
  }

  // Hash password
  bcrypt.hash(password, 10, function (err, hash) {
    if (err) {
      return res.render('users/register', {
        title: 'Registracija',
        error: 'Greška pri registraciji'
      });
    }

    const users = readUsers();
    const newUser = {
      id: Date.now().toString(),
      name: name,
      email: email,
      password: hash
    };

    users.push(newUser);
    writeUsers(users);

    // Auto-login after registration
    req.session.userId = newUser.id;
    res.redirect('/projects');
  });
});

// GET - Login form
router.get('/login', function (req, res, next) {
  // If already logged in, redirect to projects
  if (req.session && req.session.userId) {
    return res.redirect('/projects');
  }
  res.render('users/login', { title: 'Prijava', error: null });
});

// POST - Handle login
router.post('/login', function (req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('users/login', {
      title: 'Prijava',
      error: 'Email i lozinka su obavezni'
    });
  }

  const user = findUserByEmail(email);

  if (!user) {
    return res.render('users/login', {
      title: 'Prijava',
      error: 'Neispravna email adresa ili lozinka'
    });
  }

  bcrypt.compare(password, user.password, function (err, result) {
    if (err || !result) {
      return res.render('users/login', {
        title: 'Prijava',
        error: 'Neispravna email adresa ili lozinka'
      });
    }

    // Create session
    req.session.userId = user.id;
    res.redirect('/projects');
  });
});

// GET - Logout
router.get('/logout', function (req, res, next) {
  req.session.destroy(function (err) {
    res.redirect('/users/login');
  });
});

module.exports = router;