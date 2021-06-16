var config  = require('./config'),
    _       = require('lodash'),
    jwt     = require('jsonwebtoken'),
    dotenv  = require('dotenv');
const Pool = require('pg').Pool;


const pool = new Pool({
  user: process.env.DATABASE_USER,
  database: process.env.DATABASE,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.PORT,
  host: process.env.HOST,
})
  
async function createIdToken(user) {
   return jwt.sign(_.omit(user, 'password'), config.secret, { expiresIn: 60*60*5 });
}

function createAccessToken() {
  return jwt.sign({
    iss: config.issuer,
    aud: config.audience,
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
    scope: 'full_access',
    sub: "lalaland|gonto",
    jti: genJti(), // unique identifier for the token
    alg: 'HS256'
  }, config.secret);
}

// Generate Unique Identifier for the access token
function genJti() {
  let jti = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 16; i++) {
    jti += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return jti;
}

function getUserScheme(req) {
  
  var email;
  var type;
  var userSearch = {};

  if(req.body.payload.email) {
    email = req.body.payload.email;
    type = 'email';
    userSearch = { email: email };
  }
  return {
    email: email,
    type: type,
    userSearch: userSearch
  }
}

async function registerUser(req, res) {
  const { imageUrl, email, givenName, familyName, googleId, loggedIn } = req.body.payload;
  // const users = await getUsers(req, res);
  // console.log('payload--->', email);
  var userScheme = await getUserScheme(req);

  pool.query('SELECT * FROM users ORDER BY id ASC', (error, results) => {
    if (error) throw error;
    else {
      const users = results.rows;
      if (!userScheme.email) {
        return res.status(400).send("You must send the email");
      }
      if (_.find(users, userScheme.userSearch)) {
        const userFound = users.find((obj) => obj.email === email);
        return res.status(200).send({message: "User logged in successfully!", payload: userFound});
      }
      // var profile = _.pick(req.body, userScheme.type, 'password', 'extra');
      // profile.id = _.max(users, 'id').id + 1;

      pool.query('INSERT INTO users (imageUrl, email, givenName, familyName, googleId, loggedIn) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [imageUrl, email, givenName, familyName, googleId, loggedIn], (error, results) => {
        if (error) throw error;
        else if (!Array.isArray(results.rows) || results.rows.length < 1) {
          throw error
        } else {
          res.status(201).send({
            message: `User added with ID: ${results.rows[0].id}`,
            payload: results.rows[0]
            // id_token: createIdToken(profile),
            // access_token: createAccessToken()
          });
        }
      })
    }
  })
};

const login = (req, res) => {
  var userScheme = getUserScheme(req);
  if (!userScheme.username || !req.body.password) {
    return res.status(400).send("You must send the username and the password");
  }
  // const users = getUsers(req, res);
  pool.query('SELECT * FROM users ORDER BY id ASC', (error, results) => {
    if (error) throw error;
    else {
      const users = results.rows;
      var user = _.find(users, userScheme.userSearch);
      if (!user) {
        return res.status(401).send("The username or password don't match");
      }
      if (user.password !== req.body.password) {
        return res.status(401).send("The username or password don't match");
      }
      res.status(201).send({
        id_token: createIdToken(user),
        access_token: createAccessToken()
      });
    }
  });
};

const getUsers = (request, response) => {
  const {limit} = request.query;
  const offset = parseInt(request.query.start) ? parseInt(request.query.start)-1 : 0;
  pool.query(`SELECT * FROM users ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`, (error, results) => {
    if (error) throw error;
    response.status(200).json(results.rows);
    return results.rows;
  })
}

const getUserById = (request, response) => {
  const id = parseInt(request.params.id)
  pool.query('SELECT * FROM users WHERE id = $1', [id], (error, results) => {
    if (error) throw error;
    response.status(200).json(results.rows)
  })
}

// const createUser = (request, response) => {
//   const { name, email } = request.body
//   pool.query('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *', [name, email], (error, results) => {
//     if (error) {
//       throw error
//     } else if (!Array.isArray(results.rows) || results.rows.length < 1) {
//     	throw error
//     }
//     response.status(201).send(`User added with ID: ${results.rows[0].id}`)
//   })
// }

const updateUser = (request, response) => {
  const id = parseInt(request.params.id)
  const { givenName, familyName } = request.body

  pool.query(
    'UPDATE users SET givenName = $1, familyName = $2  WHERE id = $3 RETURNING *',
    [givenName, familyName, id],
    (error, results) => {
      if (error) throw error;
      else {
        if (typeof results.rows == 'undefined') {
          response.status(404).send(`Resource not found`);
        } else if (Array.isArray(results.rows) && results.rows.length < 1) {
          response.status(404).send(`User not found`);
        } else {
          response.status(200).send(`User modified with ID: ${results.rows[0].id}`)         	
        }
      }
    }
  )
}

const deleteUser = (request, response) => {
  const id = parseInt(request.params.id);
  pool.query('DELETE FROM users WHERE id = $1', [id], (error, results) => {
    if (error) throw error;
    response.status(200).send(`User deleted with ID: ${id}`)
  })
}

module.exports = {
  registerUser,
  login,
  getUsers,
  getUserById,
  // createUser,
  updateUser,
  deleteUser,
}
