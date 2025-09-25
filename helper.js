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

async function refreshRegion() {
  await kindle.exec(
    "/mnt/us/usbnet/bin/fbink -q -k top=0,left=350,width=750,height=375 -B WHITE -f -W GC16"
  );
}

async function setBacklight(level) {
  await kindle.exec(
    `lipc-set-prop com.lab126.powerd flIntensity ${Number(level)}`
  );
}

module.exports = { setTime, clearTime, refreshRegion, setBacklight };
