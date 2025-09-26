const IST_OFFSET_MINUTES = 5.5 * 60;

function getIstDate(baseDate = new Date()) {
  const utc = baseDate.getTime() + baseDate.getTimezoneOffset() * 60000;
  return new Date(utc + IST_OFFSET_MINUTES * 60000);
}

function getTimeString(date = getIstDate()) {
  const hours = date.getHours();
  const hours12 = ((hours + 11) % 12) + 1;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours12}:${minutes}`;
}

function isWithinHours(date, startHour, endHour) {
  const hour = date.getHours();
  return hour >= startHour && hour < endHour;
}

module.exports = {
  getIstDate,
  getTimeString,
  isWithinHours,
};
