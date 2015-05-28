var express = require('express');

let router = express.Router();

router
.use('/clusters', require('./clusters'))
.use('/node_sizes', require('./node_sizes'))
.use('/nodes', require('./nodes'))
.use('/regions', require('./regions'));

module.exports = router;
