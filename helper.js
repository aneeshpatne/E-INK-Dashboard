const kindle = require("./connect");

async function setTime(time) {
  await kindle.exec(
    '/mnt/us/usbnet/bin/fbink -q -m -y -3 -t regular=/mnt/us/fonts/InstrumentSerif-Regular.ttf,size=90 "12:40"'
  );
}
async function clearTime() {
  await kindle.exec(
    "/mnt/us/usbnet/bin/fbink -s top=0,left=491,width=466,height=375 -W DU"
  );
}
