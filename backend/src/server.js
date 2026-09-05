const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`PeoplePay360 API listening on port ${config.port}`);
});
