var express = require('express'),
  db = require('./queries'),

app = module.exports = express.Router();

app.get('/', db.getUsers);
app.post('/registerUser', db.registerUser);
app.post('/login', db.login);
app.get('/getAllUsers', db.getUsers)
app.get('/getUserById/:id', db.getUserById)
app.put('/updateUser/:id', db.updateUser)
app.delete('/deleteUser/:id', db.deleteUser)

// app.get('/', (response) => response.json({ info: 'Node.js, Express, and Postgres API' }));
// app.post('/createUser', db.createUser)
// app.listen(port, () => {
//   console.log(`App running on port ${port}.`)
// })
