const UPLOAD_PAGE_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lZg6VAAAAABJRU5ErkJggg==";

const LOCAL_PAGE = {
  width: 2,
  height: 2,
  channels: 4,
  background: { r: 255, g: 90, b: 60, alpha: 1 },
};

const UI_FLOW_PAGE = {
  width: 240,
  height: 320,
  channels: 4,
  background: { r: 248, g: 248, b: 245, alpha: 1 },
};

module.exports = {
  LOCAL_PAGE,
  UI_FLOW_PAGE,
  UPLOAD_PAGE_DATA_URL,
};
