const kindle = require("./connect");

async function setTime(time) {
  await kindle.exec(
    `/mnt/us/usbnet/bin/fbink -q -m -y -3 -t regular=/mnt/us/fonts/InstrumentSerif-Regular.ttf,size=90,padding=HORIZONTAL "${time}"`
  );
}
async function clearTime() {
  await kindle.exec(
    "/mnt/us/usbnet/bin/fbink -s top=0,left=350,width=750,height=375 -W A2"
  );
}

module.exports = { setTime, clearTime };
