const helper = require("./helper");
const connect = require("./connect");

(async () => {
  await connect.connect();
  await helper.setTime("1:5");
  await helper.clearTime();
})();
