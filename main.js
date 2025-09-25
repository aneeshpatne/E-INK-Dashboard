const kindle = require("./connect");
(async () => {
  await kindle.connect();
  console.log("Connected!");

  await kindle.exec(
    '/mnt/us/usbnet/bin/fbink -q -m -M -S 6 "Hello from main.js"'
  );
})();
